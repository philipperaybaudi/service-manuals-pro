/**
 * Déplace les PDFs Audio & HiFi encore dans DOSSIER SOURCE vers DOCS EN LIGNE
 * - Parcourt tous les PDFs dans SOURCE/Audio & HiFi
 * - Pour chaque fichier trouvé, cherche une entrée status=imported dans le rapport (par nom de fichier)
 * - Si trouvé → déplace vers DOCS EN LIGNE/{category_fr}/{brand}/
 * - Si non trouvé → affiche le fichier comme "à traiter manuellement"
 */

import fs from 'fs';
import path from 'path';

const SOURCE_BASE  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Audio & HiFi';
const DEST_BASE    = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';
const REPORT       = 'scripts/docs-a-classer-report-audio & hifi.json';

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

// Index par nom de fichier → entrées importées
const importedByFilename = {};
for (const doc of report.docs) {
  if (doc.status === 'imported' && doc.original_filename) {
    importedByFilename[doc.original_filename] = doc;
  }
}

// Parcourir récursivement le dossier SOURCE
function findPdfs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findPdfs(fullPath));
    else if (entry.name.toLowerCase().endsWith('.pdf')) results.push(fullPath);
  }
  return results;
}

const pdfs = findPdfs(SOURCE_BASE);
console.log(`${pdfs.length} PDF(s) encore dans SOURCE\n`);

let moved = 0;
let skipped = 0;

for (const pdfPath of pdfs) {
  const filename = path.basename(pdfPath);
  const doc = importedByFilename[filename];

  if (!doc) {
    console.log(`⚠ Pas d'entrée importée pour : ${filename}`);
    skipped++;
    continue;
  }

  // Destination : DOCS EN LIGNE/{category_fr}/{brand}/{filename}
  const destDir  = path.join(DEST_BASE, doc.category_fr, doc.brand);
  const destPath = path.join(destDir, filename);

  if (fs.existsSync(destPath)) {
    console.log(`⏭ Déjà présent en DOCS EN LIGNE : ${filename}`);
    skipped++;
    continue;
  }

  // Créer le dossier destination si nécessaire
  fs.mkdirSync(destDir, { recursive: true });

  fs.renameSync(pdfPath, destPath);
  console.log(`✅ Déplacé : ${doc.brand}\\${filename}`);
  console.log(`   → ${destPath}`);
  moved++;
}

console.log(`\n${moved} fichier(s) déplacé(s), ${skipped} ignoré(s)`);
