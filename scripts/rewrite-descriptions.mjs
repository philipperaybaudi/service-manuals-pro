/**
 * Script de rédaction des descriptions FR + EN pour les documents service-manuals-pro.
 *
 * Pour chaque document à traiter :
 * 1. Télécharge le PDF depuis R2
 * 2. Envoie le PDF directement à Claude API (vision) pour le lire
 * 3. Claude rédige title_fr, description_fr, description_en
 * 4. Met à jour Supabase
 * 5. Log le résultat dans un fichier JSON
 *
 * Usage : node scripts/rewrite-descriptions.mjs [--dry-run] [--limit N] [--start-from SLUG]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

// ─── Config ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();
const START_FROM = (() => {
  const idx = process.argv.indexOf('--start-from');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const BATCH_SIZE = 1; // 1 à la fois pour respecter le rate limit (50k tokens/min)
const DELAY_BETWEEN_BATCHES = 8000; // 8s entre chaque doc pour éviter le rate limit
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB max pour l'API Claude
const MAX_PDF_PAGES = 5; // Sommaire + intro suffisent pour décrire le contenu
const LOG_FILE = 'scripts/rewrite-descriptions-log.json';
const ERROR_FILE = 'scripts/rewrite-descriptions-errors.json';

// Documents protégés - NE JAMAIS modifier
const PROTECTED_SLUGS = [
  'foundations-of-mechanical-accuracy-wayne-r-moore-1970',
];
const PROTECTED_TITLES_PARTIAL = [
  'antique trader',
  'classic cameras',
  'mckeown',
  'russian & soviet cameras',
  'russian and soviet cameras',
  'camera craftsman', // remis en protégé après traitement Lot 1
];

// ─── Clients ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isProtected(doc) {
  if (PROTECTED_SLUGS.includes(doc.slug)) return true;
  const titleLower = doc.title.toLowerCase();
  return PROTECTED_TITLES_PARTIAL.some(p => titleLower.includes(p));
}

async function downloadPdfFromR2(filePath) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filePath,
  });
  const response = await r2.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const PROMPT_TEXT = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique (manuels de service, guides de réparation, schémas).

Tu dois fournir 3 choses :

1. **title_fr** : Le titre adapté en français. Règles :
   - Les noms de marques, modèles et références NE SE TRADUISENT PAS (ex: "Nikon F3", "Stihl MS 250")
   - Traduire les types de documents : "Service Manual" → "Manuel de service", "User Manual" → "Manuel d'utilisation", "User's Guide" → "Guide d'utilisation", "Owner's Manual" → "Manuel du propriétaire", "Repair Manual/Guide" → "Manuel/Guide de réparation", "Workshop Manual" → "Manuel d'atelier", "Parts List/Catalog" → "Liste/Catalogue des pièces", "Wiring Diagram" → "Schéma de câblage", "Technical Manual" → "Manuel technique", "Instruction Manual/Book" → "Manuel/Livret d'instructions", "Maintenance Manual" → "Manuel d'entretien", "Operating Instructions" → "Instructions d'utilisation", "Troubleshooting Guide" → "Guide de dépannage", "Restoration Guide" → "Guide de restauration", "Field Manual" → "Manuel de terrain", "Adjustment" → "Réglage"
   - "by" → "par" (quand il signifie l'auteur)

2. **description_fr** : Une description en français, professionnelle et détaillée (150-300 mots). Décris précisément le contenu du document en te basant sur ce que tu vois dans le PDF : ce qu'il couvre, les sujets traités, les chapitres principaux si visibles, le type d'information (schémas, procédures de réparation, spécifications, etc.). Le texte doit donner envie à un technicien ou un passionné d'acheter ce document.

3. **description_en** : La même description en anglais, de qualité équivalente. Ce n'est PAS une traduction mot-à-mot du français — c'est une rédaction originale en anglais couvrant les mêmes informations.

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document dans les descriptions
- INTERDIT d'inventer du contenu : décris UNIQUEMENT ce que tu peux lire/voir dans les pages du PDF. Si tu ne vois pas un sujet dans le document, NE LE MENTIONNE PAS. Par exemple, ne parle pas de "schémas électriques" si tu n'en vois aucun dans le PDF.
- Si le PDF est illisible ou trop flou, base-toi STRICTEMENT sur le titre et les métadonnées sans inventer de détails
- Ne commence PAS par "Ce document..." ou "This document..." — varie les tournures
- Utilise le vocabulaire technique approprié au domaine
- Le format de sortie doit être du texte brut (pas de HTML, pas de markdown)
- Sois PRÉCIS : mentionne les chapitres, sections ou sujets que tu VOIS réellement dans le PDF

Réponds UNIQUEMENT au format JSON suivant, sans aucun texte avant ou après :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

// Prompt spécial pour les numéros de Camera Craftsman (revue photographique)
const PROMPT_CAMERA_CRAFTSMAN = `Tu es un rédacteur spécialisé pour un site de documentation technique photographique.

Ce document est un numéro de la revue "Camera Craftsman", publication américaine dédiée à la réparation et la restauration d'appareils photo.

Tu dois fournir 3 choses :

1. **title_fr** : Le titre en français selon ce format STRICT :
   - Conserver EXACTEMENT "Camera Craftsman" (ne pas traduire)
   - Traduire la période en français : "Jan/Feb" → "Janvier/Février", "Mar/Apr" → "Mars/Avril", "May/Jun" → "Mai/Juin", "Jul/Aug" → "Juillet/Août", "Sep/Oct" → "Septembre/Octobre", "Nov/Dec" → "Novembre/Décembre"
   - Exemples : "Camera Craftsman - Janvier/Février 1978", "Camera Craftsman - Mars/Avril 1975"
   - Pour les numéros spéciaux sur un appareil (ex: "Canon AE-1") : "Camera Craftsman - Canon AE-1 (Numéro spécial)"
   - Pour les index : "Camera Craftsman - Index 1969-1978"

2. **description_fr** : Une description en français (150-300 mots) basée UNIQUEMENT sur le sommaire et le contenu réel visible dans le PDF. Présente les articles, les appareils traités, les procédures de réparation abordées, les tests ou dossiers techniques du numéro. Donne envie à un réparateur ou passionné d'appareils photo d'acheter ce numéro.

3. **description_en** : La même description en anglais, de qualité équivalente. Rédaction originale (pas une traduction mot-à-mot).

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document dans les descriptions
- INTERDIT d'inventer : décris UNIQUEMENT ce que tu vois réellement dans le PDF (sommaire, articles, titres de rubriques)
- Si le PDF est illisible, base-toi STRICTEMENT sur le titre sans inventer de contenu
- Ne commence PAS par "Ce document..." ou "This document..."
- Le format de sortie doit être du texte brut (pas de HTML, pas de markdown)

Réponds UNIQUEMENT au format JSON suivant, sans aucun texte avant ou après :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

function isCameraCraftsman(doc) {
  return doc.title.toLowerCase().includes('camera craftsman');
}

async function generateWithPdf(doc, pdfBuffer) {
  const pdfBase64 = pdfBuffer.toString('base64');

  const content = [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    },
    {
      type: 'text',
      text: `Informations sur ce document :
- Titre original (EN) : ${doc.title}
- Catégorie : ${doc.category_name || 'non spécifiée'}
- Marque : ${doc.brand_name || 'non spécifiée'}
- Nombre de pages : ${doc.page_count || 'inconnu'}

${isCameraCraftsman(doc) ? PROMPT_CAMERA_CRAFTSMAN : PROMPT_TEXT}`,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse Claude non parseable: ' + text.slice(0, 200));
  }
  return JSON.parse(jsonMatch[0]);
}

async function generateWithoutPdf(doc) {
  const selectedPrompt = isCameraCraftsman(doc) ? PROMPT_CAMERA_CRAFTSMAN : PROMPT_TEXT;
  const prompt = `Informations sur ce document :
- Titre original (EN) : ${doc.title}
- Catégorie : ${doc.category_name || 'non spécifiée'}
- Marque : ${doc.brand_name || 'non spécifiée'}
- Nombre de pages : ${doc.page_count || 'inconnu'}

Aucun PDF disponible. Base-toi uniquement sur le titre et les métadonnées.

${selectedPrompt}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse Claude non parseable: ' + text.slice(0, 200));
  }
  return JSON.parse(jsonMatch[0]);
}

async function truncatePdf(pdfBuffer, maxPages) {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = srcDoc.getPageCount();
  if (totalPages <= maxPages) return pdfBuffer;

  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(srcDoc, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach(p => newDoc.addPage(p));
  const bytes = await newDoc.save();
  return Buffer.from(bytes);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Rédaction des descriptions FR + EN (avec lecture PDF) ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (aucune modification)' : 'PRODUCTION'}`);
  console.log(`Force: ${FORCE ? 'OUI (tous les documents actifs)' : 'NON (seulement ceux sans traduction)'}`);
  console.log(`Limite: ${LIMIT === Infinity ? 'aucune' : LIMIT}`);
  if (START_FROM) console.log(`Reprise depuis: ${START_FROM}`);
  console.log('');

  // Charger TOUS les documents avec pagination (Supabase limite à 1000 par requête)
  let allDocs = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        id, title, title_fr, slug, description, description_fr,
        file_path, page_count, language, active,
        category:categories(name),
        brand:brands(name)
      `)
      .eq('active', true)
      .order('title')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Erreur Supabase:', error);
      process.exit(1);
    }
    allDocs = allDocs.concat(data);
    if (data.length < PAGE_SIZE) break; // dernière page
    from += PAGE_SIZE;
  }
  console.log(`Total documents actifs en base : ${allDocs.length}`);

  // Filtrer les documents à traiter
  let docs = allDocs
    .filter(d => !isProtected(d))
    .filter(d => {
      if (FORCE) return true; // --force : traiter tous les documents actifs
      const hasFrenchChars = (str) => str && /[éàèêîôùûçœæëïü]/i.test(str);
      return (
        !d.title_fr || d.title_fr === d.title ||
        !d.description_fr || d.description_fr === d.description ||
        (d.description_fr && d.description_fr.length < 50) ||
        !hasFrenchChars(d.description_fr) // description sans caractères français
      );
    })
    .map(d => ({
      ...d,
      category_name: d.category?.name || null,
      brand_name: d.brand?.name || null,
    }));

  if (START_FROM) {
    const idx = docs.findIndex(d => d.slug === START_FROM);
    if (idx === -1) {
      console.error(`Slug "${START_FROM}" non trouvé.`);
      process.exit(1);
    }
    docs = docs.slice(idx);
  }

  if (LIMIT < docs.length) {
    docs = docs.slice(0, LIMIT);
  }

  console.log(`Documents à traiter: ${docs.length}`);
  console.log('');

  // Charger le log existant pour reprendre si interrompu
  let log = [];
  if (fs.existsSync(LOG_FILE)) {
    log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  }
  const processedSlugs = new Set(log.map(l => l.slug));

  let errors = [];
  if (fs.existsSync(ERROR_FILE)) {
    errors = JSON.parse(fs.readFileSync(ERROR_FILE, 'utf-8'));
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (doc) => {
        if (processedSlugs.has(doc.slug)) {
          skipped++;
          return { slug: doc.slug, status: 'skipped' };
        }

        try {
          let result;
          let hadPdf = false;

          // 1. Télécharger le PDF depuis R2
          let pdfBuffer = null;
          try {
            pdfBuffer = await downloadPdfFromR2(doc.file_path);
            const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(1);
            console.log(`    PDF: ${sizeMB} MB téléchargé`);

            if (pdfBuffer.length > MAX_PDF_SIZE) {
              console.log(`    PDF trop gros (${sizeMB} MB) → sans PDF`);
              pdfBuffer = null;
            } else {
              // Tronquer si > 100 pages (limite API Claude)
              pdfBuffer = await truncatePdf(pdfBuffer, MAX_PDF_PAGES);
            }
          } catch (dlErr) {
            console.warn(`    [WARN] PDF inaccessible (${doc.file_path}): ${dlErr.message}`);
            pdfBuffer = null;
          }

          // 2. Envoyer à Claude (avec ou sans PDF)
          if (pdfBuffer) {
            console.log(`    Envoi du PDF à Claude...`);
            result = await generateWithPdf(doc, pdfBuffer);
            hadPdf = true;
          } else {
            result = await generateWithoutPdf(doc);
          }

          const { title_fr: titleFr, description_fr, description_en } = result;

          // 2. Mettre à jour Supabase
          if (!DRY_RUN) {
            const { error: updateErr } = await supabase
              .from('documents')
              .update({
                title_fr: titleFr,
                description_fr: description_fr,
                description: description_en,
              })
              .eq('id', doc.id);

            if (updateErr) throw new Error(`Supabase update error: ${updateErr.message}`);
          }

          const logEntry = {
            slug: doc.slug,
            title: doc.title,
            title_fr: titleFr,
            description_fr: description_fr.slice(0, 100) + '...',
            description_en: description_en.slice(0, 100) + '...',
            had_pdf: hadPdf,
            status: 'ok',
          };

          log.push(logEntry);
          processedSlugs.add(doc.slug);
          processed++;

          console.log(`  [${processed + skipped}/${docs.length}] OK: ${doc.slug}${hadPdf ? ' (PDF lu)' : ''}`);
          return logEntry;

        } catch (err) {
          failed++;
          const errorEntry = {
            slug: doc.slug,
            title: doc.title,
            error: err.message,
            timestamp: new Date().toISOString(),
          };
          errors.push(errorEntry);
          console.error(`  [ERROR] ${doc.slug}: ${err.message}`);
          return errorEntry;
        }
      })
    );

    // Sauvegarder les logs après chaque batch
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    fs.writeFileSync(ERROR_FILE, JSON.stringify(errors, null, 2));

    if (i + BATCH_SIZE < docs.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log('');
  console.log('=== Terminé ===');
  console.log(`Traités: ${processed}`);
  console.log(`Ignorés (déjà faits): ${skipped}`);
  console.log(`Erreurs: ${failed}`);
  console.log(`Log: ${LOG_FILE}`);
  console.log(`Erreurs: ${ERROR_FILE}`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
