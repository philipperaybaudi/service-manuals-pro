/**
 * dell-phase3-fix.mjs — Application de toutes les corrections DELL
 * =================================================================
 * 1. Upload toutes les previews régénérées → Supabase Storage (upsert, JAMAIS delete avant upload)
 * 2. Corrige les slugs erronés → DB + R2 (copy d'abord, delete ensuite)
 * 3. Corrige les page_count incorrects → DB
 * 4. Corrige les mentions de langue dans descriptions → DB
 * 5. Vérifie R2 et réimporte les PDFs manquants depuis local
 *
 * Usage :
 *   node scripts/dell-phase3-fix.mjs --dry-run   (simulation)
 *   node scripts/dell-phase3-fix.mjs             (réel)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = process.argv.includes('--dry-run');

const AUDIT_FILE   = path.join(__dirname, 'dell-audit-phase1.json');
const PREVIEW_DIR  = path.join(__dirname, 'temp_dell_previews');
const PHASE2_RPT   = path.join(__dirname, 'dell-phase2-report.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'service-manuals-documents';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Utilitaires ──────────────────────────────────────────────────────────────
function computeBase(slug) {
  return slug.replace(/-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$/, '');
}

async function slugExists(slug) {
  const { data } = await supabase.from('documents').select('id').eq('slug', slug).maybeSingle();
  return !!data;
}

async function findFreeSlug(base, lang) {
  for (const s of [`${base}-${lang}`, `${base}-${lang}-2`, `${base}-${lang}-3`, `${base}-${lang}-4`, `${base}-${lang}-5`]) {
    if (!(await slugExists(s))) return s;
  }
  throw new Error(`Slug libre introuvable pour ${base}-${lang}`);
}

async function r2Exists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

// ── 1. Upload previews ────────────────────────────────────────────────────────
async function uploadPreviews() {
  console.log('\n── ÉTAPE 1 : Upload previews ──────────────────────────────────');

  if (!existsSync(PREVIEW_DIR)) {
    console.log('  ⚠ Dossier temp_dell_previews absent — skip');
    return { ok: 0, errors: 0 };
  }

  const jpgs = readdirSync(PREVIEW_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`  ${jpgs.length} previews à uploader`);

  let ok = 0, errors = 0;

  for (let i = 0; i < jpgs.length; i++) {
    const fname = jpgs[i];
    const slug  = fname.replace('.jpg', '');
    const fpath = path.join(PREVIEW_DIR, fname);
    const storagePath = `previews/${slug}.jpg`;

    if (DRY_RUN) {
      ok++;
      if ((i + 1) % 200 === 0) console.log(`  [DRY] ${i+1}/${jpgs.length} previews traitées`);
      continue;
    }

    try {
      const buf = readFileSync(fpath);
      const { error } = await supabase.storage.from('logos').upload(storagePath, buf, {
        contentType: 'image/jpeg',
        upsert: true,  // JAMAIS delete avant — upsert atomique
      });
      if (error) throw error;
      ok++;
    } catch (e) {
      console.log(`  ✗ Preview ${slug}: ${e.message}`);
      errors++;
    }

    if ((i + 1) % 200 === 0) console.log(`  [${i+1}/${jpgs.length}] ${ok} OK, ${errors} erreurs`);
  }

  // Mettre à jour preview_url en DB pour tous les slugs concernés
  if (!DRY_RUN) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Batch update: la preview_url suit le format standard, vérifier si elle est déjà correcte
    // On ne met à jour que si la preview_url est null ou incorrecte
    console.log(`  → Vérification preview_url en DB...`);
    const { data: docsNull } = await supabase
      .from('documents')
      .select('slug')
      .ilike('slug', 'dell-%')
      .is('preview_url', null);

    if (docsNull && docsNull.length > 0) {
      for (const doc of docsNull) {
        const url = `${baseUrl}/storage/v1/object/public/logos/previews/${doc.slug}.jpg`;
        await supabase.from('documents').update({ preview_url: url }).eq('slug', doc.slug);
      }
      console.log(`  ✓ ${docsNull.length} preview_url null corrigées`);
    }
  }

  console.log(`  Résultat : ${ok} OK | ${errors} erreurs`);
  return { ok, errors };
}

// ── 2. Corriger les slugs erronés ────────────────────────────────────────────
async function fixSlugs(slugErrors) {
  console.log(`\n── ÉTAPE 2 : Correction slugs (${slugErrors.length}) ───────────────────`);
  let ok = 0, errs = 0;

  for (const entry of slugErrors) {
    const oldSlug  = entry.slug;
    const newLang  = entry.char_detected;
    const base     = computeBase(oldSlug);
    const localPdf = entry.pdf_path;

    let newSlug;
    try {
      newSlug = await findFreeSlug(base, newLang);
    } catch (e) {
      console.log(`  ✗ ${oldSlug}: ${e.message}`);
      errs++; continue;
    }

    console.log(`\n  📄 ${oldSlug}`);
    console.log(`     → ${newSlug}`);

    if (DRY_RUN) {
      console.log(`     [DRY] DB + R2 + preview`);
      ok++; continue;
    }

    // Vérifier que l'ancien slug existe encore
    if (!(await slugExists(oldSlug))) {
      console.log(`     ⚠ Slug absent en DB — ignoré`);
      ok++; continue;
    }

    // 1. Mettre à jour DB
    const { error: dbErr } = await supabase.from('documents')
      .update({ slug: newSlug }).eq('slug', oldSlug);
    if (dbErr) { console.log(`     ✗ DB: ${dbErr.message}`); errs++; continue; }
    console.log(`     ✓ DB slug mis à jour`);

    // 2. Renommer R2 (copy first, then delete)
    const oldKey = `documents/${oldSlug}.pdf`;
    const newKey = `documents/${newSlug}.pdf`;
    try {
      await r2.send(new CopyObjectCommand({
        Bucket: R2_BUCKET, CopySource: `${R2_BUCKET}/${oldKey}`, Key: newKey,
      }));
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
      console.log(`     ✓ R2 renommé`);
    } catch (e) {
      // Fallback upload local
      if (localPdf && existsSync(localPdf)) {
        try {
          const buf = readFileSync(localPdf);
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET, Key: newKey, Body: buf, ContentType: 'application/pdf',
          }));
          try { await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey })); } catch {}
          console.log(`     ✓ R2 upload local`);
        } catch (e2) {
          console.log(`     ✗ R2: ${e2.message}`);
        }
      } else {
        console.log(`     ✗ R2: ${e.message}`);
      }
    }

    // 3. Preview_url → sera mise à jour via l'upload de la nouvelle preview
    const newUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${newSlug}.jpg`;
    await supabase.from('documents').update({ preview_url: newUrl }).eq('slug', newSlug);

    ok++;
  }

  console.log(`  Résultat : ${ok} OK | ${errs} erreurs`);
  return { ok, errs };
}

// ── 3. Corriger page_count ────────────────────────────────────────────────────
async function fixPages(pagesErrors) {
  console.log(`\n── ÉTAPE 3 : Correction page_count (${pagesErrors.length}) ────────────────`);
  let ok = 0;

  for (const entry of pagesErrors) {
    console.log(`  ${entry.slug} | DB=${entry.db_pages} → réel=${entry.real_pages}`);
    if (!DRY_RUN) {
      await supabase.from('documents')
        .update({ page_count: entry.real_pages })
        .eq('slug', entry.slug);
      console.log(`  ✓ Mis à jour`);
    } else {
      console.log(`  [DRY] Mise à jour`);
    }
    ok++;
  }

  return { ok };
}

// ── 4. Corriger descriptions ──────────────────────────────────────────────────
async function fixDescriptions(descErrors) {
  console.log(`\n── ÉTAPE 4 : Correction descriptions (${descErrors.length}) ─────────────`);
  let ok = 0, errs = 0;

  for (const entry of descErrors) {
    const { slug, lang_fr_wrong, lang_fr_right, lang_en_wrong, lang_en_right } = entry;

    if (!lang_fr_wrong || !lang_fr_right || lang_fr_wrong === lang_fr_right) continue;

    // Récupérer description complète depuis DB
    const { data } = await supabase.from('documents')
      .select('description, description_fr').eq('slug', slug).maybeSingle();
    if (!data) { errs++; continue; }

    const newDescFr = (data.description_fr || '')
      .replace(new RegExp(`en ${lang_fr_wrong}`, 'gi'), `en ${lang_fr_right}`)
      .replace(new RegExp(`En ${lang_fr_wrong}`, 'gi'), `En ${lang_fr_right}`);

    const newDescEn = (data.description || '')
      .replace(new RegExp(`in ${lang_en_wrong}`, 'gi'), `in ${lang_en_right}`)
      .replace(new RegExp(`In ${lang_en_wrong}`, 'gi'), `In ${lang_en_right}`);

    console.log(`  ${slug}`);
    console.log(`    FR: "en ${lang_fr_wrong}" → "en ${lang_fr_right}"`);

    if (!DRY_RUN) {
      const { error } = await supabase.from('documents')
        .update({ description_fr: newDescFr, description: newDescEn })
        .eq('slug', slug);
      if (error) { console.log(`    ✗ ${error.message}`); errs++; continue; }
      console.log(`    ✓ Description mise à jour`);
    } else {
      console.log(`    [DRY] Description mise à jour`);
    }
    ok++;
  }

  console.log(`  Résultat : ${ok} OK | ${errs} erreurs`);
  return { ok, errs };
}

// ── 5. Vérifier R2 et réimporter PDFs manquants ──────────────────────────────
async function checkAndFixR2(allSlugs) {
  console.log(`\n── ÉTAPE 5 : Vérification R2 (${allSlugs.length} docs) ────────────────────`);
  // Charger index PDF local
  const corrFile = path.join(__dirname, 'corrections-dell.json');
  const corrections = JSON.parse(readFileSync(corrFile, 'utf-8'));

  const byOld  = {};
  const byNew  = {};
  const byBase = {};
  for (const e of corrections) {
    const lp = e.local_pdf || '';
    if (!lp) continue;
    if (e.old_slug) {
      byOld[e.old_slug] = lp;
      const b = e.old_slug.replace(/-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$/, '');
      if (!byBase[b]) byBase[b] = lp;
    }
    if (e.new_slug) {
      byNew[e.new_slug] = lp;
      const b = e.new_slug.replace(/-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$/, '');
      if (!byBase[b]) byBase[b] = lp;
    }
  }

  function getLocalPdf(slug) {
    const tryPath = (lp) => {
      if (!lp) return null;
      if (existsSync(lp)) return lp;
      const cand = `C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\${path.basename(lp)}`;
      if (existsSync(cand)) return cand;
      return null;
    };
    let lp = tryPath(byOld[slug]) || tryPath(byNew[slug]);
    if (!lp) {
      const b = slug.replace(/-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$/, '');
      lp = tryPath(byBase[b]);
    }
    return lp;
  }

  let missing = 0, fixed = 0, ok = 0;

  for (let i = 0; i < allSlugs.length; i++) {
    const slug = allSlugs[i];
    const r2Key = `documents/${slug}.pdf`;

    const exists = await r2Exists(r2Key);
    if (exists) { ok++; continue; }

    missing++;
    const localPdf = getLocalPdf(slug);
    console.log(`  ✗ R2 manquant: ${slug}`);

    if (!localPdf) {
      console.log(`    ✗ PDF local introuvable`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`    [DRY] Upload depuis ${path.basename(localPdf)}`);
      fixed++;
      continue;
    }

    try {
      const buf = readFileSync(localPdf);
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: r2Key, Body: buf, ContentType: 'application/pdf',
      }));
      console.log(`    ✓ Upload R2 OK`);
      fixed++;
    } catch (e) {
      console.log(`    ✗ Upload R2: ${e.message}`);
    }

    if ((i + 1) % 100 === 0) console.log(`  [${i+1}/${allSlugs.length}] OK=${ok} missing=${missing}`);
  }

  console.log(`  Résultat : ${ok} présents | ${missing} manquants | ${fixed} corrigés`);
  return { ok, missing, fixed };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const audit  = JSON.parse(readFileSync(AUDIT_FILE, 'utf-8'));

const allSlugs = [
  ...audit.ok,
  ...audit.slug_error.map(e => e.slug),
  ...audit.pages_error.map(e => e.slug),
  ...audit.desc_error.map(e => e.slug),
  ...audit.image_pdf.map(e => e.slug),
  ...audit.uncertain.map(e => e.slug),
  ...audit.no_pdf.map(e => e.slug),
  ...audit.preview_regen.map(e => e.slug),
].filter((v, i, a) => a.indexOf(v) === i);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  DELL PHASE 3 — CORRECTIONS${DRY_RUN ? ' [DRY-RUN]' : ''}`);
console.log('══════════════════════════════════════════════════════════════════');
console.log(`  Slugs total       : ${allSlugs.length}`);
console.log(`  Erreurs slug      : ${audit.slug_error.length}`);
console.log(`  Erreurs pages     : ${audit.pages_error.length}`);
console.log(`  Erreurs desc      : ${audit.desc_error.length}`);
console.log('══════════════════════════════════════════════════════════════════');

const r1 = await uploadPreviews();
const r2r = await fixSlugs(audit.slug_error);
const r3 = await fixPages(audit.pages_error);
const r4 = await fixDescriptions(audit.desc_error);
const r5 = await checkAndFixR2(allSlugs);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  BILAN FINAL');
console.log('══════════════════════════════════════════════════════════════════');
console.log(`  Previews uploadées : ${r1.ok}`);
console.log(`  Slugs corrigés     : ${r2r.ok}`);
console.log(`  Pages corrigées    : ${r3.ok}`);
console.log(`  Descriptions MAJ   : ${r4.ok}`);
console.log(`  R2 PDFs vérifiés   : ${r5.ok} OK | ${r5.missing} manquants | ${r5.fixed} corrigés`);
console.log('══════════════════════════════════════════════════════════════════\n');
