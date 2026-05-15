// Import Bezombes documents
// Usage: node scripts/import-bezombes.mjs

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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

const SOURCE_DIR = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/BEZOMBES';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const MACHINE_TOOLS_CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function generatePreview(pdfPath, overlayTitle) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    for (let pageNum = 1; pageNum <= Math.min(5, doc.numPages); pageNum++) {
      const page = await doc.getPage(pageNum);
      const scale = 800 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
      factory.destroy(cc);
      if (buffer.length > 30000) {
        if (pageNum > 1) console.log(`   (page ${pageNum} utilisée)`);
        return buffer;
      }
    }
    // Fallback: blue overlay
    const page = await doc.getPage(1);
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const ctx = cc.context;
    const W = vp.width, H = vp.height;
    ctx.fillStyle = 'rgba(30, 58, 138, 0.88)';
    ctx.fillRect(0, H * 0.35, W, H * 0.30);
    ctx.fillStyle = '#FFFFFF';
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
    const lineH = 44;
    const startY = H * 0.5 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));
    const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
    factory.destroy(cc);
    console.log(`   (overlay: "${overlayTitle}")`);
    return buffer;
  } catch (e) {
    console.warn('   ⚠ Preview error:', e.message);
    return null;
  }
}

async function getPageCount(pdfPath) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    return doc.numPages;
  } catch (e) { return null; }
}

const docs = [
  {
    file: 'Bezombes HB1 tour bois.pdf',
    title: 'Bezombes HB1 User Manual',
    slug: 'bezombes-hb1-user-manual',
    overlayTitle: 'Bezombes HB1 — User Manual',
    price: 1500,
    description: 'User manual for the Bezombes HB1 manual woodturning lathe with frequency converter. Covers safety precautions, machine levelling and grounding requirements, speed and rotation direction selection, tool handling, maintenance and cleaning procedures, and operating guidelines for turning various wood types and sizes. Document in French.',
  },
];

async function run() {
  console.log('=== Import Bezombes ===\n');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  console.log('1. Création brand BEZOMBES...');
  const { data: brand, error: brandErr } = await supabase.from('brands').insert({
    name: 'Bezombes', slug: 'bezombes', category_id: MACHINE_TOOLS_CAT_ID,
  }).select().single();

  let brandId;
  if (brandErr?.code === '23505') {
    const { data: existing } = await supabase.from('brands').select('id').eq('slug', 'bezombes').single();
    brandId = existing.id;
    console.log('   Brand déjà existante, ID:', brandId);
  } else if (brandErr) {
    console.error('   Erreur:', brandErr); process.exit(1);
  } else {
    brandId = brand.id;
    console.log('   ✓ Brand créée, ID:', brandId);
  }

  console.log(`\n2. Import de ${docs.length} document(s)...\n`);

  for (const doc of docs) {
    const pdfPath = `${SOURCE_DIR}/${doc.file}`;
    console.log(`   ${doc.title} — $${(doc.price / 100).toFixed(2)}`);

    try {
      const previewJpeg = await generatePreview(pdfPath, doc.overlayTitle);
      if (!previewJpeg) { console.log('   ✗ Preview échouée, skipping'); continue; }

      const previewPath = `previews/${doc.slug}.jpg`;
      const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
      if (prevErr) { console.warn('   ⚠ Preview upload:', prevErr.message); continue; }
      const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

      const pdfData = readFileSync(pdfPath);
      const r2Key = `documents/${doc.slug}.pdf`;
      await r2.send(new PutObjectCommand({ Bucket: 'service-manuals-documents', Key: r2Key, Body: pdfData, ContentType: 'application/pdf' }));

      const pageCount = await getPageCount(pdfPath);

      const { data: dbDoc, error: docErr } = await supabase.from('documents').insert({
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        category_id: MACHINE_TOOLS_CAT_ID,
        brand_id: brandId,
        price: doc.price,
        file_path: r2Key,
        file_size: pdfData.length,
        page_count: pageCount,
        preview_url: previewUrlData.publicUrl,
        seo_title: `${doc.title} | Service Manuals Pro`,
        seo_description: `Download the ${doc.title}. User manual for the Bezombes HB1 woodturning lathe with operating and safety instructions.`,
        language: 'fr',
        active: true,
        featured: false,
      }).select().single();

      if (docErr) { console.error('   ✗ DB:', docErr.message); continue; }
      console.log(`   ✓ Créé: /docs/${dbDoc.slug}`);
    } catch (e) {
      console.error(`   ✗ Erreur: ${e.message}`);
    }
  }

  console.log('\n✅ Import Bezombes terminé!');
}

run().catch(console.error);
