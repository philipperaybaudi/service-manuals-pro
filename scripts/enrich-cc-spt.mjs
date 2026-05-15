// Enrichit l'inventory Photography pour Camera-Craftsman et SPT
// - Extrait le texte des premières pages pour construire le sommaire
// - Génère titre avec date de parution
// - Prix $12 pour tous
// Usage: node scripts/enrich-cc-spt.mjs

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist');

const JSON_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.json';
const inventory = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));

const BRANDS = ['Camera-Craftsman', 'SPT'];

// ── Extraction texte PDF ─────────────────────────────────────────────────────
async function extractText(filePath, maxPages = 4) {
  try {
    const data = new Uint8Array(readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
    let text = '';
    for (let p = 1; p <= Math.min(maxPages, doc.numPages); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(' ') + '\n';
    }
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

// ── Extraction date depuis nom de fichier ────────────────────────────────────
const MONTHS = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', oct: 'October', nov: 'November', dec: 'December',
  january: 'January', february: 'February', march: 'March', april: 'April',
  june: 'June', july: 'July', august: 'August',
  september: 'September', october: 'October', november: 'November', december: 'December',
};

function extractDateFromFilename(filename) {
  // Patterns: Jan-Feb-1962, January-February-1958, Jul-Aug-1971, etc.
  const f = filename.toLowerCase().replace('.pdf', '');

  // Two-month pattern: month1-month2-year or month1-month2-year
  const twoMonth = f.match(/([a-z]+)[.-]([a-z]+)[.-](\d{4})/);
  if (twoMonth) {
    const m1 = MONTHS[twoMonth[1]];
    const m2 = MONTHS[twoMonth[2]];
    const year = twoMonth[3];
    if (m1 && m2 && year) return `${m1}/${m2} ${year}`;
    if (m1 && year) return `${m1} ${year}`;
  }

  // Three-month: Sept-Oct-Nov-Dec-1976
  const threeMonth = f.match(/([a-z]+)[.-]([a-z]+)[.-]([a-z]+)[.-]([a-z]+)[.-](\d{4})/);
  if (threeMonth) {
    const m1 = MONTHS[threeMonth[1]];
    const m4 = MONTHS[threeMonth[4]];
    const year = threeMonth[5];
    if (m1 && m4 && year) return `${m1}-${m4} ${year}`;
  }

  // Year only at end
  const yearOnly = f.match(/(\d{4})$/);
  if (yearOnly) return yearOnly[1];

  return null;
}

function buildTitle(brand, filename, date) {
  const brandLabel = brand === 'Camera-Craftsman' ? 'Camera Craftsman' : 'SPT';

  if (date) {
    // C'est un numéro daté
    return `${brandLabel} - ${date}`;
  }

  // C'est un article spécifique — extraire le sujet du nom de fichier
  const name = filename
    .replace(/^(Camera-Craftsman|camera-craftsman|CameraCraftsman|SPT)-?/i, '')
    .replace('.pdf', '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return `${brandLabel} - ${name}`;
}

// ── Construction description depuis texte PDF ────────────────────────────────
function buildDescriptionFromText(text, brand, title, isIssue) {
  if (!text || text.length < 50) {
    const b = brand === 'Camera-Craftsman' ? 'Camera Craftsman' : 'SPT';
    return isIssue
      ? `${b} magazine issue. Complete issue covering camera repair techniques, service procedures and technical articles for professional camera repairers.`
      : `Technical article from ${b} covering repair and service procedures.`;
  }

  // Nettoyer le texte
  const cleaned = text
    .replace(/camera.?craftsman|cameracraftsman|spt journal/gi, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s{3,}/g, '  ')
    .trim();

  // Extraire les lignes qui ressemblent à des titres d'articles (capitalisées, courtes)
  const lines = cleaned.split(/[\n.]{1,}/)
    .map(l => l.trim())
    .filter(l => l.length > 8 && l.length < 120)
    .filter(l => /[A-Z]/.test(l))
    .filter(l => !/^\d+$/.test(l))
    .slice(0, 8);

  const b = brand === 'Camera-Craftsman' ? 'Camera Craftsman' : 'SPT';

  if (isIssue && lines.length > 2) {
    return `${b} magazine - ${title}. Contents include: ${lines.slice(0, 6).join('; ')}.`;
  }

  if (lines.length > 0) {
    return `${b} - ${title}. ${lines.slice(0, 4).join('. ')}.`;
  }

  return isIssue
    ? `${b} magazine issue ${title}. Complete issue covering camera repair techniques and service procedures.`
    : `${b} technical article: ${title}. Camera repair and service procedures.`;
}

// ── Traitement principal ─────────────────────────────────────────────────────
let processed = 0;
const entries = inventory.filter(e => BRANDS.includes(e.brand) && e.status === 'NEW');
console.log(`Entrées à enrichir : ${entries.length}\n`);

for (const entry of entries) {
  const date = extractDateFromFilename(entry.file);
  const isIssue = date !== null;

  process.stdout.write(`  ${entry.file.substring(0, 60).padEnd(60)}`);

  // Titre
  entry.title = buildTitle(entry.brand, entry.file, date);

  // Prix $12
  entry.price_suggested = 12;
  entry.price_final = 12;

  // Type
  entry.type_detected = isIssue ? 'Magazine' : 'Service Manual';

  // Lire le PDF pour la description
  const text = await extractText(entry.path, 4);
  entry.description = buildDescriptionFromText(text, entry.brand, entry.title, isIssue);

  processed++;
  console.log(` ✓ ${isIssue ? 'issue' : 'article'}`);
}

// Sauvegarder JSON mis à jour
writeFileSync(JSON_PATH, JSON.stringify(inventory, null, 2));

// Régénérer CSV
const CSV_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.csv';
const headers = ['brand','file','slug','title','type_detected','pages','file_size','price_suggested','price_final','status','existing_slug','notes','description'];
const csvRows = [
  '\uFEFF' + headers.join(';'),
  ...inventory.map(e => headers.map(h => {
    const v = String(e[h] ?? '').replace(/\r?\n/g, ' ').replace(/;/g, ',');
    return v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(';'))
];
writeFileSync(CSV_PATH, csvRows.join('\r\n'));

console.log(`\n✓ ${processed} entrées enrichies`);
console.log(`JSON et CSV mis à jour.`);
