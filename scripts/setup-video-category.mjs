/**
 * Création catégorie "Video/Vidéo" + marque Sony dans cette catégorie
 * + diagnostic des buckets Supabase Storage disponibles
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Diagnostic buckets Storage
console.log('=== Buckets Supabase Storage ===');
const { data: buckets, error: bucketsErr } = await s.storage.listBuckets();
if (bucketsErr) console.error('Erreur buckets:', bucketsErr);
else buckets.forEach(b => console.log(` - ${b.name} (public: ${b.public})`));

// 2. Vérifier catégories existantes + display_order max
console.log('\n=== Catégories existantes ===');
const { data: cats } = await s.from('categories').select('id, name, slug, display_order').order('display_order');
cats.forEach(c => console.log(` [${c.display_order}] ${c.name} (${c.slug}) → ${c.id}`));
const maxOrder = Math.max(...cats.map(c => c.display_order || 0));

// 3. Vérifier si "video" existe déjà
const existing = cats.find(c => c.slug === 'video');
if (existing) {
  console.log(`\n✓ Catégorie "video" déjà existante : ${existing.id}`);
} else {
  // Créer la catégorie Video
  const { data: newCat, error: catErr } = await s
    .from('categories')
    .insert({
      name: 'Video',
      slug: 'video',
      description: 'Video cameras, camcorders and related documentation',
      display_order: maxOrder + 1,
    })
    .select('id, name, slug')
    .single();

  if (catErr) { console.error('Erreur création catégorie:', catErr); process.exit(1); }
  console.log(`\n✓ Catégorie "Video" créée : ${newCat.id}`);
}

// 4. Récupérer l'id final de la catégorie video
const { data: videoCat } = await s.from('categories').select('id').eq('slug', 'video').single();
const videoCatId = videoCat.id;
console.log(`\nCatégorie Video ID : ${videoCatId}`);

// 5. Vérifier/créer marque Sony dans Video
const { data: sonyBrand } = await s.from('brands').select('id, name').eq('category_id', videoCatId).ilike('name', 'sony').maybeSingle();
if (sonyBrand) {
  console.log(`✓ Marque Sony déjà existante dans Video : ${sonyBrand.id}`);
} else {
  const { data: newBrand, error: brandErr } = await s
    .from('brands')
    .insert({ name: 'SONY', slug: 'sony-video', category_id: videoCatId, logo_url: null })
    .select('id')
    .single();
  if (brandErr) { console.error('Erreur création marque:', brandErr); process.exit(1); }
  console.log(`✓ Marque Sony créée dans Video : ${newBrand.id}`);
}

// 6. Afficher un sample preview_url pour connaître le bon bucket
console.log('\n=== Sample preview_url en base ===');
const { data: sampleDocs } = await s.from('documents').select('slug, preview_url').not('preview_url', 'is', null).limit(3);
sampleDocs.forEach(d => console.log(` ${d.slug} → ${d.preview_url}`));
