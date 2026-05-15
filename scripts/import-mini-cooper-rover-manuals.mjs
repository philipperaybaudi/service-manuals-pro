import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const BRAND_ID   = 'd5bdd906-4796-4fbd-bcd1-fd7cc004c385'; // MINI COOPER ROVER
const AUTO_CAT   = 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd';
const SOURCE_DIR = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\MINI COOPER';
const DOCS_DIR   = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\MINI COOPER ROVER';

const docs = [
  {
    file: 'Mini_Repair_Manual_76-89 Service Manual FR $30.pdf',
    slug: 'mini-cooper-rover-mini-manuel-de-reparation-akm6348',
    title: 'Rover Mini - Repair Manual AKM 6348',
    title_fr: 'Rover Mini - Manuel de Réparation AKM 6348',
    description: 'Complete repair manual for the Rover Mini (1976-1989). Publication AKM 6348. Covers engine, gearbox, suspension, braking system, bodywork and all mechanical components.',
    description_fr: 'Manuel de réparation complet pour la Rover Mini (1976-1989). Publication AKM 6348. Couvre le moteur, la boîte de vitesses, la suspension, le système de freinage, la carrosserie et tous les organes mécaniques.',
    price: 3000,
  },
  {
    file: 'Mini_Repair_Manual_76-89 Service Manual GB $30.pdf',
    slug: 'mini-cooper-rover-mini-repair-manual-akm6353',
    title: 'Rover Mini - Repair Manual AKM 6353',
    title_fr: 'Rover Mini - Manuel de Réparation AKM 6353',
    description: 'Complete repair manual for the Rover Mini (1976-1989). Publication AKM 6353. Covers engine, gearbox, suspension, braking system, bodywork and all mechanical components.',
    description_fr: 'Manuel de réparation complet pour la Rover Mini (1976-1989). Publication AKM 6353. Couvre le moteur, la boîte de vitesses, la suspension, le système de freinage, la carrosserie et tous les organes mécaniques.',
    price: 3000,
  },
];

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

for (const doc of docs) {
  console.log(`\n=== ${doc.slug} ===`);
  const pdfSrc = path.join(SOURCE_DIR, doc.file);

  // 1. Générer preview page 1 via Python/fitz
  const previewPath = path.join('C:\\Users\\adm\\Desktop', `${doc.slug}-preview.jpg`);
  execSync(`python -c "import fitz; doc=fitz.open(r'${pdfSrc}'); pix=doc[0].get_pixmap(matrix=fitz.Matrix(2,2)); pix.save(r'${previewPath}')"`, { stdio: 'inherit' });
  console.log('  ✓ Preview générée');

  // 2. Upload preview Supabase Storage
  const jpgBuffer = fs.readFileSync(previewPath);
  const { error: previewErr } = await s.storage.from('logos')
    .upload(`previews/${doc.slug}.jpg`, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (previewErr) { console.error('  ✗ preview:', previewErr.message); continue; }
  const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${doc.slug}.jpg`;
  console.log('  ✓ Preview uploadée');

  // 3. Upload PDF vers R2
  const pdfBuffer = fs.readFileSync(pdfSrc);
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `documents/${doc.slug}.pdf`,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));
  console.log('  ✓ PDF uploadé vers R2');

  // 4. Créer document en base
  const { error: docErr } = await s.from('documents').insert({
    slug: doc.slug,
    title: doc.title,
    title_fr: doc.title_fr,
    description: doc.description,
    description_fr: doc.description_fr,
    brand_id: BRAND_ID,
    category_id: AUTO_CAT,
    file_path: `documents/${doc.slug}.pdf`,
    preview_url: previewUrl,
    price: doc.price,
    page_count: doc.slug.includes('akm6348') ? 329 : 344,
    active: true,
  });
  if (docErr) { console.error('  ✗ doc:', docErr.message); continue; }
  console.log('  ✓ Document créé en base');

  // 5. Déplacer PDF vers DOCS EN LIGNE
  fs.copyFileSync(pdfSrc, path.join(DOCS_DIR, doc.file));
  fs.unlinkSync(pdfSrc);
  console.log('  ✓ PDF déplacé vers DOCS EN LIGNE');
}

console.log('\n✓ Import terminé !');
