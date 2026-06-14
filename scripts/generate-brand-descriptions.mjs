/**
 * generate-brand-descriptions.mjs
 * Génère des descriptions SEO pour les marques via Claude Haiku.
 * Usage : node scripts/generate-brand-descriptions.mjs watchmaking [--dry-run]
 *
 * Options :
 *   --dry-run  Affiche les textes sans écrire en base
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const CATEGORY_SLUG = process.argv[2] || 'watchmaking';
const ONLY_BRAND = process.argv.find(a => a.startsWith('--brand='))?.split('=')[1] ?? null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Marques à ignorer (collections de référence, pas des vraies marques)
const SKIP_SLUGS = new Set([]);

// Noms anglais pour les slugs spéciaux (miroir de getBrandName dans i18n.ts)
const BRAND_NAMES_EN = {
  'ouvrages-de-reference': 'Reference Works',
  'ouvrages-de-reference-watchmaking': 'Reference Works',
  'ouvrages-de-reference-autonomy': 'Reference Works',
  'ouvrages-de-reference-pet': 'Reference Works',
  'ouvrages-de-reference-nature': 'Reference Works',
  'repair-troubleshooting': 'Repair & Troubleshooting',
  'defence-civile': 'CIVIL DEFENSE',
};

const BRAND_NAMES_FR = {
  'ouvrages-de-reference': 'Ouvrages de référence',
  'ouvrages-de-reference-watchmaking': 'Ouvrages de référence',
  'ouvrages-de-reference-autonomy': 'Ouvrages de référence',
  'ouvrages-de-reference-pet': 'Ouvrages de référence',
  'ouvrages-de-reference-nature': 'Ouvrages de référence',
  'repair-troubleshooting': 'Réparation & Dépannage',
};

async function generateDescriptions(brandName, brandNameFr, docTitles, categoryName) {
  const titlesStr = docTitles.slice(0, 15).map(t => `- ${t}`).join('\n');
  const fewDocs = docTitles.length <= 3;

  const prompt = fewDocs
    ? `You are writing concise SEO intro text for a professional technical documentation website specialising in ${categoryName}.

Brand: ${brandName}
Category: ${categoryName}
Available documents (${docTitles.length} total):
${titlesStr}

Write TWO short descriptions (2-3 sentences, max 450 characters each):
1. ENGLISH description focused on ${brandName} as a brand in ${categoryName} — mention the type of documents available and what professional watchmakers will find useful. Keep it broad enough to remain accurate if more documents are added in the future.
2. FRENCH description of the same content — use "${brandNameFr}" (not "${brandName}") as the brand name in the French text.

Format your response EXACTLY like this (no other text):
EN: [english text here]
FR: [french text here]

Rules:
- Base the brand description on what is visible in the document titles
- Do not invent specific calibre numbers or models not visible in the titles
- Write at brand level, not just about the specific documents listed
- Professional, factual tone
- Plain text only, no HTML, no markdown, no quotes`
    : `You are writing concise SEO intro text for a professional technical documentation website specialising in ${categoryName}.

Brand: ${brandName}
Category: ${categoryName}
Available documents (${docTitles.length} total, sample below):
${titlesStr}

Write TWO short descriptions (2-3 sentences, max 450 characters each):
1. ENGLISH description of what technical documents are available — mention specific calibres/models visible in the titles, types of documents (parts lists, service manuals, technical guides, assembly diagrams, specifications).
2. FRENCH translation of the same content.

Format your response EXACTLY like this (no other text):
EN: [english text here]
FR: [french text here]

Rules:
- Only mention what is visible in the document titles above
- Never invent models, features or specifications
- Professional, factual tone
- Plain text only, no HTML, no markdown, no quotes`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  let enText = '';
  let frText = '';

  for (const line of text.split('\n')) {
    if (line.startsWith('EN:')) enText = line.slice(3).trim();
    if (line.startsWith('FR:')) frText = line.slice(3).trim();
  }

  return { en: enText, fr: frText };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n=== Génération descriptions marques — ${CATEGORY_SLUG} ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  // Récupérer la catégorie
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', CATEGORY_SLUG)
    .single();

  if (catErr || !cat) {
    console.error('Catégorie introuvable :', CATEGORY_SLUG);
    process.exit(1);
  }

  console.log(`Catégorie : ${cat.name} (id: ${cat.id})\n`);

  // Récupérer les marques de cette catégorie
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', cat.id)
    .order('name');

  const results = [];
  let skipped = 0;
  let processed = 0;

  for (const brand of brands) {
    if (ONLY_BRAND && brand.slug !== ONLY_BRAND) continue;
    if (SKIP_SLUGS.has(brand.slug)) {
      console.log(`⏭  SKIP : ${brand.name}`);
      skipped++;
      continue;
    }

    // Récupérer les titres des documents
    const { data: docs } = await supabase
      .from('documents')
      .select('title')
      .eq('brand_id', brand.id)
      .eq('category_id', cat.id)
      .eq('active', true)
      .order('title')
      .limit(15);

    if (!docs || docs.length === 0) {
      console.log(`⏭  SKIP (0 docs actifs) : ${brand.name}`);
      skipped++;
      continue;
    }

    const titles = docs.map(d => d.title);
    const brandNameEn = BRAND_NAMES_EN[brand.slug] || brand.name;
    const brandNameFr = BRAND_NAMES_FR[brand.slug] || brand.name;
    process.stdout.write(`⚙  ${brand.name} (${titles.length} docs)... `);

    try {
      const { en, fr } = await generateDescriptions(brandNameEn, brandNameFr, titles, cat.name);

      if (!en || !fr) {
        console.log('⚠ Parsing échoué — skipping');
        continue;
      }

      console.log('✓');
      console.log(`   EN: ${en.substring(0, 100)}...`);
      console.log(`   FR: ${fr.substring(0, 100)}...\n`);

      results.push({ id: brand.id, name: brand.name, slug: brand.slug, description: en, description_fr: fr });

      if (!DRY_RUN) {
        await supabase
          .from('brands')
          .update({ description: en, description_fr: fr })
          .eq('id', brand.id);
      }

      processed++;
      await sleep(300); // éviter rate limit
    } catch (err) {
      console.log(`❌ Erreur : ${err.message}`);
    }
  }

  // Sauvegarder les résultats pour validation
  const outFile = `brand_descriptions_${CATEGORY_SLUG}.json`;
  writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n=== TERMINÉ ===`);
  console.log(`Traités : ${processed} | Ignorés : ${skipped}`);
  console.log(`Résultats sauvegardés : ${outFile}`);
  if (DRY_RUN) console.log('⚠ DRY RUN — aucune écriture en base');
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
