// Import Axminster documents
// Usage: node scripts/import-axminster.mjs

import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
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

const SOURCE_DIR = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/AXMINSTER';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';
const MACHINE_TOOLS_CAT_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

function extractPrice(filename) {
  const match = filename.match(/\$(\d+)/);
  return match ? parseInt(match[1]) * 100 : 1500;
}

function cleanName(filename) {
  return filename.replace(/\s*\$\d+(?=\.pdf)/i, '').replace('.pdf', '').trim();
}

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function generatePreview(pdfPath, title) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;

    // Try pages 1-5 for rich content
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

    // Fallback: page 1 + title overlay
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
    const words = title.split(' ');
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
    console.log('   (overlay titre appliqué)');
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

async function run() {
  console.log('=== Import Axminster ===\n');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  // 1. Create brand
  console.log('1. Création brand AXMINSTER...');
  const { data: brand, error: brandErr } = await supabase.from('brands').insert({
    name: 'Axminster', slug: 'axminster', category_id: MACHINE_TOOLS_CAT_ID,
  }).select().single();

  let brandId;
  if (brandErr?.code === '23505') {
    const { data: existing } = await supabase.from('brands').select('id').eq('slug', 'axminster').single();
    brandId = existing.id;
    console.log('   Brand déjà existante, ID:', brandId);
  } else if (brandErr) {
    console.error('   Erreur:', brandErr); process.exit(1);
  } else {
    brandId = brand.id;
    console.log('   ✓ Brand créée, ID:', brandId);
  }

  // 2. Import PDFs
  const files = readdirSync(SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`\n2. Import de ${files.length} documents...\n`);

  const created = [];
  for (const file of files) {
    const pdfPath = `${SOURCE_DIR}/${file}`;
    const price = extractPrice(file);
    const cleanedName = cleanName(file);
    const title = `${cleanedName} Manual`;
    const slug = generateSlug(title);

    console.log(`   ${title} — $${(price/100).toFixed(2)}`);

    try {
      // Preview
      const previewJpeg = await generatePreview(pdfPath, title);
      if (!previewJpeg) { console.log('   ✗ Preview échouée, skipping'); continue; }

      const previewPath = `previews/${slug}.jpg`;
      const { error: prevErr } = await supabase.storage.from('logos').upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
      if (prevErr) { console.warn('   ⚠ Preview upload:', prevErr.message); continue; }
      const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);

      // PDF → R2
      const pdfData = readFileSync(pdfPath);
      const r2Key = `documents/${slug}.pdf`;
      await r2.send(new PutObjectCommand({ Bucket: 'service-manuals-documents', Key: r2Key, Body: pdfData, ContentType: 'application/pdf' }));

      // Page count
      const pageCount = await getPageCount(pdfPath);

      // DB record
      const { data: doc, error: docErr } = await supabase.from('documents').insert({
        title,
        slug,
        description: `Complete technical manual and user guide for the ${cleanedName} machine tool. Includes operational procedures, maintenance instructions, spare parts diagrams, and technical specifications.`,
        category_id: MACHINE_TOOLS_CAT_ID,
        brand_id: brandId,
        price,
        file_path: r2Key,
        file_size: pdfData.length,
        page_count: pageCount,
        preview_url: previewUrlData.publicUrl,
        seo_title: `${title} | Service Manuals Pro`,
        seo_description: `Download the ${title}. Technical documentation with specifications and instructions.`,
        language: 'en',
        active: true,
        featured: false,
      }).select().single();

      if (docErr) { console.error('   ✗ DB:', docErr.message); continue; }
      console.log(`   ✓ Créé: /docs/${doc.slug}`);
      created.push(doc);
    } catch (e) {
      console.error(`   ✗ Erreur: ${e.message}`);
    }
  }

  // 3. Verify
  console.log(`\n=== Vérification ===`);
  const { data: allDocs } = await supabase.from('documents').select('id, title, price, active, file_path, preview_url').eq('brand_id', brandId).order('title');
  const { S3Client: S3, HeadObjectCommand: HOC } = require('@aws-sdk/client-s3');
  const r2check = new S3({ region: 'auto', endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com', credentials: { accessKeyId: 'bae216728d5107dec21e4cae48ad0512', secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd' } });
  let r2OK = 0;
  for (const doc of allDocs) {
    try { await r2check.send(new HOC({ Bucket: 'service-manuals-documents', Key: doc.file_path })); r2OK++; }
    catch(e) { console.log('  ✗ R2 MANQUANT:', doc.title); }
  }
  console.log(`Documents en base : ${allDocs.length}/${files.length}`);
  console.log(`PDFs sur R2       : ${r2OK}/${allDocs.length}`);
  console.log(`Previews          : ${allDocs.filter(d => d.preview_url).length}/${allDocs.length}`);
  console.log(`Actifs            : ${allDocs.filter(d => d.active).length}/${allDocs.length}`);
  const prices = {};
  allDocs.forEach(d => { const p = '$'+(d.price/100); prices[p]=(prices[p]||0)+1; });
  console.log(`Prix              : ${Object.entries(prices).map(([p,c])=>c+'×'+p).join(', ')}`);
  console.log('\n✅ Import Axminster terminé!');
}

run().catch(console.error);
