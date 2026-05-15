/**
 * Supprime la catégorie Video + déplace les docs Sony HDR-FX7 vers Cinema & Video
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CINEMA_CAT_ID  = 'a663b7bd-7943-425f-9224-ff22e6b1e151'; // Cinema & Video
const VIDEO_CAT_ID   = '8aa862c1-4e52-42bf-9088-8309ccce4e9f'; // Video (à supprimer)
const SONY_VIDEO_ID  = '4f262624-ef67-4628-bd2a-a78e9f5827a8'; // Sony brand dans Video

// 1. Chercher/créer Sony dans Cinema & Video
console.log('1. Sony dans Cinema & Video...');
const { data: existingSony } = await s
  .from('brands')
  .select('id, name, slug')
  .eq('category_id', CINEMA_CAT_ID)
  .ilike('name', 'sony')
  .maybeSingle();

let sonycinemaId;
if (existingSony) {
  console.log(`  ✓ Sony déjà présent : ${existingSony.id} (slug: ${existingSony.slug})`);
  sonycinemaId = existingSony.id;
} else {
  const { data: newBrand, error } = await s
    .from('brands')
    .insert({ name: 'SONY', slug: 'sony-cinema', category_id: CINEMA_CAT_ID, logo_url: null })
    .select('id')
    .single();
  if (error) { console.error('Erreur création marque:', error); process.exit(1); }
  sonycinemaId = newBrand.id;
  console.log(`  ✓ Sony créé dans Cinema & Video : ${sonycinemaId}`);
}

// 2. Déplacer les docs Sony HDR-FX7
console.log('2. Déplacement des docs HDR-FX7...');
const { data: docs, error: docsErr } = await s
  .from('documents')
  .select('id, slug')
  .eq('brand_id', SONY_VIDEO_ID);
if (docsErr) { console.error(docsErr); process.exit(1); }
console.log(`  ${docs.length} doc(s) trouvé(s) :`);
docs.forEach(d => console.log(`    - ${d.slug}`));

const { error: updateErr } = await s
  .from('documents')
  .update({ category_id: CINEMA_CAT_ID, brand_id: sonycinemaId })
  .eq('brand_id', SONY_VIDEO_ID);
if (updateErr) { console.error('Erreur update docs:', updateErr); process.exit(1); }
console.log(`  ✓ ${docs.length} doc(s) déplacé(s) vers Cinema & Video`);

// 3. Supprimer la marque Sony-Video
console.log('3. Suppression marque Sony (Video)...');
const { error: delBrandErr } = await s.from('brands').delete().eq('id', SONY_VIDEO_ID);
if (delBrandErr) { console.error('Erreur suppression marque:', delBrandErr); process.exit(1); }
console.log('  ✓ Marque Sony-Video supprimée');

// 4. Supprimer la catégorie Video
console.log('4. Suppression catégorie Video...');
const { error: delCatErr } = await s.from('categories').delete().eq('id', VIDEO_CAT_ID);
if (delCatErr) { console.error('Erreur suppression catégorie:', delCatErr); process.exit(1); }
console.log('  ✓ Catégorie Video supprimée');

console.log('\n✓ Terminé — docs Sony HDR-FX7 dans Cinema & Video');
