// Import EMCO machines (12 documents, rotation normalization included)
// EMCO brand already exists in DB (ID: 7261ff4a-9840-4f3c-9a2e-ab59d3209606)
// Note: EMCO_STAR_3000.pdf is a duplicate of EMCO_STAR_3000_DE_EN_FR_SP.pdf → skipped
// Usage: node scripts/import-emco.mjs

import { readFileSync, existsSync, mkdirSync } from 'fs';
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

const BASE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/EMCO';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';
const BRAND_ID = '7261ff4a-9840-4f3c-9a2e-ab59d3209606'; // EMCO brand, already exists

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

  const distinctRots = [...new Set(rotations.filter(r => r !== 0))];
  console.log(`   Normalisation rotation: [${distinctRots.join(', ')}]°`);

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

    // New page size: dimensions swap for 90°/270°
    const newW = (rot === 90 || rot === 270) ? h : w;
    const newH = (rot === 90 || rot === 270) ? w : h;
    const newPage = dst.addPage([newW, newH]);

    // Remove rotation metadata before embedding so we get raw content
    srcPage.setRotation(degrees(0));
    const [embedded] = await dst.embedPages([srcPage]);

    // Apply inverse rotation to bake content into correct orientation
    // (x, y) = translation anchor; rotAngle in pdf-lib CCW convention
    let x, y, rotAngle;
    if (rot === 90)       { x = 0; y = w;  rotAngle = -90;  }
    else if (rot === 180) { x = w; y = h;  rotAngle = -180; }
    else                  { x = h; y = 0;  rotAngle =  90;  } // 270° CW = 90° CCW

    newPage.drawPage(embedded, { x, y, width: w, height: h, rotate: degrees(rotAngle) });
  }

  const saved = await dst.save();
  return Buffer.from(saved);
}

async function generatePreview(pdfBytes, overlayTitle, forceOverlay = false) {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    if (!forceOverlay) for (let p = 1; p <= Math.min(5, doc.numPages); p++) {
      const page = await doc.getPage(p);
      const scale = 800 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
      factory.destroy(cc);
      if (buf.length > 30000) { if (p > 1) console.log(`   (page ${p})`); return buf; }
    }
    // Overlay (fallback ou forcé)
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
    ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 36px Arial';
    const words = overlayTitle.split(' ');
    let lines = [], line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
    const lH = 44, sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, sY + i * lH));
    const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
    factory.destroy(cc);
    console.log(`   (overlay: "${overlayTitle}")`);
    return buf;
  } catch (e) { console.warn('   ⚠ Preview error:', e.message); return null; }
}

async function getPageCount(pdfBytes) {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    return doc.numPages;
  } catch (e) { return null; }
}

async function importDoc(doc) {
  console.log(`\n   [${doc.slug}]`);
  console.log(`   ${doc.title} — $${(doc.price / 100).toFixed(2)}`);
  try {
    // Read and normalize PDF
    const rawBytes = readFileSync(`${BASE}/${doc.file}`);
    const pdfBytes = await normalizePdfRotation(rawBytes);
    const pageCount = await getPageCount(pdfBytes);

    // Generate preview from normalized bytes
    const previewJpeg = await generatePreview(pdfBytes, doc.overlayTitle, doc.forceOverlay || false);
    if (!previewJpeg) { console.log('   ✗ Preview échouée'); return false; }

    // Upload preview
    const previewPath = `previews/${doc.slug}.jpg`;
    const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
    if (prevErr) { console.warn('   ⚠ Preview upload:', prevErr.message); return false; }
    const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

    // Upload normalized PDF to R2
    const r2Key = `documents/${doc.slug}.pdf`;
    await r2.send(new PutObjectCommand({ Bucket: 'service-manuals-documents', Key: r2Key, Body: pdfBytes, ContentType: 'application/pdf' }));

    // Insert DB record
    const { data: dbDoc, error: docErr } = await supabase.from('documents').insert({
      title: doc.title, slug: doc.slug, description: doc.description,
      category_id: CAT_ID, brand_id: BRAND_ID, price: doc.price,
      file_path: r2Key, file_size: pdfBytes.length, page_count: pageCount,
      preview_url: previewUrlData.publicUrl,
      seo_title: `${doc.title} | Service Manuals Pro`,
      seo_description: doc.seoDesc,
      language: doc.language, active: true, featured: false,
    }).select().single();

    if (docErr) { console.error('   ✗ DB:', docErr.message); return false; }
    console.log(`   ✓ Créé: /docs/${dbDoc.slug} (${pageCount}p, ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB)`);
    return true;
  } catch (e) { console.error(`   ✗ Erreur: ${e.message}`); return false; }
}

const docs = [
  {
    file: 'EMCO Mulitstar.pdf',
    title: 'Emco Multistar Combination Woodworking Machine User Manual',
    slug: 'emco-multistar-combination-woodworking-machine-user-manual',
    overlayTitle: 'Emco Multistar — User Manual',
    forceOverlay: true, // page 1 scannée en paysage, inutilisable comme preview
    price: 1500, language: 'en',
    description: 'User manual for the Emco Multistar combination woodworking machine (N° 23-48-030-00). The Multistar is a multi-function woodworking machine combining circular saw, jointer, thicknesser, and router functions. CE certified (EC Test Certificate 0070 050 C 5047 10 94, issued by INRS). Multilingual document.',
    seoDesc: 'Download the Emco Multistar Combination Woodworking Machine User Manual. Setup, operating and maintenance instructions.',
  },
  {
    file: 'EMCO_STAR_3000_DE_EN_FR_SP.pdf',
    title: 'Emco Star 3000 Junior Combination Woodworking Machine User Manual',
    slug: 'emco-star-3000-junior-combination-woodworking-machine-user-manual',
    overlayTitle: 'Emco Star 3000 Junior — User Manual',
    price: 1500, language: 'en',
    description: 'User manual for the Emco Star 3000 Junior Fant combination woodworking machine (N° 23-90-030-00). Covers general safety recommendations, dimensions and installation, assembly, electrical connection and wiring diagram, technical specifications, and operating sections for circular saw (scie circulaire), jointer (dégauchisseuse), thicknesser (raboteuse), and router (défonceuse) with detailed safety requirements, description, guard setup, and operating procedures for each function. Multilingual: German, English, French, Spanish.',
    seoDesc: 'Download the Emco Star 3000 Junior Combination Woodworking Machine User Manual. Multilingual operating instructions for all four functions.',
  },
  {
    file: 'Emco DB5.pdf',
    title: 'Emco DB-5 Wood Lathe Betriebsanleitung & Serviceteile',
    slug: 'emco-db-5-wood-lathe-betriebsanleitung-serviceteile',
    overlayTitle: 'Emco DB-5 — Betriebsanleitung & Serviceteile',
    price: 1500, language: 'de',
    description: 'German-language operating instructions and service parts (Betriebsanleitung & Serviceteile) for the Emco DB-5 wood lathe (Drechselbank). Covers safety precautions (Unfallverhütung), technical specifications (Spitzenweite 1000 mm, Spitzenhöhe 200 mm, turning diameter 400 mm over bed, 4 speeds: 600–2700 rpm, 0.55 kW motor), assembly and installation on stand, operating procedures, and illustrated service parts list. Ausgabe 7801, Ref. Nr. DE 2690. Document in German.',
    seoDesc: 'Download the Emco DB-5 Wood Lathe Betriebsanleitung & Serviceteile. German operating instructions and service parts.',
  },
  {
    file: 'Emco DB6.pdf',
    title: 'Emco DB-6 Wood Lathe Betriebsanleitung & Serviceteile',
    slug: 'emco-db-6-wood-lathe-betriebsanleitung-serviceteile',
    overlayTitle: 'Emco DB-6 — Betriebsanleitung & Serviceteile',
    price: 1500, language: 'de',
    description: 'German-language operating instructions and service parts (Betriebsanleitung & Serviceteile) for the Emco DB-6 wood lathe (Drechselbank). Covers safety precautions (Unfallverhütung), technical specifications (Spitzenweite 1000 mm, turning diameter 330 mm, 4 speeds at 50 Hz: 550/910/1500/2500 rpm, 1 kW motor), operating procedures, and illustrated service parts list. Best.-Nr. DE6 430, multiple editions from 1985 to 1992. Document in German.',
    seoDesc: 'Download the Emco DB-6 Wood Lathe Betriebsanleitung & Serviceteile. German operating instructions and service parts.',
  },
  {
    file: 'Emco DB7.pdf',
    title: 'Emco DB-7 Drechselbank Betriebsanleitung',
    slug: 'emco-db-7-drechselbank-betriebsanleitung',
    overlayTitle: 'Emco DB-7 Drechselbank — Betriebsanleitung',
    price: 1500, language: 'de',
    description: 'German-language Betriebsanleitung for the Emco Drechselbank DB 7 wood lathe. Covers safety precautions (Unfallverhütung), technical specifications (Spitzenweite 1000 mm, turning diameter 330 mm, 4 speeds at 50 Hz: 550/910/1500/2500 rpm, 1 kW motor, IP 54 protection class), operating procedures, and safety electrical standards (VDE 0113 and 0740). Ausgabe 89-8, Ref. Nr. DE6 438. Document in German.',
    seoDesc: 'Download the Emco DB-7 Drechselbank Betriebsanleitung. German operating instructions for the DB-7 wood lathe.',
  },
  {
    file: 'Emco Rex B20.pdf',
    title: 'Emco-Rex B20 Planing and Thicknessing Machine Operating Instructions',
    slug: 'emco-rex-b20-planing-thicknessing-machine-operating-instructions',
    overlayTitle: 'Emco-Rex B20 — Operating Instructions',
    price: 1500, language: 'en',
    description: 'Operating instructions for the Emco-Rex B20 Planing and Thicknessing Machine. Covers machine stand assembly with dimensioned sketch for a self-built worktable, preparation for operation, electrical connection, surfacing (jointing) procedures with accident prevention guidance, thicknessing procedures with safety precautions, straight-edge knife sharpening and replacement, machine maintenance, wiring diagrams for flanged motors (single and three-phase), and illustrated spare parts list.',
    seoDesc: 'Download the Emco-Rex B20 Planing and Thicknessing Machine Operating Instructions. Assembly, surfacing, thicknessing and spare parts.',
  },
  {
    file: 'Emco STAR et REX.pdf',
    title: 'Emco Star & Rex Machine à Bois Multiple Mode d\'Emploi',
    slug: 'emco-star-rex-machine-bois-multiple-mode-emploi',
    overlayTitle: 'Emco Star & Rex — Mode d\'Emploi',
    price: 1500, language: 'fr',
    description: 'French-language user manual for the Emco Star combination woodworking machine and Emco Rex jointer-planer. Covers 16 woodworking operations with professional precision: circular saw, band saw, scroll saw, oscillating saw, belt and disc sanding, routing, jointing, and planing. Includes assembly and installation, operating procedures for all functions, and safety precautions. Document in French.',
    seoDesc: 'Download the Emco Star & Rex Machine à Bois Multiple user manual in French. Assembly and operating instructions for all 16 functions.',
  },
  {
    file: 'Emco TF10.pdf',
    title: 'Emco Woodworker TF 10 Tischfräse Betriebsanleitung',
    slug: 'emco-woodworker-tf-10-tischfrase-betriebsanleitung',
    overlayTitle: 'Emco TF 10 Tischfräse — Betriebsanleitung',
    price: 1500, language: 'de',
    description: 'German-language Betriebsanleitung for the Emco Woodworker TF 10 table router (Tischfräse). Covers safety requirements and safety devices, technical specifications, assembly including stand mounting, spindle setup and cutter guard, fence and stop adjustment, routing and milling operating procedures, tool mounting for various cutter types, maintenance instructions, and electrical equipment specifications. CE compliant per EG-Richtlinie 89/392/EWG. Ausgabe 1994, Ref. Nr. DE 6235. Document in German.',
    seoDesc: 'Download the Emco Woodworker TF 10 Tischfräse Betriebsanleitung. German operating instructions for the TF 10 table router.',
  },
  {
    file: 'Emco_STAR & REX.pdf',
    title: 'Emco Star & Rex Machine à Bois Multiple Mode d\'Emploi (Éd. 7809)',
    slug: 'emco-star-rex-machine-bois-multiple-mode-emploi-ed-7809',
    overlayTitle: 'Emco Star & Rex — Mode d\'Emploi',
    price: 1500, language: 'fr',
    description: 'French-language user manual for the Emco Star combination woodworking machine and Emco Rex jointer-planer (Edition 7809, Ref. FET 820). Covers 16 woodworking operations with professional precision: circular saw, band saw, scroll saw, oscillating saw, belt and disc sanding, routing, jointing, and planing. Includes assembly installation and operating procedures for each function. Document in French.',
    seoDesc: 'Download the Emco Star & Rex user manual in French (Edition 7809). Assembly and operating instructions for all 16 woodworking operations.',
  },
  {
    file: 'Emco_Star_Rex_Betriebsanl.pdf',
    title: 'Emco Star & Rex Holzbearbeitungsmaschine Betriebsanleitung',
    slug: 'emco-star-rex-holzbearbeitungsmaschine-betriebsanleitung',
    overlayTitle: 'Emco Star & Rex — Betriebsanleitung',
    price: 1500, language: 'de',
    description: 'German-language Betriebsanleitung for the Emcostar combination woodworking machine and Emco Rex jointer/thicknesser (Abrichte- und Dicktenhobelmaschine). Covers 16 different woodworking operations (16 verschiedene Arbeitsmöglichkeiten), safety requirements, assembly and setup, and operating procedures for all functions. Includes a safety supplement (Zusatz) for BRO compliance per Maschinenschutzgesetz and TÜV regulations, covering scroll saw safety and simultaneous tool operation restrictions. Document in German.',
    seoDesc: 'Download the Emco Star & Rex Holzbearbeitungsmaschine Betriebsanleitung. German operating instructions for all 16 woodworking functions.',
  },
  {
    file: 'Emco_Star_Swedish.pdf',
    title: 'Emcostar Träbearbetningsmaskin Instruktionsbok',
    slug: 'emcostar-trabearbetningsmaskin-instruktionsbok',
    overlayTitle: 'Emcostar — Instruktionsbok',
    price: 1500, language: 'sv',
    description: 'Swedish-language instruction book (Instruktionsbok) for the Emcostar woodworking combination machine (träbearbetningsmaskin), distributed by VerktygLuna (Alingsås, Sweden). Covers machine assembly and setup, operating procedures for circular saw (cirkelsåg), band saw, scroll saw, and other functions, maintenance, and safety precautions. Document in Swedish.',
    seoDesc: 'Download the Emcostar Träbearbetningsmaskin Instruktionsbok. Swedish operating instructions for the Emcostar combination machine.',
  },
  {
    file: 'Emco_Unimat_3_spanisch_franzoesisch.pdf',
    title: 'Emco Unimat 3 Mode d\'Emploi / Modo de Empleo',
    slug: 'emco-unimat-3-mode-emploi-modo-de-empleo',
    overlayTitle: 'Emco Unimat 3 — Mode d\'Emploi',
    price: 1500, language: 'fr',
    description: 'Bilingual user manual (French and Spanish) for the Emco Unimat 3 universal mini machine tool. The Unimat 3 is a precision lathe that quickly converts into a drill press, milling machine, or grinder. Covers the full range of machining operations on steel, plastic, and wood, accessories for routing, circular sawing, scroll sawing, surface planing, and profile milling, operating procedures, and specifications for the two-speed universal motor. Ref. VS2 031, Edition 7708. Available in French and Spanish.',
    seoDesc: 'Download the Emco Unimat 3 user manual in French and Spanish. Universal mini machine tool for lathe, drill, milling, and grinding operations.',
  },
];

async function run() {
  console.log('=== Import EMCO (12 documents, normalisation rotation) ===\n');
  console.log(`Brand EMCO existante: ${BRAND_ID}\n`);

  let ok = 0, err = 0;
  for (const doc of docs) {
    const success = await importDoc(doc);
    success ? ok++ : err++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Documents importés : ${ok}/${docs.length}`);
  console.log(`Erreurs            : ${err}`);
  console.log('\n✅ Import EMCO terminé!');
}

run().catch(console.error);
