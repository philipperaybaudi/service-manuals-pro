// Compare les dossiers source (Machines + Photography) avec Supabase
// et déplace les PDFs manquants vers DOSSIER SOURCE/Problème/[Category]/[BRAND]/
// Usage: node scripts/move-missing-to-probleme.mjs

import { readdirSync, statSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAT_MACHINES    = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';
const CAT_PHOTOGRAPHY = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';

const SOURCE_ROOT   = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE';
const PROBLEME_ROOT = join(SOURCE_ROOT, 'Problème');

const CATEGORIES = [
  { name: 'Machines',    folder: 'Machines',    id: CAT_MACHINES    },
  { name: 'Photography', folder: 'Photography', id: CAT_PHOTOGRAPHY },
];

// ── Charger toutes les file_size de la DB ───────────────────────────────────
async function loadDbSizes(categoryId) {
  const sizes = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('documents')
      .select('file_size')
      .eq('category_id', categoryId)
      .range(from, from + 999);
    if (error) { console.error(error.message); break; }
    if (!data?.length) break;
    for (const d of data) if (d.file_size) sizes.add(d.file_size);
    if (data.length < 1000) break;
    from += 1000;
  }
  return sizes;
}

// ── Scanner tous les PDFs d'un dossier (récursif) ───────────────────────────
function scanPdfs(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      // Ne pas redescendre dans le dossier Problème lui-même
      if (full.startsWith(PROBLEME_ROOT)) continue;
      scanPdfs(full, results);
    } else if (name.toLowerCase().endsWith('.pdf')) {
      results.push({ path: full, size: st.size });
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────
for (const cat of CATEGORIES) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${cat.name}`);
  console.log('═'.repeat(60));

  console.log('Chargement des file_size depuis Supabase...');
  const dbSizes = await loadDbSizes(cat.id);
  console.log(`  ${dbSizes.size} tailles uniques en base`);

  const categoryFolder = join(SOURCE_ROOT, cat.folder);
  console.log(`Scan de ${categoryFolder}...`);
  const pdfs = scanPdfs(categoryFolder);
  console.log(`  ${pdfs.length} PDFs trouvés sur disque`);

  let moved = 0, kept = 0, errors = 0;
  const byBrand = {};

  for (const pdf of pdfs) {
    if (dbSizes.has(pdf.size)) {
      kept++;
      continue;
    }
    // PDF absent de la DB → à déplacer
    // Le dossier parent immédiat = nom de la marque
    const rel = pdf.path.substring(categoryFolder.length + 1);
    const parts = rel.split(/[\\/]/);
    const brand = parts.length > 1 ? parts[0] : 'AUTRE';
    const filename = basename(pdf.path);

    const destDir = join(PROBLEME_ROOT, cat.folder, brand);
    const destPath = join(destDir, filename);

    try {
      mkdirSync(destDir, { recursive: true });
      if (existsSync(destPath)) {
        console.log(`  ⚠ Déjà présent : ${brand}/${filename}`);
        kept++;
        continue;
      }
      renameSync(pdf.path, destPath);
      byBrand[brand] = (byBrand[brand] || 0) + 1;
      moved++;
    } catch (e) {
      console.log(`  ✗ ${filename}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nRésultat ${cat.name} :`);
  console.log(`  En base   : ${kept}`);
  console.log(`  Déplacés  : ${moved}`);
  console.log(`  Erreurs   : ${errors}`);
  if (moved > 0) {
    console.log(`\n  Répartition par marque :`);
    const sorted = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
    for (const [brand, count] of sorted) console.log(`    ${brand.padEnd(30)} ${count}`);
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log('Terminé.');
console.log('═'.repeat(60));
