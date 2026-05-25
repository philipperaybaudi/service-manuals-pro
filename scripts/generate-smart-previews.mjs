/**
 * generate-smart-previews.mjs
 * ============================
 * Génère des previews intelligentes pour les documents d'une marque :
 * - Sélectionne la première page avec des images (photos de démontage)
 * - Ignore les premières pages (couverture, sécurité, sommaire)
 * - Upload vers Supabase Storage logos/previews/{slug}.jpg (upsert)
 *
 * Usage :
 *   node scripts/generate-smart-previews.mjs <Brand> [--dry-run]
 *   node scripts/generate-smart-previews.mjs ACER --dry-run
 *   node scripts/generate-smart-previews.mjs ACER
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import fs   from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

// ── Config ────────────────────────────────────────────────────────────────────
const REPORT_PATH   = path.join('scripts', 'docs-a-classer-report-informatique.json');
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique';
const STORAGE_BUCKET = 'logos';

// Pages à ignorer en tête de document
const SKIP_FIRST_N  = 2;    // commencer à chercher à partir de l'index 2 (page 3)
const MAX_SCAN      = 50;   // scanner au plus 50 pages
const MIN_IMAGES    = 1;    // seuil minimum d'images pour retenir la page
const THUMB_WIDTH   = 800;  // largeur thumbnail en pixels

// ── Args ──────────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const BRAND_ARG = args.find(a => !a.startsWith('--'));

if (!BRAND_ARG) {
  console.error('Usage : node scripts/generate-smart-previews.mjs <Brand> [--dry-run]');
  process.exit(1);
}
const BRAND_FILTER = BRAND_ARG.toUpperCase();

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Load report ───────────────────────────────────────────────────────────────
if (!fs.existsSync(REPORT_PATH)) {
  console.error(`Rapport introuvable : ${REPORT_PATH}`);
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
const docs   = report.docs || [];

// Filtrer les docs importés de la marque cible
const targets = docs
  .filter(d => d.status === 'imported' && (d.brand || '').toUpperCase() === BRAND_FILTER)
  .map(d => {
    const originalFilename = path.basename(d.original_filename || d.original_path || '');
    const brandFolder      = path.join(DOCS_EN_LIGNE, BRAND_FILTER);
    const pdfPath          = path.join(brandFolder, originalFilename);
    return { slug: d.slug, pdfPath, originalFilename };
  })
  .filter(d => d.slug && d.originalFilename);

console.log(`Marque          : ${BRAND_FILTER}`);
console.log(`Documents cibles: ${targets.length}`);
if (DRY_RUN) console.log('MODE DRY-RUN — aucun upload');
console.log();

// ── Helpers pdfjs ─────────────────────────────────────────────────────────────

/**
 * Compte les opérations image sur une page pdfjs.
 * paintImageXObject = image embarquée (photo, schéma)
 */
async function countImagesOnPage(page) {
  try {
    const ops = await page.getOperatorList();
    return ops.fnArray.filter(fn =>
      fn === pdfjs.OPS.paintImageXObject ||
      fn === pdfjs.OPS.paintInlineImageXObject ||
      fn === pdfjs.OPS.paintImageMaskXObject
    ).length;
  } catch {
    return 0;
  }
}

/**
 * Trouve la meilleure page (la plus riche en images, à partir de SKIP_FIRST_N).
 * Retourne { pageIdx, nImages }
 */
async function findBestPage(pdfjsDoc) {
  const n = pdfjsDoc.numPages;

  for (let i = SKIP_FIRST_N; i < Math.min(n, SKIP_FIRST_N + MAX_SCAN); i++) {
    const page   = await pdfjsDoc.getPage(i + 1); // pdfjs: 1-based
    const nImg   = await countImagesOnPage(page);
    page.cleanup();
    if (nImg >= MIN_IMAGES) {
      return { pageIdx: i, nImages: nImg };
    }
  }

  // Fallback : page 1 (index 1) ou 0 si doc très court
  const fallback = Math.min(1, n - 1);
  return { pageIdx: fallback, nImages: 0 };
}

/**
 * Rend une page en JPEG Buffer (width = THUMB_WIDTH px).
 */
async function renderPage(pdfjsDoc, pageIdx) {
  const page     = await pdfjsDoc.getPage(pageIdx + 1); // 1-based
  const viewport = page.getViewport({ scale: 1 });
  const scale    = THUMB_WIDTH / viewport.width;
  const vp       = page.getViewport({ scale });

  const canvasEl  = canvas.createCanvas(Math.round(vp.width), Math.round(vp.height));
  const ctx       = canvasEl.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport:      vp,
    canvasFactory: {
      create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; },
      reset(obj, w, h) { obj.canvas.width = w; obj.canvas.height = h; },
      destroy(obj) {},
    },
  }).promise;

  page.cleanup();
  return canvasEl.toBuffer('image/jpeg', { quality: 0.85 });
}

/**
 * Upload vers Supabase Storage (upsert).
 */
async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Supabase upload error: ${error.message}`);
  return storagePath;
}

// ── Boucle principale ─────────────────────────────────────────────────────────
let ok = 0, errors = 0, fallbacks = 0;

for (let i = 0; i < targets.length; i++) {
  const { slug, pdfPath, originalFilename } = targets[i];
  const num = `[${i + 1}/${targets.length}]`;

  if (!fs.existsSync(pdfPath)) {
    console.log(`  ${num} ✗ INTROUVABLE : ${originalFilename}`);
    errors++;
    continue;
  }

  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdfjsDoc = await pdfjs.getDocument({
      data,
      standardFontDataUrl: STANDARD_FONTS,
      verbosity: 0,
    }).promise;

    const { pageIdx, nImages } = await findBestPage(pdfjsDoc);
    const marker = nImages === 0
      ? `[fallback p.${pageIdx + 1}]`
      : `[p.${pageIdx + 1}, ${nImages} img]`;

    if (nImages === 0) fallbacks++;

    if (DRY_RUN) {
      console.log(`  ${num} DRY  ${marker}  ${slug}`);
      pdfjsDoc.destroy();
      ok++;
      continue;
    }

    const jpgBuffer = await renderPage(pdfjsDoc, pageIdx);
    pdfjsDoc.destroy();

    await uploadPreview(slug, jpgBuffer);
    console.log(`  ${num} ✓ ${marker}  ${slug}`);
    ok++;

  } catch (err) {
    console.log(`  ${num} ✗ ERREUR ${slug} : ${err.message}`);
    errors++;
  }
}

console.log();
console.log(`Terminé — ${ok} OK | ${fallbacks} fallback | ${errors} erreurs`);
