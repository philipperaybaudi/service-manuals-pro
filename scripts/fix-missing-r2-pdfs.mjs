/**
 * Cherche les PDFs manquants dans R2 parmi les docs du rapport d'audit
 * Stratégie : recherche dans DOCS EN LIGNE par mots-clés extraits du slug
 * Si trouvé : upload R2 + preview + update DB
 * Usage : node scripts/fix-missing-r2-pdfs.mjs [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const DOCS_EN_LIGNE  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';
const REPORT_PATH    = 'scripts/audit-previews-report.json';
const STORAGE_BUCKET = 'logos';
const DRY_RUN        = process.argv.includes('--dry-run');

const SCHEMA_KEYWORDS = /schema|scheme|schematic|wiring/i;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

// Mots vides à ignorer dans la recherche
const STOP_WORDS = new Set(['service','manual','user','repair','parts','list','guide',
  'schema','scheme','schematic','wiring','notice','fiche','cours','complet',
  'installation','notice','technique','electrique','electricite','elec','and','the','de',
  'du','le','la','les','un','une','pour','with']);

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderFirstPage(pdfBuffer, slug) {
  const isSchema = SCHEMA_KEYWORDS.test(slug);
  const data = new Uint8Array(pdfBuffer);
  const doc  = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const page  = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp    = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  if (isSchema) {
    const halfW = Math.floor(vp.width / 2);
    const halfH = Math.floor(vp.height / 2);
    const cropped = new NodeCanvasFactory().create(halfW, halfH);
    cropped.context.drawImage(cc.canvas, 0, 0, halfW * 2, halfH * 2, 0, 0, halfW, halfH);
    return cropped.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  }
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

// Vérifier si le PDF existe dans R2
async function existsInR2(slug) {
  try {
    await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `documents/${slug}.pdf` }));
    return true;
  } catch { return false; }
}

// Chercher tous les PDFs dans DOCS EN LIGNE récursivement
function findAllPdfs(dir, results = []) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) findAllPdfs(full, results);
      else if (entry.name.toLowerCase().endsWith('.pdf')) results.push(full);
    }
  } catch {}
  return results;
}

// Score de correspondance slug ↔ nom de fichier
function matchScore(slug, filename) {
  const fileLower = filename.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const slugWords = slug.split('-').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  let score = 0;
  for (const word of slugWords) {
    if (fileLower.includes(word)) score++;
  }
  return { score, total: slugWords.length };
}

// ─── Main ────────────────────────────────────────────────────────────────────
const report   = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const allSlugs = [...(report.suspects || []), ...(report.no_file || [])].map(d => d);

console.log(`\n${'═'.repeat(60)}`);
console.log(`Fix PDFs manquants dans R2`);
console.log(`Mode : ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
console.log(`${'═'.repeat(60)}\n`);

// Identifier les slugs dont le PDF est absent de R2
console.log('Vérification R2...');
const missing = [];
for (const doc of allSlugs) {
  const exists = await existsInR2(doc.slug);
  if (!exists) missing.push(doc);
}
console.log(`${missing.length} PDFs absents de R2\n`);

if (missing.length === 0) { console.log('✓ Rien à corriger.'); process.exit(0); }

// Indexer tous les PDFs locaux (une seule fois)
console.log('Scan DOCS EN LIGNE...');
const allLocalPdfs = findAllPdfs(DOCS_EN_LIGNE);
console.log(`${allLocalPdfs.length} PDFs locaux trouvés\n`);

const notFound = [];
let ok = 0, errors = 0;

for (const doc of missing) {
  console.log(`\n📄 ${doc.slug}`);
  console.log(`   ${doc.title}`);

  // Chercher le meilleur match local
  let bestMatch = null, bestScore = 0;
  for (const localPath of allLocalPdfs) {
    const filename = path.basename(localPath);
    const { score, total } = matchScore(doc.slug, filename);
    const ratio = total > 0 ? score / total : 0;
    if (score > bestScore && ratio >= 0.5) {
      bestScore = score;
      bestMatch = localPath;
    }
  }

  if (!bestMatch) {
    console.log('   ✗ PDF introuvable localement');
    notFound.push(doc);
    continue;
  }

  console.log(`   → ${bestMatch}`);

  if (DRY_RUN) { console.log('   [DRY-RUN] skip'); ok++; continue; }

  const pdfBuffer = fs.readFileSync(bestMatch);

  // Upload PDF vers R2
  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `documents/${doc.slug}.pdf`,
      Body: pdfBuffer, ContentType: 'application/pdf',
    }));
    console.log('   ✓ PDF uploadé vers R2');
  } catch (err) { console.error(`   ✗ R2 : ${err.message}`); errors++; continue; }

  // Générer et uploader preview
  try {
    const jpgBuffer = await renderFirstPage(pdfBuffer, doc.slug);
    await supabase.storage.from(STORAGE_BUCKET).remove([`previews/${doc.slug}.jpg`]);
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET)
      .upload(`previews/${doc.slug}.jpg`, jpgBuffer, { contentType: 'image/jpeg' });
    if (upErr) throw new Error(upErr.message);
    const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${doc.slug}.jpg?t=${Date.now()}`;
    await supabase.from('documents').update({ preview_url: previewUrl }).eq('slug', doc.slug);
    console.log('   ✓ Preview générée et uploadée');
  } catch (err) { console.error(`   ✗ Preview : ${err.message}`); }

  ok++;
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`OK: ${ok}  Erreurs: ${errors}  Introuvables: ${notFound.length}`);
if (notFound.length > 0) {
  console.log(`\nPDFs introuvables localement (à traiter manuellement) :`);
  for (const d of notFound) console.log(`  • ${d.slug}\n    ${d.title}`);
}
console.log(`${'═'.repeat(60)}`);
