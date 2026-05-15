// Import Lot 1A — 11 Schemas LUREM $5 (C2000 → C310i)
// Preview : crop quart central (25%→75% X et Y) à 1600px
// Usage: node scripts/import-lurem-lot-1a.mjs

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
    file: 'Schemas LUREM C2000 $5.pdf',
    title: 'C2000 / C2100 Wiring Diagrams',
    slug: 'lurem-c2000-c2100-wiring-diagrams',
    overlayTitle: 'Lurem C2000 / C2100 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C2000 and C2100 combination woodworking machines. Single-phase 220V single-motor configuration rated at 1.1 kW. Shows motor wiring, 30 µF + 40 µF run capacitors, spindle moulder brake circuit and contactors. Dated July 1985.',
    seoDesc: 'Download the Lurem C2000 / C2100 Wiring Diagrams. Single-phase 220V electrical schematics for the C2000 and C2100 combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C2100 $5.pdf',
    title: 'C2000 / C2100 Electrical Parts Reference',
    slug: 'lurem-c2000-c2100-electrical-parts-reference',
    overlayTitle: 'Lurem C2000 / C2100 — Electrical Parts Reference',
    price: 500,
    description: 'Electrical components reference for the LUREM C2000 and C2100 combination woodworking machines. Lists all electrical parts with manufacturer references from CGE, Telemecanique, Schneider and Legrand. Covers both single-phase 220V and three-phase 380V configurations.',
    seoDesc: 'Download the Lurem C2000 / C2100 Electrical Parts Reference. Complete components list with CGE, Telemecanique, Schneider and Legrand references for 220V and 380V configurations.',
  },
  {
    file: 'Schemas LUREM C2600 $5.pdf',
    title: 'C2600 Wiring Diagrams',
    slug: 'lurem-c2600-wiring-diagrams',
    overlayTitle: 'Lurem C2600 — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C2600 combination woodworking machine. Single-phase 220V configuration with a 1.5 kW motor at 2850 rpm. Shows motor wiring, run capacitors and control circuit.',
    seoDesc: 'Download the Lurem C2600 Wiring Diagrams. Single-phase 220V electrical schematics for the C2600 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C2600 plus $5.pdf',
    title: 'C2000S / C2600S Three-Phase Wiring Diagrams',
    slug: 'lurem-c2000s-c2600s-three-phase-wiring-diagrams',
    overlayTitle: 'Lurem C2000S / C2600S — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase electrical wiring diagrams for the LUREM C2000S and C2600S combination woodworking machines. Covers 220/380V dual-voltage brake motor rated at 2.2 kW. Shows power circuit, brake wiring and control contactors.',
    seoDesc: 'Download the Lurem C2000S / C2600S Wiring Diagrams. Three-phase 220/380V electrical schematics with brake motor for the C2000S and C2600S combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C2600S $5.pdf',
    title: 'C2600 Electrical Parts Reference',
    slug: 'lurem-c2600-electrical-parts-reference',
    overlayTitle: 'Lurem C2600 — Electrical Parts Reference',
    price: 500,
    description: 'Electrical components reference for the LUREM C2600 series combination woodworking machines. Detailed parts nomenclature listing contactors, relays, switches and wiring components with manufacturer references.',
    seoDesc: 'Download the Lurem C2600 Electrical Parts Reference. Electrical components nomenclature for the C2600 series combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C263 $5.pdf',
    title: 'C263 Wiring Diagrams',
    slug: 'lurem-c263-wiring-diagrams',
    overlayTitle: 'Lurem C263 — Wiring Diagrams',
    price: 500,
    description: 'Single-phase 220V electrical wiring diagrams for the LUREM C263 combination woodworking machine. Three-motor configuration with jointer-planer, circular saw and spindle moulder motors each rated at 1.8 kW. Includes run capacitors and contactor wiring.',
    seoDesc: 'Download the Lurem C263 Wiring Diagrams. Single-phase 220V three-motor electrical schematics for the C263 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C265 $5.pdf',
    title: 'C265 Wiring Diagrams',
    slug: 'lurem-c265-wiring-diagrams',
    overlayTitle: 'Lurem C265 — Wiring Diagrams',
    price: 500,
    description: 'Single-phase 220V electrical wiring diagrams for the LUREM C265 combination woodworking machine. Two-speed motor configuration rated at 1.3/1.7 kW (1500/3000 rpm) with BBC 9A thermal protection. Includes speed-switching contactors and run capacitors.',
    seoDesc: 'Download the Lurem C265 Wiring Diagrams. Single-phase two-speed motor electrical schematics for the C265 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C266 $5.pdf',
    title: 'C266 Wiring Diagrams',
    slug: 'lurem-c266-wiring-diagrams',
    overlayTitle: 'Lurem C266 — Wiring Diagrams',
    price: 500,
    description: 'Single-phase 220V electrical wiring diagrams for the LUREM C266 combination woodworking machine. Three-motor configuration with jointer-planer, circular saw and spindle moulder motors each rated at 1.8 kW. Shows 3×40 µF run capacitors and S15/SP17 contactors.',
    seoDesc: 'Download the Lurem C266 Wiring Diagrams. Single-phase 220V three-motor electrical schematics with S15/SP17 contactors for the C266 combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C310SX $5.pdf',
    title: 'C310SX Three-Phase Wiring Diagrams',
    slug: 'lurem-c310sx-wiring-diagrams',
    overlayTitle: 'Lurem C310SX — Three-Phase Wiring Diagrams',
    price: 500,
    description: 'Three-phase 380V electrical wiring diagrams for the LUREM C310SX combination woodworking machine. Main motor rated at 3 kW (4 hp). Shows 110V control circuit with KM1, KM2 and KM3 contactors. Dated September 1994.',
    seoDesc: 'Download the Lurem C310SX Wiring Diagrams. Three-phase 380V electrical schematics for the C310SX combination woodworking machine.',
  },
  {
    file: 'Schemas LUREM C310e-260e $5.pdf',
    title: 'C260e / C310e Wiring Diagrams',
    slug: 'lurem-c260e-c310e-wiring-diagrams',
    overlayTitle: 'Lurem C260e / C310e — Wiring Diagrams',
    price: 500,
    description: 'Electrical wiring diagrams for the LUREM C260e and C310e combination woodworking machines. Includes 115V control circuit and optional Former 260/310s surface planer wiring. Covers power and control sections for both models.',
    seoDesc: 'Download the Lurem C260e / C310e Wiring Diagrams. Electrical schematics with 115V control circuit for the C260e and C310e combination woodworking machines.',
  },
  {
    file: 'Schemas LUREM C310i $5.pdf',
    title: 'C310i Wiring Diagrams',
    slug: 'lurem-c310i-wiring-diagrams',
    overlayTitle: 'Lurem C310i — Wiring Diagrams',
    price: 500,
    description: 'Single-phase electrical wiring diagrams for the LUREM C310i combination woodworking machine. Three-motor configuration with 120 µF run capacitors. Shows individual motor circuits with thermal protection and contactor wiring.',
    seoDesc: 'Download the Lurem C310i Wiring Diagrams. Single-phase three-motor electrical schematics for the C310i combination woodworking machine.',
  },
];

async function run() {
  console.log('=== Import LUREM Lot 1A — 11 Schemas $5 ===\n');

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
