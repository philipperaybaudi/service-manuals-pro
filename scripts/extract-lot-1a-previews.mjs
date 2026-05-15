// Extract cover pages of Lot 1A (11 Schemas LUREM $5 PDFs)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-1a';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'Schemas LUREM C2000 $5.pdf',        out: '01-c2000.jpg' },
  { file: 'Schemas LUREM C2100 $5.pdf',        out: '02-c2100.jpg' },
  { file: 'Schemas LUREM C2600 $5.pdf',        out: '03-c2600.jpg' },
  { file: 'Schemas LUREM C2600 plus $5.pdf',   out: '04-c2600-plus.jpg' },
  { file: 'Schemas LUREM C2600S $5.pdf',       out: '05-c2600s.jpg' },
  { file: 'Schemas LUREM C263 $5.pdf',         out: '06-c263.jpg' },
  { file: 'Schemas LUREM C265 $5.pdf',         out: '07-c265.jpg' },
  { file: 'Schemas LUREM C266 $5.pdf',         out: '08-c266.jpg' },
  { file: 'Schemas LUREM C310SX $5.pdf',       out: '09-c310sx.jpg' },
  { file: 'Schemas LUREM C310e-260e $5.pdf',   out: '10-c310e-260e.jpg' },
  { file: 'Schemas LUREM C310i $5.pdf',        out: '11-c310i.jpg' },
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
