/**
 * Extract first page of each PHOT ARGUS PDF as preview image.
 * Uses pdfjs-dist v3 + node-canvas + sharp.
 */

const { createCanvas } = require('canvas');
const { createClient } = require('@supabase/supabase-js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const sharp = require('sharp');

class NodeCanvasFactory {
  create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) {}
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function renderFirstPage(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport,
    canvasFactory: new NodeCanvasFactory(),
  }).promise;

  const pngBuf = canvas.toBuffer('image/png');
  return sharp(pngBuf)
    .resize(600, null, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
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
    console.log('Error:', error?.message);
    return;
  }

  console.log(`Found ${docs.length} documents\n`);
  let success = 0, failed = 0;

  for (const doc of docs) {
    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (dlError || !fileData) {
        console.log(`  ✗ ${doc.slug}: ${dlError?.message}`);
        failed++;
        continue;
      }

      const pdfBuffer = Buffer.from(await fileData.arrayBuffer());
      const jpegBuffer = await renderFirstPage(pdfBuffer);

      const storagePath = `previews/${doc.slug}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(storagePath, jpegBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) {
        console.log(`  ✗ ${doc.slug}: upload - ${uploadErr.message}`);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
      const { error: updateErr } = await supabase
        .from('documents')
        .update({ preview_url: urlData.publicUrl })
        .eq('id', doc.id);

      if (updateErr) {
        console.log(`  ✗ ${doc.slug}: update - ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${doc.slug}`);
        success++;
      }
    } catch (err) {
      console.log(`  ✗ ${doc.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
}

main().catch(console.error);
