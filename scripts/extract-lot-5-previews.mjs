// Extract cover pages of Lot 5 — 7 docs LUREM $20
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-5';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'LUREM C360 C410n $20.pdf',                    out: '01-c360-c410n.jpg' },
  { file: 'LUREM C20 Notice $20.pdf',                    out: '02-c20-notice.jpg' },
  { file: 'LUREM Variateurs HZ $20.pdf',                 out: '03-variateurs-hz.jpg' },
  { file: 'LUREM Optal 26 Liste $20.pdf',                out: '04-optal26-liste.jpg' },
  { file: 'LUREM C260J Manuel $20.pdf',                  out: '05-c260j-manuel.jpg' },
  { file: 'LUREM Former 310 STI Liste - Schemas $20.pdf', out: '06-former310sti-liste-schemas.jpg' },
  { file: 'LUREM C360-C410 Manuel $20.pdf',              out: '07-c360-c410-manuel.jpg' },
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
