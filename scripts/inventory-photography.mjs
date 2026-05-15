// Inventaire Photography — scanne le dossier source, détecte les doublons
// avec les docs déjà importés (par file_size), génère JSON + CSV
// Usage: node scripts/inventory-photography.mjs

import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const pdfjs = require('pdfjs-dist');

const ROOT   = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Photography';
const CAT_ID = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';
const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Charger les docs existants (file_size + slug) ────────────────────────────
process.stdout.write('Chargement des docs Photography existants... ');
let existingDocs = [];
let from = 0;
while (true) {
  const { data } = await supabase.from('documents')
    .select('slug, file_size, title').eq('category_id', CAT_ID)
    .range(from, from + 999);
  if (!data?.length) break;
  existingDocs.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
const existingSizes = new Map(existingDocs.map(d => [d.file_size, d.slug]));
console.log(`${existingDocs.length} docs trouvés.`);

// ── Détection du type ────────────────────────────────────────────────────────
function detectType(filename) {
  const f = filename.toLowerCase();
  if (/service.?manual|service.?man|sm\b|s\.m\b/.test(f))                    return 'Service Manual';
  if (/repair|overhaul|révision|révision|reparation/.test(f))                 return 'Repair Manual';
  if (/schema|schéma|wiring|circuit.?diag|electr/.test(f))                    return 'Schema';
  if (/parts.?list|parts.?cat|spare|pièces|eclat|éclaté|vue.?ensemble/.test(f)) return 'Parts List';
  if (/brochure|catalog|catalogue|leaflet|prospectus/.test(f))                return 'Brochure';
  if (/technical|workshop|atelier|technique/.test(f))                         return 'Technical Manual';
  if (/instruction|user.?manual|notice|mode.?emploi|operating|handbook|bedienung|manual/.test(f)) return 'User Manual';
  return 'Unknown';
}

function suggestPrice(type, pages) {
  if (type === 'Service Manual')   return pages > 50 ? 25 : 20;
  if (type === 'Technical Manual') return pages > 40 ? 22 : 19;
  if (type === 'Repair Manual')    return pages > 40 ? 20 : 15;
  if (type === 'User Manual')      return pages > 30 ? 15 : 12;
  if (type === 'Parts List')       return pages > 20 ? 15 : 12;
  if (type === 'Schema')           return 5;
  if (type === 'Brochure')         return 5;
  return 10;
}

// ── Génération slug / titre ──────────────────────────────────────────────────
function toSlug(brand, filename) {
  const name = basename(filename, extname(filename));
  return (brand + '-' + name)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function toTitle(brand, filename) {
  const name = basename(filename, extname(filename))
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return brand.toUpperCase() + ' - ' + name;
}

// ── Comptage pages PDF ───────────────────────────────────────────────────────
async function getPageCount(filePath) {
  try {
    const data = new Uint8Array(require('fs').readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
    return doc.numPages;
  } catch { return null; }
}

// ── Scan ─────────────────────────────────────────────────────────────────────
const brands = readdirSync(ROOT).filter(f =>
  statSync(join(ROOT, f)).isDirectory()
);

console.log(`${brands.length} marques à scanner...\n`);

const inventory = [];
let total = 0, alreadyExist = 0, errors = 0;

for (const brand of brands) {
  const brandDir = join(ROOT, brand);
  let files;
  try {
    files = readdirSync(brandDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  } catch { continue; }

  for (const file of files) {
    const filePath = join(brandDir, file);
    const fileSize = statSync(filePath).size;
    const type = detectType(file);
    const slug = toSlug(brand, file);
    const title = toTitle(brand, file);

    // Vérifier si déjà importé (par file_size)
    const existingSlug = existingSizes.get(fileSize);
    if (existingSlug) {
      inventory.push({
        brand, file, path: filePath, slug, title,
        type_detected: type, pages: null, file_size: fileSize,
        price_suggested: null, price_final: null,
        status: 'EXISTS', existing_slug: existingSlug,
        description: '', notes: `Déjà importé : ${existingSlug}`
      });
      alreadyExist++;
      process.stdout.write('=');
      continue;
    }

    const pages = await getPageCount(filePath);
    const price = suggestPrice(type, pages || 0);

    inventory.push({
      brand, file, path: filePath, slug, title,
      type_detected: type, pages, file_size: fileSize,
      price_suggested: price, price_final: price,
      status: 'NEW', existing_slug: '',
      description: '', notes: ''
    });

    total++;
    process.stdout.write('.');
    if (total % 50 === 0) process.stdout.write(` ${total}\n`);
  }
}

console.log(`\n\nScan terminé.`);
console.log(`Nouveaux docs  : ${total}`);
console.log(`Déjà importés  : ${alreadyExist}`);

// ── Exports ──────────────────────────────────────────────────────────────────
const JSON_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.json';
writeFileSync(JSON_PATH, JSON.stringify(inventory, null, 2));
console.log(`\nJSON : ${JSON_PATH}`);

// CSV (séparateur ; pour Excel FR)
const headers = ['brand','file','slug','title','type_detected','pages','file_size','price_suggested','price_final','status','existing_slug','notes'];
const csvRows = [
  '\uFEFF' + headers.join(';'),
  ...inventory.map(e => headers.map(h => {
    const v = String(e[h] ?? '').replace(/;/g, ',');
    return v.includes('\n') ? `"${v}"` : v;
  }).join(';'))
];
const CSV_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.csv';
writeFileSync(CSV_PATH, csvRows.join('\r\n'));
console.log(`CSV : ${CSV_PATH}`);

// Résumé par marque
const byBrand = {};
for (const e of inventory.filter(e => e.status === 'NEW')) {
  if (!byBrand[e.brand]) byBrand[e.brand] = { total: 0, unknown: 0 };
  byBrand[e.brand].total++;
  if (e.type_detected === 'Unknown') byBrand[e.brand].unknown++;
}
console.log(`\nMarques avec nouveaux docs (${Object.keys(byBrand).length}) :`);
for (const [b, s] of Object.entries(byBrand).sort())
  console.log(`  ${b.padEnd(25)} ${s.total} docs${s.unknown ? ` (${s.unknown} Unknown)` : ''}`);
