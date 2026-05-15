/**
 * Déplace ouvrages-de-reference-the-truth-about-opium-smoking
 * de la catégorie "Nature" vers "Société & Soi"
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SLUG = 'ouvrages-de-reference-the-truth-about-opium-smoking';

// 1. Trouver la catégorie "Société & Soi"
const { data: categories, error: catErr } = await supabase
  .from('categories').select('id, name, name_fr').order('name_fr');
if (catErr) { console.error(catErr.message); process.exit(1); }

const societe = categories.find(c => c.id === '347f6755-dcfc-4c25-a0b5-ca66659ec660');
if (!societe) {
  console.log('Catégories disponibles :');
  categories.forEach(c => console.log(`  - ${c.name_fr || c.name} (${c.id})`));
  console.error('\n✗ Catégorie "Société & Soi" introuvable — vérifiez le nom exact ci-dessus');
  process.exit(1);
}
console.log(`✓ Catégorie trouvée : "${societe.name_fr || societe.name}" (${societe.id})`);

// 2. Chercher la marque "OUVRAGES DE RÉFÉRENCE" dans cette catégorie
const { data: brands, error: brandErr } = await supabase
  .from('brands').select('id, name, slug, category_id').ilike('name', 'OUVRAGES DE RÉFÉRENCE');
if (brandErr) { console.error(brandErr.message); process.exit(1); }

console.log(`\nMarques "OUVRAGES DE RÉFÉRENCE" trouvées :`);
brands.forEach(b => console.log(`  - slug: ${b.slug} | category_id: ${b.category_id} | id: ${b.id}`));

const brandInSociete = brands.find(b => b.category_id === societe.id);
let brandId;

if (brandInSociete) {
  console.log(`✓ Marque déjà présente dans "Société & Soi" : ${brandInSociete.slug}`);
  brandId = brandInSociete.id;
} else {
  // Créer la marque dans la catégorie Société & Soi
  const newSlug = `ouvrages-de-reference-${societe.id.slice(0, 8)}`;
  // Utiliser un slug basé sur le nom de catégorie
  const slugBase = (societe.name_fr || societe.name)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const brandSlug = `ouvrages-de-reference-${slugBase}`;

  console.log(`\n⚠ Marque absente dans "Société & Soi" — création avec slug : ${brandSlug}`);
  const { data: newBrand, error: createErr } = await supabase
    .from('brands')
    .insert({ name: 'OUVRAGES DE RÉFÉRENCE', slug: brandSlug, category_id: societe.id })
    .select().single();
  if (createErr) { console.error(`✗ Erreur création marque : ${createErr.message}`); process.exit(1); }
  console.log(`✓ Marque créée : ${newBrand.slug} (${newBrand.id})`);
  brandId = newBrand.id;
}

// 3. Mettre à jour le document
const { error: updateErr } = await supabase.from('documents')
  .update({ category_id: societe.id, brand_id: brandId })
  .eq('slug', SLUG);
if (updateErr) { console.error(`✗ Erreur update : ${updateErr.message}`); process.exit(1); }

console.log(`\n✓ Document déplacé vers "${societe.name_fr || societe.name}" avec succès`);
