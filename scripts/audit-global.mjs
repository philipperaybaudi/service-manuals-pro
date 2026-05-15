/**
 * Audit global de toutes les descriptions — toutes catégories, toutes marques.
 *
 * Critères de suspicion :
 *  1. Balises HTML dans les descriptions (<p>, <ul>, <li>, etc.)
 *  2. page_count=0/null avec description longue (>200c)
 *  3. page_count ≤5 avec description longue (>300c)
 *  4. Description FR absente ou vide
 *  5. Description FR identique à EN (non traduite)
 *  6. Description FR très courte (<60c)
 *  7. Description EN très courte (<60c)
 *  8. Langue mélangée : description FR contient des mots anglais typiques
 *  9. Langue mélangée : description EN contient des mots français typiques
 * 10. Mots génériques d'hallucination dans description (comprehensive, step-by-step, etc.)
 *     sur doc à page_count inconnu
 * 11. Slug "schema/scheme/schematic/parts-list" avec description longue (>200c)
 * 12. title_fr absent ou identique au titre EN
 *
 * Usage : node scripts/audit-global.mjs
 * Résultats : scripts/audit-global-results.json + affichage console groupé par catégorie
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Patterns ────────────────────────────────────────────────────────────────
const HTML_RE = /<(p|ul|ol|li|h[1-6]|div|span|br|strong|em|a)\b/i;

const HALLUCINATION_EN = [
  /\bcomprehensive\b/i,
  /\bstep[\s-]by[\s-]step\b/i,
  /\bextensive\b/i,
  /\bindispensable\s+resource\b/i,
  /\bcovers\s+all\s+(major\s+)?systems\b/i,
  /\bdetailed\s+(repair|service)\s+procedures\b/i,
  /\bmaintenance\s+procedures\b/i,
  /\brepair\s+procedures\b/i,
  /\btroubleshooting\s+guide\b/i,
  /\bfactory[\s-]level\b/i,
];

const HALLUCINATION_FR = [
  /\bguide\s+complet\b/i,
  /\bmanuel\s+complet\b/i,
  /\bpas[\s-]à[\s-]pas\b/i,
  /\bindispensable\s+pour\b/i,
  /\bcouvre\s+l.ensemble\b/i,
  /\bprocédures\s+de\s+(réparation|maintenance|entretien)\b/i,
  /\bressource\s+indispensable\b/i,
  /\bdocument(?:ation)?\s+complèt/i,
];

const SCHEMA_SLUG_RE = /schema|scheme|schematic|parts[\-_]list|wiring|circuit[\-_]electr/i;

// Mots anglais typiques qui ne devraient pas apparaître dans une desc FR pure
const EN_WORDS_IN_FR = /\b(the|this|manual|covers|provides|includes|features|designed|for|and|with|all|system|service|repair|maintenance|workshop|complete|guide)\b/i;
// Mots français typiques qui ne devraient pas apparaître dans une desc EN pure
const FR_WORDS_IN_EN = /\b(le|la|les|des|du|de|un|une|pour|avec|dans|sur|ce|cet|cette|ces|et|ou|par|en|au|aux|qui|que|dont|où)\b/;

function isSuspect(doc) {
  const reasons = [];
  const descEN  = doc.description    || '';
  const descFR  = doc.description_fr || '';
  const lenEN   = descEN.length;
  const lenFR   = descFR.length;
  const pages   = doc.page_count || 0;

  // 1. HTML dans les descriptions
  if (HTML_RE.test(descEN)) reasons.push('HTML dans description EN');
  if (HTML_RE.test(descFR)) reasons.push('HTML dans description FR');

  // 2. page_count=0/null + description longue
  if (pages === 0 && (lenEN > 200 || lenFR > 200)) {
    reasons.push(`page_count inconnu avec description longue (EN:${lenEN}c / FR:${lenFR}c)`);
  }

  // 3. Peu de pages + description longue
  if (pages > 0 && pages <= 5 && (lenEN > 300 || lenFR > 300)) {
    reasons.push(`Peu de pages (${pages}) avec description longue`);
  }

  // 4. description_fr absente
  if (!descFR || descFR.trim() === '') {
    reasons.push('description_fr absente');
  }

  // 5. description_fr identique à EN
  if (descFR && descEN && descFR.trim() === descEN.trim()) {
    reasons.push('description_fr identique à EN');
  }

  // 6. description_fr trop courte
  if (descFR && descFR.trim().length > 0 && descFR.trim().length < 60) {
    reasons.push(`description_fr trop courte (${descFR.trim().length}c)`);
  }

  // 7. description EN trop courte
  if (descEN && descEN.trim().length > 0 && descEN.trim().length < 60) {
    reasons.push(`description EN trop courte (${descEN.trim().length}c)`);
  }

  // 8. Langue mélangée : mots anglais dans description FR
  if (descFR && descFR.length > 80) {
    // Cherche au moins 4 mots-clés anglais typiques dans la description FR
    const enMatches = descFR.match(new RegExp('\\b(the|this|manual|covers|provides|includes|features|designed|for|complete|guide|service|repair|workshop)\\b', 'gi'));
    if (enMatches && enMatches.length >= 4) {
      reasons.push(`Langue mélangée : description FR contient ${enMatches.length} mots anglais`);
    }
  }

  // 9. Langue mélangée : mots français dans description EN
  if (descEN && descEN.length > 80) {
    const frMatches = descEN.match(new RegExp('\\b(le|la|les|des|du|pour|avec|dans|sur|et|ou|par|qui|que|ce|cet|cette|ces|un|une|au|aux)\\b', 'gi'));
    if (frMatches && frMatches.length >= 4) {
      reasons.push(`Langue mélangée : description EN contient ${frMatches.length} mots français`);
    }
  }

  // 10. Mots génériques d'hallucination (sur doc page_count=0)
  if (pages === 0) {
    const hitsEN = HALLUCINATION_EN.filter(p => p.test(descEN));
    const hitsFR = HALLUCINATION_FR.filter(p => p.test(descFR));
    if (hitsEN.length >= 2) {
      reasons.push(`Hallucinations potentielles EN (${hitsEN.length} patterns)`);
    }
    if (hitsFR.length >= 2) {
      reasons.push(`Hallucinations potentielles FR (${hitsFR.length} patterns)`);
    }
  }

  // 11. Slug schéma avec description longue
  if (SCHEMA_SLUG_RE.test(doc.slug) && (lenEN > 200 || lenFR > 200)) {
    reasons.push(`Slug schéma/schema mais description longue`);
  }

  // 12. title_fr absent ou identique au titre EN
  if (!doc.title_fr || doc.title_fr.trim() === '') {
    reasons.push('title_fr absent');
  } else if (doc.title_fr.trim() === doc.title.trim()) {
    reasons.push('title_fr identique au titre EN');
  }

  return reasons;
}

// ─── Récupération des données ─────────────────────────────────────────────────
console.log('Connexion à Supabase...');

// Toutes les catégories
const { data: categories } = await supabase
  .from('categories')
  .select('id, name, slug')
  .order('name');

console.log(`${categories.length} catégories trouvées.\n`);

// Tous les documents avec catégorie et marque
let allDocs = [];
let from = 0;
const PAGE_SIZE = 1000;

while (true) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id, slug, title, title_fr, description, description_fr,
      page_count, active, price, created_at,
      category:categories(id, name, slug),
      brand:brands(name)
    `)
    .eq('active', true)
    .order('slug')
    .range(from, from + PAGE_SIZE - 1);

  if (error) { console.error('Erreur:', error.message); process.exit(1); }
  allDocs = allDocs.concat(data);
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

console.log(`Total documents actifs : ${allDocs.length}`);

// ─── Analyse ──────────────────────────────────────────────────────────────────
const results = allDocs.map(doc => {
  const reasons = isSuspect(doc);
  return {
    slug:              doc.slug,
    title:             doc.title,
    title_fr:          doc.title_fr,
    brand:             doc.brand?.name || '—',
    category_slug:     doc.category?.slug || '—',
    category_name:     doc.category?.name || '—',
    page_count:        doc.page_count,
    created_at:        doc.created_at,
    desc_en_len:       (doc.description || '').length,
    desc_fr_len:       (doc.description_fr || '').length,
    desc_en_preview:   (doc.description || '').slice(0, 120).replace(/\n/g, ' '),
    desc_fr_preview:   (doc.description_fr || '').slice(0, 120).replace(/\n/g, ' '),
    suspect:           reasons.length > 0,
    reasons,
  };
});

const suspects = results.filter(r => r.suspect);
const clean    = results.filter(r => !r.suspect);

// ─── Groupement par catégorie ─────────────────────────────────────────────────
const byCat = {};
for (const s of suspects) {
  const key = s.category_name;
  if (!byCat[key]) byCat[key] = [];
  byCat[key].push(s);
}

// ─── Affichage ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log(`RÉSUMÉ GLOBAL : ${results.length} docs analysés`);
console.log(`  Suspects : ${suspects.length}`);
console.log(`  Propres  : ${clean.length}`);
console.log('═'.repeat(70));

// ─── Répartition par date de création ────────────────────────────────────────
const byDate = {};
for (const s of suspects) {
  const day = s.created_at ? s.created_at.slice(0, 10) : 'inconnu';
  byDate[day] = (byDate[day] || 0) + 1;
}
console.log('\n── Suspects par date de création ──');
for (const [day, count] of Object.entries(byDate).sort()) {
  console.log(`  ${day} : ${count} suspect(s)`);
}

const catsSorted = Object.entries(byCat).sort(([, a], [, b]) => b.length - a.length);

for (const [catName, docs] of catsSorted) {
  console.log(`\n▶ ${catName} — ${docs.length} suspect(s)`);
  console.log('  ' + '─'.repeat(60));
  for (const doc of docs) {
    console.log(`\n  [${doc.brand}] ${doc.slug}`);
    console.log(`    Titre    : ${doc.title}`);
    console.log(`    Pages    : ${doc.page_count ?? 'inconnu'}`);
    console.log(`    Créé le  : ${doc.created_at ? doc.created_at.slice(0, 10) : '?'}`);
    for (const r of doc.reasons) {
      console.log(`    ⚠ ${r}`);
    }
    if (doc.desc_en_preview) {
      console.log(`    EN : "${doc.desc_en_preview}${doc.desc_en_len > 120 ? '...' : ''}"`);
    }
    if (doc.desc_fr_preview) {
      console.log(`    FR : "${doc.desc_fr_preview}${doc.desc_fr_len > 120 ? '...' : ''}"`);
    }
  }
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────
const output = {
  generated_at:   new Date().toISOString(),
  total_docs:     results.length,
  total_suspects: suspects.length,
  total_clean:    clean.length,
  by_category:    catsSorted.map(([name, docs]) => ({ category: name, count: docs.length, docs })),
  suspects,
};

const outPath = 'scripts/audit-global-results.json';
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\n\nRésultats sauvegardés : ${outPath}`);
