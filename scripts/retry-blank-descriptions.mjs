/**
 * Reclassifie avec --force-jpeg les fichiers ayant des descriptions vides/blanches.
 * Usage : node scripts/retry-blank-descriptions.mjs <Subfolder>
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUBFOLDER = process.argv[2];
if (!SUBFOLDER) { console.error('Usage : node scripts/retry-blank-descriptions.mjs <Subfolder>'); process.exit(1); }

const REPORT_FILE = path.join('scripts', `docs-a-classer-report-${SUBFOLDER.toLowerCase()}.json`);
const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));

const VRAI_VIDE = /pages? (vierges?|blanch|blanche)|contenu (vierge|non lisible|non visible|non accessible|non détectable|vide|illisible|absent)|apparai[st]+ (vierge|vide|blanc)|principalement (vierge|blanc)|toutes les pages.*vierge|pages.*n.est pas lisible|aucun contenu (lisible|visible|technique)|constitué.*(pages blan|vierge)|contenu.*minimal (visible|sur les)/i;

const bad = report.docs.filter(d =>
  d.status === 'done' && (VRAI_VIDE.test(d.description_fr || '') || VRAI_VIDE.test(d.description_en || ''))
);

console.log(`${bad.length} fichier(s) à reclassifier avec --force-jpeg (${SUBFOLDER})\n`);

for (const doc of bad) {
  console.log(`${'═'.repeat(60)}`);
  console.log(`Traitement : ${doc.original_filename}`);
  try {
    execSync(
      `node scripts/classify-single.mjs "${SUBFOLDER}" "${doc.original_filename}" --force-jpeg`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.log(`✗ Échec : ${e.message}`);
  }
}

console.log('\n✓ Retries terminés.');
