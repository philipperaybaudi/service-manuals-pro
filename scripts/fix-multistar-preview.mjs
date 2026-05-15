// Fix preview Emco Multistar : force overlay (couverture scannée en paysage, inutilisable)
// Usage: node scripts/fix-multistar-preview.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

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
const SLUG = 'emco-multistar-combination-woodworking-machine-user-manual';
const OVERLAY_TITLE = 'Emco Multistar — User Manual';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function run() {
  console.log('=== Fix preview Emco Multistar (overlay forcé) ===\n');

  // Télécharger le PDF depuis R2
  console.log('1. Téléchargement depuis R2...');
  const cmd = new GetObjectCommand({ Bucket: 'service-manuals-documents', Key: `documents/${SLUG}.pdf` });
  const response = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const pdfBytes = Buffer.concat(chunks);
  console.log(`   ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB`);

  // Générer overlay sur la page 1 (en mode portrait 800px)
  console.log('2. Génération overlay...');
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);

  // La page est en paysage — on force un canvas portrait 800x1100
  const W = 800, H = 1100;
  const cvs = canvas.createCanvas(W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  // Overlay bleu
  ctx.fillStyle = 'rgba(30,58,138,0.88)';
  ctx.fillRect(0, H * 0.35, W, H * 0.30);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 38px Arial';

  const lines = ['Emco Multistar', 'Combination Woodworking Machine', 'User Manual'];
  const lH = 50;
  const sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, sY + i * lH));

  // Logo EMCO en haut
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('EMCO', W / 2, H * 0.18);
  ctx.font = '24px Arial';
  ctx.fillStyle = '#374151';
  ctx.fillText('MULTISTAR', W / 2, H * 0.26);

  const previewJpeg = cvs.toBuffer('image/jpeg', { quality: 0.88 });
  console.log(`   Preview: ${(previewJpeg.length / 1024).toFixed(0)} KB`);

  // Upload preview
  console.log('3. Upload preview...');
  const previewPath = `previews/${SLUG}.jpg`;
  const { error } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
  if (error) { console.error('   ✗', error.message); process.exit(1); }

  console.log('\n✅ Preview Emco Multistar corrigée!');
}

run().catch(console.error);
