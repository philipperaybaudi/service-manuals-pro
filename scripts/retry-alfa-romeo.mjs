/**
 * Reclassifie avec --force-jpeg tous les fichiers ALFA-ROMEO récupérés.
 * Usage : node scripts/retry-alfa-romeo.mjs
 */
import { execSync } from 'child_process';

const files = [
  'AID.pdf', 'ARE.pdf', 'COH.pdf', 'DIAG.pdf',
  'DIS.pdf', 'EAVT734A.pdf', 'EAVT766A.pdf',
  'IMP AID.pdf', 'IMP ARE.pdf', 'IMP DIAG.pdf',
  'IMP DIS.pdf', 'IMP Masses.pdf', 'IMP MOT.pdf',
  'IMP SIG.pdf', 'INF.pdf', 'LEG.pdf',
  'MOT.pdf', 'SEC.pdf', 'SIG.pdf',
];

for (const file of files) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Traitement : ${file}`);
  try {
    execSync(`node scripts/classify-single.mjs Automobile "${file}" --force-jpeg`, { stdio: 'inherit' });
  } catch (e) {
    console.log(`✗ Échec : ${e.message}`);
  }
}
console.log('\n✓ Terminé.');
