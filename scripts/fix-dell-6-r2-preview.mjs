/**
 * fix-dell-6-r2-preview.mjs
 * Renomme les fichiers R2 et previews pour les 6 docs DELL déjà corrigés en DB.
 * (La DB a été mise à jour par fix-dell-6-conflicts.mjs — uniquement R2 + preview à faire)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

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

// Mapping old_slug → new_slug (résultat du dry-run précédent)
const RENAMES = [
  {
    old_slug:  'dell-alienware-17-r4-service-manual-ko',
    new_slug:  'dell-alienware-17-r4-service-manual-de-4',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\alienware-17-r4_938925.pdf',
  },
  // Cas 2 : pas de renommage R2/preview (slug inchangé)
  {
    old_slug:  'dell-dell-g7-15-service-manual-ko-2',
    new_slug:  'dell-dell-g7-15-service-manual-zh',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\g7-15-7588_1571625.pdf',
  },
  {
    old_slug:  'dell-dell-g7-7790-service-manual-es',
    new_slug:  'dell-dell-g7-7790-service-manual-it',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\g7-17-7790_1571811.pdf',
  },
  {
    old_slug:  'dell-dell-inspiron-15-5567-service-manual-et',
    new_slug:  'dell-dell-inspiron-15-5567-service-manual-vi',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\inspiron-15-5567_943968.pdf',
  },
  {
    old_slug:  'dell-dell-inspiron-15-5576-gaming-service-manual-vi-2',
    new_slug:  'dell-dell-inspiron-15-5576-gaming-service-manual-ko',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\inspiron-15-5576-gaming_944235.pdf',
  },
];

async function renameR2(oldSlug, newSlug, localPdf) {
  const oldKey = `documents/${oldSlug}.pdf`;
  const newKey = `documents/${newSlug}.pdf`;
  try {
    await r2.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${oldKey}`,
      Key: newKey,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
    console.log(`  ✓ R2 : ${oldKey} → ${newKey}`);
    return true;
  } catch (e) {
    // Fallback : upload depuis local
    if (localPdf && existsSync(localPdf)) {
      console.log(`  ⚠ R2 source absente (${e.message}) — upload local...`);
      try {
        const buf = readFileSync(localPdf);
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET, Key: newKey, Body: buf, ContentType: 'application/pdf',
        }));
        console.log(`  ✓ R2 uploadé depuis local : ${newKey}`);
        return true;
      } catch (e2) {
        console.log(`  ✗ Upload local échoué : ${e2.message}`);
        return false;
      }
    }
    console.log(`  ✗ R2 erreur : ${e.message}`);
    return false;
  }
}

async function renamePreview(oldSlug, newSlug) {
  const oldPath = `previews/${oldSlug}.jpg`;
  const newPath = `previews/${newSlug}.jpg`;
  try {
    const { data: dl, error: dlErr } = await supabase.storage.from('logos').download(oldPath);
    if (dlErr) throw dlErr;
    const buf = Buffer.from(await dl.arrayBuffer());
    const { error: upErr } = await supabase.storage.from('logos').upload(newPath, buf, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (upErr) throw upErr;
    await supabase.storage.from('logos').remove([oldPath]);
    const newUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${newPath}`;
    // Mettre à jour preview_url en DB
    await supabase.from('documents').update({ preview_url: newUrl }).eq('slug', newSlug);
    console.log(`  ✓ Preview : ${oldPath} → ${newPath}`);
    return true;
  } catch (e) {
    console.log(`  ⚠ Preview : ${e.message}`);
    return false;
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  FIX R2 + PREVIEW — 5 docs DELL');
console.log('══════════════════════════════════════════════════════════════\n');

let ok = 0, warnings = 0;

for (const { old_slug, new_slug, local_pdf } of RENAMES) {
  console.log(`\n📄 ${old_slug} → ${new_slug}`);
  const r2ok      = await renameR2(old_slug, new_slug, local_pdf);
  const previewOk = await renamePreview(old_slug, new_slug);
  if (r2ok && previewOk) ok++;
  else warnings++;
}

console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`  Terminé — ${ok} complets | ${warnings} avec avertissements`);
console.log(`══════════════════════════════════════════════════════════════\n`);
