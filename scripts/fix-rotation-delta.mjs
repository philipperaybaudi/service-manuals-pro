// Fix rotation for Delta 40-530C (already imported, needs PDF + preview correction)
// Usage: node scripts/fix-rotation-delta.mjs

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

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const PDF_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/DELTA/Delta 40-530C scie a chantourner.pdf';
const SLUG = 'delta-40-530c-scroll-saw-user-manual';
const OVERLAY_TITLE = 'Delta 40-530C — User Manual';

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
  console.log(`   Rotations trouvées: [${distinctRots.join(', ')}]° sur ${rotations.filter(r => r !== 0).length} pages`);
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
  return Buffer.from(await dst.save());
}

async function generatePreview(pdfBytes, overlayTitle) {
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
  const vp = page.getViewport({ scale: 800 / page.getViewport({ scale: 1 }).width });
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
  console.log(`   (overlay utilisé)`);
  return buf;
}

async function run() {
  console.log('=== Fix rotation: Delta 40-530C ===\n');

  const rawBytes = readFileSync(PDF_PATH);
  console.log(`1. Lecture: ${(rawBytes.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('2. Normalisation rotation...');
  const pdfBytes = await normalizePdfRotation(rawBytes);
  console.log(`   Taille normalisée: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('3. Génération preview...');
  const previewJpeg = await generatePreview(pdfBytes, OVERLAY_TITLE);

  console.log('4. Upload preview...');
  const previewPath = `previews/${SLUG}.jpg`;
  const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
  if (prevErr) { console.error('   ✗ Preview:', prevErr.message); process.exit(1); }

  console.log('5. Upload PDF corrigé vers R2...');
  const r2Key = `documents/${SLUG}.pdf`;
  await r2.send(new PutObjectCommand({ Bucket: 'service-manuals-documents', Key: r2Key, Body: pdfBytes, ContentType: 'application/pdf' }));

  console.log('6. Mise à jour DB (file_size)...');
  const { error: dbErr } = await supabase.from('documents').update({ file_size: pdfBytes.length }).eq('slug', SLUG);
  if (dbErr) console.warn('   ⚠ DB update:', dbErr.message);

  console.log('\n✅ Delta 40-530C corrigé!');
}

run().catch(console.error);
