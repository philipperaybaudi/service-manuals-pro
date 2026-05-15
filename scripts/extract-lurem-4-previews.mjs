// Extract first page of the 4 test LUREM PDFs as JPG
// Based on the working render-covers.mjs pattern
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'Schemas LUREM C260N $5.pdf', out: 'lurem-schemas-c260n.jpg' },
  { file: 'LUREM Former RD30 RD26 Notice $10.pdf', out: 'lurem-former-rd30-rd26-notice.jpg' },
  { file: 'LUREM c-360-410-n-04 Manuel $15.pdf', out: 'lurem-c-360-410-n-04-manuel.jpg' },
  { file: 'LUREM C2000 $25.pdf', out: 'lurem-c2000.jpg' },
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

(async () => {
  for (const p of PDFS) {
    console.log('\n>>> ', p.file);
    try {
      const data = new Uint8Array(readFileSync(`${SOURCE}/${p.file}`));
      const doc = await pdfjs.getDocument({
        data,
        canvasFactory: new NodeCanvasFactory(),
        standardFontDataUrl: STANDARD_FONTS,
        useSystemFonts: true,
      }).promise;

      console.log('  Pages:', doc.numPages);

      const page = await doc.getPage(1);
      const scale = 1200 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
      factory.destroy(cc);

      const outPath = `${OUT}/${p.out}`;
      writeFileSync(outPath, buffer);
      console.log('  ✅ Saved:', outPath, `(${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log('  ❌ Error:', e.message);
    }
  }
  console.log('\nDone.');
})();
