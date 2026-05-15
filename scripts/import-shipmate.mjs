/**
 * Import des 5 manuels SHIPMATE RS8000 dans Radio & Communications
 * Méthodologie LUREM : Claude API pour les descriptions, preview page 1
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

// Polyfills pdfjs
if (typeof Path2D === 'undefined' || typeof Path2D !== 'function') {
  global.Path2D = class Path2D {
    constructor(p) { this._path = p || null; }
    addPath() {} closePath() {} moveTo() {} lineTo() {}
    bezierCurveTo() {} quadraticCurveTo() {} arc() {}
    arcTo() {} ellipse() {} rect() {}
  };
}
if (typeof DOMMatrix === 'undefined') global.DOMMatrix = canvas.DOMMatrix;

const STANDARD_FONTS  = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE_DIR      = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Radio & Communications\\SHIPMATE';
const DEST_DIR        = SOURCE_DIR; // Déjà en place
const MAX_PAGES_CLAUDE = 10;

const BRAND_SLUG     = 'shipmate';
const CATEGORY_ID    = '98979c8e-d572-461c-bee9-7ada0f605318';
const STORAGE_BUCKET = 'logos';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function truncatePdf(buffer, maxPages) {
  try {
    const src   = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = src.getPageCount();
    if (total <= maxPages) return { buffer, pageCount: total };
    const dst   = await PDFDocument.create();
    const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
    pages.forEach(p => dst.addPage(p));
    return { buffer: Buffer.from(await dst.save()), pageCount: total };
  } catch {
    try {
      const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return { buffer, pageCount: src.getPageCount() };
    } catch { return { buffer, pageCount: 0 }; }
  }
}

async function renderFirstPage(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc  = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp   = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function classifyWithClaude(filename, pdfBuffer, pageCount) {
  const { buffer: truncated } = await truncatePdf(pdfBuffer, MAX_PAGES_CLAUDE);

  const prompt = `Tu es un expert en documentation technique pour un site de vente de manuels.

Nom du fichier original : "${filename}"
Nombre de pages total : ${pageCount}

Lis ce PDF et réponds en JSON avec exactement ces champs :

- **filename_clean** : nom de fichier propre et descriptif SANS extension et SANS prix (ex: "Shipmate RS8000 Service Manual 1983")
- **title_en** : titre professionnel EN ANGLAIS (60 chars max)
- **title_fr** : titre EN FRANÇAIS (60 chars max)
- **description_en** : description EN ANGLAIS basée STRICTEMENT sur le contenu visible. Peut être courte si le contenu est limité.
- **description_fr** : description EN FRANÇAIS basée STRICTEMENT sur le contenu visible. Peut être courte si le contenu est limité.

RÈGLES ABSOLUES :
- Décris UNIQUEMENT ce que tu vois dans les pages. Rien d'autre.
- JAMAIS d'informations générales sur le modèle ou la marque tirées de ta mémoire.
- Un descriptif court et exact vaut mieux qu'un descriptif long et inventé.
- Texte brut, pas de markdown.
- TOUJOURS utiliser les caractères accentués corrects en français.
- Ne mentionne JAMAIS la langue du document.
- Ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON valide.`;

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
  const text  = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse Claude non parseable');
  return JSON.parse(match[0]);
}

// Extrait le suffixe date ou version du nom de fichier
// ex: "... 09-1983 $15.pdf" → "(09/1983)"
// ex: "... V.9002B $15.pdf" → "V.9002B"
function extractDateSuffix(filename) {
  const dateMatch = filename.match(/(\d{2})-(\d{4})/);
  if (dateMatch) return `(${dateMatch[1]}/${dateMatch[2]})`;
  const versionMatch = filename.match(/(V\.\d+[A-Z]*)/i);
  if (versionMatch) return versionMatch[1].toUpperCase();
  return '';
}

// ─── Main ────────────────────────────────────────────────────────────────────

// Récupérer l'ID de la marque SHIPMATE
const { data: brand } = await supabase.from('brands').select('id').eq('slug', BRAND_SLUG).single();
if (!brand) { console.error('✗ Marque SHIPMATE introuvable'); process.exit(1); }
const BRAND_ID = brand.id;
console.log(`Marque SHIPMATE : ${BRAND_ID}\n`);

// Créer le dossier DOCS EN LIGNE si nécessaire
if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

const pdfs = fs.readdirSync(SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.pdf')).sort();
console.log(`${pdfs.length} PDF(s) à importer :\n`);
pdfs.forEach(f => console.log(`  - ${f}`));
console.log('');

for (const filename of pdfs) {
  const pdfPath = path.join(SOURCE_DIR, filename);
  console.log(`\n=== ${filename} ===`);

  const pdfBuffer = fs.readFileSync(pdfPath);

  // Prix depuis le nom de fichier
  const priceMatch = filename.match(/\$(\d+(?:\.\d+)?)\s*(?:\.\w+)?$/);
  const price = priceMatch ? Math.round(parseFloat(priceMatch[1]) * 100) : 1500;

  // Nombre de pages
  let pageCount = 0;
  try { const src = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true }); pageCount = src.getPageCount(); } catch {}
  console.log(`  Pages: ${pageCount} | Prix: ${price / 100}€`);

  // 1. Analyse Claude
  console.log('  Analyse Claude...');
  let meta;
  try {
    meta = await classifyWithClaude(filename, pdfBuffer, pageCount);
  } catch (err) {
    console.error(`  ✗ Claude : ${err.message}`);
    continue;
  }

  // Ajouter date/version extraite du nom de fichier dans les titres
  const dateSuffix = extractDateSuffix(filename);
  if (dateSuffix) {
    meta.title_en = `${meta.title_en} ${dateSuffix}`.trim();
    meta.title_fr = `${meta.title_fr} ${dateSuffix}`.trim();
  }

  const slug = `${slugify(BRAND_SLUG)}-${slugify(meta.filename_clean)}`.slice(0, 120);
  console.log(`  Slug : ${slug}`);
  console.log(`  Titre EN : ${meta.title_en}`);
  console.log(`  Titre FR : ${meta.title_fr}`);

  // 2. Vérifier doublon
  const { data: existing } = await supabase.from('documents').select('id').eq('slug', slug).maybeSingle();
  if (existing) { console.log('  ⏭ Slug déjà présent, skip'); continue; }

  // 3. Preview page 1
  console.log('  Génération preview...');
  let previewUrl = null;
  try {
    const jpgBuffer = await renderFirstPage(pdfBuffer);
    const storagePath = `previews/${slug}.jpg`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    previewUrl = publicUrl;
    console.log(`  ✓ Preview uploadée`);
  } catch (err) {
    console.error(`  ✗ Preview : ${err.message}`);
  }

  // 4. Upload PDF vers R2
  console.log('  Upload PDF vers R2...');
  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `documents/${slug}.pdf`,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }));
    console.log('  ✓ PDF uploadé');
  } catch (err) {
    console.error(`  ✗ R2 : ${err.message}`);
    continue;
  }

  // 5. Insérer en base
  console.log('  Insertion en base...');
  const { error: docErr } = await supabase.from('documents').insert({
    slug,
    title:          meta.title_en,
    title_fr:       meta.title_fr,
    description:    meta.description_en,
    description_fr: meta.description_fr,
    brand_id:       BRAND_ID,
    category_id:    CATEGORY_ID,
    file_path:      `documents/${slug}.pdf`,
    preview_url:    previewUrl,
    price,
    page_count:     pageCount,
    active:         true,
  });
  if (docErr) { console.error(`  ✗ DB : ${docErr.message}`); continue; }
  console.log('  ✓ Document créé en base');

  // PDFs déjà dans DOCS EN LIGNE, rien à déplacer
}

console.log('\n✓ Import SHIPMATE terminé !');
