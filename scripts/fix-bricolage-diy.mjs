/**
 * Correction complète du dérapage "Bricolage & DIY"
 * - Déplace les PDFs vers DOCS EN LIGNE\Bricolage & DIY\{brand}\
 * - Corrige category_id et brand_id en base Supabase
 * - Supprime les marques vides créées par erreur
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

// ─── Helpers ────────────────────────────────────────────────────────────────
function moveFile(src, destDir, filename) {
  if (!fs.existsSync(src)) { console.log(`  ⚠ Introuvable : ${src}`); return false; }
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  try { fs.renameSync(src, dest); }
  catch { fs.copyFileSync(src, dest); fs.unlinkSync(src); }
  console.log(`  ✓ Déplacé → ${dest}`);
  return true;
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function findOrCreateBrand(name, categorySlug) {
  const slug = slugify(name) + '-' + slugify(categorySlug);
  const { data: existing } = await supabase.from('brands').select('id').eq('name', name).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase.from('brands').insert({ name, slug }).select('id').single();
  if (error) throw new Error(`Création marque ${name} : ${error.message}`);
  console.log(`  ✓ Marque créée : ${name} (slug: ${slug})`);
  return created.id;
}

async function deleteEmptyBrand(name) {
  const { data: brand } = await supabase.from('brands').select('id').eq('name', name).maybeSingle();
  if (!brand) return;
  const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id);
  if (count > 0) { console.log(`  ⚠ Marque ${name} non vide (${count} docs), conservée`); return; }
  await supabase.from('brands').delete().eq('id', brand.id);
  console.log(`  ✓ Marque vide supprimée : ${name}`);
}

// ─── 1. Récupérer catégorie Bricolage & DIY ─────────────────────────────────
console.log('\n=== 1. Catégorie Bricolage & DIY ===');
const { data: cat } = await supabase.from('categories').select('id, name').eq('slug', 'diy-home-improvement').maybeSingle();
if (!cat) { console.error('Catégorie Bricolage & DIY introuvable !'); process.exit(1); }
console.log(`  ✓ Trouvée : ${cat.name} (${cat.id})`);

// ─── 2. Créer/trouver les bonnes marques ────────────────────────────────────
console.log('\n=== 2. Marques ===');
const brandElectronique = await findOrCreateBrand('ELECTRONIQUE', 'bricolage-diy');
const brandModelisme    = await findOrCreateBrand('MODELISME', 'bricolage-diy');
// SINGER et TOYOTA existent déjà
const { data: brandSinger } = await supabase.from('brands').select('id').eq('name', 'SINGER').maybeSingle();
const { data: brandToyota } = await supabase.from('brands').select('id').eq('name', 'TOYOTA').maybeSingle();
if (!brandSinger) console.warn('  ⚠ SINGER introuvable en base');
if (!brandToyota) console.warn('  ⚠ TOYOTA introuvable en base');

// ─── 3. Déplacer les fichiers ───────────────────────────────────────────────
console.log('\n=== 3. Déplacement fichiers ===');

// ELECTRONIQUE (sous-dossier source : ELECTRONIQUE)
const destElec = path.join(DOCS_EN_LIGNE, 'Bricolage & DIY', 'ELECTRONIQUE');
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'REPAIR & TROUBLESHOOTING', 'Apprendre l Electronique en Partant de Zero - Niveau 1.pdf'), destElec, 'Apprendre l Electronique en Partant de Zero - Niveau 1.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'REPAIR & TROUBLESHOOTING', 'Apprendre l Electronique en Partant de Zero - Niveau 2.pdf'), destElec, 'Apprendre l Electronique en Partant de Zero - Niveau 2.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'ELECTRONIQUE ET LOISIRS MAGAZINE', 'Apprendre l Electronique en Partant de Zero - Niveau 3.pdf'), destElec, 'Apprendre l Electronique en Partant de Zero - Niveau 3.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'ELEKTOR', 'Desulfateur_Equalizer_Elektor.pdf'), destElec, 'Desulfateur_Equalizer_Elektor.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'WILEY PUBLISHING', "L'Electronique Pour les Nuls.pdf"), destElec, "L'Electronique Pour les Nuls.pdf");
moveFile(path.join(DOCS_EN_LIGNE, 'Électronique', 'HAMEG', 'Utilisation Oscilloscope 1.pdf'), destElec, 'Utilisation Oscilloscope 1.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Automobile', 'TASIHMA', 'Désulfater une batterie.pdf'), destElec, 'Désulfater une batterie.pdf');

// MODELISME
const destModelisme = path.join(DOCS_EN_LIGNE, 'Bricolage & DIY', 'MODELISME');
moveFile(path.join(DOCS_EN_LIGNE, 'Drones', 'A2PRO', 'Notice-Apache-UH1-07_2010.pdf'), destModelisme, 'Notice-Apache-UH1-07_2010.pdf');

// SINGER
const destSinger = path.join(DOCS_EN_LIGNE, 'Bricolage & DIY', 'SINGER');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'SINGER', 'Singer 15K88 Notice utilisateur.pdf'), destSinger, 'Singer 15K88 Notice utilisateur.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'SINGER', 'Singer 31-15 Notice utilisateur.pdf'), destSinger, 'Singer 31-15 Notice utilisateur.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'SINGER', 'Singer 401 Notice utilisateur.pdf'), destSinger, 'Singer 401 Notice utilisateur.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'SINGER', 'Singer 401-G Notice utilisateur.pdf'), destSinger, 'Singer 401-G Notice utilisateur.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'SINGER', 'Singer 99-24 Parts List.pdf'), destSinger, 'Singer 99-24 Parts List.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Machines-Outils', 'SINGER', 'Singer 212G140, G141, G145, G146 Parts List.pdf'), destSinger, 'Singer 212G140, G141, G145, G146 Parts List.pdf');
moveFile(path.join(DOCS_EN_LIGNE, 'Machines-Outils', 'SINGER', 'Singer 2491-D Notice utilisateur.pdf'), destSinger, 'Singer 2491-D Notice utilisateur.pdf');

// TOYOTA
const destToyota = path.join(DOCS_EN_LIGNE, 'Bricolage & DIY', 'TOYOTA');
moveFile(path.join(DOCS_EN_LIGNE, 'Électroménager', 'TOYOTA', 'Machine à coudre Toyota série RS Notice utilisateur.pdf'), destToyota, 'Machine à coudre Toyota série RS Notice utilisateur.pdf');

// ─── 4. Corriger la base de données ─────────────────────────────────────────
console.log('\n=== 4. Correction base de données ===');

// Docs du sous-dossier ELECTRONIQUE → brand ELECTRONIQUE
const slugsElec = [
  'repair-troubleshooting-learning-electronics-from-zero-level-1',
  'repair-troubleshooting-apprendre-l-electronique-en-partant-de-zero-niveau-2',
  'electronique-et-loisirs-magazine-learning-electronics-from-zero-level-3',
  'elektor-lead-acid-battery-desulfator-rejuvenator-circuit',
  'wiley-publishing-electronics-for-dummies-second-edition-french',
  'hameg-oscilloscope-hameg-hm303-6-operating-manual',
  'tasihma-comment-desulfater-une-batterie-acide-plomb',
];
for (const slug of slugsElec) {
  const { error } = await supabase.from('documents')
    .update({ category_id: cat.id, brand_id: brandElectronique })
    .eq('slug', slug);
  if (error) console.error(`  ✗ ${slug} : ${error.message}`);
  else console.log(`  ✓ ${slug}`);
}

// Doc MODELISME → brand MODELISME
const { error: errModel } = await supabase.from('documents')
  .update({ category_id: cat.id, brand_id: brandModelisme })
  .eq('slug', 'a2pro-apache-uh-1d-helicopter-assembly-manual');
if (errModel) console.error(`  ✗ A2PRO : ${errModel.message}`);
else console.log('  ✓ a2pro-apache-uh-1d-helicopter-assembly-manual');

// Docs SINGER → category Bricolage & DIY (brand_id reste SINGER)
const slugsSinger = [
  'singer-singer-15k88-sewing-machine-user-manual',
  'singer-singer-212g140-212g141-212g145-212g146-illustrated-parts-list',
  'singer-singer-2491d-instruction-manual-illustrated-parts-list',
  'singer-singer-31-15-sewing-machine-instructions',
  'singer-singer-401-instructions-for-use',
  'singer-singer-401g-sewing-machine-user-manual',
  'singer-singer-99-24-parts-list',
];
for (const slug of slugsSinger) {
  const { error } = await supabase.from('documents')
    .update({ category_id: cat.id })
    .eq('slug', slug);
  if (error) console.error(`  ✗ ${slug} : ${error.message}`);
  else console.log(`  ✓ ${slug}`);
}

// Doc TOYOTA → category Bricolage & DIY
const { error: errToyota } = await supabase.from('documents')
  .update({ category_id: cat.id })
  .eq('slug', 'toyota-toyota-rs-series-domestic-sewing-machine-user-guide');
if (errToyota) console.error(`  ✗ TOYOTA : ${errToyota.message}`);
else console.log('  ✓ toyota-toyota-rs-series-domestic-sewing-machine-user-guide');

// ─── 5. Supprimer les marques vides créées par erreur ───────────────────────
console.log('\n=== 5. Nettoyage marques vides ===');
await deleteEmptyBrand('REPAIR & TROUBLESHOOTING');
await deleteEmptyBrand('ELECTRONIQUE ET LOISIRS MAGAZINE');
await deleteEmptyBrand('ELEKTOR');
await deleteEmptyBrand('TASIHMA');
await deleteEmptyBrand('WILEY PUBLISHING');
await deleteEmptyBrand('A2PRO');
// HAMEG conservé (autres docs Électronique légitimes)

console.log('\n=== Terminé ===');
