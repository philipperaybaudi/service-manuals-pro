/**
 * fix-dell-true-errors.mjs
 * Lit dell-mismatches-analysis.json → liste true_error
 * Pour chaque erreur : renomme slug DB + R2 + preview Supabase + preview_url DB
 *
 * Usage :
 *   node scripts/fix-dell-true-errors.mjs --dry-run   (simulation)
 *   node scripts/fix-dell-true-errors.mjs             (réel)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = process.argv.includes('--dry-run');
const inputArg  = process.argv.find(a => a.startsWith('--input='));
const INPUT_FILE = inputArg
  ? inputArg.split('=')[1]
  : path.join(__dirname, 'dell-mismatches-analysis.json');

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

// ── Calcul du slug de base (supprime suffixe langue) ────────────────────────
// Gère : -de / -vi-2 / -ca-ca / -sl-2 / -chinese-de
function computeBase(oldSlug) {
  // Supprime trailing -XX(-XX)?(-N)? où XX = 2-3 lettres minuscules
  return oldSlug.replace(/-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$/, '');
}

// ── Vérification existence slug ─────────────────────────────────────────────
async function slugExists(slug) {
  const { data } = await supabase
    .from('documents')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !!data;
}

// ── Trouve un slug libre ─────────────────────────────────────────────────────
async function findFreeSlug(base, lang) {
  const candidates = [
    `${base}-${lang}`,
    `${base}-${lang}-2`,
    `${base}-${lang}-3`,
    `${base}-${lang}-4`,
    `${base}-${lang}-5`,
  ];
  for (const s of candidates) {
    if (!(await slugExists(s))) return s;
  }
  throw new Error(`Impossible de trouver un slug libre pour ${base}-${lang}`);
}

// ── Renommage R2 ─────────────────────────────────────────────────────────────
async function renameR2(oldSlug, newSlug, localPdf) {
  const oldKey = `documents/${oldSlug}.pdf`;
  const newKey = `documents/${newSlug}.pdf`;
  if (DRY_RUN) {
    console.log(`    [DRY] R2 : ${oldKey} → ${newKey}`);
    return true;
  }
  try {
    await r2.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${oldKey}`,
      Key: newKey,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
    console.log(`    ✓ R2 : ${oldKey} → ${newKey}`);
    return true;
  } catch (e) {
    // Fallback : upload depuis fichier local
    if (localPdf && existsSync(localPdf)) {
      console.log(`    ⚠ R2 source absente (${e.message}) — upload local...`);
      try {
        const buf = readFileSync(localPdf);
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET, Key: newKey, Body: buf, ContentType: 'application/pdf',
        }));
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
        } catch {}
        console.log(`    ✓ R2 upload local : ${newKey}`);
        return true;
      } catch (e2) {
        console.log(`    ✗ R2 upload local échoué : ${e2.message}`);
        return false;
      }
    }
    console.log(`    ✗ R2 : ${e.message}`);
    return false;
  }
}

// ── Renommage preview Supabase Storage ───────────────────────────────────────
async function renamePreview(oldSlug, newSlug) {
  const oldPath = `previews/${oldSlug}.jpg`;
  const newPath = `previews/${newSlug}.jpg`;
  if (DRY_RUN) {
    console.log(`    [DRY] Preview : ${oldPath} → ${newPath}`);
    return true;
  }
  try {
    const { data: dl, error: dlErr } = await supabase.storage.from('logos').download(oldPath);
    if (dlErr) throw dlErr;
    const buf = Buffer.from(await dl.arrayBuffer());
    const { error: upErr } = await supabase.storage.from('logos').upload(newPath, buf, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (upErr) throw upErr;
    await supabase.storage.from('logos').remove([oldPath]);
    console.log(`    ✓ Preview : ${oldPath} → ${newPath}`);
    return true;
  } catch (e) {
    console.log(`    ⚠ Preview : ${e.message}`);
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const analysisFile = INPUT_FILE;
const analysis     = JSON.parse(readFileSync(analysisFile, 'utf-8'));
// On ne corrige que les détections définitives (pas "probable")
const trueErrors   = (analysis.true_error || []).filter(e => e.confidence !== 'probable');

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  FIX DELL TRUE ERRORS — ${trueErrors.length} corrections${DRY_RUN ? ' [DRY-RUN]' : ''}`);
console.log('══════════════════════════════════════════════════════════════\n');

let ok = 0, warns = 0, errs = 0;

for (const entry of trueErrors) {
  const oldSlug  = entry.slug;
  const newLang  = entry.char_detected;
  const localPdf = entry.pdf_path || null;
  const base     = computeBase(oldSlug);

  let newSlug;
  try {
    newSlug = await findFreeSlug(base, newLang);
  } catch (e) {
    console.log(`  ✗ ${oldSlug} : ${e.message}`);
    errs++;
    continue;
  }

  console.log(`\n📄 ${oldSlug}`);
  console.log(`   → ${newSlug}`);
  console.log(`   (${entry.reason})`);

  if (DRY_RUN) {
    console.log(`    [DRY] DB : slug ${oldSlug} → ${newSlug}`);
    await renameR2(oldSlug, newSlug, localPdf);
    await renamePreview(oldSlug, newSlug);
    ok++;
    continue;
  }

  // Vérifier que le slug existe encore en DB (peut avoir été déjà corrigé)
  if (!(await slugExists(oldSlug))) {
    console.log(`    ⚠ Slug absent en DB (déjà corrigé) — ignoré`);
    ok++;
    continue;
  }

  // 1. Mettre à jour slug en DB
  const { error: dbErr } = await supabase
    .from('documents')
    .update({ slug: newSlug })
    .eq('slug', oldSlug);

  if (dbErr) {
    console.log(`    ✗ DB : ${dbErr.message}`);
    errs++;
    continue;
  }
  console.log(`    ✓ DB : slug mis à jour`);

  // 2. Renommer sur R2
  const r2ok = await renameR2(oldSlug, newSlug, localPdf);

  // 3. Renommer preview dans Supabase Storage
  const previewOk = await renamePreview(oldSlug, newSlug);

  // 4. Mettre à jour preview_url en DB
  if (previewOk) {
    const newUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${newSlug}.jpg`;
    await supabase.from('documents').update({ preview_url: newUrl }).eq('slug', newSlug);
    console.log(`    ✓ preview_url mis à jour`);
  }

  if (r2ok) ok++;
  else warns++;
}

console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`  Terminé — ${ok} OK | ${warns} avert. | ${errs} erreurs`);
console.log(`══════════════════════════════════════════════════════════════\n`);
