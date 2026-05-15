/**
 * Phase 1 — Inventaire de DOCS A CLASSER
 * Parcourt tout le dossier, liste les PDFs, détecte les doublons potentiels
 * par rapport aux docs déjà en base (comparaison par nom de fichier).
 *
 * Usage : node scripts/inventory-docs-a-classer.mjs
 * Résultat : scripts/inventory-results.json + affichage console
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS A CLASSER';
const OUT  = 'scripts/inventory-results.json';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 1. Lire tous les docs en base (file_path + title) ───────────────────────
console.log('Chargement des docs en base...');
const { data: dbDocs } = await supabase
  .from('documents')
  .select('slug, title, file_path')
  .eq('active', true);

// Index par nom de fichier normalisé
const dbByFilename = {};
for (const doc of dbDocs) {
  if (doc.file_path) {
    const fname = path.basename(doc.file_path).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!dbByFilename[fname]) dbByFilename[fname] = [];
    dbByFilename[fname].push(doc);
  }
}
console.log(`  ${dbDocs.length} docs en base indexés.\n`);

// ─── 2. Parcourir DOCS A CLASSER ──────────────────────────────────────────────
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

console.log('Scan du dossier DOCS A CLASSER...');
const allPdfs = walkDir(ROOT);
console.log(`  ${allPdfs.length} PDFs trouvés.\n`);

// ─── 3. Analyser chaque PDF ───────────────────────────────────────────────────
const results   = [];
const byFolder  = {};
let   doublon   = 0;

for (const pdf of allPdfs) {
  const rel        = path.relative(ROOT, pdf.fullPath);
  const parts      = rel.split(path.sep);
  const folder     = parts.length > 1 ? parts.slice(0, -1).join(' / ') : '(racine)';
  const fname      = pdf.name;
  const fnameNorm  = fname.toLowerCase().replace(/[^a-z0-9.]/g, '');
  const sizeMb     = (pdf.size / 1024 / 1024).toFixed(2);

  // Détection doublon
  const matches = dbByFilename[fnameNorm] || [];

  const entry = {
    folder,
    file:     fname,
    path:     pdf.fullPath,
    size_mb:  parseFloat(sizeMb),
    doublon:  matches.length > 0,
    doublon_match: matches.map(m => ({ slug: m.slug, title: m.title })),
  };

  results.push(entry);
  if (!byFolder[folder]) byFolder[folder] = [];
  byFolder[folder].push(entry);
  if (matches.length > 0) doublon++;
}

// ─── 4. Résumé console ───────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════');
console.log(`INVENTAIRE — ${allPdfs.length} PDFs dans DOCS A CLASSER`);
console.log('══════════════════════════════════════════════════════\n');

console.log(`Doublons potentiels (même nom de fichier qu'un doc en base) : ${doublon}\n`);

console.log('── Répartition par dossier ──');
const folders = Object.entries(byFolder).sort((a, b) => b[1].length - a[1].length);
for (const [folder, items] of folders) {
  const dbl = items.filter(i => i.doublon).length;
  const totalMb = items.reduce((s, i) => s + i.size_mb, 0).toFixed(1);
  console.log(`  [${items.length} PDFs, ${totalMb} MB${dbl > 0 ? `, ⚠ ${dbl} doublons` : ''}] ${folder}`);
}

// Taille totale
const totalMb = results.reduce((s, i) => s + i.size_mb, 0).toFixed(0);
console.log(`\nTaille totale : ${totalMb} MB`);

// Liste des doublons
if (doublon > 0) {
  console.log('\n── Doublons potentiels ──');
  for (const r of results.filter(r => r.doublon)) {
    console.log(`  ⚠ ${r.folder} / ${r.file}`);
    r.doublon_match.forEach(m => console.log(`      → déjà en ligne : ${m.slug}`));
  }
}

// ─── 5. Sauvegarde JSON ───────────────────────────────────────────────────────
fs.writeFileSync(OUT, JSON.stringify({ total: results.length, doublons: doublon, byFolder: byFolder, all: results }, null, 2));
console.log(`\nRésultats sauvegardés : ${OUT}`);
