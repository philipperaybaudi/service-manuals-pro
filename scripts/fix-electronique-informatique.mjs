/**
 * Correction des marques erronées dans Électronique et Informatique
 *
 * Électronique :
 *   LINEAR INTEGRATED CIRCUITS → EDITIONS RADIO
 *   HP → HEWLETT-PACKARD
 *   THALES ALENIA SPACE + GRENOBLE ALPES UNIVERSITY → THESES
 *   Suppression dossiers vides : ELECTRONIQUE ET LOISIRS MAGAZINE, ELEKTOR, WILEY PUBLISHING
 *
 * Informatique :
 *   FUJITSU SIEMENS → FUJISTU
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function moveFile(src, destDir, filename) {
  if (!fs.existsSync(src)) { console.log(`  ⚠ Introuvable : ${src}`); return false; }
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  try { fs.renameSync(src, dest); }
  catch { fs.copyFileSync(src, dest); fs.unlinkSync(src); }
  console.log(`  ✓ Déplacé → ${dest}`);
  return true;
}

function rmDirIfEmpty(dir) {
  if (!fs.existsSync(dir)) { console.log(`  ⚠ Dossier introuvable : ${dir}`); return; }
  const files = fs.readdirSync(dir);
  if (files.length > 0) { console.log(`  ⚠ Dossier non vide, conservé : ${dir}`); return; }
  fs.rmdirSync(dir);
  console.log(`  ✓ Dossier vide supprimé : ${dir}`);
}

async function getCategoryId(slug) {
  const { data } = await s.from('categories').select('id, name').eq('slug', slug).maybeSingle();
  if (!data) throw new Error(`Catégorie introuvable : ${slug}`);
  return data.id;
}

async function createBrand(name, slug, categoryId) {
  // Vérifie si le slug existe déjà
  const { data: existing } = await s.from('brands').select('id').eq('slug', slug).maybeSingle();
  if (existing) { console.log(`  ℹ Marque déjà existante : ${name} (${slug})`); return existing.id; }
  const { data, error } = await s.from('brands').insert({ name, slug, category_id: categoryId }).select('id').single();
  if (error) throw new Error(`Création marque ${name} : ${error.message}`);
  console.log(`  ✓ Marque créée : ${name} (${slug})`);
  return data.id;
}

async function reassignDoc(docSlug, brandId, categoryId) {
  const { error } = await s.from('documents').update({ brand_id: brandId, category_id: categoryId }).eq('slug', docSlug);
  if (error) console.error(`  ✗ ${docSlug} : ${error.message}`);
  else console.log(`  ✓ ${docSlug}`);
}

async function deleteEmptyBrand(slug) {
  const { data: b } = await s.from('brands').select('id').eq('slug', slug).maybeSingle();
  if (!b) { console.log(`  ⚠ Marque introuvable : ${slug}`); return; }
  const { count } = await s.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', b.id);
  if (count > 0) { console.log(`  ⚠ ${slug} non vide (${count} docs), conservée`); return; }
  const { error } = await s.from('brands').delete().eq('id', b.id);
  if (error) console.error(`  ✗ Suppression ${slug} : ${error.message}`);
  else console.log(`  ✓ Marque supprimée : ${slug}`);
}

// ─── Récupérer les catégories ─────────────────────────────────────────────────
const CAT_ELEC = await getCategoryId('electronics');
const CAT_INFO = await getCategoryId('computers-it');
console.log(`Électronique ID : ${CAT_ELEC}`);
console.log(`Informatique ID : ${CAT_INFO}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EDITIONS RADIO (au lieu de LINEAR INTEGRATED CIRCUITS)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. EDITIONS RADIO ===');
const brandEditionsRadio = await createBrand('EDITIONS RADIO', 'editions-radio-electronique', CAT_ELEC);
await reassignDoc(
  'linear-integrated-circuits-linear-integrated-circuits-principles-applications-h-lilen',
  brandEditionsRadio, CAT_ELEC
);
// Déplacement fichier
moveFile(
  path.join(DOCS_EN_LIGNE, 'Électronique', 'LINEAR INTEGRATED CIRCUITS', 'Circuits_Integres_lineaires H.LILEN 1978.pdf'),
  path.join(DOCS_EN_LIGNE, 'Électronique', 'EDITIONS RADIO'),
  'Circuits_Integres_lineaires H.LILEN 1978.pdf'
);
// Supprimer dossier vide LINEAR INTEGRATED CIRCUITS
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'LINEAR INTEGRATED CIRCUITS'));
// Supprimer marque LINEAR INTEGRATED CIRCUITS si vide
await deleteEmptyBrand('linear-integrated-circuits-electronique');
// Tenter aussi sans suffixe (selon comment la marque a été créée)
await deleteEmptyBrand('linear-integrated-circuits');

// ═══════════════════════════════════════════════════════════════════════════════
// 2. HEWLETT-PACKARD (au lieu de HP)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 2. HEWLETT-PACKARD ===');
const brandHP = await createBrand('HEWLETT-PACKARD', 'hewlett-packard-electronique', CAT_ELEC);
await reassignDoc(
  'hp-hp-54200a-digitizing-oscilloscope-service-manual',
  brandHP, CAT_ELEC
);
// Déplacement fichier
moveFile(
  path.join(DOCS_EN_LIGNE, 'Électronique', 'HP', 'Oscilloscope HP 54200A Service Manual.pdf'),
  path.join(DOCS_EN_LIGNE, 'Électronique', 'HEWLETT-PACKARD'),
  'Oscilloscope HP 54200A Service Manual.pdf'
);
// Supprimer dossier HP si vide
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'HP'));
// Supprimer marque HP (Électronique) si vide
await deleteEmptyBrand('hp-electronique');
await deleteEmptyBrand('hp-electronics');
await deleteEmptyBrand('hp');

// ═══════════════════════════════════════════════════════════════════════════════
// 3. THESES (au lieu de THALES ALENIA SPACE + GRENOBLE ALPES UNIVERSITY)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 3. THESES ===');
const brandTheses = await createBrand('THESES', 'theses-electronique', CAT_ELEC);
await reassignDoc(
  'thales-alenia-space-photonic-frequency-converter-module-performance-enhancement-thesis',
  brandTheses, CAT_ELEC
);
await reassignDoc(
  'grenoble-alpes-university-hybrid-opto-wireless-systems-millimeter-wave-networks-60ghz',
  brandTheses, CAT_ELEC
);
// Déplacements fichiers
moveFile(
  path.join(DOCS_EN_LIGNE, 'Électronique', 'THALES ALENIA SPACE', 'Thèse sur Amélioration des performances électriques d\'un module.pdf'),
  path.join(DOCS_EN_LIGNE, 'Électronique', 'THESES'),
  'Thèse sur Amélioration des performances électriques d\'un module.pdf'
);
moveFile(
  path.join(DOCS_EN_LIGNE, 'Électronique', 'GRENOBLE ALPES UNIVERSITY', 'Thèse sur Systèmes hybrides opto-électronique sans fil.pdf'),
  path.join(DOCS_EN_LIGNE, 'Électronique', 'THESES'),
  'Thèse sur Systèmes hybrides opto-électronique sans fil.pdf'
);
// Supprimer dossiers vides
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'THALES ALENIA SPACE'));
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'GRENOBLE ALPES UNIVERSITY'));
// Supprimer marques vides
await deleteEmptyBrand('thales-alenia-space-electronique');
await deleteEmptyBrand('thales-alenia-space');
await deleteEmptyBrand('grenoble-alpes-university-electronique');
await deleteEmptyBrand('grenoble-alpes-university');

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Suppression dossiers vides laissés par le dérapage Bricolage & DIY
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. Dossiers vides Électronique ===');
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'ELECTRONIQUE ET LOISIRS MAGAZINE'));
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'ELEKTOR'));
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Électronique', 'WILEY PUBLISHING'));

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FUJISTU (au lieu de FUJITSU SIEMENS) — Informatique
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. FUJISTU (Informatique) ===');
const brandFujistu = await createBrand('FUJISTU', 'fujistu-informatique', CAT_INFO);
// Trouver le slug du doc FUJITSU SIEMENS dans la DB
const { data: fujitsuDocs } = await s.from('documents')
  .select('id, slug, brand_id')
  .ilike('slug', '%fuji%');
console.log('  Docs Fuji trouvés :', fujitsuDocs?.map(d => d.slug));

if (fujitsuDocs && fujitsuDocs.length > 0) {
  for (const doc of fujitsuDocs) {
    await reassignDoc(doc.slug, brandFujistu, CAT_INFO);
  }
}
// Déplacement fichier
moveFile(
  path.join(DOCS_EN_LIGNE, 'Informatique', 'FUJITSU SIEMENS', 'FUJITSU AMILO Pro V3205 - Si 1520.pdf'),
  path.join(DOCS_EN_LIGNE, 'Informatique', 'FUJISTU'),
  'FUJITSU AMILO Pro V3205 - Si 1520.pdf'
);
rmDirIfEmpty(path.join(DOCS_EN_LIGNE, 'Informatique', 'FUJITSU SIEMENS'));
await deleteEmptyBrand('fujitsu-siemens-informatique');
await deleteEmptyBrand('fujitsu-siemens');

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Rafraîchir document_count pour les marques touchées
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== 6. Rafraîchissement document_count ===');
const brandIds = [brandEditionsRadio, brandHP, brandTheses, brandFujistu];
for (const id of brandIds) {
  const { count } = await s.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', id);
  await s.from('brands').update({ document_count: count }).eq('id', id);
}
console.log('  ✓ document_count mis à jour pour 4 marques');

console.log('\n=== Terminé ===');
