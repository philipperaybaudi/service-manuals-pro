/**
 * Import Sony HDR-FX7 — Lot 2
 * - 2 PDFs : version FR-IT et version EN (GB)
 * - 1 image preview commune : Sony HDR-FX7.jpg
 * - Catégorie : Photography (id connu)
 * - Marque : Sony (créée si absente)
 * - Prix : 1000 centimes = 10 € / $10
 *
 * Usage : node scripts/import-sony-hdr-fx7.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Config ──────────────────────────────────────────────────────────────────

const PDF_DIR  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégorie\\Photographie\\Sony';
const IMG_FILE = path.join(PDF_DIR, 'Sony HDR-FX7.jpg');

const CATEGORY_ID = '8aa862c1-4e52-42bf-9088-8309ccce4e9f'; // Video
const BRAND_ID    = '4f262624-ef67-4628-bd2a-a78e9f5827a8'; // Sony (Video)

const DOCS = [
  {
    pdfFile:   'sony_hdrfx7-notice_fr-it.pdf',
    slug:      'sony-hdr-fx7-user-manual-french-italian',
    title:     'Sony HDR-FX7 User Manual French-Italian',
    title_fr:  'Sony HDR-FX7 Notice utilisateur Français-Italien',
    language:  'fr',
    price:     1000, // centimes
    featured:  false,
  },
  {
    pdfFile:   'sony_hdrfx7-notice_gb.pdf',
    slug:      'sony-hdr-fx7-user-manual-english',
    title:     'Sony HDR-FX7 User Manual in English',
    title_fr:  'Sony HDR-FX7 Notice utilisateur en anglais',
    language:  'en',
    price:     1000,
    featured:  false,
  },
];

const STORAGE_BUCKET = 'logos'; // bucket Supabase Storage (previews dans sous-dossier logos/previews/)
const MAX_PDF_PAGES_FOR_CLAUDE = 10; // pages envoyées à Claude pour analyse

// ─── Clients ─────────────────────────────────────────────────────────────────

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
    // PDF chiffré : impossible de tronquer, on envoie le buffer original à Claude
    console.log(`    (PDF chiffré — envoi du buffer complet à Claude)`);
    return { buffer, pageCount: total };
  }
}

async function uploadToR2(key, buffer, contentType = 'application/pdf') {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key:    key,
    Body:   buffer,
    ContentType: contentType,
  }));
  console.log(`  → R2 uploadé : ${key}`);
}

async function uploadToSupabaseStorage(storagePath, buffer, contentType = 'image/jpeg') {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  console.log(`  → Supabase Storage uploadé : ${storagePath}`);
  return publicUrl;
}

async function getOrCreateBrand() {
  // Cherche Sony dans la catégorie Photography
  const { data: existing } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', CATEGORY_ID)
    .ilike('name', 'sony')
    .single();

  if (existing) {
    console.log(`  → Marque Sony existante : ${existing.id}`);
    return existing.id;
  }

  // Créer Sony
  if (DRY_RUN) {
    console.log('  [DRY-RUN] Créerait la marque Sony');
    return 'DRY-RUN-BRAND-ID';
  }

  const { data: created, error } = await supabase
    .from('brands')
    .insert({
      name:        'SONY',
      slug:        'sony-video',
      category_id: CATEGORY_ID,
      logo_url:    null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Brand creation error: ${error.message}`);
  console.log(`  → Marque Sony créée : ${created.id}`);
  return created.id;
}

async function generateDescriptionsWithPdf(doc, pdfBuffer) {
  const { buffer: truncated } = await truncatePdf(pdfBuffer, MAX_PDF_PAGES_FOR_CLAUDE);

  const prompt = `Tu es un rédacteur professionnel pour un site de vente de manuels techniques.

Document : ${doc.title}
Caméra : Sony HDR-FX7 (caméscope vidéo professionnel haute définition)

Lis ce PDF et rédige :

1. **description_fr** (200-300 mots) : Description professionnelle EN FRANÇAIS basée sur le contenu RÉEL visible dans le PDF. Mentionne précisément les chapitres, sujets et sections que tu vois réellement (surtout le sommaire). Commence par une accroche sur l'appareil. Ne mentionne JAMAIS la langue du document.

2. **description_en** (200-300 mots) : Même description EN ANGLAIS, rédaction originale (pas une traduction mot-à-mot).

RÈGLES ABSOLUES :
- Base-toi UNIQUEMENT sur ce que tu vois dans le PDF — ne pas inventer
- Ne mentionne JAMAIS la langue du document
- Texte brut, pas de markdown ni HTML
- Ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON :
{"description_fr": "...", "description_en": "..."}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: truncated.toString('base64') },
        },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('NOT_PARSEABLE:' + text.slice(0, 100));
  return JSON.parse(match[0]);
}

async function generateDescriptionsWithoutPdf(doc) {
  // Fallback : PDF chiffré/illisible — génération à partir du titre seul
  console.log('    (PDF illisible — génération sans PDF)');

  const prompt = `Tu es un rédacteur professionnel pour un site de vente de manuels techniques.

Document : ${doc.title}
Caméra : Sony HDR-FX7 (caméscope vidéo professionnel haute définition HDV1080i)
Pages : ${doc._pageCount || 'inconnu'}

Le Sony HDR-FX7 est un caméscope professionnel haute définition qui enregistre en format HDV1080i (1080 lignes effectives, ~25 Mbps). Il est équipé d'un zoom optique 20× Carl Zeiss, d'une mise au point manuelle, de contrôles d'exposition et d'iris, d'une balance des blancs réglable, d'un connecteur i.LINK, et supporte les Memory Stick Duo. Le manuel couvre la préparation, l'enregistrement, la lecture, les menus complets, la copie vers magnétoscope/DVD, les images fixes, le dépannage et les spécifications techniques.

Rédige :
1. **description_fr** (200-250 mots) EN FRANÇAIS — description professionnelle du contenu du manuel. Ne mentionne JAMAIS la langue du document.
2. **description_en** (200-250 mots) EN ANGLAIS — rédaction originale.

RÈGLES : texte brut, pas de markdown, ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON :
{"description_fr": "...", "description_en": "..."}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse Claude non parseable: ' + text.slice(0, 200));
  return JSON.parse(match[0]);
}

async function generateDescriptions(doc, pdfBuffer) {
  try {
    return await generateDescriptionsWithPdf(doc, pdfBuffer);
  } catch (err) {
    if (err.message.startsWith('NOT_PARSEABLE') || err.message.includes('blanc') || err.message.includes('blank')) {
      console.log('    PDF illisible par Claude — fallback sans PDF');
      return await generateDescriptionsWithoutPdf(doc);
    }
    throw err;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Import Sony HDR-FX7 — Lot 2 ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}\n`);

  // 1. Vérifier que les fichiers source existent
  console.log('1. Vérification des fichiers source...');
  for (const doc of DOCS) {
    const p = path.join(PDF_DIR, doc.pdfFile);
    if (!fs.existsSync(p)) throw new Error(`Fichier manquant : ${p}`);
    console.log(`  ✓ ${doc.pdfFile} (${(fs.statSync(p).size / 1024 / 1024).toFixed(1)} MB)`);
  }
  if (!fs.existsSync(IMG_FILE)) throw new Error(`Image manquante : ${IMG_FILE}`);
  console.log(`  ✓ Sony HDR-FX7.jpg (${(fs.statSync(IMG_FILE).size / 1024).toFixed(0)} KB)\n`);

  // 2. Marque Sony (ID hardcodé — créée via setup-video-category.mjs)
  console.log('2. Marque Sony (Video) → ID hardcodé');
  const brandId = BRAND_ID;
  console.log(`  → ${brandId}`);

  // 3. Upload image preview (commune aux 2 docs)
  console.log('3. Upload image preview vers Supabase Storage...');
  const imgBuffer = fs.readFileSync(IMG_FILE);
  let previewBaseUrl = null;

  if (!DRY_RUN) {
    // On upload une fois, on récupère l'URL de base pour les deux docs
    const previewPath1 = `previews/sony-hdr-fx7-user-manual-french-italian.jpg`;
    const previewPath2 = `previews/sony-hdr-fx7-user-manual-english.jpg`;
    const url1 = await uploadToSupabaseStorage(previewPath1, imgBuffer, 'image/jpeg');
    const url2 = await uploadToSupabaseStorage(previewPath2, imgBuffer, 'image/jpeg');
    previewBaseUrl = { 'sony-hdr-fx7-user-manual-french-italian': url1, 'sony-hdr-fx7-user-manual-english': url2 };
  } else {
    console.log('  [DRY-RUN] Uploaderait Sony HDR-FX7.jpg × 2 (une URL par doc)');
    previewBaseUrl = {
      'sony-hdr-fx7-user-manual-french-italian': 'DRY-RUN-URL-1',
      'sony-hdr-fx7-user-manual-english': 'DRY-RUN-URL-2',
    };
  }
  console.log('');

  // 4. Traiter chaque document
  let sharedDescFr = null; // description_fr de Doc 1, réutilisée pour Doc 2

  for (const [i, doc] of DOCS.entries()) {
    console.log(`\n─── Document ${i + 1}/2 : ${doc.slug} ───`);

    // Vérifier si déjà en base
    const { data: existing } = await supabase
      .from('documents')
      .select('id, slug')
      .eq('slug', doc.slug)
      .single();

    if (existing) {
      console.log(`  ⚠ Déjà en base (${existing.id}) — ignoré`);
      continue;
    }

    const pdfPath = path.join(PDF_DIR, doc.pdfFile);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const fileSize  = fs.statSync(pdfPath).size;

    // Compte les pages
    const srcDoc    = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pageCount = srcDoc.getPageCount();
    console.log(`  Pages : ${pageCount} | Taille : ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    doc._pageCount = pageCount; // pour le fallback sans PDF

    // 4a. Descriptions via Claude API
    console.log('  Génération des descriptions via Claude...');
    let description_fr, description_en;

    if (i === 0) {
      // Doc 1 : lecture du PDF
      ({ description_fr, description_en } = await generateDescriptions(doc, pdfBuffer));
      sharedDescFr = description_fr; // mémoriser pour Doc 2
    } else {
      // Doc 2 : réutilise description_fr de Doc 1 + traduction EN
      description_fr = sharedDescFr;
      console.log('  Traduction EN du descriptif FR (Doc 1)...');
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Traduis ce descriptif en anglais professionnel. Rédaction originale (pas mot-à-mot). Texte brut uniquement, pas de markdown. Ne commence pas par "This document...".\n\n${sharedDescFr}`,
        }],
      });
      description_en = resp.content[0].text.trim();
    }
    console.log(`  description_fr (${description_fr.length} chars) : ${description_fr.slice(0, 80)}...`);
    console.log(`  description_en (${description_en.length} chars) : ${description_en.slice(0, 80)}...`);

    // 4b. Upload PDF vers R2
    const r2Key = `documents/${doc.slug}.pdf`;
    if (!DRY_RUN) {
      await uploadToR2(r2Key, pdfBuffer);
    } else {
      console.log(`  [DRY-RUN] Uploaderait vers R2 : ${r2Key}`);
    }

    // 4c. Créer l'entrée Supabase
    const record = {
      title:          doc.title,
      title_fr:       doc.title_fr,
      slug:           doc.slug,
      description:    description_en,
      description_fr: description_fr,
      category_id:    CATEGORY_ID,
      brand_id:       brandId,
      price:          doc.price,
      file_path:      r2Key,
      file_size:      fileSize,
      page_count:     pageCount,
      preview_url:    previewBaseUrl[doc.slug],
      language:       doc.language,
      active:         true,
      featured:       doc.featured,
      download_count: 0,
    };

    if (!DRY_RUN) {
      const { data: inserted, error } = await supabase
        .from('documents')
        .insert(record)
        .select('id')
        .single();
      if (error) throw new Error(`Supabase insert error: ${error.message}`);
      console.log(`  ✓ Inséré en base : ${inserted.id}`);
    } else {
      console.log('  [DRY-RUN] Insérerait en base :');
      console.log('  ', JSON.stringify(record, null, 2).split('\n').slice(0, 8).join('\n  '));
    }
  }

  console.log('\n=== Import terminé ===');
  if (DRY_RUN) console.log('→ Relance sans --dry-run pour appliquer réellement.');
}

main().catch(err => { console.error('Erreur fatale:', err); process.exit(1); });
