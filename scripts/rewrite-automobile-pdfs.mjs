/**
 * Réécriture des descriptions automobile via lecture PDF (R2)
 *
 * Traite 5 documents dont les descriptions sont trop génériques / sans contenu réel :
 * - bombardier-bombardier-outlander-2006
 * - lotus-elan-m100-service-manual-v2
 * - polaris-polaris-850-series-service-manual
 * - suzuki-samurai-service-manual-complete
 * - yamaha-virago-535-manual-gb
 *
 * Usage : node scripts/rewrite-automobile-pdfs.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_PDF_PAGES = 10;   // couverture + sommaire + intro
const DELAY_MS = 8000;      // 8s entre chaque doc (rate limit)

const SLUGS_TO_PROCESS = [
  'bombardier-bombardier-outlander-2006',
  'lotus-elan-m100-service-manual-v2',
  'polaris-polaris-850-series-service-manual',
  'suzuki-samurai-service-manual-complete',
  'yamaha-virago-535-manual-gb',
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function downloadFromR2(filePath) {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: filePath });
  const res = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function truncatePdf(buf, maxPages) {
  const src = await PDFDocument.load(buf);
  if (src.getPageCount() <= maxPages) return buf;
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach(p => dst.addPage(p));
  return Buffer.from(await dst.save());
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PROMPT = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique (manuels de service, guides de réparation).

Lis attentivement les pages du PDF fourni et rédige 3 éléments :

1. **title_fr** : Le titre adapté en français. Les noms de marque, modèle et références NE SE TRADUISENT PAS. Traduis le type de document : "Service Manual" → "Manuel de service", "Parts List" → "Liste des pièces", "User Manual" → "Manuel d'utilisation", etc.

2. **description_fr** : Description en français (150-250 mots) basée UNIQUEMENT sur ce que tu vois dans le PDF. Mentionne les systèmes, chapitres ou sections visibles. Adapte le vocabulaire au domaine (moto, auto, quad, etc.).

3. **description_en** : La même description en anglais, rédaction originale (pas traduction mot-à-mot).

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document
- Décris UNIQUEMENT ce que tu vois réellement dans le PDF — JAMAIS ce qu'un tel document "devrait" contenir
- Pas de HTML, pas de markdown dans les descriptions
- Ne commence pas par "Ce document..." ou "This document..."
- Si le PDF est illisible ou vide, base-toi STRICTEMENT sur le titre sans inventer

Réponds UNIQUEMENT en JSON sans texte avant/après :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

async function procesDoc(doc) {
  console.log(`\n→ ${doc.slug}`);
  console.log(`  Titre: ${doc.title}`);

  let pdfBuf = null;
  try {
    const raw = await downloadFromR2(doc.file_path);
    console.log(`  PDF: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);
    pdfBuf = await truncatePdf(raw, MAX_PDF_PAGES);
    console.log(`  PDF tronqué à ${MAX_PDF_PAGES} pages max`);
  } catch (err) {
    console.warn(`  [WARN] PDF inaccessible: ${err.message}`);
  }

  const userContent = pdfBuf
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuf.toString('base64') } },
        { type: 'text', text: `Titre original (EN) : ${doc.title}\nMarque : ${doc.brand_name || '—'}\nCatégorie : Automotive\n\n${PROMPT}` },
      ]
    : `Titre original (EN) : ${doc.title}\nMarque : ${doc.brand_name || '—'}\nCatégorie : Automotive\nAucun PDF disponible — base-toi uniquement sur le titre.\n\n${PROMPT}`;

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse Claude non parseable: ' + text.slice(0, 200));

  const result = JSON.parse(match[0]);
  console.log(`  title_fr: ${result.title_fr}`);
  console.log(`  desc FR: ${result.description_fr.slice(0, 80)}...`);

  if (!DRY_RUN) {
    const { error } = await supabase
      .from('documents')
      .update({
        title_fr: result.title_fr,
        description: result.description_en,
        description_fr: result.description_fr,
      })
      .eq('slug', doc.slug);

    if (error) throw new Error(`Supabase: ${error.message}`);
    console.log(`  ✅ Mis à jour en base`);
  } else {
    console.log(`  [DRY-RUN] Pas de mise à jour`);
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`=== Réécriture descriptions automobile (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===`);
console.log(`Docs à traiter : ${SLUGS_TO_PROCESS.length}`);

// Récupérer les docs en base
const { data: docs, error } = await supabase
  .from('documents')
  .select('id, slug, title, file_path, brand:brands(name)')
  .in('slug', SLUGS_TO_PROCESS);

if (error) {
  console.error('Erreur Supabase:', error.message);
  process.exit(1);
}

const docMap = Object.fromEntries(docs.map(d => [d.slug, { ...d, brand_name: d.brand?.name || null }]));

let ok = 0, fail = 0;

for (let i = 0; i < SLUGS_TO_PROCESS.length; i++) {
  const slug = SLUGS_TO_PROCESS[i];
  const doc = docMap[slug];
  if (!doc) {
    console.error(`❌ Slug non trouvé en base : ${slug}`);
    fail++;
    continue;
  }

  try {
    await procesDoc(doc);
    ok++;
  } catch (err) {
    console.error(`❌ ${slug}: ${err.message}`);
    fail++;
  }

  if (i < SLUGS_TO_PROCESS.length - 1) {
    console.log(`  Pause ${DELAY_MS / 1000}s...`);
    await sleep(DELAY_MS);
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
