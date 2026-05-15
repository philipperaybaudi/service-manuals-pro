// Analyze all PDFs in a folder: render cover + extract text (+ OCR if blank)
// Usage: node scripts/analyze-folder.mjs <folderPath> [lang]
// lang: fra or eng (default: eng)

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');
const canvas = require('canvas');
const Tesseract = require('tesseract.js');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const COVERS_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/covers';

const folderPath = process.argv[2];
const lang = process.argv[3] || 'eng';

if (!folderPath) { console.error('Usage: node analyze-folder.mjs <folderPath> [lang]'); process.exit(1); }
if (!existsSync(COVERS_DIR)) mkdirSync(COVERS_DIR, { recursive: true });

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderPage(pdfPath, pageNum, scale = 1200) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  if (pageNum > doc.numPages) return { buf: null, numPages: doc.numPages };
  const page = await doc.getPage(pageNum);
  const sc = scale / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale: sc });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.90 });
  factory.destroy(cc);
  return { buf, numPages: doc.numPages };
}

async function extractText(pdfPath, maxPages = 4) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  let text = '';
  for (let p = 1; p <= Math.min(maxPages, doc.numPages); p++) {
    const page = await doc.getPage(p);
    const ct = await page.getTextContent();
    text += ct.items.map(i => i.str).join(' ') + '\n';
  }
  return text.replace(/\s+/g, ' ').trim();
}

async function ocrBuffer(buf, l) {
  const langMap = { 'fra': 'fra', 'fre': 'fra', 'fr': 'fra', 'eng': 'eng', 'en': 'eng' };
  const tessLang = langMap[l] || l;
  const { data: { text } } = await Tesseract.recognize(buf, tessLang, {
    logger: () => {},
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/'
  });
  return text.replace(/\s+/g, ' ').trim();
}

(async () => {
  const files = readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pdf')).sort();
  console.log(`Found ${files.length} PDF(s) in ${folderPath}\n`);

  for (const file of files) {
    const pdfPath = folderPath + '/' + file;
    const safeName = file.replace(/[\$\s,&\/\\]+/g, '_').replace('.pdf', '').replace(/_$/, '');
    console.log('='.repeat(70));
    console.log(`FILE: ${file}`);
    console.log('='.repeat(70));

    try {
      // Render cover page
      const { buf: coverBuf, numPages } = await renderPage(pdfPath, 1, 1000);
      console.log(`Pages: ${numPages}`);
      if (coverBuf) {
        const coverOut = `${COVERS_DIR}/${safeName}_p1.jpg`;
        writeFileSync(coverOut, coverBuf);
        console.log(`Cover: ${coverOut} (${(coverBuf.length/1024).toFixed(0)} KB)`);
      }

      // Try text extraction first
      const text = await extractText(pdfPath, 4);
      if (text.length > 50) {
        console.log(`\n[TEXT EXTRACTED]`);
        console.log(text.substring(0, 1500));
      } else {
        // OCR pages 1-3
        console.log(`\n[NO TEXT — running OCR (${lang})...]`);
        for (let p = 1; p <= Math.min(3, numPages); p++) {
          process.stderr.write(`  OCR page ${p}/${Math.min(3, numPages)}...\n`);
          const { buf } = await renderPage(pdfPath, p, 1200);
          if (!buf) continue;
          const ocrText = await ocrBuffer(buf, lang);
          if (ocrText.length > 20) {
            console.log(`\n--- OCR Page ${p} ---`);
            console.log(ocrText.substring(0, 1000));
          } else {
            console.log(`--- OCR Page ${p} --- (blank)`);
          }
        }
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    console.log('');
  }
})();
