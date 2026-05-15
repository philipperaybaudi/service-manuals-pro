// CORRECT LUREM import: clean names, proper previews, correct prices, proper database entries
// Usage: node scripts/reimport-lurem-correct.mjs

import { readFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const pdfjs = require('pdfjs-dist');
const canvas = require('canvas');

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
const SOURCE_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const COVERS_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/covers';
const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderCoverPage(pdfPath) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    const page = await doc.getPage(1);
    const sc = 1000 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale: sc });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    return cc.canvas.toBuffer('image/jpeg', { quality: 0.90 });
  } catch (e) {
    return null;
  }
}

function generateBlueOverlay(title) {
  const W = 800, H = 1100;
  const cvs = canvas.createCanvas(W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(30,58,138,0.88)';
  ctx.fillRect(0, H * 0.35, W, H * 0.30);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px Arial';

  const words = title.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length > 30) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lH = 45;
  const sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, sY + i * lH));

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('LUREM', W / 2, H * 0.18);

  return cvs.toBuffer('image/jpeg', { quality: 0.88 });
}

function extractPriceFromFilename(filename) {
  const match = filename.match(/\$(\d+)/);
  return match ? parseInt(match[1]) * 100 : 1500; // Default 1500 cents = $15
}

function cleanFilename(filename) {
  return filename.replace(/\s*\$\d+\s*\.pdf$/i, '.pdf').replace(/\.pdf$/i, '');
}

function generateSlug(filename) {
  return filename
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, '-')
    .replace(/[éè]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ûü]/g, 'u')
    .replace(/ô/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[-]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/\$\d+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

(async () => {
  console.log('='.repeat(100));
  console.log('LUREM CORRECT REIMPORT - Clean all, proper previews, correct titles');
  console.log('='.repeat(100) + '\n');

  if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true });

  // Step 1: Delete old incorrect LUREM entries and files from R2
  console.log('Step 1: Cleaning old LUREM entries...\n');
  const { data: oldDocs } = await supabase
    .from('documents')
    .select('id, slug, file_path, preview_url')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(28);

  for (const doc of oldDocs) {
    // Delete from R2
    if (doc.file_path) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: 'service-manuals-documents',
          Key: doc.file_path
        }));
      } catch (e) {}
    }
    if (doc.preview_url) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: 'service-manuals-documents',
          Key: doc.preview_url
        }));
      } catch (e) {}
    }
    // Delete from DB
    await supabase.from('documents').delete().eq('id', doc.id);
  }
  console.log(`Deleted ${oldDocs.length} old LUREM entries\n`);

  // Step 2: Process source PDFs
  console.log('Step 2: Processing source PDFs...\n');
  const files = readdirSync(SOURCE_PATH)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Found ${files.length} source PDFs\n`);

  let imported = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = `${SOURCE_PATH}/${file}`;
    const cleanName = cleanFilename(file);
    const slug = generateSlug(cleanName);
    const price = extractPriceFromFilename(file);
    const pdfBytes = readFileSync(filePath);
    const fileSize = pdfBytes.length;

    console.log(`${file}`);
    console.log(`  → Slug: ${slug}`);
    console.log(`  → Price: $${(price/100).toFixed(2)}`);

    try {
      // Generate preview (try cover page, fallback to blue overlay)
      let previewBuf = await renderCoverPage(filePath);
      if (!previewBuf) {
        previewBuf = generateBlueOverlay(cleanName);
      }

      const previewPath = `previews/${slug}.jpg`;
      const docPath = `documents/${slug}.pdf`;

      // Upload to R2
      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: docPath,
        Body: pdfBytes,
        ContentType: 'application/pdf'
      }));

      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: previewPath,
        Body: previewBuf,
        ContentType: 'image/jpeg'
      }));

      // Generate description
      const desc = `Complete documentation for the LUREM ${cleanName}. Comprehensive reference material with technical specifications, operating procedures, maintenance guidelines, and detailed illustrations.`;

      // Create database entry
      const { error } = await supabase.from('documents').insert({
        slug,
        title: cleanName,
        description: desc,
        language: 'fr',
        category_id: '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
        brand_id: BRAND_ID,
        file_size: fileSize,
        file_path: docPath,
        preview_url: previewPath,
        price
      });

      if (error) {
        console.error(`  ❌ ${error.message}`);
        errors++;
      } else {
        console.log(`  ✅ Imported (${(fileSize/1024/1024).toFixed(2)} MB)`);
        imported++;
      }
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      errors++;
    }
    console.log();
  }

  console.log('='.repeat(100));
  console.log(`\nResults:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${files.length}\n`);
})();
