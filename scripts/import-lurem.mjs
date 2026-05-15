// Import 28 LUREM PDFs from source folder
// Usage: node scripts/import-lurem.mjs

import { readFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
const CATEGORY_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderPage(pdfPath, pageNum, scale = 1200) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  if (pageNum > doc.numPages) return { buf: null, numPages: doc.numPages };
  const page = await doc.getPage(pageNum);
  const sc = scale / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale: sc });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.90 });
  factory.destroy(cc);
  return { buf, numPages: doc.numPages };
}

async function generatePreview(pdfBytes, slug) {
  try {
    const { buf } = await renderPage(null, 1, 1200);
    if (buf) {
      const previewPath = `previews/${slug}.jpg`;
      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: previewPath,
        Body: buf,
        ContentType: 'image/jpeg'
      }));
      return previewPath;
    }
  } catch (e) {
    console.warn(`   Warning: Could not generate preview: ${e.message}`);
  }
  return null;
}

function generateDescription(filename) {
  const fname = filename.toLowerCase();

  if (fname.includes('schéma électrique') || fname.includes('schema electrique')) {
    const match = filename.match(/Lurem\s+([^$]+)/i);
    if (match) {
      const model = match[1].trim();
      return `Complete electrical schematics and wiring diagrams for the LUREM ${model}. Technical reference for electrical maintenance, troubleshooting, and component identification.`;
    }
    return 'Electrical schematics and wiring diagrams for LUREM woodworking machine. Technical reference for electrical system analysis and maintenance.';
  }

  if (fname.includes('éclaté') || fname.includes('eclate')) {
    const match = filename.match(/Lurem\s+([^$]+)/i);
    if (match) {
      const model = match[1].replace(/éclatés?|eclates?/i, '').trim();
      return `Exploded views with detailed parts lists for the LUREM ${model}. Comprehensive illustrated guide for identifying and ordering all replacement components.`;
    }
    return 'Exploded views with parts lists for LUREM woodworking machines. Illustrated guide for identifying and ordering replacement parts.';
  }

  if (fname.includes('variateur')) {
    return 'Technical documentation for LUREM variable frequency drives and motor controls. Complete specifications and installation guide for power management systems.';
  }

  if (fname.includes('ts 41 sti')) {
    if (fname.includes('eclate')) {
      return 'Exploded views with detailed parts lists for the LUREM TS 41 STI thicknesser-planer machine. Comprehensive illustrated guide for identifying and ordering replacement components.';
    }
    return 'Complete user manual for the LUREM TS 41 STI thicknesser-planer machine. Covers setup, operating procedures, maintenance, safety guidelines, and technical specifications.';
  }

  if (fname.includes('sar')) {
    return 'Exploded views with parts lists for the LUREM SAR series woodworking machines. Illustrated guide for identifying and ordering replacement components.';
  }

  if (fname.includes('solo')) {
    return 'Exploded views with parts lists for the LUREM Solo woodworking machines. Detailed illustrated guide for identifying and ordering replacement parts.';
  }

  if (fname.includes('ts 15')) {
    return 'Exploded views with detailed parts lists for the LUREM TS 15 woodworking machine. Comprehensive illustrated guide for identifying and ordering replacement components.';
  }

  return 'Technical documentation for LUREM woodworking machines. Complete reference for operation, maintenance, and parts identification.';
}

function generateSlug(filename) {
  return filename
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[\s$]+/g, '-')
    .replace(/[éè]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ûü]/g, 'u')
    .replace(/ô/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[-]+/g, '-')
    .replace(/^-|-$/g, '');
}

(async () => {
  console.log('='.repeat(100));
  console.log('LUREM IMPORT - 28 Documents from source folder');
  console.log('='.repeat(100) + '\n');

  if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true });

  const files = readdirSync(SOURCE_PATH)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`Found ${files.length} PDF files\n`);

  let imported = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = `${SOURCE_PATH}/${file}`;
    const slug = generateSlug(file);
    const title = file.replace(/\.pdf$/i, '').replace(/\$/g, '').trim();
    const description = generateDescription(file);
    const language = 'fr';
    const price = file.includes('$19') ? 19 : file.includes('$15') ? 15 : file.includes('$5') ? 5 : 9.99;

    console.log(`Importing: ${file}`);

    try {
      // Check if already imported
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        console.log(`   ⚠️  Already exists (slug: ${slug})\n`);
        continue;
      }

      // Read PDF
      const pdfBytes = readFileSync(filePath);
      const fileSize = pdfBytes.length;

      // Render cover
      let previewPath = null;
      let numPages = 0;
      try {
        const data = new Uint8Array(pdfBytes);
        const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
        numPages = doc.numPages;

        if (numPages > 0) {
          const { buf: coverBuf } = await renderPage(filePath, 1, 1000);
          if (coverBuf) {
            const coverOut = `${COVERS_DIR}/${slug}_p1.jpg`;
            require('fs').writeFileSync(coverOut, coverBuf);
            previewPath = `previews/${slug}.jpg`;
            await r2.send(new PutObjectCommand({
              Bucket: 'service-manuals-documents',
              Key: previewPath,
              Body: coverBuf,
              ContentType: 'image/jpeg'
            }));
          }
        }
      } catch (e) {
        console.warn(`   Warning: Could not process PDF pages: ${e.message}`);
      }

      // Upload PDF to R2
      const docPath = `documents/${slug}.pdf`;
      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: docPath,
        Body: pdfBytes,
        ContentType: 'application/pdf'
      }));

      // Create database entry
      const { error } = await supabase.from('documents').insert({
        slug,
        title,
        description,
        language,
        category_id: CATEGORY_ID,
        brand_id: BRAND_ID,
        file_size: fileSize,
        file_path: docPath,
        preview_url: previewPath,
        price
      });

      if (error) {
        console.error(`   ❌ Database error: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ Imported (${(fileSize / 1024 / 1024).toFixed(2)} MB, €${price})`);
        imported++;
      }
    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
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
