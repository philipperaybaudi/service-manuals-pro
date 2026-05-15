/**
 * Upload manuel d'un fichier image comme preview d'un document
 * + mise à jour du champ preview_url en base Supabase
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BASE_SOURCE  = "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Photographie\\COLLECTION";
const BASE_DEST    = "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Photographie\\COLLECTION";

const DOCS = [
  'collection-airplane-photography-1920',
  'collection-american-photography-vol-16-1922',
];

for (const SLUG of DOCS) {
  const IMAGE_PATH   = `${BASE_SOURCE}\\${SLUG}.jpg`;
  const DEST_PATH    = `${BASE_DEST}\\${SLUG}.jpg`;
  const STORAGE_PATH = `previews/${SLUG}.jpg`;

  console.log(`\nTraitement : ${SLUG}`);

  // 1. Upload dans Supabase Storage
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(STORAGE_PATH, imageBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) { console.error('Erreur upload :', uploadErr.message); process.exit(1); }
  console.log(`✓ Image uploadée : logos/${STORAGE_PATH}`);

  // 2. Récupérer l'URL publique
  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(STORAGE_PATH);
  console.log(`  URL publique : ${publicUrl}`);

  // 3. Mettre à jour preview_url en base
  const { error: updateErr } = await supabase
    .from('documents')
    .update({ preview_url: publicUrl })
    .eq('slug', SLUG);

  if (updateErr) { console.error('Erreur update DB :', updateErr.message); process.exit(1); }
  console.log(`✓ preview_url mis à jour en base`);

  // 4. Déplacer l'image vers DOCS EN LIGNE
  const destDir = path.dirname(DEST_PATH);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.renameSync(IMAGE_PATH, DEST_PATH);
  console.log(`✓ Image déplacée → DOCS EN LIGNE`);
}
