/**
 * Correction des 13 docs Lot 1 avec HTML dans les descriptions (problème grave).
 * Ces docs ont tous des descriptions boilerplate HTML de l'ancienne méthode d'import.
 * Le script lit chaque PDF depuis R2, génère une vraie description via Claude API,
 * et met à jour la base (description EN, description FR, title_fr, page_count).
 *
 * PROTÉGÉS (NE PAS TOUCHER) :
 *   collection-antique-trader-cameras-price-guide-complete
 *   collection-classic-cameras-by-colin-harding
 *   collection-mckeowns-price-guide-complete
 *   collection-russian-and-soviet-cameras-1840-1991
 *
 * Usage : node scripts/fix-lot1-html-graves.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';

const DRY_RUN   = process.argv.includes('--dry-run');
const MAX_PAGES = 10;
const DELAY_MS  = 8000;

// Overrides par slug
const SLUG_MAX_PAGES = {
  'nikon-service-manual-nikon-f3': 30, // premières pages = accessoire AF Finder DX-1, besoin de voir plus
};
const SLUG_TITLE_FR_OVERRIDE = {
  'nikon-service-manual-nikon-f3': 'Nikon F3 Manuel de réparation',
};

const SLUGS = [
  // Automotive
  'polaris-400-500-service-manual-complete',
  // Home Appliances
  'radiateur-calidou-depannage-thermostat-noirot-airelec-acova',
  'rowenta-rh8771-air-force-extreme',
  // Audio & HiFi
  'studer-revox-revox-b77-mki-mkii-manuel',
  'nagra-nagra-ares-lb',
  'nagra-nagra-iv-models',
  // Television
  'vestel-manuel-vestel',
  // Photography
  'rollei-rolleiflex-2-8f-methode-de-reparation',
  'flash-photo-repa-maintenance-flashs-electroniques',
  'hasselbald-tele-hd',
  'nikon-demontage-et-reparation-du-zoom-nikkor-af-24-50-f3-3-4-5',
  // nikon-service-manual-nikon-f3 : exclu — les 30 premières pages couvrent uniquement
  // l'accessoire AF Finder DX-1, pas le corps F3. À traiter manuellement.
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
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function downloadFromR2(filePath) {
  const res = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: filePath }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function truncatePdf(buf, maxPages) {
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();
  if (total <= maxPages) return { buf, total };
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach(p => dst.addPage(p));
  return { buf: Buffer.from(await dst.save()), total };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PROMPT = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique.

Lis attentivement les pages du PDF fourni et rédige :

1. **title_fr** : Titre en français. Les noms de marque et de modèle NE SE TRADUISENT PAS. Traduis le type de document : "Service Manual" → "Manuel de service", "User Manual" → "Manuel d'utilisation", "Repair Manual" → "Manuel de réparation", "Troubleshooting Manual" → "Manuel de dépannage", "Parts List" → "Liste des pièces détachées", etc.

2. **description_fr** : Description en français (150-250 mots) basée UNIQUEMENT sur ce que tu vois dans le PDF. Mentionne les systèmes, chapitres ou sections visibles.

3. **description_en** : La même description en anglais, rédaction originale (pas traduction mot-à-mot).

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document
- Décris UNIQUEMENT ce que tu vois réellement dans le PDF — JAMAIS ce qu'un tel document "devrait" contenir
- Pas de HTML, pas de markdown dans les descriptions
- Ne commence pas par "Ce document..." ou "This document..."
- Si le PDF est illisible ou vide, base-toi STRICTEMENT sur le titre sans inventer

Réponds UNIQUEMENT en JSON :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

async function processDoc(doc) {
  console.log(`\n→ [${doc.category_name}] ${doc.slug}`);
  console.log(`  Titre : ${doc.title}`);
  console.log(`  title_fr actuel : ${doc.title_fr || '(absent)'}`);

  // Télécharger le PDF depuis R2
  let pdfBuf = null;
  let pageCount = doc.page_count || null;

  const maxPages = SLUG_MAX_PAGES[doc.slug] || MAX_PAGES;
  try {
    const raw = await downloadFromR2(doc.file_path);
    console.log(`  PDF : ${(raw.length / 1024 / 1024).toFixed(1)} MB`);
    const { buf, total } = await truncatePdf(raw, maxPages);
    pdfBuf = buf;
    pageCount = total;
    console.log(`  Pages : ${total} (envoi des ${Math.min(maxPages, total)} premières)`);
  } catch (err) {
    console.warn(`  [WARN] PDF inaccessible depuis R2 : ${err.message}`);
  }

  const userContent = pdfBuf
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuf.toString('base64') } },
        { type: 'text', text: `Titre original : ${doc.title}\nMarque : ${doc.brand_name || '—'}\nCatégorie : ${doc.category_name}\n\n${PROMPT}` },
      ]
    : `Titre original : ${doc.title}\nMarque : ${doc.brand_name || '—'}\nCatégorie : ${doc.category_name}\nAucun PDF disponible — base-toi uniquement sur le titre.\n\n${PROMPT}`;

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Réponse Claude non parseable : ' + text.slice(0, 200));

  const result = JSON.parse(match[0]);
  // Correction : préserver les décimales dans les références modèles (2,8F → 2.8F)
  result.title_fr = result.title_fr.replace(/(\d),(\d)/g, '$1.$2');
  console.log(`  title_fr → ${result.title_fr}`);
  console.log(`  desc FR  → ${result.description_fr.slice(0, 80)}...`);

  if (!DRY_RUN) {
    const update = {
      title_fr:       SLUG_TITLE_FR_OVERRIDE[doc.slug] || result.title_fr,
      description:    result.description_en,
      description_fr: result.description_fr,
    };
    if (pageCount) update.page_count = pageCount;

    const { error } = await supabase
      .from('documents')
      .update(update)
      .eq('slug', doc.slug);

    if (error) throw new Error(`Supabase : ${error.message}`);
    console.log(`  ✅ Mis à jour`);
  } else {
    console.log(`  [DRY-RUN] Aucune modification`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Fix Lot 1 HTML graves (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) — ${SLUGS.length} docs ===\n`);

const { data: docs, error } = await supabase
  .from('documents')
  .select(`
    id, slug, title, title_fr, file_path, page_count,
    category:categories(name),
    brand:brands(name)
  `)
  .in('slug', SLUGS);

if (error) { console.error('Erreur Supabase :', error.message); process.exit(1); }

const docMap = Object.fromEntries(docs.map(d => [d.slug, {
  ...d,
  category_name: d.category?.name || '—',
  brand_name:    d.brand?.name    || null,
}]));

let ok = 0, fail = 0;

for (let i = 0; i < SLUGS.length; i++) {
  const slug = SLUGS[i];
  const doc  = docMap[slug];
  if (!doc) {
    console.error(`❌ Slug non trouvé en base : ${slug}`);
    fail++;
    continue;
  }

  try {
    await processDoc(doc);
    ok++;
  } catch (err) {
    console.error(`❌ ${slug} : ${err.message}`);
    fail++;
  }

  if (i < SLUGS.length - 1) {
    console.log(`  Pause ${DELAY_MS / 1000}s...`);
    await sleep(DELAY_MS);
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
