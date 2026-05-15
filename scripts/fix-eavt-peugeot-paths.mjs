import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const fixes = [
  {
    slug: 'peugeot-expert-citroen-jumpy-fiat-scudo-diesel-schema-fiche-1996',
    newPath: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\FIAT\\EAVT729A.pdf'
  },
  {
    slug: 'peugeot-partner-citroen-berlingo-essence-schema-fiche-1998',
    newPath: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\CITROEN\\EAVT747A.pdf'
  }
];

let fixed = 0;
for (const fix of fixes) {
  const entry = report.docs.find(d => d.slug === fix.slug);
  if (!entry) {
    console.log(`✗ Slug non trouvé : ${fix.slug}`);
    continue;
  }
  // Vérifier que le fichier existe au nouvel emplacement
  if (!fs.existsSync(fix.newPath)) {
    console.log(`✗ Fichier introuvable : ${fix.newPath}`);
    continue;
  }
  entry.original_path = fix.newPath;
  console.log(`✓ Chemin corrigé pour : ${fix.slug}`);
  fixed++;
}

if (fixed > 0) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n${fixed} entrée(s) corrigée(s). Relance l'import maintenant.`);
} else {
  console.log('\nAucune correction effectuée.');
}
