// Import Lot 1C — 10 Schemas LUREM $5 (C410sti → CB310HZ, sans CB310SL corrompu)
// Preview : crop quart central (25%→75% X et Y) à 1600px
// Usage: node scripts/import-lurem-lot-1c.mjs

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
    file: 'Schemas LUREM C410sti $5.pdf',
    title: 'C410STI Wiring Diagrams',
    slug: 'lurem-c410sti-wiring-diagrams',
    overlayTitle: 'Lurem C410STI — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C410STI combination woodworking machine. Seven-page control circuit with 12V/48V step-down transformer rated at 1A. Shows individual start/stop control circuits for jointer-planer, planer, spindle moulder and circular saw. Dated September 1990.',
    seoDesc: 'Download the Lurem C410STI Wiring Diagrams. Control circuit electrical schematics for the C410STI combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C510N $5.pdf',
    title: 'C360N / C410N / C510N Export Wiring Diagrams',
    slug: 'lurem-c360n-c410n-c510n-export-wiring-diagrams',
    overlayTitle: 'Lurem C360N / C410N / C510N — Export Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C360N, C410N and C510N combination woodworking machines in export bi-voltage configuration. Three-phase control circuit covering jointer-planer, spindle moulder and circular saw motor starting sequences with Q1/Q3 circuit breakers and F1/F2/F3 thermal protection. Dated November 1982.',
    seoDesc: 'Download the Lurem C360N / C410N / C510N Export Wiring Diagrams. Bi-voltage three-phase electrical schematics for the C360N, C410N and C510N combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C511 $5.pdf',
    title: 'C511 Wiring Diagrams',
    slug: 'lurem-c511-wiring-diagrams',
    overlayTitle: 'Lurem C511 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C511 combination woodworking machine. Three-phase jointer-planer/planer motor rated at 3.5 kW (380V, 1500/3000 rpm, 50 Hz) with motorised wood feed (Avance). Includes control circuit with safety interlocks for the infeed and outfeed tables.',
    seoDesc: 'Download the Lurem C511 Wiring Diagrams. Electrical schematics with motorised feed for the C511 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C517 $5.pdf',
    title: 'C517 Wiring Diagrams',
    slug: 'lurem-c517-wiring-diagrams',
    overlayTitle: 'Lurem C517 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C517 combination woodworking machine. Complex multi-function control circuit covering jointer-planer with mortiser, two-speed spindle moulder (low/high speed), circular saw and spindle moulder brake and locking circuits. Includes individual stop buttons, chip guard and table safety interlocks.',
    seoDesc: 'Download the Lurem C517 Wiring Diagrams. Multi-function electrical schematics with mortiser, two-speed spindle moulder and safety interlocks for the C517 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM CB 310RL $5.pdf',
    title: 'CB310RL Wiring Diagrams',
    slug: 'lurem-cb310rl-wiring-diagrams',
    overlayTitle: 'Lurem CB310RL — Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V power circuit wiring diagrams for the LUREM CB310RL combination woodworking machine. Three motors rated at 3 kW (4 hp) with spindle moulder rotation reversal inverter. Includes 115V/30VA + 12V/5VA control transformer. Updated March 2001.',
    seoDesc: 'Download the Lurem CB310RL Wiring Diagrams. Three-phase 380V electrical schematics with spindle moulder rotation inverter for the CB310RL combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM CB 310RLX $5.pdf',
    title: 'CB310RLX Wiring Diagrams',
    slug: 'lurem-cb310rlx-wiring-diagrams',
    overlayTitle: 'Lurem CB310RLX — Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V power circuit wiring diagrams for the LUREM CB310RLX combination woodworking machine. Three motors rated at 3 kW (4 hp) with spindle moulder rotation reversal inverter. Includes 115V/30VA + 12V/5VA control transformer. Updated March 2001.',
    seoDesc: 'Download the Lurem CB310RLX Wiring Diagrams. Three-phase 380V electrical schematics with spindle moulder rotation inverter for the CB310RLX combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM CB 410RLX $5.pdf',
    title: 'CB410RLX Wiring Diagrams',
    slug: 'lurem-cb410rlx-wiring-diagrams',
    overlayTitle: 'Lurem CB410RLX — Wiring Diagrams',
    price: 500,
    description: 'Three-phase power circuit wiring diagrams for the LUREM CB410RLX combination woodworking machine. Three motors rated at 3 kW for jointer-planer/planer, spindle moulder and circular saw. Includes control transformer and thermal protection. Updated March 2002.',
    seoDesc: 'Download the Lurem CB410RLX Wiring Diagrams. Three-phase electrical schematics for the CB410RLX combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM CB310-CB260 $5.pdf',
    title: 'CB310 / CB260 Control Circuit Wiring Diagrams',
    slug: 'lurem-cb310-cb260-wiring-diagrams',
    overlayTitle: 'Lurem CB310 / CB260 — Control Circuit Wiring Diagrams',
    price: 500,
    description: 'Electrical control circuit wiring diagrams for the LUREM CB310 and CB260 combination woodworking machines. 115V control circuit covering mortiser/planer, circular saw, spindle moulder and jointer-planer functions. Includes safety interlocks for belt guard access, chip guard, infeed and outfeed tables. Optional Former 260/310s surface planer wiring included.',
    seoDesc: 'Download the Lurem CB310 / CB260 Wiring Diagrams. 115V control circuit electrical schematics for the CB310 and CB260 combination woodworking machines.',
  },
  {
    file: 'Schémas Lurem LC 260 $5.pdf',
    title: 'LC260 Wiring Diagrams',
    slug: 'lurem-lc260-wiring-diagrams',
    overlayTitle: 'Lurem LC260 — Wiring Diagrams',
    price: 500,
    description: 'Three-phase electrical wiring diagrams for the LUREM LC260 combination woodworking machine. Single 1.5 kW braked motor at 3000 rpm (220/380V, 50 Hz) with 1 N·m electromagnetic brake. Shows spindle moulder, jointer-planer and circular saw circuits controlled by a two-position selector switch. Dated January 1992.',
    seoDesc: 'Download the Lurem LC260 Wiring Diagrams. Three-phase electrical schematics with electromagnetic brake for the LC260 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM CB 310HZ $5.pdf',
    title: 'CB310 Hz Electrical Parts List',
    slug: 'lurem-cb310hz-electrical-parts-list',
    overlayTitle: 'Lurem CB310 Hz — Electrical Parts List',
    price: 500,
    description: 'Electrical components reference for the LUREM CB310 Hz combination woodworking machine with variable frequency drive. Complete parts list with reference numbers and suppliers (Schneider, ABB, Baco, Leroy-Somer), covering frequency inverters (ATV 11/ATV 31), contactors, safety switches, push buttons and brake motors.',
    seoDesc: 'Download the Lurem CB310 Hz Electrical Parts List. Complete electrical components reference with Schneider, ABB and Leroy-Somer references for the CB310 Hz woodworking machine.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 1C — 10 Schemas $5 (C410sti → CB310HZ) ===');
  console.log('    (CB310SL exclu — PDF corrompu)\n');

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
