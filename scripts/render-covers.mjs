// Render cover pages to JPEG for visual inspection
// Usage: node scripts/render-covers.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const OUT_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/covers';

const BASE_AV = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/ALLIGATOR VOLLMER';
const BASE_AX = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/AXMINSTER';

// Only the docs with blank text extraction
const files = [
  [BASE_AV, 'Alligator JED 63.pdf'],
  [BASE_AV, 'Alligator JED 65.pdf'],
  [BASE_AV, 'Alligator JED 73.pdf'],
  [BASE_AV, 'Alligator JED 75.pdf'],
  [BASE_AV, 'Alligator NM 1 & 2 $10.pdf'],
  [BASE_AV, 'Alligator NM3 $10.pdf'],
  [BASE_AV, 'Alligator NM4 $10.pdf'],
  [BASE_AV, 'Alligator SM1000.pdf'],
  [BASE_AV, 'Alligator SM80.pdf'],
  [BASE_AX, 'Axminster APTC M 900.pdf'],
  [BASE_AX, 'Axminster APTC M 950.pdf'],
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

(async () => {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const [base, f] of files) {
    try {
      const data = new Uint8Array(readFileSync(base + '/' + f));
      const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;

      // Render pages 1 and 2
      for (let pageNum = 1; pageNum <= Math.min(2, doc.numPages); pageNum++) {
        const page = await doc.getPage(pageNum);
        const scale = 1000 / page.getViewport({ scale: 1 }).width;
        const vp = page.getViewport({ scale });
        const factory = new NodeCanvasFactory();
        const cc = factory.create(vp.width, vp.height);
        await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
        const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.90 });
        factory.destroy(cc);
        const outName = f.replace(/[\$\s,&\/]+/g, '_').replace('.pdf', '') + `_p${pageNum}.jpg`;
        writeFileSync(OUT_DIR + '/' + outName, buffer);
        console.log(`✓ ${outName} (${(buffer.length/1024).toFixed(0)} KB)`);
      }
    } catch(e) {
      console.log(`✗ ${f}: ${e.message}`);
    }
  }
  console.log(`\nCovers saved to: ${OUT_DIR}`);
})();
