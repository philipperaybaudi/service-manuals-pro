// Extract first page of PDF as JPG preview using pdf2pic + sharp
const { fromPath } = require('pdf2pic');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const pdfPath = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégorie/Usinage/Foundations of Mechanical Accuracy by Wayne R Moore - 1970.pdf';
const outputPath = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews/foundations-mechanical-accuracy.jpg';

async function extractPreview() {
  const tempDir = path.dirname(outputPath);

  const converter = fromPath(pdfPath, {
    density: 200,
    saveFilename: 'temp_preview',
    savePath: tempDir,
    format: 'png',
    width: 1200,
    height: 1600,
  });

  console.log('Converting page 1 to image...');
  const result = await converter(1, { responseType: 'image' });
  console.log('Conversion done:', result.path);

  // Resize to ~800px wide and convert to JPG
  const tempPng = result.path;
  await sharp(tempPng)
    .resize({ width: 800 })
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  // Clean up temp PNG
  if (fs.existsSync(tempPng)) {
    fs.unlinkSync(tempPng);
  }

  console.log(`Preview saved: ${outputPath}`);
}

extractPreview().catch(err => { console.error(err); process.exit(1); });
