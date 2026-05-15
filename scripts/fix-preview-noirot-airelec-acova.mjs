/**
 * Génère et upload une preview JPEG pour les 3 docs NOIROT / AIRELEC / ACOVA
 * à partir du PDF déjà stocké dans R2.
 *
 * Usage : node scripts/fix-preview-noirot-airelec-acova.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const canvas  = require('canvas');
const pdfjs   = require('pdfjs-dist/legacy/build/pdf.js');

const DRY_RUN = process.argv.includes('--dry-run');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const DOCS = [
  { slug: 'noirot-manuel-depannage-thermostat-noirot',   label: 'NOIROT'   },
  { slug: 'airelec-manuel-depannage-thermostat-airelec', label: 'AIRELEC'  },
  { slug: 'acova-manuel-depannage-thermostat-acova',     label: 'ACOVA'    },
];

class NodeCanvasFactory {
  create(w, h)      { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h)   { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc)       { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function generatePreview(pdfBuffer, overlayTitle) {
  const data = new Uint8Array(pdfBuffer);
  const doc  = await pdfjs.getDocument({
    data,
    canvasFactory:      new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts:     true,
  }).promise;

  // Essayer les 5 premières pages — garder la première avec contenu visible
  for (let pageNum = 1; pageNum <= Math.min(5, doc.numPages); pageNum++) {
    const page    = await doc.getPage(pageNum);
    const scale   = 800 / page.getViewport({ scale: 1 }).width;
    const vp      = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc      = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const buffer  = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
    factory.destroy(cc);
    if (buffer.length > 30000) {
      if (pageNum > 1) console.log(`   (page ${pageNum} utilisée)`);
      return buffer;
    }
  }

  // Fallback : overlay bleu avec le titre
  const page    = await doc.getPage(1);
  const scale   = 800 / page.getViewport({ scale: 1 }).width;
  const vp      = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc      = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const ctx = cc.context;
  const W = vp.width, H = vp.height;
  ctx.fillStyle = 'rgba(30, 58, 138, 0.88)';
  ctx.fillRect(0, H * 0.35, W, H * 0.30);
  ctx.fillStyle    = '#FFFFFF';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = 'bold 36px Arial';
  const words = overlayTitle.split(' ');
  let lines = [], line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = word; }
    else line = test;
  }
  lines.push(line);
  const lineH  = 44;
  const startY = H * 0.5 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));
  const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  factory.destroy(cc);
  console.log(`   (overlay utilisé)`);
  return buffer;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Génération previews NOIROT/AIRELEC/ACOVA (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===\n`);

// Récupérer le file_path depuis l'un des 3 docs (ils partagent tous le même PDF)
const { data: refDoc, error: refErr } = await supabase
  .from('documents')
  .select('file_path')
  .eq('slug', DOCS[0].slug)
  .single();

if (refErr || !refDoc) {
  console.error(`❌ Doc de référence introuvable : ${refErr?.message}`);
  process.exit(1);
}

console.log(`→ PDF source : ${refDoc.file_path}`);

// Télécharger le PDF une seule fois
const res = await r2.send(new GetObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key:    refDoc.file_path,
}));
const chunks = [];
for await (const chunk of res.Body) chunks.push(chunk);
const pdfBuffer = Buffer.concat(chunks);
console.log(`  PDF téléchargé : ${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB\n`);

if (DRY_RUN) {
  console.log(`[DRY-RUN] Génération preview simulée pour :`);
  DOCS.forEach(d => console.log(`  → ${d.slug}`));
  console.log(`\n=== Terminé (DRY-RUN) ===`);
  process.exit(0);
}

// Générer la preview (une seule fois, réutilisée pour les 3)
console.log(`→ Génération de la preview JPEG...`);
const previewBuffer = await generatePreview(pdfBuffer, 'Manuel de dépannage thermostat NOIROT / AIRELEC / ACOVA');
console.log(`  Preview générée : ${(previewBuffer.length / 1024).toFixed(0)} KB\n`);

// Uploader et mettre à jour chaque doc
for (const doc of DOCS) {
  const storagePath = `previews/${doc.slug}.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(storagePath, previewBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) {
    console.error(`❌ Upload ${doc.slug} : ${uploadErr.message}`);
    continue;
  }

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(storagePath);

  const { error: updateErr } = await supabase
    .from('documents')
    .update({ preview_url: publicUrl })
    .eq('slug', doc.slug);

  if (updateErr) {
    console.error(`❌ Update DB ${doc.slug} : ${updateErr.message}`);
    continue;
  }

  console.log(`✅ ${doc.label} — preview OK`);
  console.log(`   ${publicUrl}`);
}

console.log(`\n=== Terminé ===`);
