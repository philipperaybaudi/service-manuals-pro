import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── 1. Corriger le descriptif FR du doc Webasto existant ──────────────────
const description_fr_updated = `Catalogue de pièces de rechange pour les chauffages à eau Webasto BBW 46 et DBW 46 destinés aux véhicules DaimlerChrysler et autres véhicules. Comprend les appareils de chauffage de remplacement complets, les accessoires électriques, les pièces du système d'alimentation en combustible, les composants du système d'air comburant, les pièces du système d'échappement, les composants du système d'eau chaude, les pièces mécaniques et les pièces normalisées avec schémas éclatés.`;

const { error: e1 } = await supabase
  .from('documents')
  .update({ description_fr: description_fr_updated })
  .eq('slug', 'webasto-webasto-bbw-46-dbw-46-spare-parts-list');

if (e1) { console.error('❌ Update descriptif :', e1.message); process.exit(1); }
console.log('✅ Descriptif FR mis à jour');

// ── 2. Récupérer la catégorie Automobile ──────────────────────────────────
const { data: catAuto } = await supabase
  .from('categories')
  .select('id')
  .eq('slug', 'automotive')
  .single();

if (!catAuto) { console.error('❌ Catégorie Automobile introuvable'); process.exit(1); }
console.log(`✅ Catégorie Automobile : ${catAuto.id}`);

// ── 3. Créer (ou récupérer) la marque Chrysler dans Automobile ────────────
let { data: chrysler } = await supabase
  .from('brands')
  .select('id')
  .eq('slug', 'chrysler')
  .maybeSingle();

if (!chrysler) {
  const { data: created, error: e2 } = await supabase
    .from('brands')
    .insert({ name: 'Chrysler', slug: 'chrysler', category_id: catAuto.id, logo_url: null })
    .select('id')
    .single();
  if (e2) { console.error('❌ Création marque Chrysler :', e2.message); process.exit(1); }
  chrysler = created;
  console.log(`✅ Marque Chrysler créée : ${chrysler.id}`);
} else {
  console.log(`✅ Marque Chrysler existante : ${chrysler.id}`);
}

// ── 4. Récupérer le doc Webasto original pour copier ses données ──────────
const { data: original } = await supabase
  .from('documents')
  .select('*')
  .eq('slug', 'webasto-webasto-bbw-46-dbw-46-spare-parts-list')
  .single();

if (!original) { console.error('❌ Doc Webasto original introuvable'); process.exit(1); }

// ── 5. Créer le doc dupliqué sous Automobile > Chrysler ───────────────────
const newSlug = 'chrysler-webasto-bbw-46-dbw-46-spare-parts-list';

// Vérifier s'il existe déjà
const { data: existing } = await supabase
  .from('documents')
  .select('id')
  .eq('slug', newSlug)
  .maybeSingle();

if (existing) {
  console.log(`⚠ Doc Chrysler déjà existant (${newSlug}), pas de création`);
} else {
  const { error: e3 } = await supabase
    .from('documents')
    .insert({
      title:          original.title,
      title_fr:       original.title_fr,
      slug:           newSlug,
      description:    original.description,
      description_fr: description_fr_updated,
      category_id:    catAuto.id,
      brand_id:       chrysler.id,
      price:          original.price,
      file_path:      original.file_path,
      file_size:      original.file_size,
      page_count:     original.page_count,
      preview_url:    original.preview_url,
      language:       original.language,
      active:         true,
      featured:       false,
    });

  if (e3) { console.error('❌ Création doc Chrysler :', e3.message); process.exit(1); }
  console.log(`✅ Doc dupliqué créé : ${newSlug}`);
}

console.log('\n=== Terminé ===');
