// Script to extract first page of a PDF as a JPEG preview image
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Force pdfjs-dist to use the top-level canvas (which is compiled)
// by shimming the nested one
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

// Override the internal canvas factory
class NodeCanvasFactory {
  create(width, height) {
    const c = canvas.createCanvas(width, height);
    return { canvas: c, context: c.getContext('2d') };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

const pdfPath = process.argv[2];
const outputPath = process.argv[3] || 'preview.jpg';

if (!pdfPath) {
  console.error('Usage: node create-preview.mjs <pdf-path> [output-path]');
  process.exit(1);
}

async function main() {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  console.log(`PDF has ${doc.numPages} pages`);

  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvasAndContext = new NodeCanvasFactory().create(viewport.width, viewport.height);

  await page.render({
    canvasContext: canvasAndContext.context,
    viewport: viewport,
    canvasFactory: new NodeCanvasFactory(),
  }).promise;

  const buffer = canvasAndContext.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  writeFileSync(outputPath, buffer);
  console.log(`Preview saved to ${outputPath} (${Math.round(buffer.length / 1024)} KB)`);
  console.log(`Page count: ${doc.numPages}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
