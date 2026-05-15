/**
 * Filtre les résultats d'audit par date de création.
 * - POST-LOT-1 : created_at >= 2026-04-18 (tous corrigibles)
 * - LOT-1 GRAVES : created_at <= 2026-04-12 avec HTML dans les descriptions
 *
 * Usage : node scripts/audit-filter-dates.mjs
 */

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/audit-global-results.json', 'utf8'));
const suspects = data.suspects;

// ── Post-Lot-1 : tous les suspects importés après le lot 1 ────────────────────
const postLot1 = suspects.filter(s => s.created_at >= '2026-04-18');

// ── Lot 1 graves : HTML dans description (affichage cassé) ───────────────────
// Exclure Camera Craftsman (protégés)
const lot1Html = suspects.filter(s =>
  s.created_at <= '2026-04-12' &&
  s.reasons.some(r => r.includes('HTML')) &&
  !s.slug.includes('camera-craftsman')
);

// ── Affichage ─────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log(`POST-LOT-1 — ${postLot1.length} docs (tous corrigibles)`);
console.log('═'.repeat(70));
for (const s of postLot1) {
  console.log(`\n  ${s.created_at.slice(0, 10)}  [${s.category_name}] ${s.slug}`);
  for (const r of s.reasons) {
    console.log(`    ⚠ ${r}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log(`LOT 1 GRAVES (HTML) — ${lot1Html.length} docs à corriger avant de refermer le lot`);
console.log('═'.repeat(70));
for (const s of lot1Html) {
  console.log(`\n  ${s.created_at.slice(0, 10)}  [${s.category_name}] ${s.slug}`);
  console.log(`    Titre : ${s.title}`);
  for (const r of s.reasons) {
    console.log(`    ⚠ ${r}`);
  }
  if (s.desc_en_preview) console.log(`    EN : "${s.desc_en_preview.slice(0, 80)}"`);
}

// ── Sauvegarde ────────────────────────────────────────────────────────────────
const output = {
  generated_at: new Date().toISOString(),
  post_lot1: { count: postLot1.length, docs: postLot1 },
  lot1_graves_html: { count: lot1Html.length, docs: lot1Html },
};
fs.writeFileSync('scripts/audit-filter-dates-results.json', JSON.stringify(output, null, 2), 'utf8');
console.log('\nRésultats sauvegardés : scripts/audit-filter-dates-results.json');
