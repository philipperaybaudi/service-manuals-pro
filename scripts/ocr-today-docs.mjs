// OCR all documents imported today to verify/improve titles and descriptions
// Usage: node scripts/ocr-today-docs.mjs > scripts/ocr-results.txt
// Uses tesseract.js with fra+eng language pack

import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');
const canvas = require('canvas');
const Tesseract = require('tesseract.js');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const BASE_AV = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/ALLIGATOR VOLLMER';
const BASE_AX = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/AXMINSTER';
const BASE_BABY = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/BABY';

const files = [
  // Alligator — blank text, visual content → OCR needed
  { base: BASE_AV, file: 'Alligator JED 63.pdf',        lang: 'fra' },
  { base: BASE_AV, file: 'Alligator JED 65.pdf',        lang: 'fra' },
  { base: BASE_AV, file: 'Alligator JED 73.pdf',        lang: 'fra' },
  { base: BASE_AV, file: 'Alligator JED 75.pdf',        lang: 'fra' },
  { base: BASE_AV, file: 'Alligator NM 1 & 2 $10.pdf',  lang: 'fra' },
  { base: BASE_AV, file: 'Alligator NM3 $10.pdf',       lang: 'fra' },
  { base: BASE_AV, file: 'Alligator NM4 $10.pdf',       lang: 'fra' },
  { base: BASE_AV, file: 'Alligator SM1000.pdf',        lang: 'fra' },
  { base: BASE_AV, file: 'Alligator SM80.pdf',          lang: 'fra' },
  // Vollmer — text already extractable, OCR as cross-check
  { base: BASE_AV, file: 'Vollmer DEPOMATIC.pdf',       lang: 'fra' },
  { base: BASE_AV, file: 'Vollmer MAP 200 & 400.pdf',   lang: 'fra' },
  { base: BASE_AV, file: 'Vollmer SIA 350.pdf',         lang: 'fra' },
  { base: BASE_AV, file: 'Vollmer T 230, 330, 420.pdf', lang: 'fra' },
  { base: BASE_AV, file: 'Vollmer T 330 & 420 CAS.pdf', lang: 'fra' },
  // Axminster APTC — blank text, visual content → OCR needed
  { base: BASE_AX, file: 'Axminster APTC M 900.pdf',    lang: 'eng' },
  { base: BASE_AX, file: 'Axminster APTC M 950.pdf',    lang: 'eng' },
  // Axminster — text already extractable, OCR as cross-check
  { base: BASE_AX, file: 'Axminster AWBL1200.pdf',      lang: 'eng' },
  { base: BASE_AX, file: 'Axminster AWSL $10.pdf',      lang: 'eng' },
  { base: BASE_AX, file: 'Axminster AWVSL 900 & 1000.pdf', lang: 'eng' },
  { base: BASE_AX, file: 'Axminster CCL $10.pdf',       lang: 'eng' },
  { base: BASE_AX, file: 'Axminster CL-1500 copy lathe.pdf', lang: 'eng' },
  // Baby
  { base: BASE_BABY, file: 'Baby 1130 $10.pdf',         lang: 'fra' },
];

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderPageToBuffer(pdfPath, pageNum) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  if (pageNum > doc.numPages) return null;
  const page = await doc.getPage(pageNum);
  const scale = 1200 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buf = cc.canvas.toBuffer('image/png');
  factory.destroy(cc);
  return buf;
}

async function ocrBuffer(buf, lang) {
  const { data: { text } } = await Tesseract.recognize(buf, lang, { logger: () => {} });
  return text.replace(/\s+/g, ' ').trim();
}

(async () => {
  console.error('Starting OCR... (this will take several minutes)');

  for (const { base, file, lang } of files) {
    const pdfPath = base + '/' + file;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`FILE: ${file}`);
    console.log('='.repeat(70));

    try {
      const data = new Uint8Array(readFileSync(pdfPath));
      const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
      const numPages = doc.numPages;
      console.log(`Pages: ${numPages}`);

      // OCR pages 1, 2, and 3 (if they exist)
      for (let p = 1; p <= Math.min(3, numPages); p++) {
        console.error(`  OCR p${p}: ${file}`);
        const buf = await renderPageToBuffer(pdfPath, p);
        if (!buf) continue;
        const text = await ocrBuffer(buf, lang);
        if (text.length > 20) {
          console.log(`--- Page ${p} ---`);
          console.log(text.substring(0, 1200));
        } else {
          console.log(`--- Page ${p} --- (blank)`);
        }
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  console.error('\nOCR complete.');
})();
