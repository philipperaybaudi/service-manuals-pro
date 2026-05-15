// Vérifie et corrige la rotation de tous les documents récemment importés (téléchargement depuis R2)
// Usage: node scripts/fix-rotation-batch.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
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
const BUCKET = 'service-manuals-documents';

// Slugs des documents à vérifier (tous les imports récents de cette session)
const SLUGS = [
  // B-F batch
  'delta-40-530c-scroll-saw-user-manual',
  // Collection Photography
  'camera-repair-vishnevsky-english',
  'camera-repair-vishnevsky-russian',
  'camera-repairs-yakovlev-english',
  'camera-repairs-yakovlev-russian',
  // Aaton
  'aaton-35-iii-users-guide',
  // 3M
  '3m-2000-overhead-projector-service-manual',
  '3m-9000-series-overhead-projector-service-manual',
  // Bezombes
  'bezombes-hb1-user-manual',
  // Bernardo
  'bernardo-pt260-user-manual',
  // Baby
  'baby-1130-assembly-user-guide',
  // Axminster
  'axminster-cl-1500-copy-lathe-manual',
  'axminster-ccl-manual',
  'axminster-awvsl-900-1000-manual',
  'axminster-awsl-manual',
  'axminster-awbl1200-manual',
  'axminster-aptc-m-950-manual',
  'axminster-aptc-m-900-manual',
  // Alligator Vollmer
  'vollmer-t-330-420-cas-manual',
  'vollmer-t-230-330-420-manual',
  'vollmer-sia-350-manual',
  'vollmer-map-200-400-manual',
  'vollmer-depomatic-manual',
  'alligator-sm80-manual',
  'alligator-sm1000-manual',
  'alligator-nm4-manual',
  'alligator-nm3-manual',
  'alligator-nm-1-2-manual',
  'alligator-jed-75-manual',
  'alligator-jed-73-manual',
  'alligator-jed-65-manual',
  'alligator-jed-63-manual',
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function downloadFromR2(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function checkRotation(pdfBytes) {
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const rots = new Set();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    rots.add(page.rotate);
  }
  return [...rots];
}

async function normalizePdfRotation(inputBytes) {
  const src = await PDFDocument.load(inputBytes);
  const srcPages = src.getPages();
  const rotations = srcPages.map(p => p.getRotation().angle);
  if (rotations.every(r => r === 0)) return null; // No change needed
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
    if (buf.length > 30000) return { buf, type: 'content', page: p };
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
  return { buf, type: 'overlay' };
}

async function run() {
  console.log('=== Vérification et correction rotation (batch R2) ===\n');

  // Fetch doc info from DB
  const { data: docs } = await supabase.from('documents')
    .select('slug, title, file_path')
    .in('slug', SLUGS);

  const docMap = Object.fromEntries(docs.map(d => [d.slug, d]));

  let checked = 0, fixed = 0, skipped = 0, errors = 0;

  for (const slug of SLUGS) {
    const doc = docMap[slug];
    if (!doc) { console.log(`   ⚠ Introuvable en DB: ${slug}`); skipped++; continue; }
    console.log(`\n[${slug}]`);

    try {
      // Download from R2
      process.stdout.write('   Téléchargement R2... ');
      const pdfBytes = await downloadFromR2(doc.file_path);
      console.log(`${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB`);

      // Check rotation
      const rots = await checkRotation(pdfBytes);
      checked++;

      if (rots.every(r => r === 0)) {
        console.log('   ✓ Rotation OK (0°) — aucune correction nécessaire');
        continue;
      }

      const nonZero = rots.filter(r => r !== 0);
      console.log(`   ⚠ Rotations trouvées: [${[...new Set(nonZero)].join(', ')}]° — correction en cours...`);

      // Normalize
      const fixedBytes = await normalizePdfRotation(pdfBytes);
      if (!fixedBytes) { console.log('   ✓ Pas de changement'); continue; }
      console.log(`   Taille normalisée: ${(fixedBytes.length / 1024 / 1024).toFixed(1)} MB`);

      // Regenerate preview
      const { buf: previewJpeg, type, page } = await generatePreview(fixedBytes, doc.title);
      console.log(`   Preview: ${type}${page ? ' (p.' + page + ')' : ''}, ${(previewJpeg.length / 1024).toFixed(0)} KB`);

      // Upload corrected PDF to R2
      await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: doc.file_path, Body: fixedBytes, ContentType: 'application/pdf' }));
      console.log('   ✓ PDF corrigé uploadé vers R2');

      // Upload new preview
      const previewPath = `previews/${slug}.jpg`;
      const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
      if (prevErr) console.warn('   ⚠ Preview upload:', prevErr.message);
      else console.log('   ✓ Preview mise à jour');

      // Update DB file_size
      await supabase.from('documents').update({ file_size: fixedBytes.length }).eq('slug', slug);

      fixed++;
    } catch (e) {
      console.error(`   ✗ Erreur: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Vérifiés : ${checked}/${SLUGS.length}`);
  console.log(`Corrigés : ${fixed}`);
  console.log(`Erreurs  : ${errors}`);
  console.log('\n✅ Correction rotation terminée!');
}

run().catch(console.error);
