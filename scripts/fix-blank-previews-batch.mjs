/**
 * fix-blank-previews-batch.mjs
 * Corrige les 202 previews non représentatives identifiées dans blank-previews-report.json
 * Source PDFs : DOCS EN LIGNE (lecture seule)
 * Méthode : complexité JPEG (taille buffer à résolution réduite) → meilleure page → upload (upsert)
 * L'URL Supabase ne change pas (même chemin previews/{slug}.jpg), donc pas de MAJ DB nécessaire.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

// Path2D polyfill (requis par pdfjs-dist en environnement Node)
if (typeof Path2D === 'undefined' || typeof Path2D !== 'function') {
  global.Path2D = class Path2D {
    constructor(p) { this._path = p || null; }
    addPath(){} closePath(){} moveTo(){} lineTo(){}
    bezierCurveTo(){} quadraticCurveTo(){} arc(){}
    arcTo(){} ellipse(){} rect(){}
  };
}
if (typeof DOMMatrix === 'undefined') global.DOMMatrix = canvas.DOMMatrix;

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const STORAGE_BUCKET = 'logos';
const DOCS_EN_LIGNE  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';
const REPORT_IN      = 'scripts/blank-previews-report.json';
const REPORT_OUT     = 'scripts/fix-blank-previews-report.json';
const SCAN_PAGES     = 60; // pages à scanner par PDF pour trouver la meilleure

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Canvas factory pour pdfjs ──────────────────────────────────────────────────
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc)   { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// ── Normalisation texte ────────────────────────────────────────────────────────
function normalize(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// ── Index récursif de tous les PDF sous DOCS EN LIGNE ─────────────────────────
function buildPdfIndex(dir) {
  const result = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) result.push(full);
    }
  }
  walk(dir);
  return result;
}

// ── Recherche du PDF local (3 passes) ─────────────────────────────────────────
function findPdf(pdfIndex, brandName, titleEn, titleFr) {
  const brandNorm = normalize(brandName);

  // Pré-filtrage : priorité aux fichiers dans un dossier portant le nom de la marque
  const brandFiles = pdfIndex.filter(p => {
    const parts = p.split(path.sep).map(normalize);
    return parts.some(part => part === brandNorm || part.includes(brandNorm));
  });
  const pool = brandFiles.length > 0 ? brandFiles : pdfIndex;

  // Pass 1 : correspondance exacte nom de fichier (normalisé)
  const titleNorm = normalize(titleEn);
  let found = pool.find(p => normalize(path.basename(p, '.pdf')) === titleNorm);
  if (found) return found;

  // Pass 2 : mots-clés du titre anglais (≥4 chars), au moins 50% présents + chiffres
  const words = titleNorm.split(' ').filter(w => w.length >= 4);
  const nums  = titleNorm.split(' ').filter(w => /^\d+$/.test(w));
  const minHits = Math.max(2, Math.ceil(words.length * 0.5));

  if (words.length >= 2) {
    found = pool.find(p => {
      const fn = normalize(path.basename(p));
      const wordHits = words.filter(w => fn.includes(w)).length;
      const numOk    = nums.length === 0 || nums.some(n => fn.includes(n));
      return wordHits >= minHits && numOk;
    });
    if (found) return found;
  }

  // Pass 3 : mots-clés du titre français
  if (titleFr) {
    const titleFrNorm = normalize(titleFr);
    const wordsFr     = titleFrNorm.split(' ').filter(w => w.length >= 4);
    const minHitsFr   = Math.max(2, Math.ceil(wordsFr.length * 0.5));
    if (wordsFr.length >= 2) {
      found = pool.find(p => {
        const fn      = normalize(path.basename(p));
        const wordHits = wordsFr.filter(w => fn.includes(w)).length;
        return wordHits >= minHitsFr;
      });
      if (found) return found;
    }
  }

  return null;
}

// ── Rendu d'une page PDF → buffer JPEG ────────────────────────────────────────
async function renderPage(pdfjsDoc, pageNum, scale) {
  const page = await pdfjsDoc.getPage(pageNum);
  const vp   = page.getViewport({ scale });
  const f    = new NodeCanvasFactory();
  const cc   = f.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

// ── Scan des N premières pages → page avec le plus grand JPEG (≈ richesse visuelle) ──
async function findBestPage(pdfjsDoc) {
  const total     = pdfjsDoc.numPages;
  const scanCount = Math.min(total, SCAN_PAGES);
  let bestPage = 1, bestScore = 0;
  for (let i = 1; i <= scanCount; i++) {
    try {
      const jpg   = await renderPage(pdfjsDoc, i, 0.3);
      const score = jpg.length;
      if (score > bestScore) { bestScore = score; bestPage = i; }
    } catch { /* page non renderable, on ignore */ }
    process.stdout.write(`\r    Scan p.${i}/${scanCount} — meilleure: p.${bestPage} (${(bestScore/1024).toFixed(0)} Ko)`);
  }
  process.stdout.write('\n');
  return { page: bestPage, score: bestScore };
}

// ── Rendu haute résolution de la page choisie (800px de large) ────────────────
async function renderHQ(pdfjsDoc, pageNum) {
  const page  = await pdfjsDoc.getPage(pageNum);
  const vp1   = page.getViewport({ scale: 1 });
  const scale = 800 / vp1.width;
  return renderPage(pdfjsDoc, pageNum, scale);
}

// ── Upload vers Supabase Storage (upsert) ─────────────────────────────────────
async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

const report   = JSON.parse(fs.readFileSync(REPORT_IN, 'utf8'));
const blanks   = report.blank_previews; // 202 entrées, triées par content_ratio asc
const slugList = blanks.map(b => b.slug);

console.log(`Previews à corriger : ${blanks.length}`);
console.log('Construction de l\'index PDF (DOCS EN LIGNE)...');
const pdfIndex = buildPdfIndex(DOCS_EN_LIGNE);
console.log(`Index : ${pdfIndex.length} PDF indexés\n`);

// Récupérer titre + marque depuis Supabase pour chaque slug
console.log('Récupération des métadonnées Supabase...');
const docsInfo = {};
for (let i = 0; i < slugList.length; i += 200) {
  const chunk = slugList.slice(i, i + 200);
  const { data, error } = await supabase
    .from('documents')
    .select('slug, title, title_fr, brands(name)')
    .in('slug', chunk);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  for (const d of data) docsInfo[d.slug] = d;
}
console.log(`Métadonnées : ${Object.keys(docsInfo).length} docs chargés\n`);

// ── Traitement séquentiel ──────────────────────────────────────────────────────
const results = { fixed: [], not_found: [], errors: [] };

for (let i = 0; i < blanks.length; i++) {
  const blank = blanks[i];
  const info  = docsInfo[blank.slug];

  console.log(`\n[${i + 1}/${blanks.length}] ${blank.slug}  (contenu actuel: ${blank.content_ratio})`);

  if (!info) {
    console.log('  ✗ Non trouvé en base');
    results.not_found.push({ slug: blank.slug, reason: 'absent de la DB' });
    continue;
  }

  const brandName = info.brands?.name || '';
  console.log(`  Marque : ${brandName} | "${info.title}"`);

  // Recherche du PDF local
  const pdfPath = findPdf(pdfIndex, brandName, info.title || '', info.title_fr || '');
  if (!pdfPath) {
    console.log('  ✗ PDF non trouvé localement');
    results.not_found.push({ slug: blank.slug, title: info.title, brand: brandName, reason: 'PDF non trouvé localement' });
    continue;
  }
  console.log(`  PDF  : ${path.relative(DOCS_EN_LIGNE, pdfPath)}`);

  // Ouverture du PDF
  let pdfjsDoc;
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    pdfjsDoc   = await pdfjs.getDocument({
      data,
      canvasFactory:       new NodeCanvasFactory(),
      standardFontDataUrl: STANDARD_FONTS,
      useSystemFonts:      true,
    }).promise;
  } catch(e) {
    console.log(`  ✗ Erreur ouverture PDF : ${e.message}`);
    results.errors.push({ slug: blank.slug, error: `open: ${e.message}` });
    continue;
  }

  // Scan des meilleures pages
  let bestPage, jpg;
  try {
    const best = await findBestPage(pdfjsDoc);
    bestPage   = best.page;
    console.log(`  → Page retenue : ${bestPage} (${(best.score / 1024).toFixed(0)} Ko)`);
    jpg = await renderHQ(pdfjsDoc, bestPage);
  } catch(e) {
    console.log(`  ✗ Erreur scan/rendu : ${e.message}`);
    results.errors.push({ slug: blank.slug, error: `render: ${e.message}` });
    continue;
  }

  // Upload
  try {
    await uploadPreview(blank.slug, jpg);
    console.log(`  ✓ Preview mise à jour`);
    results.fixed.push({
      slug:           blank.slug,
      title:          info.title,
      brand:          brandName,
      page:           bestPage,
      previous_ratio: blank.content_ratio,
    });
  } catch(e) {
    console.log(`  ✗ Erreur upload : ${e.message}`);
    results.errors.push({ slug: blank.slug, error: `upload: ${e.message}` });
  }
}

// ── Rapport final ──────────────────────────────────────────────────────────────
const outReport = {
  generated_at:  new Date().toISOString(),
  total:         blanks.length,
  fixed:         results.fixed.length,
  not_found:     results.not_found.length,
  errors:        results.errors.length,
  fixed_list:    results.fixed,
  not_found_list: results.not_found,
  errors_list:   results.errors,
};
fs.writeFileSync(REPORT_OUT, JSON.stringify(outReport, null, 2), 'utf8');

console.log('\n═══════════════════════════════════════════════════');
console.log(`Corrigés         : ${results.fixed.length}/${blanks.length}`);
console.log(`PDF non trouvés  : ${results.not_found.length}`);
console.log(`Erreurs          : ${results.errors.length}`);
console.log(`Rapport          : ${REPORT_OUT}`);
