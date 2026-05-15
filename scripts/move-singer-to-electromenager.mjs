/**
 * Déplace 8 docs Singer de "Bricolage & DIY" vers "Électroménager".
 * Conserve uniquement "Tutoriel de réparation des machines à coudre" dans Bricolage.
 *
 * Usage : node scripts/move-singer-to-electromenager.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Slug du doc à CONSERVER dans Bricolage & DIY
const KEEP_SLUG = 'singer-tutoriel-de-reparation-des-machines-a-coudre';

// ─── 1. Trouver les catégories ────────────────────────────────────────────────
const { data: categories } = await supabase
  .from('categories')
  .select('id, name, slug');

const catBricolage      = categories.find(c => c.slug === 'diy-home-improvement');
const catElectromenager = categories.find(c => c.slug === 'home-appliances');

if (!catBricolage || !catElectromenager) {
  console.error('❌ Catégories introuvables. Catégories disponibles :');
  categories.forEach(c => console.log(`  ${c.slug} — ${c.name}`));
  process.exit(1);
}

console.log(`\n=== Déplacement Singer Bricolage → Électroménager (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===`);
console.log(`\nCatégorie source      : ${catBricolage.name} (${catBricolage.id})`);
console.log(`Catégorie destination : ${catElectromenager.name} (${catElectromenager.id})`);

// ─── 2. Trouver la marque Singer dans Bricolage ───────────────────────────────
const { data: singerBricolage } = await supabase
  .from('brands')
  .select('id, name, slug')
  .eq('category_id', catBricolage.id)
  .ilike('name', '%singer%')
  .single();

if (!singerBricolage) {
  console.error('❌ Marque Singer introuvable dans Bricolage & DIY');
  process.exit(1);
}
console.log(`\nSinger Bricolage : id=${singerBricolage.id}, slug=${singerBricolage.slug}`);

// ─── 3. Lister tous les docs Singer/Bricolage ─────────────────────────────────
const { data: allDocs } = await supabase
  .from('documents')
  .select('id, slug, title, title_fr')
  .eq('brand_id', singerBricolage.id)
  .order('title');

console.log(`\n${allDocs.length} docs trouvés dans Singer/Bricolage :`);
allDocs.forEach(d => {
  const keep = d.slug === KEEP_SLUG || d.title_fr?.toLowerCase().includes('tutoriel');
  console.log(`  ${keep ? '🔒 GARDE' : '→ DÉPLACE'} ${d.slug}`);
  console.log(`          ${d.title_fr || d.title}`);
});

// Séparer : garder vs déplacer
const toKeep = allDocs.filter(d =>
  d.slug === KEEP_SLUG || d.title_fr?.toLowerCase().includes('tutoriel')
);
const toMove = allDocs.filter(d =>
  d.slug !== KEEP_SLUG && !d.title_fr?.toLowerCase().includes('tutoriel')
);

console.log(`\n→ À garder dans Bricolage : ${toKeep.length}`);
console.log(`→ À déplacer vers Électroménager : ${toMove.length}`);

if (toMove.length === 0) {
  console.log('\nRien à déplacer.');
  process.exit(0);
}

// ─── 4. Trouver ou créer Singer dans Électroménager ──────────────────────────
const { data: singerElec } = await supabase
  .from('brands')
  .select('id, name, slug')
  .eq('category_id', catElectromenager.id)
  .ilike('name', '%singer%')
  .maybeSingle();

let singerElecId;

if (singerElec) {
  console.log(`\nSinger Électroménager : id=${singerElec.id} (existant)`);
  singerElecId = singerElec.id;
} else {
  console.log(`\nSinger Électroménager : à créer`);
  if (!DRY_RUN) {
    const { data: newBrand, error } = await supabase
      .from('brands')
      .insert({ name: 'Singer', slug: 'singer-electromenager', category_id: catElectromenager.id })
      .select('id')
      .single();
    if (error) { console.error(`❌ Création marque : ${error.message}`); process.exit(1); }
    singerElecId = newBrand.id;
    console.log(`  ✅ Créée (id: ${singerElecId})`);
  } else {
    singerElecId = 'dry-run-new-id';
  }
}

// ─── 5. Déplacer les docs ─────────────────────────────────────────────────────
console.log(`\n→ Déplacement des ${toMove.length} docs...`);

for (const doc of toMove) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] ${doc.slug}`);
    continue;
  }

  const { error } = await supabase
    .from('documents')
    .update({ brand_id: singerElecId, category_id: catElectromenager.id })
    .eq('id', doc.id);

  if (error) {
    console.error(`  ❌ ${doc.slug} : ${error.message}`);
  } else {
    console.log(`  ✅ ${doc.slug}`);
  }
}

console.log(`\n=== Terminé ${DRY_RUN ? '(DRY-RUN)' : '✅'} ===`);
