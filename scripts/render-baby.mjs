import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');
const canvas = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const PDF = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/BABY/Baby 1130 $10.pdf';
const OUT = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/covers/Baby_1130_p1.jpg';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

(async () => {
  const data = new Uint8Array(readFileSync(PDF));
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  console.log('Pages:', doc.numPages);
  for (let p = 1; p <= Math.min(4, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const ct = await page.getTextContent();
    const t = ct.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
    if (t) console.log(`--- Page ${p} ---\n${t.substring(0, 800)}`);
  }
  const page = await doc.getPage(1);
  const scale = 1000 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.9 });
  writeFileSync(OUT, buf);
  console.log(`Cover: ${(buf.length/1024).toFixed(0)} KB`);
})().catch(console.error);
