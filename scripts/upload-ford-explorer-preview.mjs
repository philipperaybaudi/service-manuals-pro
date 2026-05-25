import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SLUG = 'ford-ford-explorer-mountaineer-workshop-manual-1996-2001';
const JPG_PATH = `C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\FORD\\${SLUG}.jpg`;
const STORAGE_PATH = `previews/${SLUG}.jpg`;

console.log(`\nUpload preview Ford Explorer...`);
console.log(`  Source : ${JPG_PATH}`);
console.log(`  Dest   : logos/${STORAGE_PATH}\n`);

const file = readFileSync(JPG_PATH);

const { error } = await supabase.storage
  .from('logos')
  .upload(STORAGE_PATH, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });

if (error) {
  console.error('  ✗ Erreur upload :', error.message);
  process.exit(1);
}

console.log('  ✓ Preview uploadée avec succès');
console.log(`\n  URL : ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${STORAGE_PATH}\n`);
