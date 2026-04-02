/**
 * Identify EN docs that don't match any FR product.
 * Uses the FR product data + careful matching.
 * Outputs a report for review before deactivating.
 */

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

async function main() {
  const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));
  const { data: enDocs } = await supabase
    .from('documents')
    .select('id, slug, title, active, brands(name), seo_tags')
    .eq('active', true)
    .order('slug');

  console.log(`Active EN docs: ${enDocs.length}`);
  console.log(`FR products: ${frProducts.length}\n`);

  // For each EN doc, find its best FR match
  const enMatched = new Map(); // enId → frSlug
  const frMatched = new Map(); // frSlug → [enIds]

  // Build FR token index
  const frIndex = frProducts.map(p => ({
    ...p,
    tokens: tokenize((p.title || '') + ' ' + p.slug),
  }));

  for (const en of enDocs) {
    // Skip bundles (they're already managed)
    if (en.seo_tags?.some(t => t === 'bundle' || t.startsWith('file:'))) {
      enMatched.set(en.id, 'BUNDLE');
      continue;
    }

    const enTokens = tokenize(en.title + ' ' + en.slug);
    const brand = en.brands?.name || '';

    let bestMatch = null;
    let bestScore = 0;

    for (const fr of frIndex) {
      // Score
      const enSet = new Set(enTokens);
      const overlap = fr.tokens.filter(t => enSet.has(t)).length;
      const score = overlap / Math.max(fr.tokens.length, enTokens.length);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = fr;
      }
    }

    if (bestScore >= 0.25) {
      enMatched.set(en.id, bestMatch.slug);
      if (!frMatched.has(bestMatch.slug)) frMatched.set(bestMatch.slug, []);
      frMatched.get(bestMatch.slug).push(en.slug);
    }
  }

  // Unmatched EN docs
  const unmatched = enDocs.filter(d => !enMatched.has(d.id));

  console.log(`Matched: ${enMatched.size}`);
  console.log(`Unmatched: ${unmatched.length}\n`);

  // Group unmatched by brand
  const byBrand = {};
  unmatched.forEach(d => {
    const brand = d.brands?.name || 'UNKNOWN';
    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push(d);
  });

  console.log('=== UNMATCHED EN DOCS (candidates for deactivation) ===\n');
  Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length).forEach(([brand, docs]) => {
    console.log(`${brand} (${docs.length}):`);
    docs.forEach(d => console.log(`  - ${d.slug} | ${d.title}`));
    console.log();
  });

  // Show FR products with multiple EN matches (potential bundles needed)
  console.log('\n=== FR PRODUCTS WITH MULTIPLE EN MATCHES (need bundling) ===\n');
  for (const [frSlug, enSlugs] of frMatched.entries()) {
    if (enSlugs.length > 1) {
      console.log(`${frSlug} → ${enSlugs.length} EN docs:`);
      enSlugs.forEach(s => console.log(`  - ${s}`));
      console.log();
    }
  }
}

main().catch(console.error);
