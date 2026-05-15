/**
 * Génère les previews (page 1 du PDF) pour les docs sans preview_url
 * et les upload dans logos/previews/{slug}.jpg
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const SOURCE_ROOT = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories';
const STORAGE_BUCKET = 'logos';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanTitle(filename) {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[€$]\s*\d+[.,]?\d*\s*$/, '')
    .replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

async function renderFirstPage(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;

  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload error: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

// Récupérer les docs sans preview_url (parmi les récemment importés)
const { data: docs } = await supabase
  .from('documents')
  .select('id, slug, file_path')
  .is('preview_url', null)
  .order('id', { ascending: false })
  .limit(50);

console.log(`${docs.length} doc(s) sans preview_url\n`);

// Construire un index slug → chemin PDF source
const pdfIndex = {};
for (const catFolder of fs.readdirSync(SOURCE_ROOT)) {
  const catPath = path.join(SOURCE_ROOT, catFolder);
  if (!fs.statSync(catPath).isDirectory()) continue;
  for (const brandFolder of fs.readdirSync(catPath)) {
    const brandPath = path.join(catPath, brandFolder);
    if (!fs.statSync(brandPath).isDirectory()) continue;
    for (const file of fs.readdirSync(brandPath)) {
      if (!file.toLowerCase().endsWith('.pdf')) continue;
      const rawTitle = cleanTitle(file);
      const slug = `${slugify(brandFolder)}-${slugify(rawTitle)}`.slice(0, 120);
      pdfIndex[slug] = path.join(brandPath, file);
    }
  }
}

for (const doc of docs) {
  const pdfPath = pdfIndex[doc.slug];
  if (!pdfPath) {
    console.log(`  ⚠ ${doc.slug} — PDF source introuvable`);
    continue;
  }

  console.log(`  📄 ${doc.slug}`);
  try {
    const jpgBuffer = await renderFirstPage(pdfPath);
    const publicUrl = await uploadPreview(doc.slug, jpgBuffer);
    await supabase.from('documents').update({ preview_url: publicUrl }).eq('id', doc.id);
    console.log(`     ✓ Preview uploadée : ${(jpgBuffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error(`     ✗ Erreur : ${err.message}`);
  }
}

console.log('\n✓ Terminé');
