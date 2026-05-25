/**
 * apply-dell-corrections.mjs
 * ==========================
 * Applique les corrections de langue pour les docs DELL importés :
 * - Slug changé  → renomme PDF dans R2 + preview dans Supabase + update DB
 * - Desc seule   → update descriptions en DB uniquement
 *
 * Usage :
 *   node scripts/apply-dell-corrections.mjs [--dry-run]
 */

import { readFileSync, createReadStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN        = process.argv.includes('--dry-run');
const CORRECTIONS_PATH = join(__dirname, 'corrections-dell.json');
const R2_BUCKET      = process.env.R2_BUCKET_NAME || 'service-manuals-documents';
const STORAGE_BUCKET = 'logos';

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function renameR2(oldSlug, newSlug, localPdf) {
  const oldKey = `documents/${oldSlug}.pdf`;
  const newKey = `documents/${newSlug}.pdf`;

  try {
    // Tentative copie R2 → R2
    await r2.send(new CopyObjectCommand({
      Bucket:     R2_BUCKET,
      CopySource: `${R2_BUCKET}/${oldKey}`,
      Key:        newKey,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
  } catch (err) {
    if (err.Code === 'NoSuchKey' || err.message?.includes('does not exist') || err.$metadata?.httpStatusCode === 404) {
      // Fallback : upload depuis le disque local
      if (!localPdf || !existsSync(localPdf)) {
        throw new Error(`R2 source manquante et fichier local introuvable : ${localPdf}`);
      }
      const fileStream = createReadStream(localPdf);
      await r2.send(new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         newKey,
        Body:        fileStream,
        ContentType: 'application/pdf',
      }));
      // Pas de suppression de l'ancien (il n'existe pas)
    } else {
      throw err;
    }
  }
}

async function renameSupabasePreview(oldSlug, newSlug) {
  const oldPath = `previews/${oldSlug}.jpg`;
  const newPath = `previews/${newSlug}.jpg`;

  // Télécharger l'ancien fichier
  const { data: fileData, error: dlErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(oldPath);

  if (dlErr || !fileData) {
    // Preview absente à l'ancien chemin — on continue sans bloquer
    // La preview sera régénérée via generate-dell-jpgs.py + upload
    return false;  // signale que la preview n'a pas pu être renommée
  }

  // Uploader sous le nouveau nom
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(newPath, fileData, { upsert: true, contentType: 'image/jpeg' });
  if (upErr) throw new Error(`Upload preview échoué : ${upErr.message}`);

  // Supprimer l'ancien
  await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const corrections = JSON.parse(readFileSync(CORRECTIONS_PATH, 'utf-8'));

console.log(`Corrections à appliquer : ${corrections.length}`);
if (DRY_RUN) console.log('MODE DRY-RUN\n');

let ok = 0, errors = 0;
const needsPreview = [];  // slugs dont la preview doit être régénérée

for (const [i, c] of corrections.entries()) {
  const { old_slug, new_slug, slug_changed, lang_en, new_desc_en, new_desc_fr, local_pdf } = c;

  // Vérifier si ce doc existe encore avec l'old_slug (skip si déjà traité)
  if (!DRY_RUN && slug_changed) {
    const { data: existing } = await supabase.from('documents').select('slug').eq('slug', old_slug).maybeSingle();
    if (!existing) {
      // Déjà traité (slug mis à jour lors d'un run précédent)
      ok++;
      continue;
    }
  }

  if (DRY_RUN) {
    const action = slug_changed
      ? `SLUG+DESC  ${old_slug}  →  ${new_slug}  [${lang_en}]`
      : `DESC SEUL  ${old_slug}  [${lang_en}]`;
    console.log(`  ${action}`);
    ok++;
    continue;
  }

  try {
    if (slug_changed) {
      // 1. Renommer dans R2 (avec fallback upload local si R2 source manquante)
      await renameR2(old_slug, new_slug, local_pdf);

      // 2. Renommer preview dans Supabase Storage (best-effort)
      const previewOk = await renameSupabasePreview(old_slug, new_slug);
      if (!previewOk) needsPreview.push({ new_slug, local_pdf });

      // 3. Mettre à jour la DB
      const { error } = await supabase.from('documents').update({
        slug:           new_slug,
        file_path:      `documents/${new_slug}.pdf`,
        preview_url:    `previews/${new_slug}.jpg`,
        description:    new_desc_en,
        description_fr: new_desc_fr,
      }).eq('slug', old_slug);

      if (error) throw new Error(error.message);

    } else {
      // Description seule
      const { error } = await supabase.from('documents').update({
        description:    new_desc_en,
        description_fr: new_desc_fr,
      }).eq('slug', old_slug);

      if (error) throw new Error(error.message);
    }

    ok++;

  } catch (err) {
    console.error(`  [ERREUR] ${old_slug} : ${err.message}`);
    errors++;
  }

  if ((i + 1) % 25 === 0) {
    console.log(`  ${i + 1}/${corrections.length} traités...`);
  }
}

console.log(`\nTerminé — ${ok} OK | ${errors} erreurs`);

if (!DRY_RUN && needsPreview.length > 0) {
  const needsPreviewPath = join(__dirname, 'dell-needs-preview.json');
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(needsPreviewPath, JSON.stringify(needsPreview, null, 2), 'utf-8');
    console.log(`\n⚠️  ${needsPreview.length} previews à régénérer → ${needsPreviewPath}`);
    console.log('   Étape suivante : python scripts/regenerate-dell-previews.py');
  });
}
