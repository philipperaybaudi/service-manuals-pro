// Extract text from pages 1-8 of the PDF using pdfjs-dist
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const pdfPath = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégorie/Usinage/Foundations of Mechanical Accuracy by Wayne R Moore - 1970.pdf';

async function extractText() {
  const doc = await pdfjsLib.getDocument({ url: pdfPath, useSystemFonts: true }).promise;
  console.log(`Total pages: ${doc.numPages}\n`);

  for (let i = 1; i <= Math.min(8, doc.numPages); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    console.log(`\n===== PAGE ${i} =====`);
    console.log(text);
  }
}

extractText().catch(err => { console.error(err); process.exit(1); });
