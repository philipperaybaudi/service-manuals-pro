// Extract cover page of CB310SL
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-1c';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const file = 'Schemas LUREM CB310SL $5.pdf';
const data = new Uint8Array(readFileSync(`${SOURCE}/${file}`));
const doc = await pdfjs.getDocument({
  data, canvasFactory: new NodeCanvasFactory(),
  standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
}).promise;

console.log(`Pages: ${doc.numPages}`);
for (let p = 1; p <= Math.min(3, doc.numPages); p++) {
  const page = await doc.getPage(p);
  const scale = 1200 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
  factory.destroy(cc);
  writeFileSync(`${OUT}/09-cb310sl-p${p}.jpg`, buffer);
  console.log(`✓ p${p}: ${(buffer.length/1024).toFixed(0)} KB`);
}
console.log('Done.');
