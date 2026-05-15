/**
 * - Déplace la marque MOVIOLA de Photography → Cinema & Video
 * - Déplace uniquement le doc "Kalart projector 16mm" vers une nouvelle marque KALART dans Cinema & Video
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PHOTO_CAT_ID  = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';
const CINEMA_CAT_ID = 'a663b7bd-7943-425f-9224-ff22e6b1e151';
const KALART_PROJ_DOC_ID = '9a8a6033-c101-49e9-a164-d3a6a253b24a'; // Kalart projector 16mm 70series

// 1. MOVIOLA
console.log('=== 1. MOVIOLA ===');
const { data: moviola } = await s
  .from('brands')
  .select('id, name, slug, category_id')
  .ilike('name', '%moviola%')
  .maybeSingle();

if (!moviola) {
  console.log('  ⚠ MOVIOLA introuvable en base');
} else {
  console.log(`  Trouvé : ${moviola.name} (catégorie: ${moviola.category_id})`);
  const { error: bErr } = await s.from('brands').update({ category_id: CINEMA_CAT_ID }).eq('id', moviola.id);
  if (bErr) { console.error('Erreur marque:', bErr.message); }
  else {
    const { data: docs } = await s.from('documents').select('id').eq('brand_id', moviola.id);
    if (docs?.length > 0) {
      await s.from('documents').update({ category_id: CINEMA_CAT_ID }).eq('brand_id', moviola.id);
    }
    console.log(`  ✓ MOVIOLA déplacée → Cinema & Video (${docs?.length || 0} docs)`);
  }
}

// 2. KALART projector 16mm → nouvelle marque KALART dans Cinema & Video
console.log('\n=== 2. KALART projector 16mm ===');
const { data: existingKalart } = await s
  .from('brands')
  .select('id')
  .eq('category_id', CINEMA_CAT_ID)
  .ilike('name', 'kalart')
  .maybeSingle();

let kalartCinemaId;
if (existingKalart) {
  kalartCinemaId = existingKalart.id;
  console.log(`  ✓ Marque KALART (Cinema) déjà existante : ${kalartCinemaId}`);
} else {
  const { data: newBrand, error } = await s
    .from('brands')
    .insert({ name: 'KALART', slug: 'kalart-cinema', category_id: CINEMA_CAT_ID, logo_url: null })
    .select('id')
    .single();
  if (error) { console.error('Erreur création KALART:', error.message); process.exit(1); }
  kalartCinemaId = newBrand.id;
  console.log(`  ✓ Marque KALART créée dans Cinema & Video : ${kalartCinemaId}`);
}

const { error: docErr } = await s
  .from('documents')
  .update({ brand_id: kalartCinemaId, category_id: CINEMA_CAT_ID })
  .eq('id', KALART_PROJ_DOC_ID);

if (docErr) console.error('Erreur update doc KALART:', docErr.message);
else console.log('  ✓ "Kalart projector 16mm 70series" déplacé vers KALART (Cinema & Video)');

console.log('\n✓ Terminé');
