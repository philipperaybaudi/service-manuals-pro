/**
 * Corrige les previews manquantes ou suspectes détectées par audit-previews.mjs
 * Lit scripts/audit-previews-report.json
 * Pour chaque doc : télécharge le PDF depuis R2 → extrait page 1 → upload Storage → update DB
 * Usage : node scripts/fix-previews-batch.mjs [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const REPORT_PATH    = 'scripts/audit-previews-report.json';
const STORAGE_BUCKET = 'logos';
const DRY_RUN        = process.argv.includes('--dry-run');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

// Mots-clés schéma → recadrer au quart supérieur gauche (protection contenu)
const SCHEMA_KEYWORDS = /schema|scheme|schematic|wiring/i;

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderFirstPage(pdfBuffer, slug) {
  const isSchema = SCHEMA_KEYWORDS.test(slug);
  const data = new Uint8Array(pdfBuffer);
  const doc  = await pdfjs.getDocument({
    data, canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
  }).promise;
  const page  = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp    = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;

  if (isSchema) {
    // Recadrer au quart supérieur gauche (×2 zoom, moitié largeur × moitié hauteur)
    const halfW = Math.floor(vp.width / 2);
    const halfH = Math.floor(vp.height / 2);
    const cropped = new NodeCanvasFactory().create(halfW, halfH);
    cropped.context.drawImage(cc.canvas, 0, 0, halfW * 2, halfH * 2, 0, 0, halfW, halfH);
    return cropped.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  }

  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function downloadFromR2(slug) {
  const obj = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `documents/${slug}.pdf`,
  }));
  return streamToBuffer(obj.Body);
}

// ─── Main ────────────────────────────────────────────────────────────────────
if (!fs.existsSync(REPORT_PATH)) {
  console.error(`Rapport introuvable : ${REPORT_PATH}`);
  console.error('Lance d\'abord : node scripts/audit-previews.mjs');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const todo   = [...(report.suspects || []), ...(report.no_file || [])];

console.log(`\n${'═'.repeat(60)}`);
console.log(`Fix previews — ${todo.length} docs à traiter`);
console.log(`Mode : ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
console.log(`${'═'.repeat(60)}\n`);

let ok = 0, errors = 0;

for (const doc of todo) {
  console.log(`\n📄 ${doc.slug}`);
  console.log(`   ${doc.title}`);

  if (DRY_RUN) { console.log('   [DRY-RUN] skip'); ok++; continue; }

  // 1. Télécharger PDF depuis R2
  let pdfBuffer;
  try {
    pdfBuffer = await downloadFromR2(doc.slug);
    console.log(`   ✓ PDF téléchargé (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`   ✗ R2 : ${err.message}`);
    errors++;
    continue;
  }

  // 2. Rendre la page 1
  let jpgBuffer;
  try {
    jpgBuffer = await renderFirstPage(pdfBuffer, doc.slug);
    console.log(`   ✓ Preview générée (${(jpgBuffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`   ✗ Render : ${err.message}`);
    errors++;
    continue;
  }

  // 3. Supprimer ancienne preview si présente
  await supabase.storage.from(STORAGE_BUCKET).remove([`previews/${doc.slug}.jpg`]);

  // 4. Uploader nouvelle preview
  const storagePath = `previews/${doc.slug}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg' });
  if (upErr) {
    console.error(`   ✗ Storage : ${upErr.message}`);
    errors++;
    continue;
  }
  console.log('   ✓ Preview uploadée');

  // 5. Mettre à jour preview_url en base (avec cache-buster)
  const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${doc.slug}.jpg?t=${Date.now()}`;
  const { error: dbErr } = await supabase.from('documents')
    .update({ preview_url: previewUrl })
    .eq('slug', doc.slug);
  if (dbErr) {
    console.error(`   ✗ DB : ${dbErr.message}`);
    errors++;
    continue;
  }
  console.log('   ✓ DB mis à jour');
  ok++;
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Terminé — OK: ${ok}  Erreurs: ${errors}  Total: ${todo.length}`);
console.log(`${'═'.repeat(60)}`);
