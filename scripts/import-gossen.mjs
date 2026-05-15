// Import Gossen Lunasix 3 calibration document
// Creates brand + uploads logo + generates preview + uploads PDF + creates DB record
// Usage: node scripts/import-gossen.mjs

import { readFileSync, existsSync, mkdirSync } from 'fs';
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

// ── Canvas factory for pdfjs ────────────────────────────────────
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const PHOTOGRAPHY_CATEGORY_ID = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';

const GOSSEN_DIR = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/RAPID/GOSSEN';
const PDF_PATH = `${GOSSEN_DIR}/Étalonnage Gossen Lunasix 3.pdf`;
const LOGO_PATH = `${GOSSEN_DIR}/logo_gossen.png`;

async function generatePreview(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory() }).promise;
  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function run() {
  console.log('=== Import Gossen Lunasix 3 ===\n');

  // 1. Create GOSSEN brand
  console.log('1. Creating GOSSEN brand...');
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .insert({
      name: 'Gossen',
      slug: 'gossen',
      category_id: PHOTOGRAPHY_CATEGORY_ID,
      logo_url: null, // will update after upload
    })
    .select()
    .single();

  if (brandErr) {
    // Brand might already exist
    if (brandErr.code === '23505') {
      console.log('   Brand already exists, fetching...');
      const { data: existing } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', 'gossen')
        .eq('category_id', PHOTOGRAPHY_CATEGORY_ID)
        .single();
      if (!existing) { console.error('Cannot find or create brand'); process.exit(1); }
      var brandId = existing.id;
      console.log('   Brand ID:', brandId);
    } else {
      console.error('Brand creation error:', brandErr);
      process.exit(1);
    }
  } else {
    var brandId = brand.id;
    console.log('   Brand created, ID:', brandId);
  }

  // 2. Upload logo to Supabase Storage
  console.log('2. Uploading logo...');
  const logoData = readFileSync(LOGO_PATH);
  const logoPath = `logos/gossen.png`;
  const { error: logoErr } = await supabase.storage
    .from('logos')
    .upload(logoPath, logoData, {
      contentType: 'image/png',
      upsert: true,
    });
  if (logoErr) console.warn('   Logo upload warning:', logoErr.message);
  else console.log('   Logo uploaded');

  const { data: logoUrlData } = supabase.storage.from('logos').getPublicUrl(logoPath);
  const logoUrl = logoUrlData.publicUrl;
  console.log('   Logo URL:', logoUrl);

  // Update brand with logo URL
  await supabase.from('brands').update({ logo_url: logoUrl }).eq('id', brandId);
  console.log('   Brand updated with logo');

  // 3. Generate preview from PDF
  console.log('3. Generating preview...');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  const previewJpeg = await generatePreview(PDF_PATH);
  console.log('   Preview generated:', previewJpeg.length, 'bytes');

  // 4. Upload preview to Supabase Storage
  console.log('4. Uploading preview...');
  const previewPath = `previews/gossen-lunasix-3-calibration-guide.jpg`;
  const { error: prevErr } = await supabase.storage
    .from('logos')
    .upload(previewPath, previewJpeg, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (prevErr) console.warn('   Preview upload warning:', prevErr.message);
  else console.log('   Preview uploaded');

  const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);
  const previewUrl = previewUrlData.publicUrl;
  console.log('   Preview URL:', previewUrl);

  // 5. Upload PDF to R2
  console.log('5. Uploading PDF to R2...');
  const pdfData = readFileSync(PDF_PATH);
  const r2Key = `documents/gossen-lunasix-3-calibration-guide.pdf`;
  await r2.send(new PutObjectCommand({
    Bucket: 'service-manuals-docs',
    Key: r2Key,
    Body: pdfData,
    ContentType: 'application/pdf',
  }));
  console.log('   PDF uploaded to R2:', r2Key);

  // 6. Create document record
  console.log('6. Creating document record...');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      title: 'Gossen Lunasix 3 Calibration Guide',
      slug: 'gossen-lunasix-3-calibration-guide',
      description: 'Calibration and adjustment guide for the Gossen Lunasix 3 analog light meter. Covers calibration procedures, battery replacement, and exposure measurement accuracy adjustments for this classic photographic light meter.',
      category_id: PHOTOGRAPHY_CATEGORY_ID,
      brand_id: brandId,
      price: 1000, // $10.00
      file_path: r2Key,
      file_size: pdfData.length,
      page_count: null,
      preview_url: previewUrl,
      seo_title: 'Gossen Lunasix 3 Calibration Guide | Light Meter Service Manual',
      seo_description: 'Download the calibration and adjustment guide for the Gossen Lunasix 3 light meter. Professional technical documentation for accurate exposure measurement.',
      language: 'fr',
      active: true,
      featured: false,
    })
    .select()
    .single();

  if (docErr) {
    console.error('Document creation error:', docErr);
    process.exit(1);
  }

  console.log('\n✅ Document created successfully!');
  console.log('   Title:', doc.title);
  console.log('   Slug:', doc.slug);
  console.log('   Price: $10.00');
  console.log('   URL: https://www.service-manuals-pro.com/docs/' + doc.slug);
  console.log('   Brand page: https://www.service-manuals-pro.com/categories/photography/gossen');

  // Get page count
  try {
    const data = new Uint8Array(pdfData);
    const pdfDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory() }).promise;
    const pages = pdfDoc.numPages;
    await supabase.from('documents').update({ page_count: pages }).eq('id', doc.id);
    console.log('   Pages:', pages);
  } catch (e) {
    console.warn('   Could not get page count');
  }

  console.log('\nDone!');
}

run().catch(console.error);
