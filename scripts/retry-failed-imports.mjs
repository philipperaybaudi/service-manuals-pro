// Retry des 16 docs en erreur lors de l'import universel
// Usage: node scripts/retry-failed-imports.mjs

import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');
const { PDFDocument, degrees } = require('pdf-lib');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';

const FAILED_SLUGS = new Set([
  'elektra-elektra-beckum-bas-316g-dnb',
  'elektra-elektra-beckum-hc-260-m-instruction',
  'felder-felder-manuel-s-308-f-38-f-48-v-3-v-4',
  'felder-felder-six-series-combi-planer',
  'hammer-hammer-rabot-degau-a3-26-a3-31-a3-41-degau-a3-41-a',
  'holtzling-holtzling-ot5260-combine-7-fonctions-250-mm',
  'holtzling-holtzling-ot8350-scie-sur-table',
  'holtzling-holtzling-otpt260-rabo-degau-notice',
  'inca-inca-degauchisseuse-raboteuse-343-190-bis',
  'inca-inca-scie-circulaire-major-341-018',
  'inca-inca-scie-circulaire-master-341-037',
  'inca-inca-scie-a-ruban-expert-500-342-025',
  'inca-inca-degauchisseuse-raboteuse',
  'kity-kity-613',
  'minimax-minimax-c26-30-genius-manuel',
  'scm-scm-s520-e-raboteuse-fonctionnement-entretien',
]);

const INVENTORY = JSON.parse(readFileSync(
  'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-machines.json', 'utf-8'
));
const toRetry = INVENTORY.filter(e => FAILED_SLUGS.has(e.slug));
console.log(`Docs à retenter : ${toRetry.length}\n`);

// ── Description templates ────────────────────────────────────────────────────
function buildDescription(brand, title, type) {
  const b = brand.toUpperCase();
  const t = title.replace(/^[A-Z]+ - /, '').trim();
  switch (type) {
    case 'Manual':      return `Operators manual for the ${b} ${t}. Covers installation, adjustments, operation and maintenance.`;
    case 'Notice':      return `Operators notice for the ${b} ${t}. Covers setup, adjustments and operating procedures.`;
    case 'Parts List':  return `Exploded views and illustrated parts list for the ${b} ${t}. Complete numbered component reference for all assemblies.`;
    case 'Schema':      return `Wiring diagrams and electrical schematics for the ${b} ${t}.`;
    case 'Brochure':    return `Product brochure for the ${b} ${t}.`;
    case 'Catalogue':   return `Parts catalogue for the ${b} ${t}. Complete component reference.`;
    default:            return `Technical documentation for the ${b} ${t}.`;
  }
}

function buildSeoDesc(brand, title, type) {
  const b = brand.toUpperCase();
  const t = title.replace(/^[A-Z]+ - /, '').trim();
  switch (type) {
    case 'Manual':      return `Download the ${b} ${t} operators manual. Complete guide for installation, adjustments, operation and maintenance.`;
    case 'Notice':      return `Download the ${b} ${t} operators notice. Setup, adjustments and operating procedures.`;
    case 'Parts List':  return `Download the ${b} ${t} parts list. Complete exploded views and numbered parts reference.`;
    case 'Schema':      return `Download the ${b} ${t} wiring diagrams. Complete electrical schematics.`;
    case 'Brochure':    return `Download the ${b} ${t} product brochure.`;
    case 'Catalogue':   return `Download the ${b} ${t} parts catalogue. Complete component reference.`;
    default:            return `Download the ${b} ${t} technical documentation.`;
  }
}

function brandSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const brandCache = {};
async function getOrCreateBrand(name) {
  if (brandCache[name]) return brandCache[name];
  const slug = brandSlug(name);
  const { data: existing } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();
  if (existing) { brandCache[name] = existing.id; return existing.id; }
  const { data: created, error } = await supabase.from('brands')
    .insert({ name: name.trim(), slug, category_id: CAT_ID }).select('id').single();
  if (error) { console.error(`   ✗ Brand "${name}": ${error.message}`); return null; }
  console.log(`   + Marque créée : ${name}`);
  brandCache[name] = created.id;
  return created.id;
}

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function normalizePdfRotation(inputBytes) {
  try {
    const src = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
    const srcPages = src.getPages();
    const rotations = srcPages.map(p => p.getRotation().angle);
    if (rotations.every(r => r === 0)) return Buffer.from(inputBytes);
    const dst = await PDFDocument.create();
    for (let i = 0; i < srcPages.length; i++) {
      const srcPage = srcPages[i];
      const rot = rotations[i];
      const { width: w, height: h } = srcPage.getSize();
      if (rot === 0) { const [copied] = await dst.copyPages(src, [i]); dst.addPage(copied); continue; }
      const newW = (rot === 90 || rot === 270) ? h : w;
      const newH = (rot === 90 || rot === 270) ? w : h;
      const newPage = dst.addPage([newW, newH]);
      srcPage.setRotation(degrees(0));
      const [embedded] = await dst.embedPages([srcPage]);
      let x, y, ra;
      if (rot === 90)       { x = 0; y = w; ra = -90; }
      else if (rot === 180) { x = w; y = h; ra = -180; }
      else                  { x = h; y = 0; ra =  90; }
      newPage.drawPage(embedded, { x, y, width: w, height: h, rotate: degrees(ra) });
    }
    return Buffer.from(await dst.save());
  } catch (e) {
    // PDF corrompu ou chiffré — bytes bruts, pas de normalisation rotation
    process.stdout.write(' [raw]');
    return Buffer.from(inputBytes);
  }
}

function makeBlueOverlay(overlayTitle) {
  const W = 800, H = 1000;
  const factory = new NodeCanvasFactory();
  const cc = factory.create(W, H);
  const ctx = cc.context;
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, H * 0.30, W, H * 0.40);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px Arial';
  const words = overlayTitle.split(' ');
  let lines = [], line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = word; }
    else line = test;
  }
  lines.push(line);
  const lH = 44, sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, sY + i * lH));
  const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  factory.destroy(cc);
  return buf;
}

async function generatePreview(pdfBytes, overlayTitle) {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjs.getDocument({
      data, canvasFactory: new NodeCanvasFactory(),
      standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
    }).promise;

    for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
      try {
        const page = await doc.getPage(p);
        const scale = 800 / page.getViewport({ scale: 1 }).width;
        const vp = page.getViewport({ scale });
        const factory = new NodeCanvasFactory();
        const cc = factory.create(vp.width, vp.height);
        await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
        const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
        factory.destroy(cc);
        if (buf.length > 30000) {
          if (p > 1) process.stdout.write(` (p${p})`);
          return buf;
        }
      } catch { continue; }
    }

    // Fallback blue overlay (même structure que doc page 1)
    try {
      const page = await doc.getPage(1);
      const scale = 800 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const ctx = cc.context;
      const W = vp.width, H = vp.height;
      ctx.fillStyle = 'rgba(30,58,138,0.88)';
      ctx.fillRect(0, H * 0.35, W, H * 0.30);
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 32px Arial';
      const words = overlayTitle.split(' ');
      let lines = [], line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = word; }
        else line = test;
      }
      lines.push(line);
      const lH = 40, sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
      lines.forEach((l, i) => ctx.fillText(l, W / 2, sY + i * lH));
      const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
      factory.destroy(cc);
      process.stdout.write(` (overlay)`);
      return buf;
    } catch { /* fall through to solid overlay */ }

  } catch { /* pdfjs total failure — solid blue overlay */ }

  // Fallback ultime : overlay bleu sans rendu PDF
  process.stdout.write(` (solid-overlay)`);
  return makeBlueOverlay(overlayTitle);
}

async function importDoc(entry, brandId) {
  const title = entry.title;
  const type  = entry.type_detected || 'Unknown';
  const slug  = entry.slug;
  const price = Math.round((entry.price_final || 10) * 100);

  process.stdout.write(`  ── ${slug.substring(0, 55).padEnd(55)}`);

  try {
    const { data: existing } = await supabase.from('documents').select('id').eq('slug', slug).maybeSingle();
    if (existing) { console.log(' ⚠ déjà importé'); return 'skip'; }

    const rawBytes = readFileSync(entry.path);
    const pdfBytes = await normalizePdfRotation(rawBytes);

    const description = entry.description || buildDescription(entry.brand, title, type);
    const seoDesc     = buildSeoDesc(entry.brand, title, type);

    const previewJpeg = await generatePreview(pdfBytes, title);

    const previewPath = `previews/${slug}.jpg`;
    const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (prevErr) { console.log(` ✗ preview: ${prevErr.message}`); return 'error'; }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

    const r2Key = `documents/${slug}.pdf`;
    await r2.send(new PutObjectCommand({
      Bucket: 'service-manuals-documents',
      Key: r2Key, Body: pdfBytes, ContentType: 'application/pdf',
    }));

    const { error: docErr } = await supabase.from('documents').insert({
      title, slug, description,
      category_id: CAT_ID,
      brand_id: brandId,
      price,
      file_path: r2Key,
      file_size: pdfBytes.length,
      page_count: entry.pages,
      preview_url: urlData.publicUrl,
      seo_title: `${title} | Service Manuals Pro`,
      seo_description: seoDesc,
      language: 'en',
      active: true,
      featured: false,
    });

    if (docErr) { console.log(` ✗ DB: ${docErr.message}`); return 'error'; }
    console.log(` ✓ $${entry.price_final}`);
    return 'ok';
  } catch (e) {
    console.log(` ✗ ${e.message.substring(0, 80)}`);
    return 'error';
  }
}

async function run() {
  console.log('=== Retry 16 docs en erreur ===\n');

  const byBrand = {};
  for (const entry of toRetry) {
    if (!byBrand[entry.brand]) byBrand[entry.brand] = [];
    byBrand[entry.brand].push(entry);
  }

  let ok = 0, skipped = 0, errors = 0;

  for (const [brand, entries] of Object.entries(byBrand)) {
    console.log(`\n▶ ${brand} (${entries.length} docs)`);
    const brandId = await getOrCreateBrand(brand);
    if (!brandId) { errors += entries.length; continue; }

    for (const entry of entries) {
      if (!entry.pages) {
        console.log(`  ── ${entry.file.substring(0, 55)} ⚠ PDF illisible — ignoré`);
        skipped++;
        continue;
      }
      const result = await importDoc(entry, brandId);
      if (result === 'ok')    ok++;
      if (result === 'skip')  skipped++;
      if (result === 'error') errors++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Importés  : ${ok}`);
  console.log(`Ignorés   : ${skipped}`);
  console.log(`Erreurs   : ${errors}`);
  console.log('='.repeat(60));
}

run().catch(console.error);
