// Régénère les previews en pleine page (800px, sans crop)
// pour les 16 éclatés Lot 2 + Optal 26 Liste Lot 5
// Usage: node scripts/regen-previews-full-page.mjs

import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');
const { PDFDocument, degrees } = require('pdf-lib');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

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

// Pleine page 800px — parcourt jusqu'à 8 pages, seuil 30 KB
async function generatePreviewFull(pdfBytes, overlayTitle) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data, canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
  }).promise;

  for (let p = 1; p <= Math.min(8, doc.numPages); p++) {
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

  // Fallback blue overlay
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

async function regenPreview(doc) {
  console.log(`\n── ${doc.slug}`);
  try {
    const rawBytes = readFileSync(`${BASE}/${doc.file}`);
    const pdfBytes = await normalizePdfRotation(rawBytes);
    const previewJpeg = await generatePreviewFull(pdfBytes, doc.overlayTitle);

    const previewPath = `previews/${doc.slug}.jpg`;
    const { error: uploadErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploadErr) { console.warn(`   ⚠ Upload: ${uploadErr.message}`); return false; }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(previewPath);
    const { error: dbErr } = await supabase.from('documents')
      .update({ preview_url: urlData.publicUrl })
      .eq('slug', doc.slug);
    if (dbErr) { console.error(`   ✗ DB: ${dbErr.message}`); return false; }

    console.log(`   ✓ preview régénérée (${(previewJpeg.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    console.error(`   ✗ Erreur: ${e.message}`);
    return false;
  }
}

const docs = [
  // Lot 2 — 16 éclatés $19
  {
    file: 'LUREM CB310 RL-RLX-04 Liste Eclate $19.pdf',
    slug: 'lurem-cb310-rl-rlx-parts-list',
    overlayTitle: 'Lurem CB310 RL / RLX — Exploded Views and Parts List',
  },
  {
    file: 'LUREM CB310rlrlx Liste Eclate $19.pdf',
    slug: 'lurem-cb310-rl-rlx-parts-list-edition-04',
    overlayTitle: 'Lurem CB310 RL / RLX — Exploded Views and Parts List Ed.04',
  },
  {
    file: 'LUREM CB310SL Liste Eclaté $19.pdf',
    slug: 'lurem-cb310sl-parts-list',
    overlayTitle: 'Lurem CB310SL — Exploded Views and Parts List',
  },
  {
    file: 'LUREM CB410 rlx Liste Eclatés $19.pdf',
    slug: 'lurem-cb410-rlx-parts-list',
    overlayTitle: 'Lurem CB410 RLX — Exploded Views and Parts List',
  },
  {
    file: 'LUREM C260e C310e Liste $19.pdf',
    slug: 'lurem-c260e-c310e-parts-list',
    overlayTitle: 'Lurem C260e / C310e — Exploded Views and Parts List',
  },
  {
    file: 'LUREM FORMER 260s Liste Eclate $19.pdf',
    slug: 'lurem-former-260s-parts-list',
    overlayTitle: 'Lurem Former 260S — Exploded Views and Parts List',
  },
  {
    file: 'LUREM FORMER 260SI Liste Eclate $19.pdf',
    slug: 'lurem-former-260si-parts-list',
    overlayTitle: 'Lurem Former 260SI — Exploded Views and Parts List',
  },
  {
    file: 'LUREM Former 310 s Liste Eclate $19.pdf',
    slug: 'lurem-former-310s-parts-list',
    overlayTitle: 'Lurem Former 310S — Exploded Views and Parts List',
  },
  {
    file: 'LUREM Former 310si Liste Eclate $19.pdf',
    slug: 'lurem-former-310si-parts-list',
    overlayTitle: 'Lurem Former 310SI — Exploded Views and Parts List',
  },
  {
    file: 'LUREM Former 310 st Liste Eclate $19.pdf',
    slug: 'lurem-former-310st-parts-list',
    overlayTitle: 'Lurem Former 310ST — Exploded Views and Parts List',
  },
  {
    file: 'LUREM FORMER 310STI Liste Eclate $19.pdf',
    slug: 'lurem-former-310sti-parts-list',
    overlayTitle: 'Lurem Former 310STI — Exploded Views and Parts List',
  },
  {
    file: 'LUREM Maxi26plus Liste Eclate $19.pdf',
    slug: 'lurem-maxi26plus-parts-list',
    overlayTitle: 'Lurem Maxi 26 Plus — Exploded Views and Parts List',
  },
  {
    file: 'LUREM RD41e Liste Eclate $19.pdf',
    slug: 'lurem-rd41e-parts-list',
    overlayTitle: 'Lurem RD 41e — Exploded Views and Parts List',
  },
  {
    file: 'LUREM T180 Liste Eclate $19.pdf',
    slug: 'lurem-t180-parts-list',
    overlayTitle: 'Lurem T180 — Exploded Views and Parts List',
  },
  {
    file: 'LUREM TS15rl Liste Eclate$19.pdf',
    slug: 'lurem-ts15rl-parts-list',
    overlayTitle: 'Lurem TS 15 RL — Exploded Views and Parts List',
  },
  {
    file: 'LUREM TS41STI Liste Eclate $19.pdf',
    slug: 'lurem-ts41sti-parts-list',
    overlayTitle: 'Lurem TS 41 STI — Exploded Views and Parts List',
  },
  // Lot 5 — Optal 26 Liste $20
  {
    file: 'LUREM Optal 26 Liste $20.pdf',
    slug: 'lurem-optal26-parts-list',
    overlayTitle: 'Lurem Optal 26 — Parts List',
  },
];

async function run() {
  console.log('=== Régénération previews pleine page — 17 documents ===\n');
  let ok = 0, err = 0;
  for (const doc of docs) {
    const success = await regenPreview(doc);
    success ? ok++ : err++;
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Régénérés : ${ok}/${docs.length} — Erreurs : ${err}`);
  console.log('='.repeat(60));
}

run().catch(console.error);
