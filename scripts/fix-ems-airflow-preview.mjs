import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const PDF_PATH = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Biomédical\\EMS\\Handy 2+.pdf';
const SLUG     = 'ems-air-flow-handy-2-plus-user-manual';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const pdfBuffer = fs.readFileSync(PDF_PATH);

// 1. Upload PDF vers R2
console.log('1. Upload PDF vers R2...');
await r2.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: `documents/${SLUG}.pdf`,
  Body: pdfBuffer, ContentType: 'application/pdf',
}));
console.log('  ✓ PDF uploadé');

// 2. Générer preview page 1
console.log('2. Génération preview...');
const data = new Uint8Array(pdfBuffer);
const doc  = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
const page  = await doc.getPage(1);
const scale = 800 / page.getViewport({ scale: 1 }).width;
const vp    = page.getViewport({ scale });
const factory = new NodeCanvasFactory();
const cc = factory.create(vp.width, vp.height);
await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
const jpgBuffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });

// 3. Upload preview
await supabase.storage.from('logos').remove([`previews/${SLUG}.jpg`]);
const { error: upErr } = await supabase.storage.from('logos').upload(`previews/${SLUG}.jpg`, jpgBuffer, { contentType: 'image/jpeg' });
if (upErr) { console.error('  ✗ Storage :', upErr.message); process.exit(1); }
console.log('  ✓ Preview uploadée');

// 4. Update DB
const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/previews/${SLUG}.jpg?t=${Date.now()}`;
await supabase.from('documents').update({ preview_url: previewUrl }).eq('slug', SLUG);
console.log('  ✓ DB mis à jour');
console.log('\n✓ Terminé !');
