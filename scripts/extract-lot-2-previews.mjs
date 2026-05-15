// Extract cover pages of Lot 2 — 16 Éclatés/Listes LUREM $19
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-2';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const PDFS = [
  { file: 'LUREM CB310 RL-RLX-04 Liste Eclate $19.pdf',    out: '01-cb310-rl-rlx.jpg' },
  { file: 'LUREM CB310rlrlx Liste Eclate $19.pdf',          out: '02-cb310rlrlx.jpg' },
  { file: 'LUREM CB310SL Liste Eclaté $19.pdf',             out: '03-cb310sl.jpg' },
  { file: 'LUREM CB410 rlx Liste Eclatés $19.pdf',          out: '04-cb410rlx.jpg' },
  { file: 'LUREM C260e C310e Liste $19.pdf',                out: '05-c260e-c310e.jpg' },
  { file: 'LUREM FORMER 260s Liste Eclate $19.pdf',         out: '06-former-260s.jpg' },
  { file: 'LUREM FORMER 260SI Liste Eclate $19.pdf',        out: '07-former-260si.jpg' },
  { file: 'LUREM Former 310 s Liste Eclate $19.pdf',        out: '08-former-310s.jpg' },
  { file: 'LUREM Former 310si Liste Eclate $19.pdf',        out: '09-former-310si.jpg' },
  { file: 'LUREM Former 310 st Liste Eclate $19.pdf',       out: '10-former-310st.jpg' },
  { file: 'LUREM FORMER 310STI Liste Eclate $19.pdf',       out: '11-former-310sti.jpg' },
  { file: 'LUREM Maxi26plus Liste Eclate $19.pdf',          out: '12-maxi26plus.jpg' },
  { file: 'LUREM RD41e Liste Eclate $19.pdf',               out: '13-rd41e.jpg' },
  { file: 'LUREM T180 Liste Eclate $19.pdf',                out: '14-t180.jpg' },
  { file: 'LUREM TS15rl Liste Eclate$19.pdf',               out: '15-ts15rl.jpg' },
  { file: 'LUREM TS41STI Liste Eclate $19.pdf',             out: '16-ts41sti.jpg' },
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
