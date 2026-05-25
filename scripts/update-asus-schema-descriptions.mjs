/**
 * update-asus-schema-descriptions.mjs
 * =====================================
 * Raccourcit les descriptions des schémas ASUS (slug contient "schematic" ou "schema").
 * Règle pipeline : "schema → short factual description only"
 *
 * Usage :
 *   node scripts/update-asus-schema-descriptions.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN  = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Récupérer la category_id de computers-it
const { data: cats } = await supabase
  .from('categories')
  .select('id')
  .eq('slug', 'computers-it')
  .single();
const categoryId = cats.id;

// Récupérer tous les docs ASUS avec "schematic" ou "schema" dans le slug
const { data: docs, error } = await supabase
  .from('documents')
  .select('id, slug, title, title_fr, description, description_fr')
  .eq('category_id', categoryId)
  .or('slug.ilike.%schematic%,slug.ilike.%schema%')
  .order('slug');

if (error) { console.error('Erreur Supabase :', error.message); process.exit(1); }

console.log(`Schémas ASUS trouvés : ${docs.length}`);
if (DRY_RUN) console.log('MODE DRY-RUN — aucune modification');
console.log();

/**
 * Génère une description courte et factuelle depuis le titre.
 * Format : "Schematic diagram for [model]. Circuit diagrams and component layout."
 */
function buildShortDesc(titleEn, titleFr) {
  // Nettoyer le titre pour extraire le modèle
  const modelEn = titleEn
    .replace(/schematic(s)?/gi, '')
    .replace(/diagram(s)?/gi, '')
    .replace(/technical specifications?/gi, '')
    .replace(/motherboard/gi, 'motherboard')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^(for|of|and|the)\s+/i, '')
    .trim();

  const modelFr = titleFr
    .replace(/schéma(s)?/gi, '')
    .replace(/électronique(s)?/gi, '')
    .replace(/diagramme(s)?/gi, '')
    .replace(/de la carte mère/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^(de|du|des|pour|le|la|les)\s+/i, '')
    .trim();

  const descEn = `Schematic diagram for ${modelEn || titleEn}. Circuit diagrams and component connections for technical reference and repair.`;
  const descFr = `Schéma électronique pour ${modelFr || titleFr}. Diagrammes de circuits et connexions des composants pour référence technique et réparation.`;

  return { descEn, descFr };
}

let updated = 0;
let errors  = 0;

for (const doc of docs) {
  const { descEn, descFr } = buildShortDesc(doc.title, doc.title_fr);

  if (DRY_RUN) {
    console.log(`  ${doc.slug}`);
    console.log(`    EN : ${descEn}`);
    console.log(`    FR : ${descFr}`);
    console.log();
    updated++;
    continue;
  }

  const { error: updateErr } = await supabase
    .from('documents')
    .update({ description: descEn, description_fr: descFr })
    .eq('id', doc.id);

  if (updateErr) {
    console.log(`  ✗ ERREUR ${doc.slug} : ${updateErr.message}`);
    errors++;
  } else {
    console.log(`  ✓ ${doc.slug}`);
    updated++;
  }
}

console.log();
console.log(`Terminé — ${updated} mis à jour | ${errors} erreurs`);
