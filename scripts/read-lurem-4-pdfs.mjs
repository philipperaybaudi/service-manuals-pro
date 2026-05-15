// Read the 4 test LUREM PDFs to extract their content
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const SOURCE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';

const PDFS = [
  'Schemas LUREM C260N $5.pdf',
  'LUREM Former RD30 RD26 Notice $10.pdf',
  'LUREM c-360-410-n-04 Manuel $15.pdf',
  'LUREM C2000 $25.pdf',
];

(async () => {
  for (const filename of PDFS) {
    console.log('\n' + '='.repeat(100));
    console.log('FILE:', filename);
    console.log('='.repeat(100));

    try {
      const data = readFileSync(`${SOURCE}/${filename}`);
      const parser = new PDFParse({ data });
      const result = await parser.getText();

      console.log('Pages total:', result.pages?.length || result.total || 'N/A');
      console.log('\n--- TEXT (max 3000 chars) ---');
      const text = result.text || '';
      console.log(text.substring(0, 3000));
      console.log('--- END TEXT ---');
      console.log('Text length:', text.length);
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
})();
