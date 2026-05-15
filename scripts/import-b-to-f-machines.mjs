// Import Machines B to F (Bridgeport, Delta, DeWalt, Einhell, Elektra, Erphi, Evolution, Felder, Fox)
// Usage: node scripts/import-b-to-f-machines.mjs

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

const BASE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9'; // Machine Tools

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
  const distinctRots = [...new Set(rotations.filter(r => r !== 0))];
  console.log(`   Normalisation rotation: [${distinctRots.join(', ')}]°`);
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
    let x, y, rotAngle;
    if (rot === 90)       { x = 0; y = w;  rotAngle = -90;  }
    else if (rot === 180) { x = w; y = h;  rotAngle = -180; }
    else                  { x = h; y = 0;  rotAngle =  90;  }
    newPage.drawPage(embedded, { x, y, width: w, height: h, rotate: degrees(rotAngle) });
  }
  return Buffer.from(await dst.save());
}

async function generatePreview(pdfBytes, overlayTitle) {
  try {
    const data = new Uint8Array(pdfBytes);
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    for (let p = 1; p <= Math.min(5, doc.numPages); p++) {
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
    // Overlay fallback
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
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = w; } else line = test;
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

async function getOrCreateBrand(name, slug) {
  const { data: existing } = await supabase.from('brands').select('id').eq('slug', slug).eq('category_id', CAT_ID).single();
  if (existing) { console.log(`   Brand "${name}" existante: ${existing.id}`); return existing.id; }
  const { data, error } = await supabase.from('brands').insert({ name, slug, category_id: CAT_ID }).select().single();
  if (error) { console.error(`   Erreur brand "${name}":`, error.message); process.exit(1); }
  console.log(`   ✓ Brand "${name}" créée: ${data.id}`);
  return data.id;
}

async function importDoc(doc, brandId) {
  console.log(`\n   [${doc.slug}]`);
  console.log(`   ${doc.title} — $${(doc.price / 100).toFixed(2)}`);
  try {
    // Read and normalize PDF rotation
    const rawBytes = readFileSync(doc.pdfPath);
    const pdfData = await normalizePdfRotation(rawBytes);

    const previewJpeg = await generatePreview(pdfData, doc.overlayTitle);
    if (!previewJpeg) { console.log('   ✗ Preview échouée'); return false; }

    const previewPath = `previews/${doc.slug}.jpg`;
    const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
    if (prevErr) { console.warn('   ⚠ Preview upload:', prevErr.message); return false; }
    const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

    const r2Key = `documents/${doc.slug}.pdf`;
    await r2.send(new PutObjectCommand({ Bucket: 'service-manuals-documents', Key: r2Key, Body: pdfData, ContentType: 'application/pdf' }));

    const pageCount = await getPageCount(pdfData);

    const { data: dbDoc, error: docErr } = await supabase.from('documents').insert({
      title: doc.title, slug: doc.slug, description: doc.description,
      category_id: CAT_ID, brand_id: brandId, price: doc.price,
      file_path: r2Key, file_size: pdfData.length, page_count: pageCount,
      preview_url: previewUrlData.publicUrl,
      seo_title: `${doc.title} | Service Manuals Pro`,
      seo_description: doc.seoDesc,
      language: doc.language, active: true, featured: false,
    }).select().single();

    if (docErr) { console.error('   ✗ DB:', docErr.message); return false; }
    console.log(`   ✓ Créé: /docs/${dbDoc.slug}`);
    return true;
  } catch (e) { console.error(`   ✗ Erreur: ${e.message}`); return false; }
}

// ── Document list ──────────────────────────────────────────────────────────────
const brands = [
  {
    name: 'Bridgeport', slug: 'bridgeport',
    docs: [
      {
        file: 'BRIDGEPORT/bridgeport-manual.pdf',
        title: 'Bridgeport Milling Machine Instruction Manual',
        slug: 'bridgeport-milling-machine-instruction-manual',
        overlayTitle: 'Bridgeport Milling Machine — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Instruction manual for the Bridgeport milling machine. Covers installation (handling, cleaning, floor plan, foundation, power supply), ancillary equipment, machine controls and J-Head/2J2-Head/M-Head/E-Head controls, mechanical and variable table feed, Heidenhain digital readout, lubrication, and maintenance procedures including table screw and cross screw assemblies, gib strip adjustment, belt and brake shoe replacement, and quill removal.',
        seoDesc: 'Download the Bridgeport Milling Machine Instruction Manual. Installation, controls, lubrication and maintenance procedures.',
      },
    ],
  },
  {
    name: 'Delta', slug: 'delta',
    docs: [
      {
        file: 'DELTA/Delta 40-530C scie a chantourner.pdf',
        title: 'Delta 40-530C Scroll Saw User Manual',
        slug: 'delta-40-530c-scroll-saw-user-manual',
        overlayTitle: 'Delta 40-530C — User Manual',
        price: 1500, language: 'fr',
        description: 'User manual for the Delta 40-530C 16-inch scroll saw (scie à chantourner). Covers safety rules, specific scroll saw safety precautions, unpacking and cleaning, assembly instructions, fixing to a supporting surface, extension cord selection, electrical connection, grounding instructions, blade installation and tensioning, operating procedures, and maintenance. Document in French.',
        seoDesc: 'Download the Delta 40-530C Scroll Saw User Manual. Assembly, blade installation and operating instructions.',
      },
    ],
  },
  {
    name: 'DeWalt', slug: 'dewalt',
    docs: [
      {
        file: 'DeWALT/DeWalt DW1251 scie radiale.pdf',
        title: 'DeWalt DW1251 Radial Arm Saw Adjustment & Operating Instructions',
        slug: 'dewalt-dw1251-radial-arm-saw-adjustment-operating-instructions',
        overlayTitle: 'DeWalt DW1251 — Adjustment & Operating Instructions',
        price: 1500, language: 'en',
        description: 'Adjustment and operating instructions for the DeWalt Powershop Radial Arm Saw DW1251 (also covers DW1501, DW1503). Covers all machine controls identification (mitre scale and clamp, yoke, bevel clamp and scale, elevating handle, column), initial setup and alignment adjustments, and safe operating instructions. Part No. 822503.',
        seoDesc: 'Download the DeWalt DW1251 Radial Arm Saw Adjustment & Operating Instructions. Controls, setup and alignment procedures.',
      },
      {
        file: 'DeWALT/DeWalt DW728-729 scie radiale.pdf',
        title: 'DeWalt DW728 & DW729 Radial Arm Saw Instruction Manual',
        slug: 'dewalt-dw728-dw729-radial-arm-saw-instruction-manual',
        overlayTitle: 'DeWalt DW728 & DW729 — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Multilingual instruction manual for the DeWalt DW728 and DW729 radial arm saws. Covers assembly, setup, adjustment, operating procedures, safety rules, maintenance, and parts identification. Available in Danish, German, English, Spanish, French, Italian, Dutch, Norwegian, Portuguese, Finnish, Swedish, Turkish, and Greek.',
        seoDesc: 'Download the DeWalt DW728 & DW729 Radial Arm Saw Instruction Manual. Multilingual assembly, setup and operating instructions.',
      },
      {
        file: 'DeWALT/DeWalt dw721 scie radiale.pdf',
        title: 'DeWalt DW721 Radial Arm Saw Instruction Manual',
        slug: 'dewalt-dw721-radial-arm-saw-instruction-manual',
        overlayTitle: 'DeWalt DW721 — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Multilingual instruction manual for the DeWalt DW721 radial arm saw. Covers assembly, setup, adjustment, operating procedures, safety rules, maintenance, and parts identification. Available in Danish, German, English, Spanish, French, Italian, Dutch, Norwegian, Portuguese, Finnish, Swedish, Turkish, and Greek.',
        seoDesc: 'Download the DeWalt DW721 Radial Arm Saw Instruction Manual. Multilingual assembly, setup and operating instructions.',
      },
      {
        file: 'DeWALT/Dewalt DW 3401 3403 3501 3503 scie a ruban.pdf',
        title: 'DeWalt DW3401/3403/3501/3503 Band Saw Parts Manual',
        slug: 'dewalt-dw3401-3403-3501-3503-band-saw-parts-manual',
        overlayTitle: 'DeWalt DW3401/3403/3501/3503 — Parts Manual',
        price: 1500, language: 'en',
        description: 'Spare parts, wiring diagrams and accessories manual for the DeWalt DW3401, DW3403 (two-speed band saw) and DW3501, DW3503 (variable speed band saw). Covers illustrated mechanical parts lists for both models, single-phase and three-phase motor wiring diagrams, switch box diagram, special executions, and accessories catalogue.',
        seoDesc: 'Download the DeWalt DW3401/3403/3501/3503 Band Saw Parts Manual. Spare parts, wiring diagrams and accessories.',
      },
      {
        file: 'DeWALT/Dewalt DW110.pdf',
        title: 'DeWalt DW110 Power Shop Operating & Maintenance Manual',
        slug: 'dewalt-dw110-power-shop-operating-maintenance-manual',
        overlayTitle: 'DeWalt DW110 — Operating & Maintenance Manual',
        price: 1500, language: 'en',
        description: "Operating and maintenance manual for the DeWalt 10\" DW110 Power Shop radial arm saw. Covers safe operation rules, machine setup and adjustments, operating procedures for crosscut, ripping and special cuts, preventive maintenance, parts bulletin with illustrated parts list, and motor connection diagrams.",
        seoDesc: 'Download the DeWalt DW110 Power Shop Operating & Maintenance Manual. Setup, operation, maintenance and parts list.',
      },
      {
        file: 'DeWALT/Dewalt radial arm saw 5.pdf',
        title: 'DeWalt 12" Radial Arm Saw Type 5 Operations & Maintenance Manual',
        slug: 'dewalt-12in-radial-arm-saw-type-5-operations-maintenance-manual',
        overlayTitle: 'DeWalt 12" Radial Arm Saw Type 5 — Operations & Maintenance Manual',
        price: 1500, language: 'en',
        description: 'Operations and maintenance manual and parts bulletin for the DeWalt 12-inch Radial Arm Saw Type 5, Models 3512-01 and 3512-03 (s/n 20071031179 forward). Covers safe operation rules, setup, alignment, crosscutting and ripping operations, maintenance procedures, illustrated parts list, and parts bulletin.',
        seoDesc: 'Download the DeWalt 12" Radial Arm Saw Type 5 Operations & Maintenance Manual. Setup, operations and parts bulletin.',
      },
      {
        file: 'DeWALT/Dewalt radial arm saw 790.pdf',
        title: 'DeWalt No. 790 12" Radial Arm Saw Instruction Manual',
        slug: 'dewalt-no-790-12in-radial-arm-saw-instruction-manual',
        overlayTitle: 'DeWalt No. 790 12" Radial Arm Saw — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Instruction manual for the DeWalt No. 790 12-inch Radial Arm Saw (Cat. Nos. 7790/3431-3436, Type 41). Covers power connection and grounding, unpacking and setup, adjustments and alignment, operating instructions, rules for safe operation and maintenance, parts drawing and lists, and motor connection diagrams. Bulletin No. 8422.',
        seoDesc: 'Download the DeWalt No. 790 Radial Arm Saw Instruction Manual. Setup, alignment, operating and maintenance instructions.',
      },
      {
        file: 'DeWALT/dewalt DW125.pdf',
        title: 'DeWalt DW125 Radial Arm Saw Instruction Manual',
        slug: 'dewalt-dw125-radial-arm-saw-instruction-manual',
        overlayTitle: 'DeWalt DW125 — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Multilingual instruction manual for the DeWalt DW125 Powershop radial arm saw. Covers operation, adjustments, maintenance, and spare parts in English, French, German, Italian, and Dutch.',
        seoDesc: 'Download the DeWalt DW125 Radial Arm Saw Instruction Manual. Multilingual operation, adjustments and spare parts.',
      },
    ],
  },
  {
    name: 'Einhell', slug: 'einhell',
    docs: [
      {
        file: 'EINHELL/Einhell TC-SP 204 manuel.pdf',
        title: 'Einhell TC-SP 204 Original Instructions',
        slug: 'einhell-tc-sp-204-original-instructions',
        overlayTitle: 'Einhell TC-SP 204 — Original Instructions',
        price: 1500, language: 'en',
        description: 'Original instructions for the Einhell TC-SP 204 stationary thickness planer (raboteuse stationnaire). Multilingual document covering safety requirements, technical specifications, assembly, operating procedures, adjustment, maintenance, and troubleshooting. Available in German, French, Italian, Dutch, Spanish, and Portuguese.',
        seoDesc: 'Download the Einhell TC-SP 204 Original Instructions. Stationary planer assembly, operating and maintenance instructions.',
      },
    ],
  },
  {
    name: 'Elektra Beckum', slug: 'elektra-beckum',
    docs: [
      {
        file: 'ELEKTRA/Elektra Beckum BAS315.pdf',
        title: 'Elektra Beckum BAS 315 Band Saw Instruction Manual',
        slug: 'elektra-beckum-bas-315-band-saw-instruction-manual',
        overlayTitle: 'Elektra Beckum BAS 315 — Instruction Manual',
        price: 1500, language: 'en',
        description: 'Bilingual instruction manual (German/English) for the Elektra Beckum BAS 315 band saw (Bandsäge). Covers safety requirements, technical specifications, assembly and installation, blade changing and tensioning, fence and guide adjustment, operating procedures, and maintenance. Serial No. 09004 K.',
        seoDesc: 'Download the Elektra Beckum BAS 315 Band Saw Instruction Manual. Assembly, blade setup and operating instructions.',
      },
      {
        file: 'ELEKTRA/Elektra Beckum HC 260 M instruction.pdf',
        title: 'Elektra Beckum HC 260 M Betriebsanleitung',
        slug: 'elektra-beckum-hc-260-m-betriebsanleitung',
        overlayTitle: 'Elektra Beckum HC 260 M — Betriebsanleitung',
        price: 1500, language: 'de',
        description: 'German-language operating instructions (Betriebsanleitung) for the Elektra Beckum HC 260 M jointer-planer (Hobelmaschine). Covers safety requirements, technical specifications, assembly, jointing and planing operations, blade replacement, and maintenance procedures. Document in German.',
        seoDesc: 'Download the Elektra Beckum HC 260 M Betriebsanleitung. German operating instructions for the HC 260 M jointer-planer.',
      },
      {
        file: 'ELEKTRA/Elektra Beckum HC 260 manual.pdf',
        title: 'Elektra Beckum HC 260 Planer/Thicknesser Operating Instructions',
        slug: 'elektra-beckum-hc-260-planer-thicknesser-operating-instructions',
        overlayTitle: 'Elektra Beckum HC 260 — Operating Instructions',
        price: 1500, language: 'en',
        description: 'English operating instructions for the Elektra Beckum HC 260 Planer/Thicknesser combination machine. Covers safety precautions, technical specifications, assembly and installation, jointing and planing operating procedures, blade replacement, maintenance, and troubleshooting. Serial No. 11.004 M.',
        seoDesc: 'Download the Elektra Beckum HC 260 Planer/Thicknesser Operating Instructions. Assembly, operating and maintenance procedures.',
      },
      {
        file: 'ELEKTRA/Elektra Beckum bas 316g dnb.pdf',
        title: 'Elektra Beckum BAS 316G DNB & WNB Operating Instruction',
        slug: 'elektra-beckum-bas-316g-dnb-wnb-operating-instruction',
        overlayTitle: 'Elektra Beckum BAS 316G — Operating Instruction',
        price: 1500, language: 'en',
        description: 'Multilingual operating instruction for the Elektra Beckum BAS 316G DNB and BAS 316G WNB band saws (Metabo Germany). Covers safety requirements, technical specifications, assembly, blade installation and tensioning, fence and guide adjustment, operating procedures, and maintenance. Available in German, English, French, Italian, and Spanish.',
        seoDesc: 'Download the Elektra Beckum BAS 316G DNB & WNB Operating Instruction. Band saw assembly, blade setup and operating procedures.',
      },
    ],
  },
  {
    name: 'Erphi', slug: 'erphi',
    docs: [
      {
        file: 'ERPHI/ERPHI 561 combine bois Notice utilisation.pdf',
        title: 'Erphi Bloc Établi Combiné 561 User Manual',
        slug: 'erphi-bloc-etabli-combine-561-user-manual',
        overlayTitle: 'Erphi Combiné 561 — User Manual',
        price: 1500, language: 'fr',
        description: 'User manual for the Erphi Bloc Établi Combiné 561, a combination woodworking machine. Covers assembly (leg mounting), electrical connection for single-phase 220V and three-phase 220V/380V with earthing instructions, operating procedures for jointing (dégauchissage), planing (rabotage), circular sawing, and routing (toupillage) with cutter head mounting and depth adjustment. Document in French.',
        seoDesc: 'Download the Erphi Bloc Établi Combiné 561 User Manual. Assembly, electrical connection and operating procedures for all functions.',
      },
    ],
  },
  {
    name: 'Evolution', slug: 'evolution',
    docs: [
      {
        file: 'EVOLUTION/Evolution FURY5-S.pdf',
        title: 'Evolution FURY5-S Table Saw Original Instructions',
        slug: 'evolution-fury5-s-table-saw-original-instructions',
        overlayTitle: 'Evolution FURY5-S — Original Instructions',
        price: 1500, language: 'en',
        description: 'Original instructions for the Evolution FURY5-S table saw. Multilingual document covering safety requirements, machine specifications, assembly and installation, operating procedures for ripping and crosscutting, blade changing, fence and mitre gauge adjustment, dust extraction connection, maintenance, and troubleshooting. Published 01/03/2016, written in UK English.',
        seoDesc: 'Download the Evolution FURY5-S Table Saw Original Instructions. Assembly, operating and maintenance procedures.',
      },
    ],
  },
  {
    name: 'Felder', slug: 'felder',
    docs: [
      {
        file: 'FELDER/Felder Manuel S-308 F-38 F-48 V-3 V-4.pdf',
        title: 'Felder S-308 / F-38 / F-48 / V-3 / V-4 User Manual',
        slug: 'felder-s308-f38-f48-v3-v4-user-manual',
        overlayTitle: 'Felder S-308 / F-38 / F-48 / V-3 / V-4 — User Manual',
        price: 1500, language: 'fr',
        description: 'Multilingual user manual for Felder woodworking mortising and tenoning machines: S-308, F-38, F-48, V-3, and V-4. Covers CE conformity declaration, patented systems (SHS Money Saver, SPS Safety Slip Proof, PINS Safety Elastic Pin), assembly, operating procedures, adjustment, maintenance, and spare parts. Available in French, German, and English.',
        seoDesc: 'Download the Felder S-308/F-38/F-48/V-3/V-4 User Manual. Mortising machine assembly, operating and maintenance instructions.',
      },
      {
        file: 'FELDER/Felder-six-series-combi-planer-.pdf',
        title: 'Felder Six Series Combination Planer Operating Manual',
        slug: 'felder-six-series-combination-planer-operating-manual',
        overlayTitle: 'Felder Six Series Combination Planer — Operating Manual',
        price: 1500, language: 'en',
        description: 'Trilingual operating manual (German/French/English) for the Felder Six Series combination planer-thicknesser machines, covering models BF 6-26, BF 6-31, BF 6-41, AD 6-31, AD 6-41, KFS-37, K-37, F-38, KFS-6, and K-6. Covers safety requirements, technical specifications, assembly, jointing and planing procedures, blade replacement, adjustment, maintenance, and spare parts.',
        seoDesc: 'Download the Felder Six Series Combination Planer Operating Manual. Assembly, operating and maintenance instructions.',
      },
    ],
  },
  {
    name: 'Fox', slug: 'fox',
    docs: [
      {
        file: 'FOX/FOX 36-252B.pdf',
        title: 'Fox F36-252B Slide Compound Mitre Saw Exploded Diagram',
        slug: 'fox-f36-252b-slide-compound-mitre-saw-exploded-diagram',
        overlayTitle: 'Fox F36-252B — Exploded Diagram',
        price: 1500, language: 'en',
        description: 'Illustrated exploded diagram for the Fox F36-252B slide compound mitre saw. Shows all mechanical components with numbered part references for identification and ordering of spare parts.',
        seoDesc: 'Download the Fox F36-252B Slide Compound Mitre Saw Exploded Diagram. Illustrated parts breakdown for spare parts identification.',
      },
      {
        file: 'FOX/FOX F22-568 Manuel NEW VERSION.pdf',
        title: 'Fox F22-568 Planer/Thicknesser Assembly & Operating Instructions',
        slug: 'fox-f22-568-planer-thicknesser-assembly-operating-instructions',
        overlayTitle: 'Fox F22-568 — Assembly & Operating Instructions',
        price: 1500, language: 'en',
        description: 'Assembly and operating instructions for the Fox F22-568 250mm Planer/Thicknesser (Raboteuse/Dégauchisseuse). Covers safety precautions, technical specifications, machine assembly, parallel fence setup, jointing (dégauchissage) and planing (rabotage) procedures, blade replacement, maintenance, and spare parts list. Bilingual French/English.',
        seoDesc: 'Download the Fox F22-568 Planer/Thicknesser Assembly & Operating Instructions. Setup, jointing, planing and maintenance procedures.',
      },
      {
        file: 'FOX/FOX F36-252A.pdf',
        title: 'Fox F36-252A Slide Compound Mitre Saw Assembly & Operating Instructions',
        slug: 'fox-f36-252a-slide-compound-mitre-saw-assembly-operating-instructions',
        overlayTitle: 'Fox F36-252A — Assembly & Operating Instructions',
        price: 1500, language: 'en',
        description: 'Assembly and operating instructions for the Fox F36-252A 250mm Slide Compound Mitre Saw (Scie à onglet inclinable à déplacement radiale). Covers safety precautions, technical specifications, assembly, mitre and bevel angle adjustment, blade guard setup, crosscutting and bevel cutting procedures, maintenance, and spare parts list. Bilingual French/English.',
        seoDesc: 'Download the Fox F36-252A Slide Compound Mitre Saw Assembly & Operating Instructions. Setup, adjustment and operating procedures.',
      },
      {
        file: 'FOX/FOX F46-255 notice tour bois.pdf',
        title: 'Fox F46-255 Variable Speed Wood Lathe Assembly & Operating Instructions',
        slug: 'fox-f46-255-variable-speed-wood-lathe-assembly-operating-instructions',
        overlayTitle: 'Fox F46-255 — Assembly & Operating Instructions',
        price: 1500, language: 'en',
        description: 'Assembly and operating instructions for the Fox F46-255 Variable Speed Wood Lathe (Tour à bois à vitesse variable). Covers safety precautions, technical specifications, assembly, speed adjustment, tool rest setup, woodturning techniques, maintenance, and spare parts list. Bilingual French/English.',
        seoDesc: 'Download the Fox F46-255 Variable Speed Wood Lathe Assembly & Operating Instructions. Setup and operating procedures.',
      },
      {
        file: 'FOX/FOX F60-001 toupie-scie + assemblage combine bois F60-250.pdf',
        title: 'Fox F60-001 Combined Circular Saw/Spindle Shaper Assembly & Operating Instructions',
        slug: 'fox-f60-001-combined-circular-saw-spindle-shaper-assembly-operating-instructions',
        overlayTitle: 'Fox F60-001 — Assembly & Operating Instructions',
        price: 1500, language: 'en',
        description: 'Assembly and operating instructions for the Fox F60-001 Combined Circular Saw/Spindle Shaper (Toupie/Scie), including assembly instructions for the F60-250 combined woodworking machine. Covers safety precautions, specifications, saw and spindle shaper setup, blade and cutter guard adjustment, operating procedures for sawing and routing, and combination machine assembly. Bilingual French/English.',
        seoDesc: 'Download the Fox F60-001 Combined Circular Saw/Spindle Shaper Assembly & Operating Instructions. Setup and operating procedures.',
      },
    ],
  },
];

async function run() {
  console.log('=== Import Machines B to F ===\n');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  let totalOk = 0, totalErr = 0;

  for (const brand of brands) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`BRAND: ${brand.name}`);
    const brandId = await getOrCreateBrand(brand.name, brand.slug);

    for (const doc of brand.docs) {
      doc.pdfPath = `${BASE}/${doc.file}`;
      const ok = await importDoc(doc, brandId);
      ok ? totalOk++ : totalErr++;
    }
  }

  const total = brands.reduce((s, b) => s + b.docs.length, 0);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Documents importés : ${totalOk}/${total}`);
  console.log(`Erreurs            : ${totalErr}`);
  console.log('\n✅ Import B-F terminé!');
}

run().catch(console.error);
