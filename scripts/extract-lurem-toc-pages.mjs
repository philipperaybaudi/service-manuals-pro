// Extract pages 2-4 for table of contents visual inspection
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews';

const PDFS = [
  { file: 'LUREM Former RD30 RD26 Notice $10.pdf', prefix: 'former-rd30' },
  { file: 'LUREM c-360-410-n-04 Manuel $15.pdf', prefix: 'c-360-410' },
  { file: 'LUREM C2000 $25.pdf', prefix: 'c2000' },
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

(async () => {
  for (const p of PDFS) {
    console.log('\n>>>', p.file);
    const data = new Uint8Array(readFileSync(`${SOURCE}/${p.file}`));
    const doc = await pdfjs.getDocument({
      data,
      canvasFactory: new NodeCanvasFactory(),
      standardFontDataUrl: STANDARD_FONTS,
      useSystemFonts: true,
    }).promise;

    for (const pageNum of [2, 3, 4]) {
      if (pageNum > doc.numPages) break;
      const page = await doc.getPage(pageNum);
      const scale = 1200 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
      factory.destroy(cc);
      const out = `${OUT}/${p.prefix}-p${pageNum}.jpg`;
      writeFileSync(out, buffer);
      console.log(`  p${pageNum}: ${(buffer.length / 1024).toFixed(0)} KB`);
    }
  }
  console.log('\nDone.');
})();
