/**
 * Extract first page of each PHOT ARGUS PDF as preview image.
 * Uses pdfjs-dist + node-canvas for rendering, sharp for JPEG output.
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { createCanvas } from 'canvas';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Disable worker threads (node environment)
GlobalWorkerOptions.workerSrc = '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(_canvasAndContext: any) {}
}

async function renderFirstPage(pdfBuffer: Buffer): Promise<Buffer> {
  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const scale = 1.5;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx as any,
    viewport,
    canvasFactory: new NodeCanvasFactory() as any,
  }).promise;

  const pngBuffer = canvas.toBuffer('image/png');
  const jpegBuffer = await sharp(pngBuffer)
    .resize(600, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return jpegBuffer;
}

async function main() {
  console.log('=== PHOT ARGUS PDF Preview Extraction ===\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, file_path')
    .eq('active', true)
    .ilike('slug', 'phot-argus-%')
    .order('slug');

  if (error || !docs) {
    console.log('Error fetching docs:', error?.message);
    return;
  }

  console.log(`Found ${docs.length} PHOT ARGUS documents\n`);

  let success = 0, failed = 0;

  for (const doc of docs) {
    try {
      // Download PDF from Supabase storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (dlError || !fileData) {
        console.log(`  ✗ ${doc.slug}: download error - ${dlError?.message}`);
        failed++;
        continue;
      }

      const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

      // Render first page
      const jpegBuffer = await renderFirstPage(pdfBuffer);

      // Upload to Supabase storage
      const storagePath = `previews/${doc.slug}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(storagePath, jpegBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        console.log(`  ✗ ${doc.slug}: upload error - ${uploadErr.message}`);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
      const { error: updateErr } = await supabase
        .from('documents')
        .update({ preview_url: urlData.publicUrl })
        .eq('id', doc.id);

      if (updateErr) {
        console.log(`  ✗ ${doc.slug}: update error - ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${doc.slug}`);
        success++;
      }
    } catch (err: any) {
      console.log(`  ✗ ${doc.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
}

main().catch(console.error);
