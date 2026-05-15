// Extract cover page of LUREM C2000 $25 (missed from Lot 3)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/tmp-lurem-previews/lot-3-extra';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const file = 'LUREM C2000 $25.pdf';
const data = new Uint8Array(readFileSync(`${SOURCE}/${file}`));
const doc = await pdfjs.getDocument({
  data, canvasFactory: new NodeCanvasFactory(),
  standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true,
}).promise;

const page = await doc.getPage(1);
const scale = 1200 / page.getViewport({ scale: 1 }).width;
const vp = page.getViewport({ scale });
const factory = new NodeCanvasFactory();
const cc = factory.create(vp.width, vp.height);
await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.88 });
factory.destroy(cc);
writeFileSync(`${OUT}/01-c2000.jpg`, buffer);
console.log(`✓ 01-c2000.jpg (${doc.numPages}p, ${(buffer.length / 1024).toFixed(0)} KB)`);
console.log('Done.');
