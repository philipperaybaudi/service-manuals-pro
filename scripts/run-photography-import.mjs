// Launcher : relance l'import Photography jusqu'à ce que tout soit traité
// Si le script plante (OOM), il redémarre automatiquement avec mémoire propre
// Usage: node scripts/run-photography-import.mjs

import { spawn } from 'child_process';

const SCRIPT = 'scripts/import-from-inventory-photography.mjs';
const NODE_ARGS = ['--max-old-space-size=4096', SCRIPT];
const MAX_RESTARTS = 50;

let attempt = 0;

function launch() {
  attempt++;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ Tentative ${attempt}/${MAX_RESTARTS}`);
  console.log('═'.repeat(60));

  const child = spawn(process.execPath, NODE_ARGS, { stdio: 'inherit' });

  child.on('exit', (code, signal) => {
    if (code === 0) {
      console.log('\n✓ Import terminé avec succès.');
      process.exit(0);
    }
    if (attempt >= MAX_RESTARTS) {
      console.log(`\n✗ Abandon après ${MAX_RESTARTS} tentatives.`);
      process.exit(1);
    }
    console.log(`\n⚠ Process terminé (code=${code}, signal=${signal}) — redémarrage dans 2s...`);
    setTimeout(launch, 2000);
  });
}

launch();
