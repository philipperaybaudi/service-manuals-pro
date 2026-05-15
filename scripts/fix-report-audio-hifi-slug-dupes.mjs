/**
 * Corrige les entrées Audio & HiFi dont le slug était en doublon :
 * elles ont été marquées "imported" sans être réellement uploadées.
 * Ce script leur assigne un slug unique et remet status:"done"
 * pour que Phase 2 les importe correctement.
 */

import fs from 'fs';

const REPORT = 'scripts/docs-a-classer-report-audio & hifi.json';
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

// Corrections : original_filename → nouveau slug
const SLUG_FIXES = {
  'Revox_A76 Service Manual GB $20.pdf':       'studer-revox-revox-a76-service-manual-en',
  'Revox_A78 Service Manual $17.pdf':           'studer-revox-revox-a78-service-manual-en',
  'Revox_B215_Op_LR.pdf':                       'studer-revox-revox-b215-operating-instructions-fr',
  'Revox_PR99_MkI-II Service Manual $20.pdf':   'studer-revox-revox-pr99-mki-mkii-service-manual-en',
  'Revox_A700-Telecomando IT $7.pdf':           'studer-revox-revox-a700-telecomando-it',
  'Nagra_4.2 Notice GB_2.pdf':                  'nagra-nagra-4-2-instruction-manual-gb-2',
};

let fixed = 0;

for (const doc of report.docs) {
  const newSlug = SLUG_FIXES[doc.original_filename];
  if (!newSlug) continue;

  if (doc.status === 'imported') {
    const oldSlug = doc.slug;
    doc.slug = newSlug;
    doc.status = 'done';

    // Mettre à jour le nom de la preview en cache si elle existe
    if (doc.preview_file) {
      doc.preview_file = doc.preview_file.replace(/[^\\\/]+\.jpg$/, `${newSlug}.jpg`);
    }

    console.log(`✅ ${doc.original_filename}`);
    console.log(`   slug : ${oldSlug} → ${newSlug}`);
    console.log(`   status : imported → done`);
    fixed++;
  }
}

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n${fixed} entrée(s) corrigée(s) dans ${REPORT}`);
if (fixed > 0) console.log('\n→ Lancer : node scripts/import-from-report.mjs "Audio & HiFi"');
