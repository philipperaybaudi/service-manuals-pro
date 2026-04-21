/**
 * Phase 1 — Classification des PDFs depuis DOCS A CLASSER
 * - Lit chaque PDF avec Claude API (10 premières pages)
 * - Identifie catégorie, marque, titre propre, descriptions FR/EN
 * - Génère la preview (page 1) dans scripts/temp_previews/
 * - Produit un rapport : scripts/docs-a-classer-report.json
 *
 * Usage : node scripts/classify-docs.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const SUBFOLDER       = process.argv[2] || ''; // ex: node classify-docs.mjs Motoculture
const DOCS_A_CLASSER  = path.join('C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories', SUBFOLDER);
const TEMP_PREVIEWS   = path.join('scripts', 'temp_previews');
const REPORT_FILE     = path.join('scripts', `docs-a-classer-report${SUBFOLDER ? '-' + SUBFOLDER.toLowerCase() : ''}.json`);
const STANDARD_FONTS  = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const MAX_PAGES_CLAUDE = 10;
const DEFAULT_PRICE    = 1200; // 12€

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Catégories FR disponibles sur le site
const CATEGORIES_FR = [
  'Animaux & Soins', 'Audio & HiFi', 'Automobile', 'Biomédical',
  'Bricolage & DIY', 'Camping & Caravaning', 'Cinéma & Vidéo', 'Drones',
  'Électroménager', 'Électronique', 'Équipements Sportifs', 'Informatique',
  'Machines-Outils', 'Marine', 'Motoculture', 'Photographie',
  'Radio & Communications', 'Téléphonie & Télécom', 'Télévision', 'Usinage',
];

if (!fs.existsSync(TEMP_PREVIEWS)) fs.mkdirSync(TEMP_PREVIEWS, { recursive: true });

// ─── Helpers ────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Parcourir récursivement DOCS A CLASSER
function findPdfs(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findPdfs(fullPath));
    else if (entry.name.toLowerCase().endsWith('.pdf')) results.push(fullPath);
  }
  return results;
}

// Tronquer le PDF pour Claude
async function truncatePdf(buffer, maxPages) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = src.getPageCount();
  if (total <= maxPages) return { buffer, pageCount: total };
  try {
    const dst = await PDFDocument.create();
    const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
    pages.forEach(p => dst.addPage(p));
    return { buffer: Buffer.from(await dst.save()), pageCount: total };
  } catch {
    return { buffer, pageCount: total };
  }
}

// Générer preview page 1
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderFirstPage(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

// Générer métadonnées via Claude (brand et category_fr lus depuis le dossier, pas par Claude)
async function classifyWithClaude(filename, pdfBuffer, pageCount) {
  const { buffer: truncated } = await truncatePdf(pdfBuffer, MAX_PAGES_CLAUDE);

  const prompt = `Tu es un expert en documentation technique pour un site de vente de manuels.

Nom du fichier original : "${filename}"
Nombre de pages total : ${pageCount}

Lis ce PDF et réponds en JSON avec exactement ces champs :

- **filename_clean** : nom de fichier propre et descriptif SANS extension et SANS prix (ex: "Nikon F3 Service Manual")
- **title_en** : titre professionnel EN ANGLAIS (60 chars max)
- **title_fr** : titre EN FRANÇAIS (60 chars max)
- **description_en** : description EN ANGLAIS basée STRICTEMENT sur le contenu visible. Peut être courte si le contenu est limité.
- **description_fr** : description EN FRANÇAIS basée STRICTEMENT sur le contenu visible. Peut être courte si le contenu est limité.
- **language** : langue principale du document ("fr" ou "en")

RÈGLES ABSOLUES :
- Décris UNIQUEMENT ce que tu vois dans les pages. Rien d'autre.
- Si les pages ne contiennent que des schémas électroniques : dis-le. Ne raconte pas ce que le schéma "représente" ou "inclut" si tu ne lis pas ces informations dans le document.
- Si le document contient des tubes électroniques, dis "tubes". Si transistors, dis "transistors". Si tu ne distingues pas, ne dis rien.
- JAMAIS d'informations générales sur le modèle ou la marque tirées de ta mémoire. Zero.
- Un descriptif court et exact vaut mieux qu'un descriptif long et inventé.
- Si le nom du fichier contient "Schema", "Scheme", "Schematic" ou "Parts List" : le contenu est probablement des schémas électroniques et/ou des listes de pièces avec vues éclatées. Décris uniquement ce que tu vois (ex: "Schéma électronique du [modèle]." ou "Liste de pièces avec vues éclatées pour le [modèle]."). Pas de blabla.
- Texte brut, pas de markdown.
- Ne mentionne JAMAIS la langue du document.
- Ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON valide.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: truncated.toString('base64') } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse non parseable');
    return JSON.parse(match[0]);
  } catch (err) {
    throw new Error(`Claude error: ${err.message}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
const pdfs = findPdfs(DOCS_A_CLASSER);
console.log(`=== Classification de ${pdfs.length} PDF(s) ===\n`);

// Charger rapport existant si reprise
let report = { generated_at: new Date().toISOString(), total: pdfs.length, docs: [] };
if (fs.existsSync(REPORT_FILE)) {
  const existing = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  report.docs = existing.docs || [];
  console.log(`  Reprise : ${report.docs.filter(d => d.status === 'done').length} déjà traités\n`);
}

const processedPaths = new Set(report.docs.map(d => d.original_path));

for (const [i, pdfPath] of pdfs.entries()) {
  const filename = path.basename(pdfPath);
  console.log(`[${i + 1}/${pdfs.length}] ${filename}`);

  if (processedPaths.has(pdfPath)) {
    console.log('  ⏭ Déjà traité\n');
    continue;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const fileSize = fs.statSync(pdfPath).size;

  // Compte les pages
  let pageCount = 0;
  try {
    const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    pageCount = srcDoc.getPageCount();
  } catch { pageCount = 0; }

  console.log(`  Pages: ${pageCount} | Taille: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  // Extraire le prix depuis le nom de fichier : ex. "Manual $5.pdf" → 500 centimes
  const priceMatch = filename.match(/\$(\d+(?:\.\d+)?)\s*(?:\.\w+)?$/);
  const price = priceMatch ? Math.round(parseFloat(priceMatch[1]) * 100) : DEFAULT_PRICE;

  const entry = {
    original_filename: filename,
    original_path: pdfPath,
    file_size: fileSize,
    page_count: pageCount,
    price,
    status: 'pending',
  };

  // 1. Générer preview
  try {
    const slugBase = slugify(filename.replace(/\.pdf$/i, '').slice(0, 60));
    const previewFile = path.join(TEMP_PREVIEWS, `${slugBase}.jpg`);
    const jpgBuffer = await renderFirstPage(pdfBuffer);
    fs.writeFileSync(previewFile, jpgBuffer);
    entry.preview_file = previewFile;
    console.log(`  ✓ Preview: ${(jpgBuffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.log(`  ⚠ Preview: ${err.message}`);
    entry.preview_file = null;
  }

  // Brand et catégorie lus depuis l'arborescence — jamais depuis Claude
  const brand      = path.basename(path.dirname(pdfPath));
  const category_fr = path.basename(path.dirname(path.dirname(pdfPath)));
  entry.brand       = brand;
  entry.category_fr = category_fr;

  // 2. Générer métadonnées avec Claude
  try {
    console.log('  Analyse Claude...');
    const meta = await classifyWithClaude(filename, pdfBuffer, pageCount);
    entry.filename_clean  = meta.filename_clean;
    entry.title_en        = meta.title_en;
    entry.title_fr        = meta.title_fr;
    entry.description_en  = meta.description_en;
    entry.description_fr  = meta.description_fr;
    entry.language        = meta.language;
    entry.slug = `${slugify(brand)}-${slugify(meta.filename_clean)}`.slice(0, 120);
    // Renommer preview avec le bon slug si généré
    if (entry.preview_file && fs.existsSync(entry.preview_file)) {
      const newPreview = path.join(TEMP_PREVIEWS, `${entry.slug}.jpg`);
      fs.renameSync(entry.preview_file, newPreview);
      entry.preview_file = newPreview;
    }
    entry.status = 'done';
    console.log(`  ✓ Catégorie: ${category_fr} | Marque: ${brand}`);
    console.log(`  ✓ Fichier: ${meta.filename_clean}`);
  } catch (err) {
    entry.status = 'error';
    entry.error = err.message;
    console.log(`  ✗ Erreur: ${err.message}`);
  }

  report.docs.push(entry);
  report.generated_at = new Date().toISOString();

  // Sauvegarde incrémentale
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log('');
}

console.log(`=== Terminé ===`);
console.log(`Rapport : ${REPORT_FILE}`);
console.log(`Previews : ${TEMP_PREVIEWS}/`);
console.log(`\nDocs traités : ${report.docs.filter(d => d.status === 'done').length}/${pdfs.length}`);
console.log(`Erreurs      : ${report.docs.filter(d => d.status === 'error').length}`);
console.log('\n→ Vérifie le rapport JSON, corrige si besoin, puis lance la Phase 2.');
