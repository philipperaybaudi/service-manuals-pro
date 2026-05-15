/**
 * Correction globale des marques
 * 1. ELECTRONIQUE + MODELISME → category_id DIY
 * 2. TOYOTA sewing machine → marque TOYOTA DIY
 * 3. SONY KDL-55X4500 → SONY (Télévision) + déplacement fichier
 * 4. Suppression doublons vides (singer-photography, singer-home, singer-machine)
 * 5. Rafraîchissement document_count
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

const CAT_DIY = '33040eb3-b9d9-4c15-bda6-1afb5fb9c226';
const CAT_TV  = '982bd7fe-fbf9-4c94-999f-652daaebcaf2';

// ─── 1. ELECTRONIQUE + MODELISME : fixer category_id ────────────────────────
console.log('\n=== 1. ELECTRONIQUE + MODELISME → DIY ===');
for (const slug of ['electronique-bricolage-diy', 'modelisme-bricolage-diy']) {
  const { error } = await s.from('brands').update({ category_id: CAT_DIY }).eq('slug', slug);
  if (error) console.error(`  ✗ ${slug} : ${error.message}`);
  else console.log(`  ✓ ${slug} → category_id DIY`);
}

// ─── 2. TOYOTA en DIY ────────────────────────────────────────────────────────
console.log('\n=== 2. TOYOTA sewing machine → DIY ===');
// Mettre toyota-home dans DIY
const { error: toyotaErr } = await s.from('brands').update({ category_id: CAT_DIY }).eq('slug', 'toyota-home');
if (toyotaErr) console.error('  ✗ toyota-home :', toyotaErr.message);
else console.log('  ✓ toyota-home → category_id DIY');

// Réassigner le doc Toyota vers toyota-home (id: 75c70364-5294-494b-af2c-90e341c234fa)
const { error: toyotaDocErr } = await s.from('documents')
  .update({ brand_id: '75c70364-5294-494b-af2c-90e341c234fa' })
  .eq('slug', 'toyota-toyota-rs-series-domestic-sewing-machine-user-guide');
if (toyotaDocErr) console.error('  ✗ doc Toyota :', toyotaDocErr.message);
else console.log('  ✓ doc Toyota → brand toyota-home (DIY)');

// ─── 3. SONY KDL-55X4500 → SONY (Télévision) ───────────────────────────────
console.log('\n=== 3. SONY KDL-55X4500 → SONY (TV) ===');

// Créer marque SONY pour Télévision
const { data: sonyTv, error: sonyCreateErr } = await s.from('brands')
  .insert({ name: 'SONY', slug: 'sony-television', category_id: CAT_TV })
  .select('id').single();
if (sonyCreateErr) {
  console.error('  ✗ Création SONY TV :', sonyCreateErr.message);
} else {
  console.log('  ✓ Marque SONY (télévision) créée');

  // Réassigner le doc
  const { error: sonyDocErr } = await s.from('documents')
    .update({ brand_id: sonyTv.id })
    .eq('slug', 'sony-kdl-55x4500-kdl-55x4500-manuel');
  if (sonyDocErr) console.error('  ✗ doc SONY :', sonyDocErr.message);
  else console.log('  ✓ doc SONY KDL-55X4500 → brand SONY (TV)');

  // Supprimer marque SONY KDL-55X4500
  const { error: delErr } = await s.from('brands').delete().eq('slug', 'sony-kdl-55x4500');
  if (delErr) console.error('  ✗ Suppression SONY KDL-55X4500 :', delErr.message);
  else console.log('  ✓ Marque SONY KDL-55X4500 supprimée');

  // Déplacer le fichier
  const src  = path.join(DOCS_EN_LIGNE, 'Télévision', 'Sony KDL-55X4500', 'KDL-55X4500_manuel.pdf');
  const dest = path.join(DOCS_EN_LIGNE, 'Télévision', 'SONY');
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.renameSync(src, path.join(dest, 'KDL-55X4500_manuel.pdf'));
    console.log('  ✓ Fichier déplacé → DOCS EN LIGNE\\Télévision\\SONY\\');
  } else {
    console.log('  ⚠ Fichier déjà déplacé ou introuvable');
  }
}

// ─── 4. Supprimer doublons SINGER vides ─────────────────────────────────────
console.log('\n=== 4. Suppression doublons vides ===');
for (const slug of ['singer-photography', 'singer-home', 'singer-machine', 'repair-troubleshooting-electronics']) {
  const { data: b } = await s.from('brands').select('id').eq('slug', slug).maybeSingle();
  if (!b) { console.log(`  ⚠ ${slug} introuvable`); continue; }
  const { count } = await s.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', b.id);
  if (count > 0) { console.log(`  ⚠ ${slug} non vide (${count} docs), conservé`); continue; }
  await s.from('brands').delete().eq('id', b.id);
  console.log(`  ✓ Supprimé : ${slug}`);
}

// ─── 5. Rafraîchir document_count pour toutes les marques ───────────────────
console.log('\n=== 5. Rafraîchissement document_count ===');
const { data: allBrands } = await s.from('brands').select('id, name');
let updated = 0;
for (const brand of allBrands) {
  const { count } = await s.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id);
  await s.from('brands').update({ document_count: count }).eq('id', brand.id);
  updated++;
}
console.log(`  ✓ ${updated} marques mises à jour`);

console.log('\n=== Terminé ===');
