/**
 * Création catégorie "DIY & Home Improvement" (Bricolage & DIY côté FR)
 * + déplacement de la marque Singer depuis Machine Tools vers cette catégorie
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Catégories existantes
const { data: cats } = await s.from('categories').select('id, name, slug, display_order').order('display_order');
cats.forEach(c => console.log(` [${c.display_order}] ${c.name} (${c.slug})`));
const maxOrder = Math.max(...cats.map(c => c.display_order || 0));

// 2. Créer catégorie DIY si absente
const existing = cats.find(c => c.slug === 'diy-home-improvement');
let diyCatId;

if (existing) {
  console.log(`\n✓ Catégorie "DIY & Home Improvement" déjà existante : ${existing.id}`);
  diyCatId = existing.id;
} else {
  const { data: newCat, error } = await s
    .from('categories')
    .insert({
      name: 'DIY & Home Improvement',
      slug: 'diy-home-improvement',
      description: 'Service manuals and guides for sewing machines, power tools and home improvement equipment',
      display_order: maxOrder + 1,
    })
    .select('id')
    .single();
  if (error) { console.error('Erreur création catégorie:', error); process.exit(1); }
  diyCatId = newCat.id;
  console.log(`\n✓ Catégorie "DIY & Home Improvement" créée : ${diyCatId}`);
}

// 3. Trouver Singer dans Machine Tools
const machineCat = cats.find(c => c.slug === 'machine-tools');
console.log(`\nMachine Tools ID : ${machineCat.id}`);

const { data: singerBrand, error: findErr } = await s
  .from('brands')
  .select('id, name, slug, category_id')
  .eq('category_id', machineCat.id)
  .ilike('name', 'singer')
  .maybeSingle();

if (findErr) { console.error('Erreur recherche Singer:', findErr); process.exit(1); }

if (!singerBrand) {
  console.log('⚠ Marque Singer introuvable dans Machine Tools — vérification globale...');
  const { data: singerGlobal } = await s.from('brands').select('id, name, slug, category_id').ilike('name', 'singer');
  console.log('Singer dans toutes catégories :', singerGlobal);
  process.exit(1);
}

console.log(`Singer trouvé : ${singerBrand.id} (slug: ${singerBrand.slug})`);

// 4. Déplacer Singer vers DIY
const { error: moveErr } = await s
  .from('brands')
  .update({ category_id: diyCatId })
  .eq('id', singerBrand.id);

if (moveErr) { console.error('Erreur déplacement Singer:', moveErr); process.exit(1); }
console.log(`✓ Singer déplacé vers DIY & Home Improvement`);

// 5. Vérifier les documents Singer (pour info)
const { data: singerDocs, count } = await s
  .from('documents')
  .select('slug, title', { count: 'exact' })
  .eq('brand_id', singerBrand.id)
  .limit(5);
console.log(`\nDocs Singer (${count} total) :`);
singerDocs.forEach(d => console.log(`  - ${d.slug}`));

console.log('\n✓ Terminé');
console.log(`DIY Category ID : ${diyCatId}`);
console.log(`Singer Brand ID : ${singerBrand.id}`);
