import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG     = 'lada-lada-niva-vaz-21213-service-manual';
const JPG_PATH = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\LADA\\Lada-Niva_1977 manuel.jpg';

// 1. Supprimer l'ancienne preview pour forcer le rafraîchissement
console.log('1. Suppression ancienne preview...');
await s.storage.from('logos').remove([`previews/${SLUG}.jpg`]);
console.log('  ✓ Ancienne preview supprimée');

// 2. Upload vers Supabase Storage
console.log('2. Upload nouvelle preview...');
const jpgBuffer = fs.readFileSync(JPG_PATH);
const { error: uploadErr } = await s.storage.from('logos')
  .upload(`previews/${SLUG}.jpg`, jpgBuffer, { contentType: 'image/jpeg' });
if (uploadErr) { console.error('  ✗', uploadErr.message); process.exit(1); }
const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${SLUG}.jpg?t=${Date.now()}`;
console.log('  ✓ Preview uploadée');

// 3. Mettre à jour la fiche en base
console.log('3. Mise à jour en base...');
const { error: updateErr } = await s.from('documents')
  .update({ preview_url: previewUrl })
  .eq('slug', SLUG);
if (updateErr) { console.error('  ✗', updateErr.message); process.exit(1); }
console.log('  ✓ Fiche mise à jour');

console.log('\n✓ Terminé !');
console.log(`  Preview : ${previewUrl}`);
