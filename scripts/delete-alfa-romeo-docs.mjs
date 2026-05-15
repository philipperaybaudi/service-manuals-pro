/**
 * Supprime définitivement 7 fiches ALFA-ROMEO :
 *   - Enregistrement Supabase (documents)
 *   - PDF dans R2 (documents/{slug}.pdf)
 *   - Preview dans Supabase Storage (logos/previews/{slug}.jpg)
 *   - PDF physique dans DOCS EN LIGNE
 *   - Entrée(s) dans le rapport JSON
 *
 * Usage : node scripts/delete-alfa-romeo-docs.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\ALFA-ROMEO';
const REPORT_PATH   = path.join('scripts', 'docs-a-classer-report-automobile.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const TO_DELETE = [
  {
    filename: 'EAV819.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-1-9-jtd-16v-electrical-schemas-and-component-locations',
  },
  {
    filename: 'Ecran Alfa Romeo.pdf',
    slug:     'alfa-romeo-alfa-romeo-145-146-156-technical-documentation',
  },
  {
    filename: 'IMP COH.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-habitacle-confort-ventilation-chauffage-climatisation',
  },
  {
    filename: 'IMP INF.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-instrument-cluster-wiring-diagrams',
  },
  {
    filename: 'IMP SEC.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-security-systems-airbags-alarm',
  },
  {
    filename: 'IMP.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-1-9-jtd-16v-electrical-systems-installation-guide',
  },
  {
    filename: 'SCH.pdf',
    slug:     'alfa-romeo-alfa-romeo-156-1-9-jtd-16v-electrical-schemas',
  },
];

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
let totalOk = 0;

for (const { filename, slug } of TO_DELETE) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Suppression : ${filename}`);
  console.log(`  slug : ${slug}`);

  // 1. Supabase DB
  const { error: dbErr } = await supabase
    .from('documents')
    .delete()
    .eq('slug', slug);
  if (dbErr) console.log(`  ✗ DB : ${dbErr.message}`);
  else       console.log(`  ✓ Enregistrement Supabase supprimé`);

  // 2. R2 — PDF
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key:    `documents/${slug}.pdf`,
    }));
    console.log(`  ✓ R2 PDF supprimé`);
  } catch (e) {
    console.log(`  ✗ R2 PDF : ${e.message}`);
  }

  // 3. Supabase Storage — preview
  const { error: previewErr } = await supabase.storage
    .from('logos')
    .remove([`previews/${slug}.jpg`]);
  if (previewErr) console.log(`  ✗ Preview storage : ${previewErr.message}`);
  else            console.log(`  ✓ Preview Supabase Storage supprimée`);

  // 4. Fichier physique dans DOCS EN LIGNE
  const pdfPath = path.join(DOCS_EN_LIGNE, filename);
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
    console.log(`  ✓ PDF physique supprimé (DOCS EN LIGNE)`);
  } else {
    console.log(`  ⚠ PDF physique introuvable (déjà supprimé ?)`);
  }

  // 5. Preview locale temp_previews (nettoyage)
  const localPreview = path.join('scripts', 'temp_previews', `${slug}.jpg`);
  if (fs.existsSync(localPreview)) {
    fs.unlinkSync(localPreview);
    console.log(`  ✓ Preview locale supprimée`);
  }

  // 6. Rapport JSON — retirer toutes les entrées avec ce slug
  const before = report.docs.length;
  report.docs  = report.docs.filter(d => d.slug !== slug);
  const removed = before - report.docs.length;
  console.log(`  ✓ Rapport : ${removed} entrée(s) retirée(s)`);

  totalOk++;
}

// Sauvegarder le rapport mis à jour
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n${'═'.repeat(60)}`);
console.log(`✓ Terminé — ${totalOk}/${TO_DELETE.length} fiches supprimées`);
console.log(`✓ Rapport automobile mis à jour`);
