// Extract cover pages of Lot 3 — 15 Manuels LUREM $25
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-3';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'LUREM C210B Manual $25.pdf',           out: '01-c210b-manual.jpg' },
  { file: 'LUREM C2100 Manuel $25.pdf',           out: '02-c2100-manuel.jpg' },
  { file: 'LUREM C260 S2 Manuel $25.pdf',         out: '03-c260-s2.jpg' },
  { file: 'LUREM C260E C310E Manuel $25.pdf',     out: '04-c260e-c310e-manuel.jpg' },
  { file: 'LUREM C310E C260E $25.pdf',            out: '05-c310e-c260e.jpg' },
  { file: 'LUREM C260N Manual $25.pdf',           out: '06-c260n-manual.jpg' },
  { file: 'LUREM C260N Manuel $25.pdf',           out: '07-c260n-manuel.jpg' },
  { file: 'LUREM C266 Manuel $25.pdf',            out: '08-c266-manuel.jpg' },
  { file: 'LUREM C2600 Manuel $25.pdf',           out: '09-c2600-manuel.jpg' },
  { file: 'LUREM C36 Manuel $25.pdf',             out: '10-c36-manuel.jpg' },
  { file: 'LUREM CB310Hz $25.pdf',                out: '11-cb310hz.jpg' },
  { file: 'LUREM CB310SL Manuel $25.pdf',         out: '12-cb310sl-manuel.jpg' },
  { file: 'LUREM Maxi26-plus Manuel $25.pdf',     out: '13-maxi26plus-manuel.jpg' },
  { file: 'LUREM MF260L CB260TL Manuel $25.pdf',  out: '14-mf260l-cb260tl.jpg' },
  { file: 'LUREM Optal 26 - Manuel $25.pdf',      out: '15-optal26-manuel.jpg' },
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

for (const p of PDFS) {
  try {
    const data = new Uint8Array(readFileSync(`${SOURCE}/${p.file}`));
    const doc = await pdfjs.getDocument({
      data,
      canvasFactory: new NodeCanvasFactory(),
      standardFontDataUrl: STANDARD_FONTS,
      useSystemFonts: true,
    }).promise;

    const page = await doc.getPage(1);
    const scale = 1200 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
    factory.destroy(cc);
    writeFileSync(`${OUT}/${p.out}`, buffer);
    console.log(`✓ ${p.out} (${doc.numPages}p, ${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`✗ ${p.file}: ${e.message}`);
  }
}
console.log('\nDone.');
