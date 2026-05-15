/**
 * Audit des descriptions de la catégorie Automobile
 * Détecte les hallucinations potentielles dans les descriptions.
 *
 * Critères de suspicion :
 *   1. Peu de pages (≤5) + description longue (>300 caractères)
 *   2. Slug contenant "schema", "scheme", "parts-list", "wiring", "circuit" avec description longue
 *   3. Description EN ou FR qui mentionne des équipements/chapitres impossibles pour un doc court
 *   4. Description FR absente ou identique à EN (non traduite)
 *   5. Description contenant des termes génériques suspects ("comprehensive", "detailed", "complete")
 *      sur un doc de ≤3 pages
 *
 * Usage : node scripts/audit-automobile.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Patterns suspects dans les descriptions ──────────────────────────────────
const SUSPECT_PATTERNS_EN = [
  /\bchapter(s)?\b/i,
  /\bsection(s)?\b/i,
  /\bcomprehensive\b/i,
  /\bdetailed\s+(guide|manual|coverage|instructions)\b/i,
  /\bcovers\s+all\b/i,
  /\bstep[\s-]by[\s-]step\b/i,
  /\bcomplete\s+(guide|manual|service)\b/i,
  /\bextensive\b/i,
  /\btroubleshooting\s+guide\b/i,
  /\bmaintenance\s+procedures\b/i,
  /\brepair\s+procedures\b/i,
  /includes\s+diagrams/i,
  /includes\s+illustrations/i,
];

const SUSPECT_PATTERNS_FR = [
  /\bchapitre(s)?\b/i,
  /\bguide\s+complet\b/i,
  /\bmanuel\s+complet\b/i,
  /\bpas[\s-]à[\s-]pas\b/i,
  /\bdétaillé\b/i,
  /\bcouvre\s+tous\b/i,
  /\bprocédures\s+de\s+(réparation|maintenance|entretien)\b/i,
  /\bcomplet\s+avec\s+(schémas|illustrations|diagrammes)\b/i,
  /\bguide\s+de\s+dépannage\b/i,
];

// Slugs patterns qui indiquent souvent des docs courts (schémas, listes de pièces)
const SHORT_DOC_SLUG_PATTERNS = [
  /schema/i,
  /scheme/i,
  /parts[\-_]list/i,
  /wiring/i,
  /circuit[\-_]electr/i,
  /electrique/i,
  /climatisa/i,
  /transmission/i,
  /garnissage/i,
  /sellerie/i,
];

function isSuspect(doc) {
  const reasons = [];
  const descLen = (doc.description || '').length;
  const descFrLen = (doc.description_fr || '').length;
  const pages = doc.page_count || 0;

  // Critère 1 : peu de pages + description longue
  if (pages > 0 && pages <= 5 && (descLen > 300 || descFrLen > 300)) {
    reasons.push(`Peu de pages (${pages}) mais description longue (EN:${descLen}c / FR:${descFrLen}c)`);
  }

  // Critère 2 : slug de doc court + description longue
  const isShortDocSlug = SHORT_DOC_SLUG_PATTERNS.some(p => p.test(doc.slug));
  if (isShortDocSlug && (descLen > 250 || descFrLen > 250)) {
    reasons.push(`Slug suggère doc court/schéma mais description longue (EN:${descLen}c / FR:${descFrLen}c)`);
  }

  // Critère 3 : patterns suspects EN sur doc court
  if (pages > 0 && pages <= 10 && doc.description) {
    const hits = SUSPECT_PATTERNS_EN.filter(p => p.test(doc.description));
    if (hits.length > 0) {
      reasons.push(`Patterns suspects EN sur doc court (${pages}p): ${hits.map(p => p.source).join(', ')}`);
    }
  }

  // Critère 4 : patterns suspects FR sur doc court
  if (pages > 0 && pages <= 10 && doc.description_fr) {
    const hits = SUSPECT_PATTERNS_FR.filter(p => p.test(doc.description_fr));
    if (hits.length > 0) {
      reasons.push(`Patterns suspects FR sur doc court (${pages}p): ${hits.map(p => p.source).join(', ')}`);
    }
  }

  // Critère 5 : description_fr absente
  if (!doc.description_fr || doc.description_fr.trim() === '') {
    reasons.push('description_fr absente');
  }

  // Critère 6 : description_fr identique à description EN (non traduite)
  if (doc.description_fr && doc.description && doc.description_fr.trim() === doc.description.trim()) {
    reasons.push('description_fr identique à EN (non traduite)');
  }

  // Critère 7 : page_count = 0 ou null avec une description détaillée
  if ((pages === 0 || pages === null) && (descLen > 200 || descFrLen > 200)) {
    reasons.push(`page_count inconnu (${pages}) avec description longue`);
  }

  return reasons;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('Connexion à Supabase...');

// Récupérer l'ID de la catégorie automotive
const { data: category, error: catError } = await supabase
  .from('categories')
  .select('id, name, slug')
  .eq('slug', 'automotive')
  .single();

if (catError || !category) {
  console.error('Catégorie "automotive" introuvable:', catError?.message);
  // Essayer "automobile"
  const { data: cat2, error: err2 } = await supabase
    .from('categories')
    .select('id, name, slug')
    .ilike('slug', '%auto%');
  if (cat2 && cat2.length > 0) {
    console.log('Catégories trouvées avec "auto":', cat2.map(c => `${c.slug} (${c.id})`).join(', '));
  } else {
    console.error('Aucune catégorie auto trouvée:', err2?.message);
  }
  process.exit(1);
}

console.log(`Catégorie trouvée : "${category.name}" (slug: ${category.slug}, id: ${category.id})`);

// Récupérer tous les documents de la catégorie avec pagination
let allDocs = [];
let from = 0;
const PAGE_SIZE = 1000;

while (true) {
  const { data: page, error: pageError } = await supabase
    .from('documents')
    .select('id, slug, title, title_fr, description, description_fr, page_count, active, price')
    .eq('category_id', category.id)
    .range(from, from + PAGE_SIZE - 1)
    .order('slug');

  if (pageError) {
    console.error('Erreur récupération docs:', pageError.message);
    process.exit(1);
  }

  allDocs = allDocs.concat(page);
  console.log(`  Page ${Math.floor(from / PAGE_SIZE) + 1} : ${page.length} docs récupérés`);
  if (page.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

console.log(`\nTotal documents catégorie automotive : ${allDocs.length}`);

// ─── Analyse ──────────────────────────────────────────────────────────────────
const results = allDocs.map(doc => {
  const suspectReasons = isSuspect(doc);
  return {
    slug: doc.slug,
    page_count: doc.page_count,
    active: doc.active,
    price: doc.price,
    title: doc.title,
    title_fr: doc.title_fr,
    description_en_length: (doc.description || '').length,
    description_fr_length: (doc.description_fr || '').length,
    description: doc.description || null,
    description_fr: doc.description_fr || null,
    suspect: suspectReasons.length > 0,
    suspect_reasons: suspectReasons,
  };
});

const suspects = results.filter(r => r.suspect);
const clean = results.filter(r => !r.suspect);

// ─── Statistiques ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`RÉSUMÉ : ${results.length} docs analysés`);
console.log(`  - Suspects (hallucinations potentielles) : ${suspects.length}`);
console.log(`  - Propres                                : ${clean.length}`);
console.log('══════════════════════════════════════════════════════════\n');

if (suspects.length > 0) {
  console.log('SUSPECTS DÉTECTÉS :');
  suspects.forEach((doc, i) => {
    console.log(`\n[${i + 1}] ${doc.slug}`);
    console.log(`    Pages       : ${doc.page_count ?? 'inconnu'}`);
    console.log(`    Titre       : ${doc.title}`);
    console.log(`    Raisons     :`);
    doc.suspect_reasons.forEach(r => console.log(`      - ${r}`));
    if (doc.description) {
      const preview = doc.description.substring(0, 150).replace(/\n/g, ' ');
      console.log(`    Desc EN     : "${preview}${doc.description.length > 150 ? '...' : ''}"`);
    }
    if (doc.description_fr) {
      const preview = doc.description_fr.substring(0, 150).replace(/\n/g, ' ');
      console.log(`    Desc FR     : "${preview}${doc.description_fr.length > 150 ? '...' : ''}"`);
    }
  });
}

// ─── Sauvegarde JSON ──────────────────────────────────────────────────────────
const output = {
  generated_at: new Date().toISOString(),
  category: category,
  total_docs: results.length,
  total_suspects: suspects.length,
  total_clean: clean.length,
  suspects: suspects,
  all_docs: results,
};

const outputPath = 'scripts/audit-automobile-results.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\nRésultats sauvegardés dans : ${outputPath}`);
