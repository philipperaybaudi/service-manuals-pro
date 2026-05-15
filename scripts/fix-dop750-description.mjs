/**
 * Patch ciblé : corrige la description du De Dietrich DOP750
 * qui mentionnait les langues du document (règle interdite).
 *
 * Usage : node scripts/fix-dop750-description.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG = 'de-dietrich-de-dietrich-dop750-user-guide';

const description_fr = `Guide complet d'utilisation du four encastrable DE DIETRICH DOP750. Le manuel couvre l'installation et le raccordement de l'appareil, la description des commandes et du tableau de bord, ainsi que le réglage des différents modes de cuisson disponibles. Les instructions détaillent l'utilisation des fonctions four, gril et chaleur tournante, avec les températures et durées recommandées selon les types d'aliments. Une section est consacrée au nettoyage et à l'entretien de l'appareil, incluant la pyrolyse lorsqu'elle est disponible. Le guide aborde également les accessoires fournis, leur utilisation optimale, ainsi que les conseils de sécurité à respecter lors de l'utilisation. Des tableaux de cuisson pratiques permettent de sélectionner rapidement les paramètres adaptés à chaque préparation.`;

const description_en = `Complete user guide for the DE DIETRICH DOP750 built-in oven. The manual covers installation and connection, description of controls and dashboard, and adjustment of the various available cooking modes. Instructions detail the use of conventional oven, grill and fan-assisted heat functions, with recommended temperatures and durations according to food types. A section is dedicated to cleaning and maintenance, including pyrolysis where available. The guide also addresses supplied accessories, their optimal use, and safety guidelines to follow during operation. Practical cooking charts allow quick selection of parameters suited to each preparation.`;

console.log(`\n=== Patch DOP750 description (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===\n`);
console.log(`Slug : ${SLUG}`);
console.log(`desc FR → ${description_fr.slice(0, 100)}...`);

if (!DRY_RUN) {
  const { error } = await supabase
    .from('documents')
    .update({ description: description_en, description_fr })
    .eq('slug', SLUG);

  if (error) { console.error(`❌ ${error.message}`); process.exit(1); }
  console.log(`✅ Mis à jour`);
} else {
  console.log(`[DRY-RUN] Aucune modification`);
}
