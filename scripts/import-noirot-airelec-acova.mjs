/**
 * Crée 3 nouvelles marques (NOIROT, AIRELEC, ACOVA) dans Electroménager,
 * avec chacune un document pointant vers le même PDF que l'actuel doc Calidou Heater,
 * puis supprime la marque CALIDOU HEATER et son document.
 *
 * Usage : node scripts/import-noirot-airelec-acova.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CALIDOU_SLUG = 'radiateur-calidou-depannage-thermostat-noirot-airelec-acova';

// ─── Données des 3 nouvelles marques/docs ────────────────────────────────────
const NEW_BRANDS = [
  {
    brand_name: 'Noirot',
    brand_slug: 'noirot',
    doc_slug:   'noirot-manuel-depannage-thermostat-noirot',
    title:      'NOIROT Thermostat Troubleshooting Manual',
    title_fr:   'Manuel de dépannage thermostat NOIROT',
  },
  {
    brand_name: 'Airelec',
    brand_slug: 'airelec',
    doc_slug:   'airelec-manuel-depannage-thermostat-airelec',
    title:      'AIRELEC Thermostat Troubleshooting Manual',
    title_fr:   'Manuel de dépannage thermostat AIRELEC',
  },
  {
    brand_name: 'Acova',
    brand_slug: 'acova',
    doc_slug:   'acova-manuel-depannage-thermostat-acova',
    title:      'ACOVA Thermostat Troubleshooting Manual',
    title_fr:   'Manuel de dépannage thermostat ACOVA',
  },
];

// ─── 1. Récupérer le doc Calidou existant ────────────────────────────────────
console.log(`\n=== Import NOIROT / AIRELEC / ACOVA (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===\n`);
console.log(`→ Lecture du doc source : ${CALIDOU_SLUG}`);

const { data: srcDoc, error: srcErr } = await supabase
  .from('documents')
  .select('*, brand:brands(id, name, slug), category:categories(id, name)')
  .eq('slug', CALIDOU_SLUG)
  .single();

if (srcErr || !srcDoc) {
  console.error(`❌ Doc source introuvable : ${srcErr?.message}`);
  process.exit(1);
}

console.log(`  Titre actuel  : ${srcDoc.title}`);
console.log(`  Marque actuelle : ${srcDoc.brand?.name} (id: ${srcDoc.brand_id})`);
console.log(`  Catégorie     : ${srcDoc.category?.name} (id: ${srcDoc.category_id})`);
console.log(`  file_path     : ${srcDoc.file_path}`);
console.log(`  preview_file  : ${srcDoc.preview_file || '(aucun)'}`);
console.log(`  page_count    : ${srcDoc.page_count}`);
console.log(`  price         : ${srcDoc.price}`);

const categoryId = srcDoc.category_id;
const calidouBrandId = srcDoc.brand_id;

// ─── 2. Créer les 3 marques ───────────────────────────────────────────────────
console.log(`\n→ Création des 3 marques...`);

const brandIds = {};

for (const entry of NEW_BRANDS) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Marque "${entry.brand_name}" (slug: ${entry.brand_slug})`);
    brandIds[entry.brand_slug] = 'dry-run-id';
    continue;
  }

  // Vérifier si la marque existe déjà
  const { data: existing } = await supabase
    .from('brands')
    .select('id, name')
    .eq('slug', entry.brand_slug)
    .single();

  if (existing) {
    console.log(`  ℹ️  Marque "${entry.brand_name}" existe déjà (id: ${existing.id})`);
    brandIds[entry.brand_slug] = existing.id;
    continue;
  }

  const { data: newBrand, error: brandErr } = await supabase
    .from('brands')
    .insert({
      name:        entry.brand_name,
      slug:        entry.brand_slug,
      category_id: categoryId,
    })
    .select('id')
    .single();

  if (brandErr) {
    console.error(`  ❌ Erreur création marque ${entry.brand_name} : ${brandErr.message}`);
    process.exit(1);
  }

  console.log(`  ✅ Marque "${entry.brand_name}" créée (id: ${newBrand.id})`);
  brandIds[entry.brand_slug] = newBrand.id;
}

// ─── 3. Créer les 3 documents ─────────────────────────────────────────────────
console.log(`\n→ Création des 3 documents...`);

for (const entry of NEW_BRANDS) {
  const docData = {
    slug:           entry.doc_slug,
    title:          entry.title,
    title_fr:       entry.title_fr,
    description:    srcDoc.description,
    description_fr: srcDoc.description_fr,
    file_path:      srcDoc.file_path,
    preview_file:   srcDoc.preview_file,
    page_count:     srcDoc.page_count,
    price:          srcDoc.price,
    active:         true,
    featured:       false,
    category_id:    categoryId,
    brand_id:       brandIds[entry.brand_slug],
    seo_tags:       srcDoc.seo_tags,
    seo_description: srcDoc.seo_description,
  };

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Document "${entry.title_fr}"`);
    console.log(`            slug: ${entry.doc_slug}`);
    console.log(`            brand_id: ${brandIds[entry.brand_slug]}`);
    console.log(`            file_path: ${srcDoc.file_path}`);
    continue;
  }

  const { error: docErr } = await supabase
    .from('documents')
    .insert(docData);

  if (docErr) {
    console.error(`  ❌ Erreur création doc ${entry.doc_slug} : ${docErr.message}`);
    process.exit(1);
  }

  console.log(`  ✅ Document "${entry.title_fr}" créé`);
}

// ─── 4. Supprimer le doc Calidou ─────────────────────────────────────────────
console.log(`\n→ Suppression du doc source Calidou...`);

if (DRY_RUN) {
  console.log(`  [DRY-RUN] Suppression document slug: ${CALIDOU_SLUG}`);
} else {
  const { error: delDocErr } = await supabase
    .from('documents')
    .delete()
    .eq('slug', CALIDOU_SLUG);

  if (delDocErr) {
    console.error(`  ❌ Erreur suppression doc : ${delDocErr.message}`);
    process.exit(1);
  }
  console.log(`  ✅ Document Calidou supprimé`);
}

// ─── 5. Supprimer la marque CALIDOU HEATER ───────────────────────────────────
console.log(`\n→ Suppression de la marque CALIDOU HEATER (id: ${calidouBrandId})...`);

if (DRY_RUN) {
  console.log(`  [DRY-RUN] Suppression marque id: ${calidouBrandId}`);
} else {
  const { error: delBrandErr } = await supabase
    .from('brands')
    .delete()
    .eq('id', calidouBrandId);

  if (delBrandErr) {
    console.error(`  ❌ Erreur suppression marque : ${delBrandErr.message}`);
    process.exit(1);
  }
  console.log(`  ✅ Marque CALIDOU HEATER supprimée`);
}

console.log(`\n=== Terminé ${DRY_RUN ? '(DRY-RUN — aucune modification)' : '✅'} ===`);
