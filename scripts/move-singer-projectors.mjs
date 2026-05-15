/**
 * Crée une marque SINGER dans Photography
 * + déplace les 3 docs projecteurs Singer vers cette marque
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PHOTOGRAPHY_CAT_ID = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';

const PROJECTOR_SLUGS = [
  'singer-singer-projector-instaload2200',
  'singer-singer-projector-1000',
  'singer-singer-projector-caramate',
];

// 1. Créer marque Singer dans Photography
const { data: existing } = await s
  .from('brands')
  .select('id, name, slug')
  .eq('category_id', PHOTOGRAPHY_CAT_ID)
  .ilike('name', 'singer')
  .maybeSingle();

let singerPhotoId;
if (existing) {
  console.log(`✓ Singer déjà présent dans Photography : ${existing.id}`);
  singerPhotoId = existing.id;
} else {
  const { data: newBrand, error } = await s
    .from('brands')
    .insert({
      name: 'SINGER',
      slug: 'singer-photography',
      category_id: PHOTOGRAPHY_CAT_ID,
      logo_url: null,
    })
    .select('id')
    .single();
  if (error) { console.error('Erreur création marque:', error); process.exit(1); }
  singerPhotoId = newBrand.id;
  console.log(`✓ Marque SINGER créée dans Photography : ${singerPhotoId}`);
}

// 2. Récupérer les IDs des 3 docs projecteurs
const { data: projDocs, error: docsErr } = await s
  .from('documents')
  .select('id, slug, title')
  .in('slug', PROJECTOR_SLUGS);

if (docsErr) { console.error('Erreur recherche docs:', docsErr); process.exit(1); }
console.log(`\nDocs projecteurs trouvés (${projDocs.length}/3) :`);
projDocs.forEach(d => console.log(`  - ${d.slug} → ${d.id}`));

if (projDocs.length !== 3) {
  console.warn('⚠ Attention : moins de 3 docs trouvés !');
}

// 3. Mettre à jour brand_id ET category_id de ces docs
const docIds = projDocs.map(d => d.id);
const { error: updateErr } = await s
  .from('documents')
  .update({
    brand_id:    singerPhotoId,
    category_id: PHOTOGRAPHY_CAT_ID,
  })
  .in('id', docIds);

if (updateErr) { console.error('Erreur update docs:', updateErr); process.exit(1); }
console.log(`\n✓ ${projDocs.length} docs déplacés vers Singer (Photography)`);

// 4. Vérification finale
console.log('\n=== Vérification ===');
const { data: diyDocs } = await s
  .from('documents')
  .select('slug, title')
  .eq('brand_id', 'aa68b94b-01b4-43e1-a95d-b92789b3cfac'); // Singer DIY
console.log(`Singer (DIY) — ${diyDocs.length} doc(s) :`);
diyDocs.forEach(d => console.log(`  ✓ ${d.slug}`));

const { data: photoDocs } = await s
  .from('documents')
  .select('slug, title')
  .eq('brand_id', singerPhotoId);
console.log(`Singer (Photography) — ${photoDocs.length} doc(s) :`);
photoDocs.forEach(d => console.log(`  ✓ ${d.slug}`));
