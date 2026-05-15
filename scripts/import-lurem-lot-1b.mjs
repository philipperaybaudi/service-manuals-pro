// Import Lot 1B — 11 Schemas LUREM $5 (C310si → C417)
// Preview : crop quart central (25%→75% X et Y) à 1600px
// Usage: node scripts/import-lurem-lot-1b.mjs

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
    file: 'Schemas LUREM C310si $5.pdf',
    title: 'C310SI Three-Phase Wiring Diagrams',
    slug: 'lurem-c310si-wiring-diagrams',
    overlayTitle: 'Lurem C310SI — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V electrical wiring diagrams for the LUREM C310SI combination woodworking machine. Single 2.2 kW (3 hp) motor at 50 Hz with 115V/12V step-down transformer for the control circuit. Shows circular saw, jointer-planer and spindle moulder motor circuits with KM contactors and thermal protection. Dated August 1995.',
    seoDesc: 'Download the Lurem C310SI Wiring Diagrams. Three-phase 380V electrical schematics for the C310SI combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C310sti $5.pdf',
    title: 'C310STI Three-Phase Wiring Diagrams',
    slug: 'lurem-c310sti-wiring-diagrams',
    overlayTitle: 'Lurem C310STI — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V electrical wiring diagrams for the LUREM C310STI combination woodworking machine. Three independent 3 kW motors at 3000 rpm (220/380V) for jointer-planer, spindle moulder and circular saw, with individual KM1/KM2/KM3 contactors. Spindle moulder equipped with 1 N·m electromagnetic brake. Dated October 1991.',
    seoDesc: 'Download the Lurem C310STI Wiring Diagrams. Three-phase 380V three-motor electrical schematics for the C310STI combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C311 $5.pdf',
    title: 'C311 Three-Phase Wiring Diagrams',
    slug: 'lurem-c311-wiring-diagrams',
    overlayTitle: 'Lurem C311 — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase electrical wiring diagrams for the LUREM C311 combination woodworking machine. Two-speed jointer-planer motor rated at 3 kW (380V, 1500/3000 rpm, 50 Hz, ref. B11FO732). Includes power and control circuit sections with mortiser interlock, jointer-planer direction selector and spindle arbor micro-switch.',
    seoDesc: 'Download the Lurem C311 Wiring Diagrams. Three-phase two-speed motor electrical schematics for the C311 combination woodworking machine.',
  },
  {
    file: 'Schemas Lurem C315 $5.pdf',
    title: 'C315 Three-Phase Wiring Diagrams',
    slug: 'lurem-c315-wiring-diagrams',
    overlayTitle: 'Lurem C315 — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V electrical wiring diagrams for the LUREM C315 combination woodworking machine. Three-motor configuration with two-speed jointer-planer (1.9/2.2 kW, 1500/3000 rpm), two-speed spindle moulder (2.2/3 kW, 1500/3000 rpm) and circular saw (2.2 kW, 3000 rpm). Includes 380V control contactor and FO730/FO731 component references.',
    seoDesc: 'Download the Lurem C315 Wiring Diagrams. Three-phase 380V three-motor electrical schematics for the C315 combination woodworking machine.',
  },
  {
    file: 'Schemas Lurem C317 $5.pdf',
    title: 'C317 Three-Phase Wiring Diagrams',
    slug: 'lurem-c317-wiring-diagrams',
    overlayTitle: 'Lurem C317 — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V electrical wiring diagrams for the LUREM C317 combination woodworking machine. Three-motor configuration with two-speed jointer-planer (2.2/3 kW, 1500/3000 rpm), two-speed spindle moulder (2.2/3 kW, 1500/3000 rpm) and circular saw (3 kW, 220/380V). Includes FO730/FO731 component references and 380V control contactor.',
    seoDesc: 'Download the Lurem C317 Wiring Diagrams. Three-phase 380V three-motor electrical schematics for the C317 combination woodworking machine.',
  },
  {
    file: 'Schemas Lurem C360N C410N  C510N $5.pdf',
    title: 'C360N / C410N / C510N Wiring Diagrams',
    slug: 'lurem-c360n-c410n-c510n-wiring-diagrams',
    overlayTitle: 'Lurem C360N / C410N / C510N — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C360N, C410N and C510N combination woodworking machines. Three-phase control circuit covering jointer-planer, spindle moulder and circular saw motor starting sequences with Q1/Q3 circuit breakers and F1/F2/F3 thermal protection. Includes spindle moulder brake and locking circuits. Dated November 1982.',
    seoDesc: 'Download the Lurem C360N / C410N / C510N Wiring Diagrams. Three-phase electrical schematics for the C360N, C410N and C510N combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C410E $5.pdf',
    title: 'C410E Wiring Diagrams',
    slug: 'lurem-c410e-wiring-diagrams',
    overlayTitle: 'Lurem C410E — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C410E combination woodworking machine. Three-motor configuration covering circular saw, spindle moulder and jointer-planer circuits with individual motor starters and contactors.',
    seoDesc: 'Download the Lurem C410E Wiring Diagrams. Electrical schematics for the C410E combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C410S $5.pdf',
    title: 'C410S Wiring Diagrams',
    slug: 'lurem-c410s-wiring-diagrams',
    overlayTitle: 'Lurem C410S — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C410S combination woodworking machine. Single three-phase 220/380V jointer-planer motor rated at 3/3.5 kW, controlled by a BBC M633 drum switch (ref. B17 C17 965 EG). Includes control circuit with 0.5A fuse, interlock relay and locking contactor.',
    seoDesc: 'Download the Lurem C410S Wiring Diagrams. Electrical schematics with BBC M633 drum switch for the C410S combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C410SX $5.pdf',
    title: 'C410SX Wiring Diagrams',
    slug: 'lurem-c410sx-wiring-diagrams',
    overlayTitle: 'Lurem C410SX — Wiring Diagrams',
    price: 500,
    description: 'Three-phase electrical wiring diagrams for the LUREM C410SX combination woodworking machine. Four-circuit configuration covering jointer-planer, spindle moulder, circular saw and motorised wood feed (Avance Bois) with KM1 to KM4 contactors. Dated November 1993.',
    seoDesc: 'Download the Lurem C410SX Wiring Diagrams. Three-phase electrical schematics including motorised wood feed for the C410SX combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C411 $5.pdf',
    title: 'C411 Wiring Diagrams',
    slug: 'lurem-c411-wiring-diagrams',
    overlayTitle: 'Lurem C411 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C411 woodworking machine. Two-speed motor rated at 1 kW (380V, 1500/3000 rpm, ref. B11TF-1335). Shows power and control circuit sections with independent start/stop controls.',
    seoDesc: 'Download the Lurem C411 Wiring Diagrams. Electrical schematics with two-speed motor for the C411 woodworking machine.',
  },
  {
    file: 'Schemas LUREM C417 $5.pdf',
    title: 'C417 Wiring Diagrams',
    slug: 'lurem-c417-wiring-diagrams',
    overlayTitle: 'Lurem C417 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C417 combination woodworking machine. Complex multi-function control circuit covering jointer-planer with mortiser, two-speed spindle moulder (low/high speed), circular saw and spindle moulder brake and locking circuits. Includes individual stop buttons and safety interlocks for each function.',
    seoDesc: 'Download the Lurem C417 Wiring Diagrams. Multi-function electrical schematics with mortiser, two-speed spindle moulder and safety interlocks for the C417 combination woodworking machine.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 1B — 11 Schemas $5 (C310si → C417) ===\n');

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
