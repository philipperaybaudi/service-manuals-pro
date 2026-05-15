/**
 * Phase 2 — Classification IA des PDFs dans DOCS A CLASSER
 *
 * Pour chaque PDF :
 *  1. Infère catégorie + marque depuis le chemin du dossier
 *  2. Extrait le texte des 2 premières pages via pdfjs-dist (gratuit)
 *  3. Si texte insuffisant (PDF scanné) → rendu image page 1 (vision)
 *  4. Envoie à Claude Haiku → retourne category/brand/model/doc_type/title_fr
 *  5. Sauvegarde progressive dans scripts/classification-report.json
 *     (reprend automatiquement là où ça s'est arrêté si interrompu)
 *
 * Usage :
 *   node scripts/classify-docs-a-classer.mjs --dry-run    ← test sur 5 PDFs
 *   node scripts/classify-docs-a-classer.mjs              ← traitement complet
 *   node scripts/classify-docs-a-classer.mjs --stats      ← résumé du rapport existant
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Anthropic           from '@anthropic-ai/sdk';
import { createRequire }   from 'module';
import fs                  from 'fs';
import path                from 'path';

const require    = createRequire(import.meta.url);
const pdfjsLib   = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const ROOT        = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS A CLASSER';
const DOSSIER_SRC = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégories';
const REPORT_PATH = 'scripts/classification-report.json';

const DRY_RUN  = process.argv.includes('--dry-run');
const STATS    = process.argv.includes('--stats');
const DRY_LIMIT   = 5;
const CONCURRENCY = 2;   // appels parallèles (ne pas dépasser 5 pour Haiku)
const DELAY_MS    = 400; // pause entre batches (ms)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Catégories exactes de DOSSIER SOURCE\Catégories ────────────────────────
// (noms de dossiers tels qu'ils existent sur le disque)
const KNOWN_CATEGORIES = [
  'Alarme & Surveillance',
  'Animaux & Soins',
  'Audio & HiFi',
  'Automobile',
  'Autonomie',
  'Biomédical',
  'Bricolage & DIY',
  'Camping & Caravaning',
  'Chauffage & Clim',
  'Cinéma & Vidéo',
  'Drones',
  'Informatique',
  'Machines-Outils',
  'Marine',
  'Motoculture',
  'Photographie',
  'Radio & Communications',
  'Société & Soi',
  'Téléphonie & Télécom',
  'Télévision',
  'Usinage',
  'Électroménager',
  'Électronique',
  'Équipements Sportifs',
];

// ─── Rapport ──────────────────────────────────────────────────────────────────
function loadReport() {
  if (fs.existsSync(REPORT_PATH)) {
    try { return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')); }
    catch { /* fichier corrompu → reset */ }
  }
  return { generated_at: new Date().toISOString(), total: 0, results: {} };
}

function saveReport(report) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

// ─── Parcourir le dossier ─────────────────────────────────────────────────────
function walkDir(dir) {
  const entries = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return entries; }
  for (const item of items) {
    const fp = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...walkDir(fp));
    else if (item.name.toLowerCase().endsWith('.pdf')) entries.push(fp);
  }
  return entries;
}

// ─── Extraction texte ─────────────────────────────────────────────────────────
async function extractText(filePath, maxPages = 2) {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf  = await pdfjsLib.getDocument({ data, verbosity: 0, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    const n    = Math.min(pdf.numPages, maxPages);
    let text   = '';
    for (let i = 1; i <= n; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(s => s.str).join(' ') + '\n';
    }
    return text.trim();
  } catch {
    return '';
  }
}

// ─── Rendu page 1 → JPEG base64 (pour PDFs scannés) ──────────────────────────
async function renderPage1(filePath) {
  try {
    const data   = new Uint8Array(fs.readFileSync(filePath));
    const pdf    = await pdfjsLib.getDocument({ data, verbosity: 0, standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    const page   = await pdf.getPage(1);
    const vp     = page.getViewport({ scale: 1.2 });
    const canvas = createCanvas(vp.width, vp.height);
    const ctx    = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas.toBuffer('image/jpeg', { quality: 0.65 }).toString('base64');
  } catch {
    return null;
  }
}

// ─── Inférer catégorie + marque depuis le chemin ──────────────────────────────
function inferFromPath(filePath) {
  const rel   = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);
  // Passer jusqu'à 3 niveaux de dossiers pour donner le max de contexte à Claude
  // ex: AUTO MOTO / ATV - All Terrain Vehicle / CAN AM → brand = CAN AM
  const folderParts = parts.slice(0, -1); // tout sauf le nom de fichier
  return {
    folder_category: folderParts[0] || '(racine)',
    folder_brand:    folderParts[folderParts.length - 1] || '(inconnu)', // dossier direct du fichier
    folder_path:     folderParts.join(' / '),  // chemin complet pour le contexte
    filename:        parts[parts.length - 1],
    rel_path:        rel,
  };
}

// ─── Appel Claude Haiku ───────────────────────────────────────────────────────
async function classifyWithClaude({ filename, folderCategory, folderBrand, folderPath, text, imageBase64 }) {
  const contextLine = `Chemin du dossier : ${folderPath} | Fichier : ${filename}`;
  const catList     = KNOWN_CATEGORIES.join(', ');

  const userContent = [];

  if (imageBase64) {
    userContent.push({
      type:   'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
    });
  }

  userContent.push({
    type: 'text',
    text: `Tu dois classifier ce document PDF de manuel technique.

${contextLine}
Catégories disponibles : ${catList}

${text
  ? `Texte extrait (premières pages) :\n${text.slice(0, 2000)}`
  : '(PDF scanné — utilise l\'image ci-dessus et le nom de fichier)'}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication :
{
  "category": "<une des catégories disponibles>",
  "brand": "<marque exacte, ex: YAMAHA, SONY, GRUNDIG>",
  "model": "<modèle ou référence, ex: Grizzly 700, ICF-SW7600>",
  "doc_type": "<SERVICE_MANUAL|USER_MANUAL|PARTS_LIST|WIRING_DIAGRAM|CATALOG|SCHEMATIC|OTHER>",
  "title_fr": "<titre court et précis en français, ex: YAMAHA Grizzly 700 — Manuel d'atelier>",
  "confidence": "<HIGH|MEDIUM|LOW>"
}`,
  });

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 350,
    messages:   [{ role: 'user', content: userContent }],
  });

  const raw     = response.content[0].text.trim();
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(jsonStr);
}

// ─── Traiter un PDF ───────────────────────────────────────────────────────────
async function processPdf(filePath, report) {
  const { folder_category, folder_brand, folder_path, filename, rel_path } = inferFromPath(filePath);

  const text    = await extractText(filePath);
  const isScanned = text.length < 80;

  let imageBase64 = null;
  if (isScanned) imageBase64 = await renderPage1(filePath);

  let classification;
  try {
    classification = await classifyWithClaude({
      filename,
      folderCategory: folder_category,
      folderBrand:    folder_brand,
      folderPath:     folder_path,
      text,
      imageBase64,
    });
  } catch (e) {
    // En cas d'erreur JSON ou API, garder les infos du dossier
    classification = {
      category:   folder_category !== '(racine)' ? folder_category : 'AUTRE',
      brand:      folder_brand    !== '(inconnu)' ? folder_brand   : '?',
      model:      '?',
      doc_type:   'OTHER',
      title_fr:   filename.replace(/\.pdf$/i, ''),
      confidence: 'LOW',
      error:      e.message,
    };
  }

  const targetFolder = path.join(
    DOSSIER_SRC,
    classification.category || folder_category,
    classification.brand    || folder_brand,
  );

  report.results[rel_path] = {
    original_path:    filePath.replace(/\//g, path.sep),
    folder_category,
    folder_brand,
    filename,
    is_scanned:       isScanned,
    classification,
    suggested_target: path.join(targetFolder, filename),
  };
}

// ─── Stats depuis un rapport existant ────────────────────────────────────────
function showStats(report) {
  const results = Object.values(report.results);
  console.log(`\n=== Rapport existant — ${results.length} / ${report.total || '?'} PDFs traités ===\n`);

  // Par catégorie
  const byCategory = {};
  const byConfidence = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let scanned = 0, errors = 0;

  for (const r of results) {
    const cat = r.classification?.category || '?';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    const conf = r.classification?.confidence;
    if (conf) byConfidence[conf] = (byConfidence[conf] || 0) + 1;
    if (r.is_scanned) scanned++;
    if (r.classification?.error) errors++;
  }

  console.log('Répartition par catégorie :');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${String(n).padStart(4)}  ${cat}`));

  console.log(`\nConfiance : HIGH=${byConfidence.HIGH}  MEDIUM=${byConfidence.MEDIUM}  LOW=${byConfidence.LOW}`);
  console.log(`PDFs scannés (vision) : ${scanned}`);
  console.log(`Erreurs API           : ${errors}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const report = loadReport();

if (STATS) {
  showStats(report);
  process.exit(0);
}

console.log(`\n=== Phase 2 — Classification IA ${DRY_RUN ? '(DRY-RUN : 5 PDFs)' : ''} ===\n`);

const allPdfs   = walkDir(ROOT);
let toProcess   = allPdfs.filter(f => !report.results[path.relative(ROOT, f)]);

if (DRY_RUN) toProcess = toProcess.slice(0, DRY_LIMIT);

report.total = allPdfs.length;
console.log(`Total PDFs      : ${allPdfs.length}`);
console.log(`Déjà traités    : ${allPdfs.length - toProcess.length}`);
console.log(`À traiter       : ${toProcess.length}`);
if (!DRY_RUN) {
  const estMin = Math.ceil(toProcess.length / CONCURRENCY * (DELAY_MS + 1200) / 60000);
  console.log(`Durée estimée   : ~${estMin} min\n`);
}

let done      = 0;
const startAt = Date.now();

for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY);

  await Promise.all(batch.map(f => processPdf(f, report)));

  done += batch.length;
  saveReport(report);

  const elapsed   = ((Date.now() - startAt) / 1000).toFixed(0);
  const pct       = ((done / toProcess.length) * 100).toFixed(1);
  const speed     = done / Math.max(1, (Date.now() - startAt) / 1000);
  const remaining = ((toProcess.length - done) / Math.max(0.01, speed)).toFixed(0);

  process.stdout.write(
    `\r  [${done}/${toProcess.length}]  ${pct}%  |  ${elapsed}s écoulées  |  ~${remaining}s restantes   `
  );

  if (i + CONCURRENCY < toProcess.length) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log('\n');
showStats(report);
console.log(`\nRapport sauvegardé : ${REPORT_PATH}`);

if (DRY_RUN) {
  console.log('\n── Détail dry-run ──');
  for (const r of Object.values(report.results).slice(-DRY_LIMIT)) {
    const c = r.classification;
    console.log(`\n  📄 ${r.filename}`);
    console.log(`     Dossier  : ${r.folder_category} / ${r.folder_brand}`);
    console.log(`     Résultat : ${c.category} / ${c.brand} / ${c.model}`);
    console.log(`     Type     : ${c.doc_type}  |  Confiance : ${c.confidence}`);
    console.log(`     Titre FR : ${c.title_fr}`);
    console.log(`     Cible    : ${r.suggested_target}`);
    if (c.error) console.log(`     ⚠ Erreur : ${c.error}`);
  }
}
