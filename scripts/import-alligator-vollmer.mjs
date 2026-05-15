// Import Alligator Vollmer documents
// Usage: node scripts/import-alligator-vollmer.mjs

import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

// ── Config ──────────────────────────────────────────────────────
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

const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';
const SOURCE_DIR = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/ALLIGATOR VOLLMER';
const MACHINE_TOOLS_CATEGORY_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';

// ── Canvas factory for pdfjs ────────────────────────────────────
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const STANDARD_FONTS_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

// ── Extract price from filename ──────────────────────────────────
function extractPrice(filename) {
  const match = filename.match(/\$(\d+)/);
  if (match) {
    return parseInt(match[1]) * 100; // Convert to cents
  }
  return 1500; // Default $15
}

// ── Clean filename (remove $XX) ──────────────────────────────────
function cleanFilename(filename) {
  return filename.replace(/\s*\$\d+(?=\.pdf)/, '');
}

// ── Generate slug from title ─────────────────────────────────────
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Render one PDF page to JPEG buffer ──────────────────────────
async function renderPage(doc, pageNum) {
  const page = await doc.getPage(pageNum);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  factory.destroy(cc);
  return { buffer, canvas: cc, vp };
}

// ── Generate preview from PDF ────────────────────────────────────
// Tries pages 1-5. If all sparse (<30KB), overlays the title on page 1.
async function generatePreview(pdfPath, title) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({
      data,
      canvasFactory: new NodeCanvasFactory(),
      standardFontDataUrl: STANDARD_FONTS_PATH,
      useSystemFonts: true,
    }).promise;

    // Try pages 1-5 for a rich image
    for (let pageNum = 1; pageNum <= Math.min(5, doc.numPages); pageNum++) {
      const { buffer } = await renderPage(doc, pageNum);
      if (buffer.length > 30000) {
        if (pageNum > 1) console.log(`   (page ${pageNum} utilisée)`);
        return buffer;
      }
    }

    // Fallback: render page 1 + overlay title on a blue band
    const page = await doc.getPage(1);
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;

    const ctx = cc.context;
    const W = vp.width, H = vp.height;
    // Blue band in the middle third
    ctx.fillStyle = 'rgba(30, 58, 138, 0.88)';
    ctx.fillRect(0, H * 0.35, W, H * 0.30);
    // Title text
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
    console.warn('   ⚠ Could not generate preview:', e.message);
    return null;
  }
}

// ── Get page count ───────────────────────────────────────────────
async function getPageCount(pdfPath) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS_PATH, useSystemFonts: true }).promise;
    return doc.numPages;
  } catch (e) {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────
async function run() {
  console.log('=== Import Alligator Vollmer Documents ===\n');

  // 1. Create brand
  console.log('1. Creating brand ALLIGATOR VOLLMER...');
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .insert({
      name: 'Alligator Vollmer',
      slug: 'alligator-vollmer',
      category_id: MACHINE_TOOLS_CATEGORY_ID,
    })
    .select()
    .single();

  let brandId;
  if (brandErr) {
    if (brandErr.code === '23505') {
      console.log('   Brand already exists, fetching...');
      const { data: existing } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', 'alligator-vollmer')
        .eq('category_id', MACHINE_TOOLS_CATEGORY_ID)
        .single();
      brandId = existing.id;
    } else {
      console.error('   Brand creation error:', brandErr);
      process.exit(1);
    }
  } else {
    brandId = brand.id;
  }
  console.log('   ✓ Brand ID:', brandId);

  // 2. Get all PDF files
  console.log('\n2. Reading PDF files from source...');
  const files = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`   Found ${files.length} files`);

  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  // 3. Import each document
  console.log('\n3. Importing documents...');
  const created = [];

  for (const file of files) {
    const pdfPath = `${SOURCE_DIR}/${file}`;
    const price = extractPrice(file);
    const cleanName = cleanFilename(file).replace('.pdf', '');
    const title = `${cleanName} Manual`;
    const slug = generateSlug(title);

    console.log(`\n   ${title}`);
    console.log(`   Price: $${(price / 100).toFixed(2)}`);

    try {
      // Generate preview
      const previewJpeg = await generatePreview(pdfPath, title);
      if (!previewJpeg) {
        console.log('   ⚠ No preview generated, skipping');
        continue;
      }

      // Upload preview
      const previewPath = `previews/${slug}.jpg`;
      const { error: prevErr } = await supabase.storage
        .from('logos')
        .upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
      if (prevErr) {
        console.warn('   ⚠ Preview upload failed:', prevErr.message);
        continue;
      }

      const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);
      const previewUrl = previewUrlData.publicUrl;

      // Upload PDF to R2
      const pdfData = readFileSync(pdfPath);
      const r2Key = `documents/${slug}.pdf`;
      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: r2Key,
        Body: pdfData,
        ContentType: 'application/pdf',
      }));

      // Get page count
      const pageCount = await getPageCount(pdfPath);

      // Create document record
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          title,
          slug,
          description: `Complete technical manual and user guide for the ${cleanName} machine tool. Includes operational procedures, maintenance instructions, spare parts diagrams, and technical specifications.`,
          category_id: MACHINE_TOOLS_CATEGORY_ID,
          brand_id: brandId,
          price,
          file_path: r2Key,
          file_size: pdfData.length,
          page_count: pageCount,
          preview_url: previewUrl,
          seo_title: `${title} | Service Manuals Pro`,
          seo_description: `Download ${title} with technical specifications and user instructions.`,
          language: 'en',
          active: true,
          featured: false,
        })
        .select()
        .single();

      if (docErr) {
        console.error('   ✗ DB Error:', docErr.message);
        continue;
      }

      console.log(`   ✓ Created: ${doc.slug}`);
      created.push(doc);
    } catch (e) {
      console.error(`   ✗ Error: ${e.message}`);
    }
  }

  // Summary
  console.log(`\n✅ Import complete! Created ${created.length}/${files.length} documents`);
  console.log('\nDocuments:');
  created.forEach(doc => {
    console.log(`  • ${doc.title}`);
    console.log(`    URL: https://www.service-manuals-pro.com/docs/${doc.slug}`);
  });
}

run().catch(console.error);
