// Import Lot 2 — 16 Éclatés/Listes LUREM $19
// Preview : crop quart central (25%→75% X et Y) à 1600px
// Usage: node scripts/import-lurem-lot-2.mjs

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

// Preview : crop quart central (25%→75% X et Y), rendu à 1600px
// Parcourt jusqu'à 8 pages pour trouver une vue éclatée réelle
async function generatePreview(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
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
    file: 'LUREM CB310 RL-RLX-04 Liste Eclate $19.pdf',
    title: 'CB310 RL / RLX Exploded Views and Parts List',
    slug: 'lurem-cb310-rl-rlx-parts-list',
    overlayTitle: 'Lurem CB310 RL / RLX — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM CB310 RL and CB310 RLX combination woodworking machines. Complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem CB310 RL / RLX Exploded Views and Parts List. Complete spare parts diagrams and reference list for the CB310 RL and CB310 RLX combination woodworking machines.',
  },
  {
    file: 'LUREM CB310rlrlx Liste Eclate $19.pdf',
    title: 'CB310 RL / RLX Exploded Views and Parts List — Edition 04',
    slug: 'lurem-cb310-rl-rlx-parts-list-edition-04',
    overlayTitle: 'Lurem CB310 RL / RLX — Exploded Views and Parts List Ed.04',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM CB310 RL and CB310 RLX combination woodworking machines, Edition 04. Updated complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem CB310 RL / RLX Exploded Views and Parts List Edition 04. Updated spare parts diagrams and reference list for the CB310 RL and CB310 RLX combination woodworking machines.',
  },
  {
    file: 'LUREM CB310SL Liste Eclaté $19.pdf',
    title: 'CB310SL Exploded Views and Parts List',
    slug: 'lurem-cb310sl-parts-list',
    overlayTitle: 'Lurem CB310SL — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM CB310SL combination woodworking machine. Complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem CB310SL Exploded Views and Parts List. Complete spare parts diagrams and reference list for the CB310SL combination woodworking machine.',
  },
  {
    file: 'LUREM CB410 rlx Liste Eclatés $19.pdf',
    title: 'CB410 RLX Exploded Views and Parts List',
    slug: 'lurem-cb410-rlx-parts-list',
    overlayTitle: 'Lurem CB410 RLX — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM CB410 RLX combination woodworking machine. Complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections of this 410mm capacity machine.',
    seoDesc: 'Download the Lurem CB410 RLX Exploded Views and Parts List. Complete spare parts diagrams and reference list for the CB410 RLX combination woodworking machine.',
  },
  {
    file: 'LUREM C260e C310e Liste $19.pdf',
    title: 'C260e / C310e Exploded Views and Parts List',
    slug: 'lurem-c260e-c310e-parts-list',
    overlayTitle: 'Lurem C260e / C310e — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM C260e and C310e electronic combination woodworking machines. Complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem C260e / C310e Exploded Views and Parts List. Complete spare parts diagrams and reference list for the C260e and C310e combination woodworking machines.',
  },
  {
    file: 'LUREM FORMER 260s Liste Eclate $19.pdf',
    title: 'Former 260S Exploded Views and Parts List',
    slug: 'lurem-former-260s-parts-list',
    overlayTitle: 'Lurem Former 260S — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 260S surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 260mm jointer, thicknesser and circular saw sections.',
    seoDesc: 'Download the Lurem Former 260S Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 260S surface planer and thicknesser.',
  },
  {
    file: 'LUREM FORMER 260SI Liste Eclate $19.pdf',
    title: 'Former 260SI Exploded Views and Parts List',
    slug: 'lurem-former-260si-parts-list',
    overlayTitle: 'Lurem Former 260SI — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 260SI surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 260mm jointer, thicknesser and spindle moulder sections.',
    seoDesc: 'Download the Lurem Former 260SI Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 260SI surface planer and thicknesser.',
  },
  {
    file: 'LUREM Former 310 s Liste Eclate $19.pdf',
    title: 'Former 310S Exploded Views and Parts List',
    slug: 'lurem-former-310s-parts-list',
    overlayTitle: 'Lurem Former 310S — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 310S surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 310mm jointer, thicknesser and circular saw sections.',
    seoDesc: 'Download the Lurem Former 310S Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 310S surface planer and thicknesser.',
  },
  {
    file: 'LUREM Former 310si Liste Eclate $19.pdf',
    title: 'Former 310SI Exploded Views and Parts List',
    slug: 'lurem-former-310si-parts-list',
    overlayTitle: 'Lurem Former 310SI — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 310SI surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 310mm jointer, thicknesser and spindle moulder sections.',
    seoDesc: 'Download the Lurem Former 310SI Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 310SI surface planer and thicknesser.',
  },
  {
    file: 'LUREM Former 310 st Liste Eclate $19.pdf',
    title: 'Former 310ST Exploded Views and Parts List',
    slug: 'lurem-former-310st-parts-list',
    overlayTitle: 'Lurem Former 310ST — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 310ST surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 310mm jointer, thicknesser and circular saw sections.',
    seoDesc: 'Download the Lurem Former 310ST Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 310ST surface planer and thicknesser.',
  },
  {
    file: 'LUREM FORMER 310STI Liste Eclate $19.pdf',
    title: 'Former 310STI Exploded Views and Parts List',
    slug: 'lurem-former-310sti-parts-list',
    overlayTitle: 'Lurem Former 310STI — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Former 310STI surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of the 310mm jointer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem Former 310STI Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Former 310STI surface planer and thicknesser.',
  },
  {
    file: 'LUREM Maxi26plus Liste Eclate $19.pdf',
    title: 'Maxi 26 Plus Exploded Views and Parts List',
    slug: 'lurem-maxi26plus-parts-list',
    overlayTitle: 'Lurem Maxi 26 Plus — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM Maxi 26 Plus combination woodworking machine. Complete numbered part diagrams with reference list covering all assemblies of the jointer-planer, thicknesser, circular saw and spindle moulder sections.',
    seoDesc: 'Download the Lurem Maxi 26 Plus Exploded Views and Parts List. Complete spare parts diagrams and reference list for the Maxi 26 Plus combination woodworking machine.',
  },
  {
    file: 'LUREM RD41e Liste Eclate $19.pdf',
    title: 'RD 41e Exploded Views and Parts List',
    slug: 'lurem-rd41e-parts-list',
    overlayTitle: 'Lurem RD 41e — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM RD 41e electronic surface planer and thicknesser. Complete numbered part diagrams with reference list covering all assemblies of this 410mm capacity jointer-planer.',
    seoDesc: 'Download the Lurem RD 41e Exploded Views and Parts List. Complete spare parts diagrams and reference list for the RD 41e surface planer and thicknesser.',
  },
  {
    file: 'LUREM T180 Liste Eclate $19.pdf',
    title: 'T180 Exploded Views and Parts List',
    slug: 'lurem-t180-parts-list',
    overlayTitle: 'Lurem T180 — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM T180 woodworking machine. Complete numbered part diagrams with reference list covering all main assemblies and components.',
    seoDesc: 'Download the Lurem T180 Exploded Views and Parts List. Complete spare parts diagrams and reference list for the LUREM T180 woodworking machine.',
  },
  {
    file: 'LUREM TS15rl Liste Eclate$19.pdf',
    title: 'TS 15 RL Exploded Views and Parts List',
    slug: 'lurem-ts15rl-parts-list',
    overlayTitle: 'Lurem TS 15 RL — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM TS 15 RL spindle moulder. Complete numbered part diagrams with reference list covering all assemblies including the spindle head, tables, fence and rotation reversal mechanism.',
    seoDesc: 'Download the Lurem TS 15 RL Exploded Views and Parts List. Complete spare parts diagrams and reference list for the TS 15 RL spindle moulder.',
  },
  {
    file: 'LUREM TS41STI Liste Eclate $19.pdf',
    title: 'TS 41 STI Exploded Views and Parts List',
    slug: 'lurem-ts41sti-parts-list',
    overlayTitle: 'Lurem TS 41 STI — Exploded Views and Parts List',
    price: 1900,
    description: 'Exploded views and parts list for the LUREM TS 41 STI spindle moulder. Complete numbered part diagrams with reference list covering all assemblies including the spindle head, tables, fence and electronic speed control.',
    seoDesc: 'Download the Lurem TS 41 STI Exploded Views and Parts List. Complete spare parts diagrams and reference list for the TS 41 STI spindle moulder.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 2 — 16 Éclatés $19 ===\n');

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
