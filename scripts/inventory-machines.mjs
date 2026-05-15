// Inventaire complet du dossier Machines — toutes marques
// Génère inventory-machines.csv + inventory-machines.json
// Usage: node scripts/inventory-machines.mjs

import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');

const ROOT = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines';
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const OUT_JSON = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-machines.json';
const OUT_CSV  = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-machines.csv';

// ── Détection du type de document ──────────────────────────────────────────
function detectType(filename) {
  const f = filename.toLowerCase();
  if (/schema|schéma|wiring|electr|branchement/.test(f))   return 'Schema';
  if (/eclat|éclaté|eclaté|explod|parts list|pieces|pièces|vue.?ensemble|spare/.test(f)) return 'Parts List';
  if (/notice/.test(f))                                      return 'Notice';
  if (/manuel|manual|instruction|utilisation|bedienung|operating|handbook/.test(f)) return 'Manual';
  if (/catalogue|catalog/.test(f))                           return 'Catalogue';
  if (/brochure/.test(f))                                    return 'Brochure';
  if (/liste|list/.test(f))                                  return 'Parts List';
  return 'Unknown';
}

// ── Prix suggéré selon le type ──────────────────────────────────────────────
function suggestPrice(type, pages) {
  if (type === 'Schema')     return 5;
  if (type === 'Parts List') return pages > 20 ? 19 : 12;
  if (type === 'Manual')     return pages > 40 ? 25 : pages > 20 ? 19 : 15;
  if (type === 'Notice')     return pages > 20 ? 15 : 10;
  if (type === 'Catalogue')  return 10;
  if (type === 'Brochure')   return 5;
  return 10;
}

// ── Génération slug ─────────────────────────────────────────────────────────
function toSlug(brand, filename) {
  const name = basename(filename, '.pdf');
  const slug = (brand + '-' + name)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
  return slug;
}

// ── Génération titre ────────────────────────────────────────────────────────
function toTitle(brand, filename) {
  const name = basename(filename, '.pdf');
  return brand.toUpperCase() + ' - ' + name;
}

// ── Lecture nombre de pages PDF ─────────────────────────────────────────────
async function getPageCount(filePath) {
  try {
    const { readFileSync } = await import('fs');
    const data = new Uint8Array(readFileSync(filePath));
    const doc = await pdfjs.getDocument({
      data,
      standardFontDataUrl: STANDARD_FONTS,
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
    return doc.numPages;
  } catch (e) {
    return null;
  }
}

// ── Scan récursif ───────────────────────────────────────────────────────────
function scanDir(dir, brand) {
  const entries = [];
  let items;
  try { items = readdirSync(dir); } catch { return entries; }

  for (const item of items) {
    const fullPath = join(dir, item);
    let stat;
    try { stat = statSync(fullPath); } catch { continue; }

    if (stat.isDirectory()) {
      // Sous-dossier = nouvelle marque ou sous-marque
      const subBrand = brand || item.trim();
      entries.push(...scanDir(fullPath, subBrand));
    } else if (extname(item).toLowerCase() === '.pdf') {
      entries.push({ brand: brand || 'UNKNOWN', file: item, path: fullPath, size: stat.size });
    }
  }
  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('Scan du dossier Machines...\n');
const rawEntries = scanDir(ROOT, null);
console.log(`${rawEntries.length} fichiers PDF trouvés dans ${new Set(rawEntries.map(e => e.brand)).size} marques.\n`);

const results = [];
let i = 0;
for (const entry of rawEntries) {
  i++;
  process.stdout.write(`[${i}/${rawEntries.length}] ${entry.brand} — ${entry.file.substring(0, 50)}\r`);
  const pages = await getPageCount(entry.path);
  const type  = detectType(entry.file);
  const price = suggestPrice(type, pages || 0);
  const slug  = toSlug(entry.brand, entry.file);
  const title = toTitle(entry.brand, entry.file);

  results.push({
    brand:          entry.brand,
    file:           entry.file,
    path:           entry.path,
    size_kb:        Math.round(entry.size / 1024),
    pages:          pages,
    type_detected:  type,
    price_suggested: price,
    price_final:    price,      // à corriger dans le CSV
    title:          title,      // à corriger si besoin
    slug:           slug,       // à corriger si besoin
    description:    '',         // à remplir si souhaité
    notes:          pages === null ? 'PDF illisible' : '',
  });
}

console.log('\n\nGénération des fichiers de sortie...');

// JSON
writeFileSync(OUT_JSON, JSON.stringify(results, null, 2), 'utf-8');

// CSV
const header = 'brand;file;size_kb;pages;type_detected;price_suggested;price_final;title;slug;description;notes';
const rows = results.map(r => [
  r.brand,
  r.file.replace(/;/g, ','),
  r.size_kb,
  r.pages ?? '',
  r.type_detected,
  r.price_suggested,
  r.price_final,
  r.title.replace(/;/g, ','),
  r.slug,
  r.description,
  r.notes,
].join(';'));

writeFileSync(OUT_CSV, '\uFEFF' + header + '\n' + rows.join('\n'), 'utf-8');

console.log(`\n✓ ${results.length} documents inventoriés`);
console.log(`✓ ${OUT_JSON}`);
console.log(`✓ ${OUT_CSV}`);

// Résumé par marque
const byBrand = {};
for (const r of results) {
  if (!byBrand[r.brand]) byBrand[r.brand] = { count: 0, types: {} };
  byBrand[r.brand].count++;
  byBrand[r.brand].types[r.type_detected] = (byBrand[r.brand].types[r.type_detected] || 0) + 1;
}

console.log('\n── Résumé par marque ──────────────────────────────────');
for (const [brand, data] of Object.entries(byBrand).sort((a, b) => b[1].count - a[1].count)) {
  const types = Object.entries(data.types).map(([t, n]) => `${t}:${n}`).join(' ');
  console.log(`  ${brand.padEnd(20)} ${String(data.count).padStart(3)} docs   ${types}`);
}
console.log('──────────────────────────────────────────────────────');
console.log(`  TOTAL                  ${results.length} docs`);
