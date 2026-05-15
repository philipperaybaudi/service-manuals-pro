/**
 * Déplace vers DOCS EN LIGNE tous les fichiers status="imported" encore présents dans SOURCE.
 * Usage : node scripts/move-imported-files.mjs <Subfolder>
 */
import fs from 'fs';
import path from 'path';

const SUBFOLDER = process.argv[2];
if (!SUBFOLDER) { console.error('Usage : node scripts/move-imported-files.mjs <Subfolder>'); process.exit(1); }

const REPORT_PATH = path.join('scripts', `docs-a-classer-report-${SUBFOLDER.toLowerCase()}.json`);
const DEST_ROOT   = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
let moved = 0, missing = 0, errors = 0;

for (const d of report.docs.filter(d => d.status === 'imported')) {
  if (!d.original_path || !fs.existsSync(d.original_path)) { missing++; continue; }
  const destDir  = path.join(DEST_ROOT, d.category_fr, d.brand);
  const destPath = path.join(destDir, d.original_filename);
  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(d.original_path, destPath);
    moved++;
    console.log('✓ ' + d.original_filename);
  } catch (e) {
    errors++;
    console.log('✗ ' + d.original_filename + ' — ' + e.message);
  }
}

console.log(`\nDéplacés : ${moved} | Déjà absents : ${missing} | Erreurs : ${errors}`);
