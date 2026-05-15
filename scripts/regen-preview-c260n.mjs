// Régénère la preview du C260N avec crop quart central (protection anti-lecture)
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

const SLUG = 'lurem-c260n-wiring-diagrams';
const FILE = 'Schemas LUREM C260N $5.pdf';

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

async function generatePreviewQuarterCrop(pdfBytes) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;

  for (let p = 1; p <= Math.min(5, doc.numPages); p++) {
    const page = await doc.getPage(p);
    // Rendre à 1600px de large pour avoir assez de résolution après crop
    const scale = 1600 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;

    // Crop quart central : de 25% à 75% en X et Y
    const cropX = Math.floor(vp.width * 0.25);
    const cropY = Math.floor(vp.height * 0.25);
    const cropW = Math.floor(vp.width * 0.50);
    const cropH = Math.floor(vp.height * 0.50);
    const cropCanvas = canvas.createCanvas(cropW, cropH);
    cropCanvas.getContext('2d').drawImage(cc.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    factory.destroy(cc);

    const buf = cropCanvas.toBuffer('image/jpeg', { quality: 0.88 });
    if (buf.length > 15000) {
      if (p > 1) console.log(`   (preview depuis page ${p})`);
      console.log(`   Crop: ${cropW}×${cropH}px — ${(buf.length / 1024).toFixed(0)} KB`);
      return buf;
    }
  }
  return null;
}

async function run() {
  console.log(`=== Régénération preview C260N (quart central) ===\n`);

  const rawBytes = readFileSync(`${BASE}/${FILE}`);
  const pdfBytes = await normalizePdfRotation(rawBytes);

  const previewJpeg = await generatePreviewQuarterCrop(pdfBytes);
  if (!previewJpeg) { console.error('✗ Preview échoué'); process.exit(1); }

  const previewPath = `previews/${SLUG}.jpg`;
  const { error: upErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) { console.error('✗ Upload:', upErr.message); process.exit(1); }

  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

  // Mettre à jour le champ preview_url en DB
  const { error: dbErr } = await supabase
    .from('documents')
    .update({ preview_url: urlData.publicUrl })
    .eq('slug', SLUG);
  if (dbErr) { console.error('✗ DB update:', dbErr.message); process.exit(1); }

  console.log(`✓ Preview mise à jour : ${urlData.publicUrl}`);
  console.log('\nDone.');
}

run().catch(console.error);
