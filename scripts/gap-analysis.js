/**
 * Gap Analysis: Compare FR products (302) vs EN active docs (253)
 * Find which FR products have no EN equivalent and vice versa.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STOP_WORDS = new Set([
  'de', 'du', 'la', 'le', 'les', 'des', 'un', 'une', 'et', 'en', 'a', 'au',
  'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'ce', 'cette', 'ces',
  'the', 'an', 'and', 'or', 'for', 'in', 'on', 'of', 'to', 'with',
  'is', 'are', 'was', 'not', 'be', 'has', 'have', 'had',
  'manuel', 'manual', 'notice', 'mode', 'emploi', 'service',
  'reparation', 'repair', 'depannage', 'troubleshooting',
  'atelier', 'workshop', 'technique', 'technical',
  'produit', 'product', 'documentation', 'tutoriel', 'tutorial',
  'guide', 'user', 'owner', 'complete', 'complet',
  'hd', 'bd', 'fr', 'gb', 'pdf',
]);

function tokenize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function matchScore(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const overlap = tokensB.filter(t => setA.has(t)).length;
  return overlap / Math.max(tokensA.length, tokensB.length, 1);
}

async function main() {
  // Load FR products
  const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));

  // Load ALL EN docs (active and inactive)
  const { data: allEnDocs } = await supabase
    .from('documents')
    .select('id, slug, title, active, brands(name), seo_tags, file_path, file_size, price')
    .order('slug');

  const activeEnDocs = allEnDocs.filter(d => d.active);
  const inactiveEnDocs = allEnDocs.filter(d => !d.active);

  console.log(`=== GAP ANALYSIS ===`);
  console.log(`FR products: ${frProducts.length}`);
  console.log(`EN active docs: ${activeEnDocs.length}`);
  console.log(`EN inactive docs: ${inactiveEnDocs.length}`);
  console.log(`Gap: ${frProducts.length - activeEnDocs.length}\n`);

  // Tokenize all
  const frTokenized = frProducts.map(p => ({
    ...p,
    tokens: tokenize((p.title || '') + ' ' + p.slug),
  }));

  const enTokenized = activeEnDocs.map(d => ({
    ...d,
    brandName: d.brands?.name || '',
    tokens: tokenize((d.title || '') + ' ' + d.slug),
  }));

  // For each FR product, find best EN match
  const frMatched = new Map();   // frSlug → { enDoc, score }
  const enUsed = new Set();      // enIds already matched

  for (const fr of frTokenized) {
    let bestMatch = null;
    let bestScore = 0;

    for (const en of enTokenized) {
      const score = matchScore(fr.tokens, en.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = en;
      }
    }

    if (bestScore >= 0.25) {
      frMatched.set(fr.slug, { enDoc: bestMatch, score: bestScore });
      enUsed.add(bestMatch.id);
    }
  }

  // FR products with NO EN match
  const unmatchedFr = frTokenized.filter(p => !frMatched.has(p.slug));

  // EN docs matched to NO FR product
  const unmatchedEn = enTokenized.filter(d => !enUsed.has(d.id));

  // Also check if unmatched FR products have inactive EN docs
  const inactiveTokenized = inactiveEnDocs.map(d => ({
    ...d,
    brandName: d.brands?.name || '',
    tokens: tokenize((d.title || '') + ' ' + d.slug),
  }));

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  UNMATCHED FR PRODUCTS (${unmatchedFr.length}) - No active EN equivalent`);
  console.log(`${'='.repeat(80)}\n`);

  // Group by category for readability
  for (const fr of unmatchedFr) {
    const frUrl = fr.url;

    // Check if there's an inactive EN doc that could match
    let inactiveMatch = null;
    let inactiveBestScore = 0;
    for (const en of inactiveTokenized) {
      const score = matchScore(fr.tokens, en.tokens);
      if (score > inactiveBestScore) {
        inactiveBestScore = score;
        inactiveMatch = en;
      }
    }

    console.log(`FR: ${fr.title || fr.slug}`);
    console.log(`    ${frUrl}`);
    console.log(`    Price: ${fr.price}€`);
    if (inactiveBestScore >= 0.20) {
      console.log(`    ⚡ Possible inactive EN match (score ${inactiveBestScore.toFixed(2)}): ${inactiveMatch.slug}`);
      console.log(`       Title: ${inactiveMatch.title}`);
    }
    console.log();
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  ACTIVE EN DOCS WITH NO FR MATCH (${unmatchedEn.length})`);
  console.log(`${'='.repeat(80)}\n`);

  for (const en of unmatchedEn) {
    console.log(`EN: ${en.title}`);
    console.log(`    Slug: ${en.slug}`);
    console.log(`    Brand: ${en.brandName}`);
    console.log(`    URL: https://service-manuals-pro.com/docs/${en.slug}`);
    console.log();
  }

  // Summary of FR products matched to the SAME EN doc (many-to-one)
  const enMatchCount = {};
  for (const [frSlug, match] of frMatched.entries()) {
    const enSlug = match.enDoc.slug;
    if (!enMatchCount[enSlug]) enMatchCount[enSlug] = [];
    enMatchCount[enSlug].push(frSlug);
  }

  const multiMatched = Object.entries(enMatchCount).filter(([_, frs]) => frs.length > 1);
  if (multiMatched.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`  EN DOCS MATCHED TO MULTIPLE FR PRODUCTS (${multiMatched.length})`);
    console.log(`${'='.repeat(80)}\n`);

    for (const [enSlug, frSlugs] of multiMatched) {
      const enDoc = activeEnDocs.find(d => d.slug === enSlug);
      console.log(`EN: ${enDoc?.title || enSlug}`);
      console.log(`    Slug: ${enSlug}`);
      console.log(`    Matched to ${frSlugs.length} FR products:`);
      for (const frSlug of frSlugs) {
        const fr = frProducts.find(p => p.slug === frSlug);
        console.log(`      - ${fr?.title || frSlug}`);
        console.log(`        ${fr?.url || ''}`);
      }
      console.log();
    }
  }

  // Check bundle status
  const bundledDocs = activeEnDocs.filter(d => d.seo_tags?.includes('bundle'));
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  BUNDLE STATUS`);
  console.log(`${'='.repeat(80)}`);
  console.log(`  Active bundled docs: ${bundledDocs.length}`);
  for (const b of bundledDocs) {
    const fileCount = (b.seo_tags || []).filter(t => t.startsWith('file:')).length;
    console.log(`    ${b.slug} (${fileCount} files)`);
  }
}

main().catch(console.error);
