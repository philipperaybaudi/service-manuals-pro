// Extract text from PDFs using pdfjs-dist
// Usage: node scripts/read-pdfs-descriptions.mjs

import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const BASE_AV = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/ALLIGATOR VOLLMER';
const BASE_AX = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/AXMINSTER';

const files = [
  [BASE_AV, 'Alligator JED 63.pdf'],
  [BASE_AV, 'Alligator JED 65.pdf'],
  [BASE_AV, 'Alligator JED 73.pdf'],
  [BASE_AV, 'Alligator JED 75.pdf'],
  [BASE_AV, 'Alligator NM 1 & 2 $10.pdf'],
  [BASE_AV, 'Alligator NM3 $10.pdf'],
  [BASE_AV, 'Alligator NM4 $10.pdf'],
  [BASE_AV, 'Alligator SM1000.pdf'],
  [BASE_AV, 'Alligator SM80.pdf'],
  [BASE_AV, 'Vollmer DEPOMATIC.pdf'],
  [BASE_AV, 'Vollmer MAP 200 & 400.pdf'],
  [BASE_AV, 'Vollmer SIA 350.pdf'],
  [BASE_AV, 'Vollmer T 230, 330, 420.pdf'],
  [BASE_AV, 'Vollmer T 330 & 420 CAS.pdf'],
  [BASE_AX, 'Axminster APTC M 900.pdf'],
  [BASE_AX, 'Axminster APTC M 950.pdf'],
  [BASE_AX, 'Axminster AWBL1200.pdf'],
  [BASE_AX, 'Axminster AWSL $10.pdf'],
  [BASE_AX, 'Axminster AWVSL 900 & 1000.pdf'],
  [BASE_AX, 'Axminster CCL $10.pdf'],
  [BASE_AX, 'Axminster CL-1500 copy lathe.pdf'],
];

async function extractText(pdfPath, maxPages = 6) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const numPages = doc.numPages;
  let text = '';
  for (let p = 1; p <= Math.min(maxPages, numPages); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(i => i.str).join(' ');
    text += pageText + '\n';
  }
  return { text, numPages };
}

(async () => {
  for (const [base, f] of files) {
    try {
      const { text, numPages } = await extractText(base + '/' + f);
      const clean = text.replace(/\s+/g, ' ').trim();
      console.log(`\n${'='.repeat(70)}`);
      console.log(`FILE: ${f}  [${numPages} pages]`);
      console.log(`${'='.repeat(70)}`);
      console.log(clean.substring(0, 2000));
    } catch(e) {
      console.log(`\n=== ${f} ERROR: ${e.message}`);
    }
  }
})();
