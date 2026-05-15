// Import Lot 5 — 7 docs LUREM $20
// Preview : pleine page (800px) pour manuels/notices, crop central pour listes/schémas
// Usage: node scripts/import-lurem-lot-5.mjs

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
const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc'; // LUREM

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function normalizePdfRotation(inputBytes) {
  const src = await PDFDocument.load(inputBytes);
  const srcPages = src.getPages();
  const rotations = srcPages.map(p => p.getRotation().angle);
  if (rotations.every(r => r === 0)) return Buffer.from(inputBytes);

  console.log(`   Rotation: [${[...new Set(rotations.filter(r => r !== 0))].join(', ')}]°`);
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

// Preview pleine page (manuels/notices) — 800px, jusqu'à 3 pages, seuil 30 KB
async function generatePreviewFull(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data, canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
  }).promise;

  for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
    factory.destroy(cc);
    if (buf.length > 30000) {
      if (p > 1) console.log(`   (preview p${p}, pleine page)`);
      return buf;
    }
  }
  return generateOverlay(pdfBytes, overlayTitle);
}

// Preview crop central (listes/schémas) — 1600px, 25%→75%, jusqu'à 8 pages, seuil 15 KB
async function generatePreviewCrop(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data, canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
  }).promise;

  for (let p = 1; p <= Math.min(8, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const scale = 1600 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;

    const cropX = Math.floor(vp.width * 0.25);
    const cropY = Math.floor(vp.height * 0.25);
    const cropW = Math.floor(vp.width * 0.50);
    const cropH = Math.floor(vp.height * 0.50);
    const cropCanvas = canvas.createCanvas(cropW, cropH);
    cropCanvas.getContext('2d').drawImage(cc.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    factory.destroy(cc);

    const buf = cropCanvas.toBuffer('image/jpeg', { quality: 0.88 });
    if (buf.length > 15000) {
      if (p > 1) console.log(`   (preview p${p}, crop central)`);
      return buf;
    }
  }
  return generateOverlay(pdfBytes, overlayTitle);
}

// Fallback blue overlay
async function generateOverlay(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data, canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
  }).promise;
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

async function importDoc(doc) {
  console.log(`\n── ${doc.title}`);
  try {
    const rawBytes = readFileSync(`${BASE}/${doc.file}`);
    const pdfBytes = await normalizePdfRotation(rawBytes);
    const pageCount = await getPageCount(pdfBytes);

    const previewJpeg = doc.previewType === 'crop'
      ? await generatePreviewCrop(pdfBytes, doc.overlayTitle)
      : await generatePreviewFull(pdfBytes, doc.overlayTitle);
    if (!previewJpeg) { console.log('   ✗ Preview échoué'); return false; }

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
    console.log(`   ✓ ${dbDoc.slug} (${pageCount}p, ${(pdfBytes.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    console.error(`   ✗ Erreur: ${e.message}`);
    return false;
  }
}

const docs = [
  {
    file: 'LUREM C360 C410n $20.pdf',
    title: 'LUREM C360 / C410N — Instructions Manual',
    slug: 'lurem-c360-c410n-manual',
    overlayTitle: 'Lurem C360 / C410N — Instructions Manual',
    previewType: 'full',
    price: 2000,
    description: 'Instructions manual for the LUREM C360 and C410N combination woodworking machines. Covers installation, adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C360 / C410N Instructions Manual. Complete guide for installation, adjustments, operation and maintenance of the C360 and C410N combination woodworking machines.',
  },
  {
    file: 'LUREM C20 Notice $20.pdf',
    title: 'LUREM C20 — Operators Notice',
    slug: 'lurem-c20-notice',
    overlayTitle: 'Lurem C20 — Operators Notice',
    previewType: 'full',
    price: 2000,
    description: 'Operators notice for the LUREM C20 combination woodworking machine. Covers setup, adjustments and operating procedures.',
    seoDesc: 'Download the Lurem C20 Operators Notice. Complete guide for setup, adjustments and operating procedures for the C20 combination woodworking machine.',
  },
  {
    file: 'LUREM Variateurs HZ $20.pdf',
    title: 'LUREM Hz Concept — CB310 rl/rlx / TS15-21rl / TS25 rlx',
    slug: 'lurem-hz-concept-cb310-ts',
    overlayTitle: 'Lurem Hz Concept — CB310 / TS Series',
    previewType: 'full',
    price: 2000,
    description: 'Hz Concept frequency inverter guide for the LUREM CB310 rl/rlx, TS15/21rl and TS25 rlx woodworking machines. Covers wiring, configuration and commissioning.',
    seoDesc: 'Download the Lurem Hz Concept Manual for CB310 rl/rlx, TS15/21rl and TS25 rlx. Complete guide for wiring, configuration and commissioning of the Hz frequency inverter system.',
  },
  {
    file: 'LUREM Optal 26 Liste $20.pdf',
    title: 'LUREM Optal 26 — Parts List',
    slug: 'lurem-optal26-parts-list',
    overlayTitle: 'Lurem Optal 26 — Parts List',
    previewType: 'crop',
    price: 2000,
    description: 'Parts list for the LUREM Optal 26 surface planer and thicknesser. Complete numbered component reference for all assemblies.',
    seoDesc: 'Download the Lurem Optal 26 Parts List. Complete numbered component reference for all assemblies of the Optal 26 surface planer and thicknesser.',
  },
  {
    file: 'LUREM C260J Manuel $20.pdf',
    title: 'LUREM C260J — Instructions Manual',
    slug: 'lurem-c260j-manual',
    overlayTitle: 'Lurem C260J — Instructions Manual',
    previewType: 'full',
    price: 2000,
    description: 'Instructions manual for the LUREM C260J surface planer and thicknesser. Covers installation, adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C260J Instructions Manual. Complete guide for installation, adjustments, operation and maintenance of the C260J surface planer and thicknesser.',
  },
  {
    file: 'LUREM Former 310 STI Liste - Schemas $20.pdf',
    title: 'LUREM Former 310 STI — Parts List and Wiring Diagrams',
    slug: 'lurem-former310sti-parts-schemas',
    overlayTitle: 'Lurem Former 310 STI — Parts List and Wiring Diagrams',
    previewType: 'crop',
    price: 2000,
    description: 'Parts list and wiring diagrams for the LUREM Former 310 STI surface planer. Includes numbered exploded views and complete electrical schematics.',
    seoDesc: 'Download the Lurem Former 310 STI Parts List and Wiring Diagrams. Complete exploded views, numbered parts reference and electrical schematics for the Former 310 STI surface planer.',
  },
  {
    file: 'LUREM C360-C410 Manuel $20.pdf',
    title: 'LUREM C360 / C410 — Instructions Manual',
    slug: 'lurem-c360-c410-manual',
    overlayTitle: 'Lurem C360 / C410 — Instructions Manual',
    previewType: 'full',
    price: 2000,
    description: 'Instructions manual for the LUREM C360 and C410 combination woodworking machines. Covers installation, adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C360 / C410 Instructions Manual. Complete guide for installation, adjustments, operation and maintenance of the C360 and C410 combination woodworking machines.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 5 — 7 docs $20 ===\n');

  let ok = 0, err = 0;
  for (const doc of docs) {
    const success = await importDoc(doc);
    success ? ok++ : err++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Documents importés : ${ok}/${docs.length}`);
  console.log(`Erreurs            : ${err}`);
  console.log('='.repeat(60));
}

run().catch(console.error);
