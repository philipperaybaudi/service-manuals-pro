// Extract cover pages of Lot 4 — 5 Manuels LUREM $22
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-4';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'LUREM T30N Manuel $22.pdf',              out: '01-t30n.jpg' },
  { file: 'LUREM SAR 400 Manuel $22.pdf',           out: '02-sar400.jpg' },
  { file: 'LUREM TS41STI TS4TI TS4I Manuel $22.pdf', out: '03-ts41sti-ts4ti-ts4i.jpg' },
  { file: 'LUREM SC25 Manuel $22.pdf',              out: '04-sc25.jpg' },
  { file: 'LUREM Router 7 Manuel $22.pdf',          out: '05-router7.jpg' },
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
