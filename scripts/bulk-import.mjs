/**
 * Import en masse depuis C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories
 * Structure : Catégorie / Marque / Document €prix.pdf
 * Usage : node scripts/bulk-import.mjs [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

const DRY_RUN = process.argv.includes('--dry-run');
const SOURCE_ROOT = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories';
const MAX_PAGES_CLAUDE = 10;
const STORAGE_BUCKET = 'logos'; // previews dans logos/previews/

// ─── Mapping dossier FR → catégorie Supabase ────────────────────────────────
const CATEGORY_MAP = {
  'Animaux & Soins':        { id: '9a064eb7-1b7f-447d-8736-0ee4d0ea8eaa', slug: 'pet-care' },
  'Audio & HiFi':           { id: 'fac320cd-12a4-4022-b011-aa39931c3062', slug: 'audio-hifi' },
  'Automobile':             { id: 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd', slug: 'automotive' },
  'Biomédical':             { id: '0cc59f0f-1636-40af-90e1-82eb60126a05', slug: 'biomedical' },
  'Bricolage & DIY':        { id: '33040eb3-b9d9-4c15-bda6-1afb5fb9c226', slug: 'diy-home-improvement' },
  'Camping & Caravaning':   { id: '4dbd7c09-3be2-4beb-9134-bcbef838299c', slug: 'camping-rv' },
  'Cinéma & Vidéo':         { id: 'a663b7bd-7943-425f-9224-ff22e6b1e151', slug: 'cinema-video' },
  'Drones':                 { id: '834579fc-2641-47f3-bea1-84cd187dcaae', slug: 'drones' },
  'Électroménager':         { id: '277e6e9d-384a-4f04-9946-f262db187bbe', slug: 'home-appliances' },
  'Électronique':           { id: '74ab5d99-2f9c-4b98-b320-70013f876e99', slug: 'electronics' },
  'Équipements Sportifs':   { id: '4b9310a5-024d-4987-880c-aac3f26a242e', slug: 'sports-equipment' },
  'Informatique':           { id: 'b675e893-db94-4cde-b926-224575d3459f', slug: 'computers-it' },
  'Machines-Outils':        { id: '19a46ff6-9ad4-4273-9c8f-83f249904ec9', slug: 'machine-tools' },
  'Marine':                 { id: '6c2ea1cf-6e27-40e8-9042-405220f6b9cb', slug: 'marine' },
  'Motoculture':            { id: '834942f3-b150-484e-a6b8-8468d19a4e60', slug: 'outdoor-power' },
  'Photographie':           { id: '79ea117d-8952-4b9e-aab9-4b10fc2dec7a', slug: 'photography' },
  'Radio & Communications': { id: '98979c8e-d572-461c-bee9-7ada0f605318', slug: 'radio-communications' },
  'Téléphonie & Télécom':   { id: 'd7011240-f85b-4129-bd99-6cb7b6ee4936', slug: 'phones-telecom' },
  'Télévision':             { id: '982bd7fe-fbf9-4c94-999f-652daaebcaf2', slug: 'television' },
  'Usinage':                { id: '851ae9d7-4c3a-4eef-9e89-d42425cd5a31', slug: 'machining' },
};

// ─── Clients ────────────────────────────────────────────────────────────────
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrice(filename) {
  const match = filename.match(/[€$]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return Math.round(parseFloat(match[1].replace(',', '.')) * 100);
}

function cleanTitle(filename) {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[€$]\s*\d+[.,]?\d*\s*$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Preview upload error: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

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

async function generateMetadata(rawTitle, brandName, pdfBuffer) {
  const { buffer } = await truncatePdf(pdfBuffer, MAX_PAGES_CLAUDE);
  const b64 = buffer.toString('base64');

  const prompt = `Tu es un rédacteur professionnel pour un site de vente de manuels techniques.

Document : "${rawTitle}" — Marque/éditeur : ${brandName}

Lis ce PDF et génère :

1. **title_en** : titre propre et professionnel EN ANGLAIS (60 chars max). Si "OM" = "Owner's Manual". Si c'est un livre de réparation généraliste, titre accrocheur en anglais.
2. **title_fr** : titre EN FRANÇAIS (60 chars max).
3. **description_en** (150-250 mots) : description professionnelle EN ANGLAIS basée sur le contenu RÉEL du PDF.
4. **description_fr** (150-250 mots) : description EN FRANÇAIS basée sur le contenu RÉEL du PDF.
5. **language** : langue principale du document ("fr" ou "en").

RÈGLES ABSOLUES :
- Base-toi UNIQUEMENT sur ce que tu vois dans le PDF
- Texte brut, pas de markdown ni HTML
- Ne mentionne JAMAIS la langue du document dans les descriptions
- Ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON :
{"title_en":"...","title_fr":"...","description_en":"...","description_fr":"...","language":"fr"}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('NOT_PARSEABLE');
    return JSON.parse(match[0]);
  } catch (err) {
    // Fallback sans PDF
    console.log('    ⚠ PDF illisible — fallback sans PDF');
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Tu es un rédacteur professionnel pour un site de manuels techniques.
Document : "${rawTitle}" — Marque/éditeur : ${brandName}
Génère title_en, title_fr, description_en (150-250 mots), description_fr (150-250 mots), language ("fr"/"en").
Texte brut. Ne mentionne jamais la langue dans les descriptions.
JSON uniquement : {"title_en":"...","title_fr":"...","description_en":"...","description_fr":"...","language":"fr"}`,
      }],
    });
    const text = resp.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Fallback non parseable');
    return JSON.parse(match[0]);
  }
}

async function getOrCreateBrand(brandName, categoryId, categorySlug) {
  // Chercher la marque dans la catégorie
  const { data: existing } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', categoryId)
    .ilike('name', brandName)
    .maybeSingle();
  if (existing) return existing;

  if (DRY_RUN) return { id: 'DRY-BRAND', name: brandName, slug: slugify(brandName) };

  // Tenter création avec slug simple, puis avec suffixe catégorie si conflit
  const baseSlug = slugify(brandName);
  for (const slug of [baseSlug, `${baseSlug}-${categorySlug.split('-')[0]}`]) {
    const { data: created, error } = await supabase
      .from('brands')
      .insert({ name: brandName, slug, category_id: categoryId, logo_url: null })
      .select('id, name, slug')
      .single();
    if (!error) return created;
    if (error.code !== '23505') { console.error(`  Erreur création marque ${brandName}:`, error.message); return null; }
  }
  console.error(`  Impossible de créer la marque ${brandName}`);
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`=== Bulk Import — Mode: ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'} ===\n`);

let totalImported = 0;
let totalSkipped = 0;
let totalErrors = 0;

const catFolders = fs.readdirSync(SOURCE_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort();

for (const catFolder of catFolders) {
  const cat = CATEGORY_MAP[catFolder];
  if (!cat) continue;

  const catPath = path.join(SOURCE_ROOT, catFolder);
  const brandFolders = fs.readdirSync(catPath, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
  if (brandFolders.length === 0) continue;

  // Vérifier s'il y a des PDFs
  const hasPdfs = brandFolders.some(b =>
    fs.readdirSync(path.join(catPath, b)).some(f => f.toLowerCase().endsWith('.pdf'))
  );
  if (!hasPdfs) continue;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📁 ${catFolder} → ${cat.slug}`);

  for (const brandName of brandFolders) {
    const brandPath = path.join(catPath, brandName);
    const pdfFiles = fs.readdirSync(brandPath).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) continue;

    console.log(`\n  🏷 ${brandName}`);

    // Trouver/créer la marque
    const brand = await getOrCreateBrand(brandName, cat.id, cat.slug);
    if (!brand) { totalErrors += pdfFiles.length; continue; }
    console.log(`     Brand ID: ${brand.id} (slug: ${brand.slug})`);

    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(brandPath, pdfFile);
      const rawTitle = cleanTitle(pdfFile);
      const price = parsePrice(pdfFile);
      const docSlug = `${brand.slug}-${slugify(rawTitle)}`.slice(0, 120);

      console.log(`\n  📄 ${pdfFile}`);
      console.log(`     slug: ${docSlug} | prix: ${price ? price/100 + '€' : '⚠ MANQUANT'}`);

      if (!price) { console.log('     ⚠ Prix manquant — ignoré'); totalErrors++; continue; }

      // Vérifier si déjà en base
      const { data: existing } = await supabase.from('documents').select('id').eq('slug', docSlug).maybeSingle();
      if (existing) { console.log('     ⏭ Déjà en base — ignoré'); totalSkipped++; continue; }

      const pdfBuffer = fs.readFileSync(pdfPath);
      const fileSize = fs.statSync(pdfPath).size;

      // Compter les pages
      const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const pageCount = srcDoc.getPageCount();
      console.log(`     Pages: ${pageCount} | Taille: ${(fileSize/1024/1024).toFixed(1)} MB`);

      // Générer les métadonnées via Claude
      console.log('     Génération Claude...');
      let meta;
      try {
        meta = await generateMetadata(rawTitle, brandName, pdfBuffer);
      } catch (err) {
        console.error('     Erreur Claude:', err.message);
        totalErrors++;
        continue;
      }
      console.log(`     title_en: ${meta.title_en}`);
      console.log(`     title_fr: ${meta.title_fr}`);
      console.log(`     language: ${meta.language}`);

      if (DRY_RUN) {
        console.log('     [DRY-RUN] Uploaderait vers R2 et insérerait en base');
        totalImported++;
        continue;
      }

      // Générer preview (page 1 du PDF)
      let previewUrl = null;
      if (!DRY_RUN) {
        try {
          const jpgBuffer = await renderFirstPage(pdfBuffer);
          previewUrl = await uploadPreview(docSlug, jpgBuffer);
          console.log(`     ✓ Preview: ${(jpgBuffer.length/1024).toFixed(0)} KB`);
        } catch (err) {
          console.log(`     ⚠ Preview non générée: ${err.message}`);
        }
      }

      // Upload PDF vers R2
      const r2Key = `documents/${docSlug}.pdf`;
      try {
        await r2.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: r2Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        }));
        console.log(`     ✓ R2: ${r2Key}`);
      } catch (err) {
        console.error('     Erreur R2:', err.message);
        totalErrors++;
        continue;
      }

      // Insérer en base Supabase
      const record = {
        title:          meta.title_en,
        title_fr:       meta.title_fr,
        slug:           docSlug,
        description:    meta.description_en,
        description_fr: meta.description_fr,
        category_id:    cat.id,
        brand_id:       brand.id,
        price,
        file_path:      r2Key,
        file_size:      fileSize,
        page_count:     pageCount,
        preview_url:    previewUrl,
        language:       meta.language,
        active:         true,
        featured:       false,
        download_count: 0,
      };

      const { error: insertErr } = await supabase.from('documents').insert(record);
      if (insertErr) {
        console.error('     Erreur Supabase:', insertErr.message);
        totalErrors++;
      } else {
        console.log(`     ✓ Inséré en base`);
        totalImported++;
      }
    }
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`\n✓ Import terminé`);
console.log(`  Importés  : ${totalImported}`);
console.log(`  Ignorés   : ${totalSkipped}`);
console.log(`  Erreurs   : ${totalErrors}`);
if (DRY_RUN) console.log('\n→ Relance sans --dry-run pour appliquer réellement.');
