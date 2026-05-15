// Import 4 LUREM test documents (4 different prices: $5, $10, $15, $25)
// Also uploads the LUREM brand logo if not already set
// Usage: node scripts/import-lurem-4-test.mjs

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

const BASE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9'; // Machine Tools
const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc'; // LUREM (already exists)
const LOGO_SRC = `${BASE}/IMAGES LUREM/logo-lurem.jpeg`;

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// Normalize PDF rotation: bake rotation into content and set /Rotate = 0
async function normalizePdfRotation(inputBytes) {
  const src = await PDFDocument.load(inputBytes);
  const srcPages = src.getPages();
  const rotations = srcPages.map(p => p.getRotation().angle);
  if (rotations.every(r => r === 0)) return Buffer.from(inputBytes);

  console.log(`   Rotation normalization: [${[...new Set(rotations.filter(r => r !== 0))].join(', ')}]°`);
  const dst = await PDFDocument.create();

  for (let i = 0; i < srcPages.length; i++) {
    const srcPage = srcPages[i];
    const rot = rotations[i];
    const { width: w, height: h } = srcPage.getSize();

    if (rot === 0) {
      const [copied] = await dst.copyPages(src, [i]);
      dst.addPage(copied);
      continue;
    }

    const newW = (rot === 90 || rot === 270) ? h : w;
    const newH = (rot === 90 || rot === 270) ? w : h;
    const newPage = dst.addPage([newW, newH]);

    srcPage.setRotation(degrees(0));
    const [embedded] = await dst.embedPages([srcPage]);

    let x, y, rotAngle;
    if (rot === 90)       { x = 0; y = w;  rotAngle = -90;  }
    else if (rot === 180) { x = w; y = h;  rotAngle = -180; }
    else                  { x = h; y = 0;  rotAngle =  90;  }

    newPage.drawPage(embedded, { x, y, width: w, height: h, rotate: degrees(rotAngle) });
  }

  const saved = await dst.save();
  return Buffer.from(saved);
}

// Generate preview: try pages 1-5, fallback to blue overlay
async function generatePreview(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;

  for (let p = 1; p <= Math.min(5, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
    factory.destroy(cc);
    if (buf.length > 30000) {
      if (p > 1) console.log(`   (preview from page ${p})`);
      return buf;
    }
  }

  // Fallback: blue overlay on page 1
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
  ctx.font = 'bold 36px Arial';

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
  console.log(`   (blue overlay: "${overlayTitle}")`);
  return buf;
}

async function getPageCount(pdfBytes) {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    return doc.numPages;
  } catch (e) { return null; }
}

async function ensureBrandLogo() {
  const { data: brand } = await supabase.from('brands').select('logo_url').eq('id', BRAND_ID).single();
  if (brand?.logo_url) {
    console.log(`Logo LUREM already set: ${brand.logo_url}\n`);
    return;
  }
  console.log('Uploading LUREM logo...');
  const logoBytes = readFileSync(LOGO_SRC);
  const logoPath = 'brands/lurem.jpeg';
  const { error: upErr } = await supabase.storage.from('logos').upload(logoPath, logoBytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) { console.error('Logo upload error:', upErr.message); return; }
  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(logoPath);
  const { error: updErr } = await supabase.from('brands').update({ logo_url: urlData.publicUrl }).eq('id', BRAND_ID);
  if (updErr) { console.error('Brand update error:', updErr.message); return; }
  console.log(`✓ Logo set: ${urlData.publicUrl}\n`);
}

async function importDoc(doc) {
  console.log(`\n── ${doc.title} — $${(doc.price / 100).toFixed(2)}`);
  try {
    const rawBytes = readFileSync(`${BASE}/${doc.file}`);
    const pdfBytes = await normalizePdfRotation(rawBytes);
    const pageCount = await getPageCount(pdfBytes);

    const previewJpeg = await generatePreview(pdfBytes, doc.overlayTitle);
    if (!previewJpeg) { console.log('   ✗ Preview failed'); return false; }

    const previewPath = `previews/${doc.slug}.jpg`;
    const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (prevErr) { console.warn('   ⚠ Preview upload:', prevErr.message); return false; }
    const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

    const r2Key = `documents/${doc.slug}.pdf`;
    await r2.send(new PutObjectCommand({
      Bucket: 'service-manuals-documents',
      Key: r2Key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    }));

    const { data: dbDoc, error: docErr } = await supabase.from('documents').insert({
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      category_id: CAT_ID,
      brand_id: BRAND_ID,
      price: doc.price,
      file_path: r2Key,
      file_size: pdfBytes.length,
      page_count: pageCount,
      preview_url: previewUrlData.publicUrl,
      seo_title: `${doc.title} | Service Manuals Pro`,
      seo_description: doc.seoDesc,
      language: 'en',
      active: true,
      featured: false,
    }).select().single();

    if (docErr) { console.error('   ✗ DB:', docErr.message); return false; }
    console.log(`   ✓ Created: /docs/${dbDoc.slug} (${pageCount}p, ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB)`);
    return true;
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
    return false;
  }
}

const docs = [
  {
    file: 'Schemas LUREM C260N $5.pdf',
    title: 'C260N Wiring Diagrams',
    slug: 'lurem-c260n-wiring-diagrams',
    overlayTitle: 'Lurem C260N — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C260N combination woodworking machine with single-motor configuration. Shows 220V single-phase connection, motor wiring, capacitor values, brake and locking circuits, and rotation reversal for the C210N / C260N series.',
    seoDesc: 'Download the Lurem C260N Wiring Diagrams. Single-motor 220V electrical schematics for the C210N / C260N combination woodworking machines.',
  },
  {
    file: 'LUREM Former RD30 RD26 Notice $10.pdf',
    title: 'Former RD 30 / RD 26 Operating Instructions',
    slug: 'lurem-former-rd-30-rd-26-operating-instructions',
    overlayTitle: 'Lurem Former RD 30 / RD 26 — Operating Instructions',
    price: 1000,
    description: 'Operating instructions for the LUREM Former RD 30 and RD 26 surface planer and thicknesser. Covers safety guidelines, machine setup, operating procedures, feed and cut adjustments, and routine maintenance of these woodworking machines.',
    seoDesc: 'Download the Lurem Former RD 30 / RD 26 Operating Instructions. Setup, operation and maintenance of the surface planer and thicknesser.',
  },
  {
    file: 'LUREM c-360-410-n-04 Manuel $15.pdf',
    title: 'C360 / C410N Combination Machine Manual',
    slug: 'lurem-c360-c410n-combination-machine-manual',
    overlayTitle: 'Lurem C360 / C410N — Combination Machine Manual',
    price: 1500,
    description: 'Reference manual for the LUREM C360 and C410N combination woodworking machines. Includes exploded parts views and detailed spare-parts list for the jointer-planer section with bearing, shaft, cover and fastener identification.',
    seoDesc: 'Download the Lurem C360 / C410N Combination Machine Manual. Exploded parts views and spare-parts list for the jointer-planer section.',
  },
  {
    file: 'LUREM C2000 $25.pdf',
    title: 'C2000 Combination Woodworking Machine Technical Manual',
    slug: 'lurem-c2000-combination-woodworking-machine-technical-manual',
    overlayTitle: 'Lurem C2000 — Technical Manual',
    price: 2500,
    description: 'Complete technical manual for the LUREM C2000 multi-function combination woodworking machine. Covers installation, electrical connection, machine characteristics and capacities, and detailed operation of all functions: surface planer (jointer), thicknesser, circular saw, spindle moulder/shaper and mortiser. Also includes maintenance procedures, lubrication guide and five exploded parts views.',
    seoDesc: 'Download the Lurem C2000 Combination Woodworking Machine Technical Manual. Installation, operation, maintenance and exploded parts views.',
  },
];

async function run() {
  console.log('=== Import LUREM — 4 test documents ===\n');
  await ensureBrandLogo();

  let ok = 0, err = 0;
  for (const doc of docs) {
    const success = await importDoc(doc);
    success ? ok++ : err++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Documents imported : ${ok}/${docs.length}`);
  console.log(`Errors             : ${err}`);
  console.log('='.repeat(60));
}

run().catch(console.error);
