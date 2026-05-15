/**
 * Met à jour les illustrations des 3 docs NOIROT / AIRELEC / ACOVA
 * - JPG FR → docs du site français (locale fr)
 * - JPG EN → docs du site anglais (locale en)
 *
 * Usage : node scripts/fix-preview-noirot-airelec-acova-v2.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const DRY_RUN  = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SRC_DIR  = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/Électroménager/NOIROT';
const IMG_FR   = path.join(SRC_DIR, 'Dépannage-des-thermostats-FR.jpg');
const IMG_EN   = path.join(SRC_DIR, 'Dépannage-des-thermostats-GB.jpg');

const BRANDS   = ['noirot', 'airelec', 'acova'];

// ─── 1. Trouver tous les docs concernés ───────────────────────────────────────
const { data: docs, error } = await supabase
  .from('documents')
  .select('id, slug, title, title_fr, preview_url')
  .or(BRANDS.map(b => `slug.ilike.%${b}%`).join(','));

if (error) { console.error('❌', error.message); process.exit(1); }

console.log(`\n${docs.length} docs trouvés :\n`);
docs.forEach(d => console.log(`  ${d.slug}\n    title   : ${d.title}\n    title_fr: ${d.title_fr || '(vide)'}`));

if (DRY_RUN) { console.log('\n[DRY-RUN] Fin.'); process.exit(0); }

// ─── 2. Uploader les deux images ──────────────────────────────────────────────
async function uploadImage(localPath, storageName) {
  const buffer      = fs.readFileSync(localPath);
  const storagePath = `previews/${storageName}`;

  const { error: upErr } = await supabase.storage
    .from('logos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (upErr) throw new Error(`Upload ${storageName} : ${upErr.message}`);

  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
  return urlData.publicUrl;
}

console.log('\nUpload des images...');
const urlFr = await uploadImage(IMG_FR, 'depannage-thermostats-fr.jpg');
const urlEn = await uploadImage(IMG_EN, 'depannage-thermostats-en.jpg');
console.log(`  FR → ${urlFr}`);
console.log(`  EN → ${urlEn}`);

// ─── 3. Mettre à jour chaque doc ─────────────────────────────────────────────
console.log('\nMise à jour des docs...');
for (const doc of docs) {
  // preview_url    = image FR (site français, locale fr)
  // preview_url_en = image EN (site anglais, locale en)
  const { error: updErr } = await supabase
    .from('documents')
    .update({ preview_url: urlFr, preview_url_en: urlEn })
    .eq('id', doc.id);

  if (updErr) {
    console.error(`  ❌ ${doc.slug} : ${updErr.message}`);
  } else {
    console.log(`  ✅ ${doc.slug}  [FR + EN]`);
  }
}

console.log('\n=== Terminé ===');
