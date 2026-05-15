/**
 * Corrige le rapport Audio & HiFi :
 * - Les docs dans les sous-dossiers STUDER REVOX (A700, A77, B77...) avaient
 *   category_fr = "STUDER REVOX" et brand = "A700"/"A77"/etc. → incorrect
 * - Les fichiers ont été déplacés : STUDER REVOX/A700/fichier.pdf → STUDER REVOX/fichier.pdf
 * - Correction : category_fr = "Audio & HiFi", brand = "STUDER REVOX"
 * - original_path recalculé (suppression du sous-dossier modèle)
 * - Slug recalculé avec le bon préfixe
 */

import fs from 'fs';
import path from 'path';

const REPORT = 'scripts/docs-a-classer-report-audio & hifi.json';
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

// Modèles Revox qui étaient utilisés comme marque (noms de sous-dossiers)
const REVOX_MODELS = new Set(['A700', 'A77', 'B77', 'A78', '884', 'A88', 'A36', 'F36',
  'B36', 'A710', 'B710', 'A721', 'B721', 'A722', 'B722', 'A730', 'B750', 'B760',
  'B790', 'C36', 'C270', 'C274', 'H1', 'PR99', 'G36', 'T26', 'T51']);

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let fixed = 0;

for (const doc of report.docs) {
  const wrongCategory = doc.category_fr === 'STUDER REVOX' ||
    (doc.brand && REVOX_MODELS.has(doc.brand.toUpperCase()));

  if (wrongCategory && doc.status !== 'imported') {
    const oldBrand    = doc.brand;
    const oldCategory = doc.category_fr;
    const oldPath     = doc.original_path;

    doc.category_fr = 'Audio & HiFi';
    doc.brand       = 'STUDER REVOX';

    // Recalcule original_path : supprime le sous-dossier modèle
    // Avant : ...STUDER REVOX\A700\fichier.pdf
    // Après  : ...STUDER REVOX\fichier.pdf
    if (doc.original_path) {
      const dir      = path.dirname(doc.original_path);   // ...STUDER REVOX\A700
      const filename = path.basename(doc.original_path);  // fichier.pdf
      const parentDir = path.dirname(dir);                // ...STUDER REVOX
      const modelDir  = path.basename(dir);               // A700
      if (REVOX_MODELS.has(modelDir.toUpperCase())) {
        doc.original_path = path.join(parentDir, filename);
      }
    }

    // Recalcule le slug : remplace le préfixe de l'ancienne marque par "studer-revox-"
    if (doc.slug) {
      const oldPrefix = slugify(oldBrand) + '-';
      if (doc.slug.startsWith(oldPrefix)) {
        doc.slug = 'studer-revox-' + doc.slug.slice(oldPrefix.length);
      } else {
        doc.slug = 'studer-revox-' + doc.slug;
      }
      doc.slug = doc.slug.slice(0, 120);
    }

    // Recalcule preview_file si le slug a changé
    if (doc.preview_file) {
      const previewDir = path.dirname(doc.preview_file);
      doc.preview_file = path.join(previewDir, `${doc.slug}.jpg`);
    }

    console.log(`✅ ${oldBrand} → STUDER REVOX | cat: ${oldCategory} → Audio & HiFi`);
    console.log(`   path : ${oldPath}`);
    console.log(`   →      ${doc.original_path}`);
    console.log(`   slug : ${doc.slug}`);
    fixed++;
  }
}

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n${fixed} entrée(s) corrigée(s) dans ${REPORT}`);
