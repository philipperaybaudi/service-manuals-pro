/**
 * Classifie un seul PDF et met à jour le rapport existant.
 * Usage : node scripts/classify-single.mjs "Audio & HiFi" "LPB Monogram II Service Manual $25.pdf"
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require       = createRequire(import.meta.url);
const pdfjs         = require('pdfjs-dist');
const canvas        = require('canvas');
if (typeof Path2D === 'undefined' || typeof Path2D !== 'function') {
  global.Path2D = class Path2D {
    constructor(path) { this._path = path || null; }
    addPath() {} closePath() {} moveTo() {} lineTo() {}
    bezierCurveTo() {} quadraticCurveTo() {} arc() {}
    arcTo() {} ellipse() {} rect() {}
  };
}
if (typeof DOMMatrix === 'undefined') global.DOMMatrix = canvas.DOMMatrix;

const SUBFOLDER      = process.argv[2];
const TARGET_FILE    = process.argv[3];
const FORCE_JPEG     = process.argv.includes('--force-jpeg'); // force rendu JPEG pdfjs pour PDFs scannés
if (!SUBFOLDER || !TARGET_FILE) {
  console.error('Usage : node scripts/classify-single.mjs <Subfolder> <filename.pdf> [--force-jpeg]');
  process.exit(1);
}

const DOCS_A_CLASSER  = path.join('C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories', SUBFOLDER);
const DOCS_EN_LIGNE   = path.join('C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE', SUBFOLDER);
const TEMP_PREVIEWS  = path.join('scripts', 'temp_previews');
const REPORT_FILE    = path.join('scripts', `docs-a-classer-report-${SUBFOLDER.toLowerCase()}.json`);
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const MAX_PAGES      = 10;
const DEFAULT_PRICE  = 1200;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { const r = findFile(full, name); if (r) return r; }
    else if (entry.name === name) return full;
  }
  return null;
}

async function truncatePdf(buffer, maxPages) {
  const SIZE_LIMIT = FORCE_JPEG ? 0 : 15 * 1024 * 1024; // --force-jpeg : toujours passer par pdfjs
  if (buffer.length <= SIZE_LIMIT) {
    try {
      const src   = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = src.getPageCount();
      if (total <= maxPages) return { buffer, pageCount: total };
      const dst   = await PDFDocument.create();
      const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
      pages.forEach(p => dst.addPage(p));
      return { buffer: Buffer.from(await dst.save()), pageCount: total };
    } catch { /* PDF corrompu → fallback */ }
  }
  const data     = new Uint8Array(buffer);
  const pdfjsDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const total         = pdfjsDoc.numPages;
  const pagesToRender = Math.min(total, maxPages);
  const newPdf        = await PDFDocument.create();
  for (let i = 1; i <= pagesToRender; i++) {
    const page  = await pdfjsDoc.getPage(i);
    const vp0   = page.getViewport({ scale: 1 });
    const scale = Math.min(800 / vp0.width, 1.5);
    const vp    = page.getViewport({ scale });
    const f     = new NodeCanvasFactory();
    const cc    = f.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
    const jpgBytes = cc.canvas.toBuffer('image/jpeg', { quality: 0.75 });
    const img      = await newPdf.embedJpg(jpgBytes);
    const p        = newPdf.addPage([vp.width, vp.height]);
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
  }
  const compressed = Buffer.from(await newPdf.save());
  console.log(`  ✓ Compressé: ${(buffer.length/1024/1024).toFixed(1)}MB → ${(compressed.length/1024/1024).toFixed(1)}MB (${pagesToRender}/${total} pages)`);
  return { buffer: compressed, pageCount: total };
}

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const SCHEMA_KEYWORDS = /schema|scheme|schematic|wiring/i;

async function renderFirstPage(pdfBuffer, filename = '') {
  const isSchema = SCHEMA_KEYWORDS.test(filename);
  const data = new Uint8Array(pdfBuffer);
  const doc  = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  if (isSchema) {
    const scale = (800 / page.getViewport({ scale: 1 }).width) * 2;
    const vp    = page.getViewport({ scale });
    const f = new NodeCanvasFactory(); const cc = f.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
    const out = canvas.createCanvas(Math.round(vp.width / 2), Math.round(vp.height / 2));
    out.getContext('2d').drawImage(cc.canvas, 0, 0);
    return out.toBuffer('image/jpeg', { quality: 0.85 });
  } else {
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp    = page.getViewport({ scale });
    const f = new NodeCanvasFactory(); const cc = f.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
    return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  }
}

async function classifyWithClaude(filename, pdfBuffer, pageCount) {
  const { buffer: truncated } = await truncatePdf(pdfBuffer, MAX_PAGES);
  const isHorlogerie = SUBFOLDER === 'Horlogerie';
  const isAutomobile = SUBFOLDER === 'Automobile';
  const prixBlock = isHorlogerie ? `
- **price_cents** : prix de vente en centimes d'euro. Applique ces règles :
  * Fiche 1-2 pages (liste de pièces numérotées, éclaté mécanique seul) → 300
  * Quelques pages avec explications techniques → 700 à 1000
  * Manuel de service avec explications techniques détaillées → 1200 à 1500
  * Dossier technique conséquent, marque très prestigieuse (Rolex, Patek…) → 1700 à 2500
  Si le nom du fichier contient "$N", utilise N×100 comme référence.`
  : isAutomobile ? `
- **price_cents** : prix de vente en centimes d'euro. Applique ces règles :
  * Liste de pièces seule ou document de quelques pages sans explications techniques → 500
  * Manuel d'utilisation / guide du propriétaire → 700 à 1000
  * Manuel de réparation ou d'atelier partiel (sous-ensemble, section unique) → 1000 à 1500
  * Manuel d'atelier ou de service complet (plusieurs systèmes couverts) → 1500 à 2000
  * Manuel d'atelier complet pour marque prestigieuse ou véhicule rare (Alpine, Bugatti, Rolls-Royce, Land Rover Series, etc.) → 2000 à 2500
  Si le nom du fichier contient "$N", utilise N×100 comme référence mais ajuste selon le contenu réel.`
  : '';
  const prompt = `Tu es un expert en documentation technique pour un site de vente de manuels.
Nom du fichier original : "${filename}"
Nombre de pages total : ${pageCount}
Lis ce PDF et réponds en JSON avec exactement ces champs :
- **filename_clean** : nom de fichier propre et descriptif SANS extension et SANS prix
- **title_en** : titre professionnel EN ANGLAIS (60 chars max)
- **title_fr** : titre EN FRANÇAIS (60 chars max)
- **description_en** : description EN ANGLAIS basée STRICTEMENT sur le contenu visible.
- **description_fr** : description EN FRANÇAIS basée STRICTEMENT sur le contenu visible.
- **language** : langue principale du document ("fr" ou "en")${prixBlock}
RÈGLES ABSOLUES :
- Décris UNIQUEMENT ce que tu vois dans les pages. Rien d'autre.
- TOUJOURS utiliser les caractères accentués corrects en français (é, è, ê, à, â, ù, û, ô, î, ï, ç, œ, etc.).
- Ne mentionne JAMAIS la langue du document.
- Ne commence pas par "Ce document..." ou "This document..."
- Texte brut, pas de markdown.
- Si le nom du fichier contient "Schema", "Scheme", "Schematic" ou "Parts List" : descriptif court et factuel uniquement.
Réponds UNIQUEMENT en JSON valide.`;
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: truncated.toString('base64') } },
      { type: 'text', text: prompt },
    ]}],
  });
  const text  = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse non parseable');
  return JSON.parse(match[0]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
let pdfPath = findFile(DOCS_A_CLASSER, TARGET_FILE);
if (!pdfPath && fs.existsSync(DOCS_EN_LIGNE)) {
  console.log(`Non trouvé dans SOURCE, recherche dans DOCS EN LIGNE...`);
  pdfPath = findFile(DOCS_EN_LIGNE, TARGET_FILE);
}
if (!pdfPath) { console.error(`Fichier introuvable : ${TARGET_FILE}`); process.exit(1); }
console.log(`Fichier trouvé : ${pdfPath}`);

const pdfBuffer = fs.readFileSync(pdfPath);
const fileSize  = fs.statSync(pdfPath).size;
let pageCount   = 0;
try { const src = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true }); pageCount = src.getPageCount(); } catch {}
console.log(`Pages: ${pageCount} | Taille: ${(fileSize/1024/1024).toFixed(1)} MB`);

const priceMatch = TARGET_FILE.match(/\$(\d+(?:\.\d+)?)\s*(?:\.\w+)?$/);
const price      = priceMatch ? Math.round(parseFloat(priceMatch[1]) * 100) : DEFAULT_PRICE;

const brand       = path.basename(path.dirname(pdfPath));
const category_fr = SUBFOLDER;

const entry = { original_filename: TARGET_FILE, original_path: pdfPath, file_size: fileSize, page_count: pageCount, price, brand, category_fr, status: 'pending' };

// Preview
try {
  if (!fs.existsSync(TEMP_PREVIEWS)) fs.mkdirSync(TEMP_PREVIEWS, { recursive: true });
  const jpgBuffer  = await renderFirstPage(pdfBuffer, TARGET_FILE);
  const slugBase   = slugify(TARGET_FILE.replace(/\.pdf$/i, '').slice(0, 60));
  entry.preview_file = path.join(TEMP_PREVIEWS, `${slugBase}.jpg`);
  fs.writeFileSync(entry.preview_file, jpgBuffer);
  console.log(`✓ Preview: ${(jpgBuffer.length/1024).toFixed(0)} KB`);
} catch (err) { console.log(`⚠ Preview: ${err.message}`); entry.preview_file = null; }

// Claude
try {
  console.log('Analyse Claude...');
  const meta       = await classifyWithClaude(TARGET_FILE, pdfBuffer, pageCount);
  entry.filename_clean  = meta.filename_clean;
  entry.title_en        = meta.title_en;
  entry.title_fr        = meta.title_fr;
  entry.description_en  = meta.description_en;
  entry.description_fr  = meta.description_fr;
  entry.language        = meta.language;
  if (meta.price_cents && Number.isInteger(meta.price_cents) && meta.price_cents > 0) {
    entry.price = meta.price_cents;
  }
  entry.slug            = `${slugify(brand)}-${slugify(meta.filename_clean)}`.slice(0, 120);
  if (entry.preview_file && fs.existsSync(entry.preview_file)) {
    const newPreview = path.join(TEMP_PREVIEWS, `${entry.slug}.jpg`);
    fs.renameSync(entry.preview_file, newPreview);
    entry.preview_file = newPreview;
  }
  entry.status = 'done';
  console.log(`✓ Slug: ${entry.slug}`);
  console.log(`✓ Titre: ${meta.title_fr}`);
} catch (err) {
  entry.status = 'error';
  entry.error  = err.message;
  console.log(`✗ Erreur: ${err.message}`);
}

// Mise à jour du rapport : remplace les entrées error pour ce fichier, ajoute la nouvelle
const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
report.docs  = report.docs.filter(d => !(d.original_filename === TARGET_FILE && d.status === 'error'));
report.docs.push(entry);
report.generated_at = new Date().toISOString();
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
console.log(`\nRapport mis à jour : ${entry.status}`);
