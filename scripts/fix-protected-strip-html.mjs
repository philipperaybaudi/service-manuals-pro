/**
 * Supprime les balises HTML des descriptions des 4 documents protégés.
 * Aucun contenu n'est modifié, aucun titre n'est touché.
 * Seule opération : <p>texte</p> → texte (prose propre).
 *
 * Documents protégés traités :
 *   collection-antique-trader-cameras-price-guide-complete
 *   collection-classic-cameras-by-colin-harding
 *   collection-mckeowns-price-guide-complete
 *   collection-russian-and-soviet-cameras-1840-1991
 *
 * Usage : node scripts/fix-protected-strip-html.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

const SLUGS = [
  'collection-antique-trader-cameras-price-guide-complete',
  'collection-classic-cameras-by-colin-harding',
  'collection-mckeowns-price-guide-complete',
  'collection-russian-and-soviet-cameras-1840-1991',
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function stripHtml(str) {
  if (!str) return str;
  return str
    .replace(/<\/p>\s*<p>/gi, ' ')   // </p><p> → espace
    .replace(/<br\s*\/?>/gi, ' ')    // <br> → espace
    .replace(/<[^>]+>/g, '')         // autres balises → supprimées
    .replace(/\s{2,}/g, ' ')         // espaces multiples → un seul
    .trim();
}

// Corrections spécifiques par slug (contenu protégé, ajustements minimaux FR uniquement)
const SPECIAL_FR = {
  'collection-classic-cameras-by-colin-harding': (fr) =>
    fr
      .replace(/^documentation\b/i, 'Documentation')   // majuscule initiale
      .replace(/\bby Colin Harding\b/g, 'par Colin Harding'), // by → par
  'collection-mckeowns-price-guide-complete': (fr) =>
    fr.replace(/^documentation\b/i, 'Documentation'),  // majuscule initiale
};

const { data: docs, error } = await supabase
  .from('documents')
  .select('slug, title, description, description_fr')
  .in('slug', SLUGS);

if (error) { console.error('Erreur Supabase :', error.message); process.exit(1); }

console.log(`\n=== Strip HTML — documents protégés (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===\n`);

let ok = 0, fail = 0;

for (const doc of docs) {
  const newEN = stripHtml(doc.description);
  let newFR = stripHtml(doc.description_fr);
  if (SPECIAL_FR[doc.slug]) newFR = SPECIAL_FR[doc.slug](newFR);

  console.log(`\n[${doc.slug}]`);
  console.log(`  EN avant : ${(doc.description || '').slice(0, 80)}`);
  console.log(`  EN après : ${newEN.slice(0, 80)}`);
  console.log(`  FR avant : ${(doc.description_fr || '').slice(0, 80)}`);
  console.log(`  FR après : ${newFR.slice(0, 80)}`);

  if (!DRY_RUN) {
    const { error: upErr } = await supabase
      .from('documents')
      .update({ description: newEN, description_fr: newFR })
      .eq('slug', doc.slug);

    if (upErr) {
      console.error(`  ❌ ${upErr.message}`);
      fail++;
    } else {
      console.log(`  ✅ Mis à jour`);
      ok++;
    }
  } else {
    console.log(`  [DRY-RUN] Aucune modification`);
    ok++;
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
