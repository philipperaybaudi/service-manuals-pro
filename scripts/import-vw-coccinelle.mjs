/**
 * Import direct du manuel Volkswagen Coccinelle 1200/1300/1302
 * PDF source : DOCS EN LIGNE\Automobile\WV\Volkswagen Coccinelle 201200 - 201300 - 201302.pdf
 *
 * Ce script est auto-suffisant :
 *  1. Lit le PDF local
 *  2. Génère description + titre FR via Claude API (lecture PDF)
 *  3. Crée/trouve la marque Volkswagen en DB
 *  4. Génère la preview (page 1 → JPEG)
 *  5. Upload PDF → R2
 *  6. Upload preview → Supabase Storage
 *  7. Crée l'entrée en base Supabase
 *
 * Usage : node scripts/import-vw-coccinelle.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Constantes ───────────────────────────────────────────────────────────────
const PDF_PATH  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\Volkswagen\\Volkswagen Coccinelle 201200 - 201300 - 201302.pdf';
const SLUG      = 'volkswagen-volkswagen-coccinelle-1200-1300-1302';
const TITLE_EN  = 'Volkswagen Beetle 1200/1300/1302 Service Manual';
const BRAND_NAME = 'Volkswagen';
const CATEGORY_ID   = 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd'; // automotive
const CATEGORY_SLUG = 'automotive';
const PRICE     = 1500;  // 15€
const MAX_PAGES_FOR_CLAUDE = 10;
const STORAGE_BUCKET = 'logos';
const R2_KEY    = `documents/${SLUG}.pdf`;
const PREVIEW_PATH = `previews/${SLUG}.jpg`;

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderFirstPage(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;
  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function truncatePdf(buf, maxPages) {
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();
  if (total <= maxPages) return { buf, pages: total };
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach(p => dst.addPage(p));
  return { buf: Buffer.from(await dst.save()), pages: total };
}

async function generateDescriptions(pdfBuf, totalPages) {
  const b64 = pdfBuf.toString('base64');
  const prompt = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique.

Lis les pages du PDF et rédige :

1. **title_fr** : Titre adapté en français. "Volkswagen" et "Beetle/Coccinelle" restent tels quels, traduis le type de document.

2. **description_fr** : Description en français (150-250 mots) basée UNIQUEMENT sur ce que tu vois dans le PDF. Mentionne les systèmes, modèles couverts et chapitres visibles.

3. **description_en** : Même description en anglais, rédaction originale.

RÈGLES :
- Ne mentionne JAMAIS la langue du document
- UNIQUEMENT ce que tu vois dans le PDF — jamais ce qu'un tel document "devrait" contenir
- Pas de HTML ni markdown
- Ne commence pas par "Ce document..." ou "This document..."
- ${totalPages} pages au total

Réponds UNIQUEMENT en JSON :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
        { type: 'text', text: `Titre original : ${TITLE_EN}\n\n${prompt}` },
      ],
    }],
  });

  const text = resp.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse Claude non parseable: ' + text.slice(0, 200));
  return JSON.parse(match[0]);
}

async function getOrCreateBrand() {
  const { data: existing } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', CATEGORY_ID)
    .ilike('name', BRAND_NAME)
    .maybeSingle();
  if (existing) {
    console.log(`  ✓ Marque existante : ${existing.name} (${existing.slug})`);
    return existing;
  }
  // Tenter de créer avec différents slugs
  const slugCandidates = ['volkswagen', 'volkswagen-auto', 'volkswagen-automotive'];
  for (const slug of slugCandidates) {
    const { data: created, error } = await supabase
      .from('brands')
      .insert({ name: BRAND_NAME, slug, category_id: CATEGORY_ID, logo_url: null })
      .select('id, name, slug')
      .single();
    if (!error) {
      console.log(`  ✓ Marque créée : ${created.name} (${created.slug})`);
      return created;
    }
    if (error.code !== '23505') {
      console.error(`  Erreur création marque : ${error.message}`);
      return null;
    }
  }
  console.error('  Impossible de créer la marque Volkswagen');
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Import VW Coccinelle (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===\n`);

// 1. Vérifier que le fichier existe
if (!fs.existsSync(PDF_PATH)) {
  console.error(`❌ Fichier introuvable : ${PDF_PATH}`);
  process.exit(1);
}
console.log(`✓ PDF trouvé : ${PDF_PATH}`);

// 2. Vérifier doublon en base
const { data: existing } = await supabase
  .from('documents').select('id').eq('slug', SLUG).maybeSingle();
if (existing) {
  console.log(`⚠ Document "${SLUG}" déjà en base. Rien à faire.`);
  process.exit(0);
}

// 3. Lire le PDF
const pdfBuffer = fs.readFileSync(PDF_PATH);
console.log(`✓ PDF lu : ${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB`);

// 4. Compter les pages + tronquer pour Claude
const { buf: truncatedBuf, pages: pageCount } = await truncatePdf(pdfBuffer, MAX_PAGES_FOR_CLAUDE);
console.log(`✓ Pages : ${pageCount} (envoi des ${Math.min(MAX_PAGES_FOR_CLAUDE, pageCount)} premières à Claude)`);

// 5. Générer descriptions via Claude
console.log('  Envoi à Claude API...');
let descriptions;
try {
  descriptions = await generateDescriptions(truncatedBuf, pageCount);
  console.log(`✓ title_fr : ${descriptions.title_fr}`);
  console.log(`  desc FR : ${descriptions.description_fr.slice(0, 80)}...`);
} catch (err) {
  console.error(`❌ Erreur Claude : ${err.message}`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log('\n[DRY-RUN] Arrêt ici. Aucune modification en base ni R2.');
  console.log(`  slug      : ${SLUG}`);
  console.log(`  title     : ${TITLE_EN}`);
  console.log(`  title_fr  : ${descriptions.title_fr}`);
  console.log(`  pages     : ${pageCount}`);
  console.log(`  prix      : ${PRICE / 100}€`);
  process.exit(0);
}

// 6. Créer/trouver la marque
const brand = await getOrCreateBrand();
if (!brand) process.exit(1);

// 7. Générer preview
let previewUrl = null;
try {
  const jpgBuffer = await renderFirstPage(pdfBuffer);
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(PREVIEW_PATH, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadErr) throw new Error(uploadErr.message);
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(PREVIEW_PATH);
  previewUrl = publicUrl;
  console.log(`✓ Preview uploadée : ${PREVIEW_PATH} (${(jpgBuffer.length / 1024).toFixed(0)} KB)`);
} catch (err) {
  console.warn(`⚠ Preview non générée : ${err.message}`);
}

// 8. Upload PDF → R2
try {
  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME,
    Key:         R2_KEY,
    Body:        pdfBuffer,
    ContentType: 'application/pdf',
  }));
  console.log(`✓ PDF uploadé R2 : ${R2_KEY}`);
} catch (err) {
  console.error(`❌ Erreur R2 : ${err.message}`);
  process.exit(1);
}

// 9. Créer entrée Supabase
const { error: insertErr } = await supabase.from('documents').insert({
  title:          TITLE_EN,
  title_fr:       descriptions.title_fr,
  slug:           SLUG,
  description:    descriptions.description_en,
  description_fr: descriptions.description_fr,
  category_id:    CATEGORY_ID,
  brand_id:       brand.id,
  price:          PRICE,
  file_path:      R2_KEY,
  file_size:      pdfBuffer.length,
  page_count:     pageCount,
  preview_url:    previewUrl,
  active:         true,
  featured:       false,
});

if (insertErr) {
  console.error(`❌ Erreur Supabase insert : ${insertErr.message}`);
  process.exit(1);
}

console.log(`\n✅ Document importé avec succès !`);
console.log(`   slug     : ${SLUG}`);
console.log(`   title    : ${TITLE_EN}`);
console.log(`   title_fr : ${descriptions.title_fr}`);
console.log(`   pages    : ${pageCount}`);
console.log(`   prix     : ${PRICE / 100}€`);
console.log(`   brand    : ${brand.name} (${brand.slug})`);
