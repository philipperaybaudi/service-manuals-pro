/**
 * Déplace les marques cinéma/vidéo de Photography → Cinema & Video
 * + création marque KALART pour 1 doc spécifique
 * + correction prix SCOPONET (1200 → 200 centimes)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PHOTO_CAT_ID  = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a'; // Photography
const CINEMA_CAT_ID = 'a663b7bd-7943-425f-9224-ff22e6b1e151'; // Cinema & Video

const BRANDS_TO_MOVE = [
  'aaton', 'ampro', 'arriflex', 'audiscan', 'beaulieu', 'bell & howell',
  'bolex', 'cinema-products', 'debrie', 'devry', 'eiki', 'elmo', 'eumig',
  'fairchild', 'gaf', 'lafayette', 'maurice gillon', 'movolia', 'pathe',
  'rous', 'sears', 'singer', 'tower', 'victor',
];

// ─── 1. Déplacer les marques ─────────────────────────────────────────────────
console.log('=== 1. Déplacement des marques Photography → Cinema & Video ===\n');

let movedBrands = 0;
let movedDocs = 0;
const notFound = [];

for (const brandName of BRANDS_TO_MOVE) {
  const { data: brand } = await s
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', PHOTO_CAT_ID)
    .ilike('name', brandName)
    .maybeSingle();

  if (!brand) {
    notFound.push(brandName);
    continue;
  }

  // Mettre à jour la marque
  const { error: brandErr } = await s
    .from('brands')
    .update({ category_id: CINEMA_CAT_ID })
    .eq('id', brand.id);
  if (brandErr) { console.error(`Erreur marque ${brandName}:`, brandErr.message); continue; }

  // Mettre à jour tous les docs de cette marque
  const { data: docs } = await s
    .from('documents')
    .select('id')
    .eq('brand_id', brand.id);

  if (docs?.length > 0) {
    const { error: docsErr } = await s
      .from('documents')
      .update({ category_id: CINEMA_CAT_ID })
      .eq('brand_id', brand.id);
    if (docsErr) { console.error(`Erreur docs ${brandName}:`, docsErr.message); continue; }
    movedDocs += docs.length;
  }

  console.log(`  ✓ ${brand.name} (${docs?.length || 0} docs)`);
  movedBrands++;
}

if (notFound.length > 0) {
  console.log(`\n  ⚠ Non trouvées dans Photography : ${notFound.join(', ')}`);
}
console.log(`\n→ ${movedBrands} marques déplacées, ${movedDocs} docs mis à jour`);

// ─── 2. KALART — doc isolé ───────────────────────────────────────────────────
console.log('\n=== 2. KALART Victor 16mm ===\n');

// Chercher le doc KALART
const { data: kalartDoc } = await s
  .from('documents')
  .select('id, slug, title, brand_id, category_id')
  .ilike('title', '%kalart%')
  .maybeSingle();

if (!kalartDoc) {
  console.log('  ⚠ Doc KALART introuvable — recherche élargie...');
  const { data: all } = await s.from('documents').select('id, slug, title').ilike('title', '%victor 16%');
  console.log('  Résultats :', all);
} else {
  console.log(`  Doc trouvé : ${kalartDoc.slug} (brand: ${kalartDoc.brand_id})`);

  // Créer marque KALART dans Cinema & Video
  const { data: existingKalart } = await s
    .from('brands')
    .select('id')
    .eq('category_id', CINEMA_CAT_ID)
    .ilike('name', 'kalart')
    .maybeSingle();

  let kalartBrandId;
  if (existingKalart) {
    kalartBrandId = existingKalart.id;
    console.log(`  ✓ Marque KALART déjà existante : ${kalartBrandId}`);
  } else {
    const { data: newBrand, error } = await s
      .from('brands')
      .insert({ name: 'KALART', slug: 'kalart', category_id: CINEMA_CAT_ID, logo_url: null })
      .select('id')
      .single();
    if (error) { console.error('Erreur création KALART:', error.message); }
    else {
      kalartBrandId = newBrand.id;
      console.log(`  ✓ Marque KALART créée : ${kalartBrandId}`);
    }
  }

  // Déplacer uniquement ce doc vers KALART / Cinema & Video
  if (kalartBrandId) {
    const { error } = await s
      .from('documents')
      .update({ brand_id: kalartBrandId, category_id: CINEMA_CAT_ID })
      .eq('id', kalartDoc.id);
    if (error) console.error('Erreur update KALART doc:', error.message);
    else console.log(`  ✓ Doc "${kalartDoc.title}" déplacé vers KALART (Cinema & Video)`);
  }
}

// ─── 3. SCOPONET — correction prix ──────────────────────────────────────────
console.log('\n=== 3. SCOPONET — prix 1200 → 200 centimes ===\n');

const { data: scoponet } = await s
  .from('documents')
  .select('id, slug, title, price')
  .ilike('title', '%scoponet%')
  .maybeSingle();

if (!scoponet) {
  console.log('  ⚠ SCOPONET introuvable');
} else {
  console.log(`  Trouvé : ${scoponet.slug} — prix actuel : ${scoponet.price} centimes`);
  const { error } = await s
    .from('documents')
    .update({ price: 200 })
    .eq('id', scoponet.id);
  if (error) console.error('Erreur prix SCOPONET:', error.message);
  else console.log(`  ✓ Prix mis à jour : 200 centimes (2€ / $2)`);
}

console.log('\n=== Terminé ===');
