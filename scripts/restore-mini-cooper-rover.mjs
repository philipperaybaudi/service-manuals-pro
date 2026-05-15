import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const SLUG        = 'mini-cooper-rover-manuel-du-conducteur';
const PDF_PATH    = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\MINI COOPER\\Mini-Austin-Rover notice.pdf';
const JPG_PATH    = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\MINI COOPER\\Mini-Austin-Rover notice.jpg';
const AUTO_CAT_ID = 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd';
const ROVER_LOGO  = 'https://ylsbqehotapcprfinsnu.supabase.co/storage/v1/object/public/logos/brands/rover.jpg';

// 1. Créer la marque MINI COOPER ROVER
console.log('1. Création marque MINI COOPER ROVER...');
const { data: brand, error: brandErr } = await s.from('brands')
  .insert({ slug: 'mini-cooper-rover', name: 'MINI COOPER ROVER', logo_url: ROVER_LOGO })
  .select().single();
if (brandErr) { console.error('✗', brandErr.message); process.exit(1); }
console.log(`  ✓ Marque créée (id: ${brand.id})`);

// 2. Upload PDF vers R2
console.log('2. Upload PDF vers R2...');
const pdfBuffer = fs.readFileSync(PDF_PATH);
await r2.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: `documents/${SLUG}.pdf`,
  Body: pdfBuffer,
  ContentType: 'application/pdf',
}));
console.log(`  ✓ PDF uploadé: documents/${SLUG}.pdf`);

// 3. Upload preview JPG vers Supabase Storage
console.log('3. Upload preview...');
const jpgBuffer = fs.readFileSync(JPG_PATH);
const { error: previewErr } = await s.storage.from('logos')
  .upload(`previews/${SLUG}.jpg`, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
if (previewErr) { console.error('✗ preview:', previewErr.message); process.exit(1); }
const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${SLUG}.jpg`;
console.log(`  ✓ Preview uploadée`);

// 4. Créer le document en base
console.log('4. Création document en base...');
const { error: docErr } = await s.from('documents').insert({
  slug: SLUG,
  title: 'Austin Rover Mini - Owner\'s Manual',
  title_fr: 'Austin Rover Mini - Manuel du Conducteur',
  description_fr: 'Manuel du conducteur complet pour la Mini Austin Rover. Publication AKM 4738, 7ème édition, © Austin Rover Group Limited 1986. Contient les données d\'entretien, spécifications techniques (huile moteur 10W/30-10W/40, réservoir 34 litres) et pressions de gonflage.',
  description: 'Complete owner\'s manual for the Austin Rover Mini. Publication AKM 4738, 7th edition, © Austin Rover Group Limited 1986. Covers maintenance data, technical specifications (engine oil 10W/30-10W/40, 34-litre tank) and tyre pressures.',
  brand_id: brand.id,
  category_id: AUTO_CAT_ID,
  file_path: `documents/${SLUG}.pdf`,
  preview_url: previewUrl,
  price: 1000,
  active: true,
});
if (docErr) { console.error('✗ doc:', docErr.message); process.exit(1); }
console.log(`  ✓ Document créé`);

console.log('\n✓ Restauration terminée !');
