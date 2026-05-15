/**
 * Identifie les doublons physiques dans DOCS A CLASSER :
 *  - Dossiers miroirs (ATV / Quad ATV, BIOMEDICAL / MEDICAL, etc.)
 *  - Fichiers identiques par nom+taille dans des dossiers différents
 *  - Dossiers mal nommés (fautes de frappe)
 *  - PDFs mal rangés (ex: Nikon dans SON/)
 *
 * Usage : node scripts/find-physical-duplicates.mjs
 * Résultat : scripts/physical-duplicates-report.json + affichage console
 */

import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS A CLASSER';
const OUT  = 'scripts/physical-duplicates-report.json';

// ─── Parcourir le dossier ─────────────────────────────────────────────────────
function walkDir(dir) {
  const entries = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return entries; }
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...walkDir(fullPath));
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      let size = 0;
      try { size = fs.statSync(fullPath).size; } catch {}
      entries.push({ fullPath, name: item.name, size });
    }
  }
  return entries;
}

console.log('Scan en cours...');
const allPdfs = walkDir(ROOT);
console.log(`${allPdfs.length} PDFs trouvés.\n`);

const report = {
  folder_mirrors: [],
  file_duplicates: [],
  misnamed_folders: [],
  misplaced_files: [],
};

// ─── 1. Doublons par nom+taille (même fichier dans 2 endroits différents) ─────
const byKey = {};
for (const pdf of allPdfs) {
  const key = `${pdf.name.toLowerCase()}|${pdf.size}`;
  if (!byKey[key]) byKey[key] = [];
  byKey[key].push(pdf.fullPath);
}

const fileDuplicates = Object.entries(byKey)
  .filter(([, paths]) => paths.length > 1)
  .map(([key, paths]) => {
    const [name, size] = key.split('|');
    return { name, size_mb: (parseInt(size) / 1024 / 1024).toFixed(2), paths };
  })
  .sort((a, b) => parseFloat(b.size_mb) - parseFloat(a.size_mb));

report.file_duplicates = fileDuplicates;

console.log(`══════════════════════════════════════════════════════`);
console.log(`DOUBLONS PHYSIQUES (même nom + même taille) : ${fileDuplicates.length} fichiers`);
console.log(`══════════════════════════════════════════════════════\n`);

let totalDupMb = 0;
for (const dup of fileDuplicates) {
  const extra = (dup.paths.length - 1) * parseFloat(dup.size_mb);
  totalDupMb += extra;
  console.log(`  📄 ${dup.name} (${dup.size_mb} MB × ${dup.paths.length} copies)`);
  for (const p of dup.paths) {
    const rel = path.relative(ROOT, p);
    console.log(`      ${rel}`);
  }
}
console.log(`\n  → Espace récupérable : ~${totalDupMb.toFixed(0)} MB\n`);

// ─── 2. Dossiers miroirs connus ────────────────────────────────────────────────
const mirrorPairs = [
  ['AUTO MOTO/ATV - All Terrain Vehicle', 'AUTO MOTO/Quad ATV - All Terrain Vehicle'],
  ['BIOMEDICAL',                           'MEDICAL/MEDICAL'],
  ['MEDICAL/DENTAIRE',                     'BIOMEDICAL/DENTAIRE'],
  ['SON/GRUNDIG',                          'RADIO COM/GRUNDIG'],
];

console.log(`══════════════════════════════════════════════════════`);
console.log(`DOSSIERS MIROIRS`);
console.log(`══════════════════════════════════════════════════════\n`);

for (const [a, b] of mirrorPairs) {
  const pathA = path.join(ROOT, a.replace(/\//g, path.sep));
  const pathB = path.join(ROOT, b.replace(/\//g, path.sep));

  const existsA = fs.existsSync(pathA);
  const existsB = fs.existsSync(pathB);
  if (!existsA || !existsB) continue;

  const pdfsA = walkDir(pathA);
  const pdfsB = walkDir(pathB);
  const sizeA = pdfsA.reduce((s, f) => s + f.size, 0);
  const sizeB = pdfsB.reduce((s, f) => s + f.size, 0);

  // Vérifier si les contenus semblent identiques
  const namesA = new Set(pdfsA.map(f => f.name.toLowerCase()));
  const namesB = new Set(pdfsB.map(f => f.name.toLowerCase()));
  const common = [...namesA].filter(n => namesB.has(n));
  const pct = namesA.size > 0 ? Math.round(common.length / namesA.size * 100) : 0;

  const entry = {
    folder_a: a,
    folder_b: b,
    pdfs_a: pdfsA.length,
    pdfs_b: pdfsB.length,
    size_a_mb: (sizeA / 1024 / 1024).toFixed(1),
    size_b_mb: (sizeB / 1024 / 1024).toFixed(1),
    common_files: common.length,
    similarity_pct: pct,
  };
  report.folder_mirrors.push(entry);

  console.log(`  📁 ${a}`);
  console.log(`  📁 ${b}`);
  console.log(`     PDFs : ${pdfsA.length} vs ${pdfsB.length} — Similarité : ${pct}% (${common.length} fichiers communs)`);
  console.log(`     Taille : ${(sizeA/1024/1024).toFixed(0)} MB vs ${(sizeB/1024/1024).toFixed(0)} MB\n`);
}

// ─── 3. Dossiers mal nommés (fautes de frappe) ────────────────────────────────
const typoFolders = [
  { wrong: 'SON/GRUNDING',  correct: 'SON/GRUNDIG'   },
  { wrong: 'SON/TECKNICS',  correct: 'SON/TECHNICS'  },
  { wrong: 'SON/GRUNDING/Satellit 1400', correct: 'RADIO COM/GRUNDIG/Satellit 1400' },
];

console.log(`══════════════════════════════════════════════════════`);
console.log(`DOSSIERS MAL NOMMÉS (fautes de frappe)`);
console.log(`══════════════════════════════════════════════════════\n`);

for (const t of typoFolders) {
  const p = path.join(ROOT, t.wrong.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) continue;
  const pdfs = walkDir(p);
  const sizeMb = (pdfs.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1);
  report.misnamed_folders.push({ ...t, pdf_count: pdfs.length, size_mb: sizeMb });
  console.log(`  ⚠ "${t.wrong}" → devrait être "${t.correct}"`);
  console.log(`    ${pdfs.length} PDFs, ${sizeMb} MB\n`);
}

// ─── 4. Fichiers mal rangés ────────────────────────────────────────────────────
console.log(`══════════════════════════════════════════════════════`);
console.log(`FICHIERS MAL RANGÉS`);
console.log(`══════════════════════════════════════════════════════\n`);

// Nikon dans SON/DOCS à compléter
const misplacedPatterns = [
  { folder: 'SON/DOCS à compléter', reason: 'Documents PHOTOGRAPHIE rangés dans SON/' },
  { folder: 'ENERGIE/Lincoln SA200', reason: 'Doublon de AUTO MOTO/Lincoln SA200' },
  { folder: 'AUTO MOTO/RTA/Collection/Help', reason: 'Fichiers d\'aide RTA Collection (non pertinents)' },
  { folder: 'AUTO MOTO/RTA/Collection/Resource', reason: 'Ressources RTA Collection (non pertinents)' },
  { folder: 'AUTO MOTO/NAVIGATION/GPS', reason: 'Doublon de AUTO MOTO/GPS/PIONEER' },
];

for (const m of misplacedPatterns) {
  const p = path.join(ROOT, m.folder.replace(/\//g, path.sep));
  if (!fs.existsSync(p)) continue;
  const pdfs = walkDir(p);
  if (pdfs.length === 0) continue;
  const sizeMb = (pdfs.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1);
  report.misplaced_files.push({ folder: m.folder, reason: m.reason, files: pdfs.map(f => f.name), size_mb: sizeMb });
  console.log(`  ⚠ ${m.folder}/`);
  console.log(`    Raison : ${m.reason}`);
  pdfs.forEach(f => console.log(`    - ${f.name}`));
  console.log();
}

// ─── Résumé final ─────────────────────────────────────────────────────────────
console.log(`══════════════════════════════════════════════════════`);
console.log(`RÉSUMÉ`);
console.log(`══════════════════════════════════════════════════════`);
console.log(`  Fichiers en double (même nom+taille) : ${fileDuplicates.length} (${totalDupMb.toFixed(0)} MB récupérables)`);
console.log(`  Paires de dossiers miroirs            : ${report.folder_mirrors.length}`);
console.log(`  Dossiers mal nommés                   : ${report.misnamed_folders.length}`);
console.log(`  Dossiers mal rangés                   : ${report.misplaced_files.length}`);

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nRapport sauvegardé : ${OUT}`);
