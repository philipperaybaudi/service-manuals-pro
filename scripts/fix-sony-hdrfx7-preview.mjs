/**
 * Correction preview_url Sony HDR-FX7 (Lot 2)
 * - Re-upload des 2 images vers le bon bucket (logos/previews/)
 * - Update des preview_url en base
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const IMG_FILE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégorie\\Photographie\\Sony\\Sony HDR-FX7.jpg';
const BUCKET   = 'logos';

const DOCS = [
  { slug: 'sony-hdr-fx7-user-manual-french-italian', id: '8128f33e-0dbb-4576-b286-d381b28c0769' },
  { slug: 'sony-hdr-fx7-user-manual-english',        id: '3a92e373-7092-4861-97a3-872d21687573' },
];

const imgBuffer = fs.readFileSync(IMG_FILE);

for (const doc of DOCS) {
  const storagePath = `previews/${doc.slug}.jpg`;

  // 1. Upload vers logos/previews/
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (upErr) { console.error(`Upload error (${doc.slug}):`, upErr.message); process.exit(1); }

  // 2. Récupérer l'URL publique
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log(`  → Uploadé : ${publicUrl}`);

  // 3. Mettre à jour la preview_url en base
  const { error: updErr } = await supabase
    .from('documents')
    .update({ preview_url: publicUrl })
    .eq('id', doc.id);
  if (updErr) { console.error(`Update error (${doc.slug}):`, updErr.message); process.exit(1); }

  console.log(`  ✓ ${doc.slug} mis à jour`);
}

console.log('\n✓ Correction terminée');
