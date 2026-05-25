/**
 * upload-smart-previews.mjs
 * ==========================
 * Étape 2 : uploade les JPGs du dossier temp_smart_previews vers Supabase Storage.
 * Le nom de fichier = {slug}.jpg → uploadé dans logos/previews/{slug}.jpg (upsert).
 *
 * Usage :
 *   node scripts/upload-smart-previews.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import fs   from 'fs';
import path from 'path';

const JPG_DIR        = path.join('scripts', 'temp_smart_previews');
const STORAGE_BUCKET = 'logos';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!fs.existsSync(JPG_DIR)) {
  console.error(`Dossier introuvable : ${JPG_DIR}`);
  console.error('Lance d\'abord : python scripts/generate-acer-jpgs.py');
  process.exit(1);
}

const files = fs.readdirSync(JPG_DIR).filter(f => f.endsWith('.jpg'));
console.log(`JPGs trouvés : ${files.length}`);
if (DRY_RUN) console.log('MODE DRY-RUN — aucun upload');
console.log();

let ok = 0, errors = 0;

for (let i = 0; i < files.length; i++) {
  const filename    = files[i];
  const slug        = filename.replace(/\.jpg$/, '');
  const storagePath = `previews/${slug}.jpg`;
  const num         = `[${i + 1}/${files.length}]`;

  if (DRY_RUN) {
    console.log(`  ${num} DRY  ${storagePath}`);
    ok++;
    continue;
  }

  try {
    const jpgBuffer = fs.readFileSync(path.join(JPG_DIR, filename));
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(error.message);
    console.log(`  ${num} ✓ ${storagePath}`);
    ok++;
  } catch (err) {
    console.log(`  ${num} ✗ ERREUR ${slug} : ${err.message}`);
    errors++;
  }
}

console.log();
console.log(`Terminé — ${ok} uploadés | ${errors} erreurs`);
