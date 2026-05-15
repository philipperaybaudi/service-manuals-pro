// Import Lot 3 — 15 Manuels LUREM $25
// Preview : pleine page (800px, sans crop) — couvertures avec photo machine / logo
// Usage: node scripts/import-lurem-lot-3.mjs

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

// Preview : pleine page (800px, sans crop) — couvertures manuels
// Parcourt jusqu'à 3 pages pour trouver une couverture avec contenu
async function generatePreview(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
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

  // Fallback : blue overlay sur page 1
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

    const previewJpeg = await generatePreview(pdfBytes, doc.overlayTitle);
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
    file: 'LUREM C210B Manual $25.pdf',
    title: 'LUREM C210B — Operators Manual',
    slug: 'lurem-c210b-operators-manual',
    overlayTitle: 'Lurem C210B — Operators Manual',
    price: 2500,
    description: 'Complete operators manual for the LUREM C210B combination woodworking machine. Covers setup, adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C210B Operators Manual. Complete guide for setup, adjustments, operation and maintenance of the C210B combination woodworking machine.',
  },
  {
    file: 'LUREM C2100 Manuel $25.pdf',
    title: 'LUREM C2100 — Manuel Opérateur',
    slug: 'lurem-c2100-operators-manual',
    overlayTitle: 'Lurem C2100 — Manuel Opérateur',
    price: 2500,
    description: 'Complete operators manual for the LUREM C2100 combination woodworking machine. Covers installation, adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C2100 Operators Manual. Complete guide for installation, adjustments, operation and maintenance of the C2100 combination woodworking machine.',
  },
  {
    file: 'LUREM C260 S2 Manuel $25.pdf',
    title: 'LUREM C260 S2 — Manuel',
    slug: 'lurem-c260-s2-manual',
    overlayTitle: 'Lurem C260 S2 — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM C260 S2 combination woodworking machine. Covers adjustments, safety and maintenance procedures.',
    seoDesc: 'Download the Lurem C260 S2 Manual. Complete guide for operation and maintenance of the C260 S2 combination woodworking machine.',
  },
  {
    file: 'LUREM C260E C310E Manuel $25.pdf',
    title: 'LUREM C260E / C310E — Manuel',
    slug: 'lurem-c260e-c310e-manual',
    overlayTitle: 'Lurem C260E / C310E — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM C260E and C310E combination woodworking machines. Covers adjustments, safety and maintenance.',
    seoDesc: 'Download the Lurem C260E / C310E Manual. Complete guide for operation and maintenance of the C260E and C310E combination woodworking machines.',
  },
  {
    file: 'LUREM C310E C260E $25.pdf',
    title: 'LUREM C310E / C260E — Manuel (Éd. alt.)',
    slug: 'lurem-c310e-c260e-manual',
    overlayTitle: 'Lurem C310E / C260E — Manuel',
    price: 2500,
    description: 'Alternative edition of the operators manual for the LUREM C310E and C260E combination woodworking machines. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C310E / C260E Manual — alternative edition. Complete guide for operation and maintenance of the C310E and C260E combination woodworking machines.',
  },
  {
    file: 'LUREM C260N Manual $25.pdf',
    title: 'LUREM C260N — Operators Manual',
    slug: 'lurem-c260n-operators-manual',
    overlayTitle: 'Lurem C260N — Operators Manual',
    price: 2500,
    description: 'Operators manual for the LUREM C260N combination woodworking machine. Covers setup, adjustments, safety and maintenance procedures.',
    seoDesc: 'Download the Lurem C260N Operators Manual. Complete guide for setup, adjustments and maintenance of the C260N combination woodworking machine.',
  },
  {
    file: 'LUREM C260N Manuel $25.pdf',
    title: 'LUREM C260N — Manuel Opérateur',
    slug: 'lurem-c260n-user-manual',
    overlayTitle: 'Lurem C260N — Manuel Opérateur',
    price: 2500,
    description: 'Operators manual for the LUREM C260N combination woodworking machine. Covers installation, adjustments, safety and maintenance.',
    seoDesc: 'Download the Lurem C260N Operators Manual. Complete guide for installation, adjustments and maintenance of the C260N combination woodworking machine.',
  },
  {
    file: 'LUREM C266 Manuel $25.pdf',
    title: 'LUREM C266 — Manuel',
    slug: 'lurem-c266-manual',
    overlayTitle: 'Lurem C266 — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM C266 combination woodworking machine. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C266 Manual. Complete guide for operation and maintenance of the C266 combination woodworking machine.',
  },
  {
    file: 'LUREM C2600 Manuel $25.pdf',
    title: 'LUREM C2600 — Manuel',
    slug: 'lurem-c2600-manual',
    overlayTitle: 'Lurem C2600 — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM C2600 combination woodworking machine. Covers installation, adjustments and maintenance procedures.',
    seoDesc: 'Download the Lurem C2600 Manual. Complete guide for operation and maintenance of the C2600 combination woodworking machine.',
  },
  {
    file: 'LUREM C36 Manuel $25.pdf',
    title: 'LUREM C36 — Manuel',
    slug: 'lurem-c36-manual',
    overlayTitle: 'Lurem C36 — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM C36 combination woodworking machine. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem C36 Manual. Complete guide for operation and maintenance of the C36 combination woodworking machine.',
  },
  {
    file: 'LUREM CB310Hz $25.pdf',
    title: 'LUREM CB310 Hz — Manuel',
    slug: 'lurem-cb310hz-manual',
    overlayTitle: 'Lurem CB310 Hz — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM CB310 Hz combination woodworking machine with frequency inverter drive. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem CB310 Hz Manual. Complete guide for operation and maintenance of the CB310 Hz combination woodworking machine with frequency inverter.',
  },
  {
    file: 'LUREM CB310SL Manuel $25.pdf',
    title: 'LUREM CB310SL — Manuel',
    slug: 'lurem-cb310sl-manual',
    overlayTitle: 'Lurem CB310SL — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM CB310SL combination woodworking machine. Covers installation, adjustments and maintenance procedures.',
    seoDesc: 'Download the Lurem CB310SL Manual. Complete guide for operation and maintenance of the CB310SL combination woodworking machine.',
  },
  {
    file: 'LUREM Maxi26-plus Manuel $25.pdf',
    title: 'LUREM Maxi 26 Plus — Manuel',
    slug: 'lurem-maxi26plus-manual',
    overlayTitle: 'Lurem Maxi 26 Plus — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM Maxi 26 Plus combination woodworking machine. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem Maxi 26 Plus Manual. Complete guide for operation and maintenance of the Maxi 26 Plus combination woodworking machine.',
  },
  {
    file: 'LUREM MF260L CB260TL Manuel $25.pdf',
    title: 'LUREM MF260L / CB260TL — Manuel',
    slug: 'lurem-mf260l-cb260tl-manual',
    overlayTitle: 'Lurem MF260L / CB260TL — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM MF260L and CB260TL woodworking machines. Covers adjustments, safety and maintenance.',
    seoDesc: 'Download the Lurem MF260L / CB260TL Manual. Complete guide for operation and maintenance of the MF260L and CB260TL woodworking machines.',
  },
  {
    file: 'LUREM Optal 26 - Manuel $25.pdf',
    title: 'LUREM Optal 26 — Manuel',
    slug: 'lurem-optal26-manual',
    overlayTitle: 'Lurem Optal 26 — Manuel',
    price: 2500,
    description: 'Operators manual for the LUREM Optal 26 surface planer and thicknesser. Covers adjustments, operation and maintenance.',
    seoDesc: 'Download the Lurem Optal 26 Manual. Complete guide for operation and maintenance of the Optal 26 surface planer and thicknesser.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 3 — 15 Manuels $25 ===\n');

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
