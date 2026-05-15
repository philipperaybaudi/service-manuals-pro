// Import Collection documents (Vishnevsky + Yakovlev Camera Repair)
// Usage: node scripts/import-collection.mjs

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

const SOURCE_DIR = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Photography/COLLECTION';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

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
    file: 'Vishnevsky-Camera-Repair - English $25.pdf',
    title: 'Camera Repair — English Edition',
    slug: 'camera-repair-vishnevsky-english',
    overlayTitle: 'Camera Repair — English Edition',
    price: 2500,
    language: 'en',
    description: 'Comprehensive camera repair guide covering the structure and mechanisms of most photographic cameras produced by the Soviet industry. Describes in detail the interaction of parts for each unit and mechanism, lists possible malfunctions and their remedies. Covers both simple and complex cameras, intended for repair technicians and advanced amateur photographers. Moscow, Publishing House "Light Industry", 1964.',
  },
  {
    file: 'Vishnevsky-Camera-Repair - Russian.pdf',
    title: 'Camera Repair — Russian Edition',
    slug: 'camera-repair-vishnevsky-russian',
    overlayTitle: 'Camera Repair — Russian Edition',
    price: 1500,
    language: 'ru',
    description: 'Comprehensive camera repair guide covering the structure and mechanisms of most photographic cameras produced by the Soviet industry. Describes in detail the interaction of parts for each unit and mechanism, lists possible malfunctions and their remedies. Covers both simple and complex cameras, intended for repair technicians and advanced amateur photographers. Moscow, Publishing House "Light Industry", 1964. Document in Russian.',
  },
  {
    file: 'Yakovlev-Camera-Repair - English $25.pdf',
    title: 'Camera Repairs — English Edition',
    slug: 'camera-repairs-yakovlev-english',
    overlayTitle: 'Camera Repairs — English Edition',
    price: 2500,
    language: 'en',
    description: 'Practical camera repair guide sharing many years of field experience in repairing cameras. Describes in detail the failures of mechanisms and optical devices encountered, with specific advice on eliminating them. Well illustrated with photographs of parts and assemblies showing disassembly and reassembly sequences. Includes an appendix covering optical-mechanical work and the tools required for repair. Intended for a wide range of amateur photographers. Moscow, Publisher "Art", 1962. Library Fotoljbitelz, Release 29.',
  },
  {
    file: 'Yakovlev-Camera-Repair - Russian.pdf',
    title: 'Camera Repairs — Russian Edition',
    slug: 'camera-repairs-yakovlev-russian',
    overlayTitle: 'Camera Repairs — Russian Edition',
    price: 1500,
    language: 'ru',
    description: 'Practical camera repair guide sharing many years of field experience in repairing cameras. Describes in detail the failures of mechanisms and optical devices encountered, with specific advice on eliminating them. Well illustrated with photographs of parts and assemblies showing disassembly and reassembly sequences. Includes an appendix covering optical-mechanical work and the tools required for repair. Intended for a wide range of amateur photographers. Moscow, Publisher "Art", 1962. Document in Russian.',
  },
];

async function run() {
  console.log('=== Import Collection ===\n');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  // Get photography category ID
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'photography').single();
  if (!cat) { console.error('Category "photography" not found'); process.exit(1); }
  const catId = cat.id;

  // Get or create brand 'collection'
  console.log('1. Récupération brand COLLECTION...');
  let brandId;
  const { data: existing } = await supabase.from('brands').select('id').eq('slug', 'collection').eq('category_id', catId).single();
  if (existing) {
    brandId = existing.id;
    console.log('   Brand existante, ID:', brandId);
  } else {
    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: 'Collection', slug: 'collection', category_id: catId,
    }).select().single();
    if (brandErr) { console.error('   Erreur:', brandErr); process.exit(1); }
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
        category_id: catId,
        brand_id: brandId,
        price: doc.price,
        file_path: r2Key,
        file_size: pdfData.length,
        page_count: pageCount,
        preview_url: previewUrlData.publicUrl,
        seo_title: `${doc.title} | Service Manuals Pro`,
        seo_description: `Download ${doc.title}. Comprehensive camera repair guide with detailed mechanism descriptions and fault-finding procedures.`,
        language: doc.language,
        active: true,
        featured: false,
      }).select().single();

      if (docErr) { console.error('   ✗ DB:', docErr.message); continue; }
      console.log(`   ✓ Créé: /docs/${dbDoc.slug}`);
    } catch (e) {
      console.error(`   ✗ Erreur: ${e.message}`);
    }
  }

  console.log('\n✅ Import Collection terminé!');
}

run().catch(console.error);
