/**
 * clean-dead-entries.mjs
 *
 * Supprime du rapport toutes les entrées "done" dont le fichier
 * n'existe pas sur le disque (ni à original_path, ni dans DOCS EN LIGNE).
 */
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile';

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

// Construire un index de tous les fichiers dans DOCS EN LIGNE
console.log('Scan de DOCS EN LIGNE...');
const allFiles = new Set();

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else {
      allFiles.add(entry.name.toLowerCase());
    }
  }
}

scanDir(DOCS_EN_LIGNE);
console.log(`${allFiles.size} fichiers indexés dans DOCS EN LIGNE\n`);

const before = report.docs.length;
const dead = [];
const kept = [];

for (const doc of report.docs) {
  if (doc.status !== 'done') {
    kept.push(doc);
    continue;
  }

  const existsAtPath = fs.existsSync(doc.original_path);
  const existsAnywhere = allFiles.has(doc.original_filename.toLowerCase());

  if (!existsAtPath && !existsAnywhere) {
    dead.push(doc);
    console.log(`🗑  Supprimé : ${doc.original_filename} | ${doc.brand} | ${doc.slug}`);
  } else {
    kept.push(doc);
  }
}

report.docs = kept;
report.total = kept.length;

const after = report.docs.length;

console.log(`\n════════════════════════════════`);
console.log(`Entrées avant  : ${before}`);
console.log(`Entrées mortes : ${dead.length}`);
console.log(`Entrées après  : ${after}`);

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n✓ Rapport nettoyé et sauvegardé.`);
