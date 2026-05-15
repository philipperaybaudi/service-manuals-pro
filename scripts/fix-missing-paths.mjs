/**
 * fix-missing-paths.mjs
 *
 * Pour chaque entrée "done" du rapport dont le fichier est introuvable
 * au chemin original_path, cherche le fichier dans DOCS EN LIGNE
 * et met à jour le chemin si trouvé.
 */
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile';

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

let fixed = 0;
let notFound = 0;
let ambiguous = 0;
let alreadyOk = 0;

// Construire un index de tous les fichiers dans DOCS EN LIGNE
console.log('Scan de DOCS EN LIGNE en cours...');
const allFiles = new Map(); // filename -> [fullPath, ...]

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const name = entry.name;
      if (!allFiles.has(name)) allFiles.set(name, []);
      allFiles.get(name).push(fullPath);
    }
  }
}

scanDir(DOCS_EN_LIGNE);
console.log(`${allFiles.size} noms de fichiers uniques trouvés dans DOCS EN LIGNE\n`);

for (const doc of report.docs) {
  if (doc.status !== 'done') continue;

  // Vérifier si le fichier existe au chemin actuel
  if (fs.existsSync(doc.original_path)) {
    alreadyOk++;
    continue;
  }

  // Chercher dans DOCS EN LIGNE
  const filename = doc.original_filename;
  const matches = allFiles.get(filename) || [];

  if (matches.length === 0) {
    console.log(`✗ Introuvable partout   : ${filename} (${doc.slug})`);
    notFound++;
  } else if (matches.length === 1) {
    const newPath = matches[0];
    console.log(`✓ Chemin corrigé : ${filename}`);
    console.log(`  ${doc.original_path}`);
    console.log(`  → ${newPath}`);
    doc.original_path = newPath;
    fixed++;
  } else {
    // Plusieurs correspondances — on cherche le bon dossier par brand
    const brandDir = doc.brand.replace(/[^a-zA-Z0-9\s\-]/g, '').toUpperCase();
    const brandMatch = matches.find(p => p.toUpperCase().includes(brandDir));
    if (brandMatch) {
      console.log(`✓ Chemin corrigé (brand) : ${filename} → ${brandMatch}`);
      doc.original_path = brandMatch;
      fixed++;
    } else {
      console.log(`⚠ Ambigu (${matches.length} résultats) : ${filename} (${doc.slug})`);
      matches.forEach(m => console.log(`   - ${m}`));
      ambiguous++;
    }
  }
}

console.log(`\n════════════════════════════════`);
console.log(`Résumé :`);
console.log(`  Déjà OK        : ${alreadyOk}`);
console.log(`  Corrigés       : ${fixed}`);
console.log(`  Introuvables   : ${notFound}`);
console.log(`  Ambigus        : ${ambiguous}`);

if (fixed > 0) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✓ Rapport mis à jour — ${fixed} chemin(s) corrigé(s).`);
  console.log('Relance maintenant : node scripts/import-from-report.mjs --category automobile');
}
