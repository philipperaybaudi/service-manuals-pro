/**
 * Relance classify-single pour les 6 fichiers en erreur de la catégorie Automobile.
 * Usage : node scripts/retry-automobile-errors.mjs
 */
import { execSync } from 'child_process';

const files = [
  '95_96_Disco1_Manual.pdf',
  'Defender_90_110.pdf',
  'Series_III_Workshop_Manual.pdf',
  'manuel_chassis_HDJ80.pdf',
  'manuel_moteur_2LT.pdf',
  'manuel_moteur_3B_13BT.pdf',
];

for (const file of files) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Traitement : ${file}`);
  console.log('═'.repeat(60));
  try {
    execSync(`node scripts/classify-single.mjs Automobile "${file}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log(`✗ Échec : ${e.message}`);
  }
}

console.log('\n✓ Retries terminés.');
