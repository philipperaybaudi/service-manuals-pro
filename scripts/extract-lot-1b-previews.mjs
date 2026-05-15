// Extract cover pages of Lot 1B (11 Schemas LUREM $5 PDFs : C310si → C417)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-1b';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'Schemas LUREM C310si $5.pdf',           out: '01-c310si.jpg' },
  { file: 'Schemas LUREM C310sti $5.pdf',          out: '02-c310sti.jpg' },
  { file: 'Schemas LUREM C311 $5.pdf',             out: '03-c311.jpg' },
  { file: 'Schemas Lurem C315 $5.pdf',             out: '04-c315.jpg' },
  { file: 'Schemas Lurem C317 $5.pdf',             out: '05-c317.jpg' },
  { file: 'Schemas Lurem C360N C410N  C510N $5.pdf', out: '06-c360n-c410n-c510n.jpg' },
  { file: 'Schemas LUREM C410E $5.pdf',            out: '07-c410e.jpg' },
  { file: 'Schemas LUREM C410S $5.pdf',            out: '08-c410s.jpg' },
  { file: 'Schemas LUREM C410SX $5.pdf',           out: '09-c410sx.jpg' },
  { file: 'Schemas LUREM C411 $5.pdf',             out: '10-c411.jpg' },
  { file: 'Schemas LUREM C417 $5.pdf',             out: '11-c417.jpg' },
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
