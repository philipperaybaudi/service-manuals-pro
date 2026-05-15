/**
 * Correction directe des docs post-Lot-1 dont le slug contient "schema", "schematic"
 * ou "parts-list" et qui ont des descriptions trop longues.
 * Règle : ces docs doivent avoir une description courte et factuelle uniquement.
 *
 * Usage : node scripts/fix-post-lot1-schema-direct.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [
  // ── Bang & Olufsen schematics ─────────────────────────────────────────────
  {
    slug: 'bang-olufsen-bang-olufsen-beogram-8000-8002-6006-schematic-diagram',
    description:    'Complete electronic schematic diagram for Bang & Olufsen Beogram 8000, 8002 and 6006 turntables.',
    description_fr: 'Schéma électronique complet pour les platines vinyle Bang & Olufsen Beogram 8000, 8002 et 6006.',
  },
  {
    slug: 'bang-olufsen-beomaster-1900-2-type-2903-schematic-diagram',
    description:    'Electronic schematic diagram for the Bang & Olufsen Beomaster 1900-2 Type 2903.',
    description_fr: 'Schéma électronique du Bang & Olufsen Beomaster 1900-2 Type 2903.',
  },
  {
    slug: 'bang-olufsen-beomaster-4400-type-2417-schematic-diagrams',
    description:    'Complete schematic diagrams for the Bang & Olufsen Beomaster 4400 Type 2417 stereo receiver.',
    description_fr: 'Schémas électriques complets du récepteur stéréo Bang & Olufsen Beomaster 4400 Type 2417.',
  },
  {
    slug: 'bang-olufsen-beogram-5000-type-580x-582x-service-manual-schematic',
    description:    'Electrical schematic and service documentation for Bang & Olufsen Beogram 5000 Type 580x and 582x turntables.',
    description_fr: 'Schéma électrique et documentation de service pour les platines Bang & Olufsen Beogram 5000 types 580x et 582x.',
  },
  {
    slug: 'bang-olufsen-beogram-4002-6000-schematic-diagram',
    description:    'Complete schematic diagram for Bang & Olufsen Beogram 4002 Type 5501 and Beogram 6000 Type 5502 turntables.',
    description_fr: 'Schéma électrique complet pour les platines Bang & Olufsen Beogram 4002 Type 5501 et Beogram 6000 Type 5502.',
  },
  {
    slug: 'bang-olufsen-beolab-8000-service-manual-schematics',
    description:    'Electrical schematics for Bang & Olufsen Beolab 8000 active speaker system.',
    description_fr: 'Schémas électriques du système de haut-parleurs actifs Bang & Olufsen Beolab 8000.',
  },

  // ── Gaudillat — fascicules de schémas de radiorécepteurs ─────────────────
  {
    slug: 'gaudillat-gaudillat-radio-receiver-schematics-fascicule-1',
    description:    'Collection of detailed circuit schematics for radio receivers — Fascicule 1. Published by Société des Éditions Radio.',
    description_fr: 'Recueil de schémas électriques de radiorécepteurs — Fascicule 1. Édité par la Société des Éditions Radio.',
  },
  {
    slug: 'l-gaudillat-schemas-de-radiorecepteurs-fascicule-2',
    description:    'Collection of detailed circuit schematics for radio receivers — Fascicule 2. Published by Société des Éditions Radio.',
    description_fr: 'Recueil de schémas électriques de radiorécepteurs — Fascicule 2. Édité par la Société des Éditions Radio.',
  },
  {
    slug: 'gaudillat-radio-receiver-schematics-fascicule-3-gaudillat',
    description:    'Collection of detailed circuit schematics for radio receivers — Fascicule 3. Published by Société des Éditions Radio.',
    description_fr: 'Recueil de schémas électriques de radiorécepteurs — Fascicule 3. Édité par la Société des Éditions Radio.',
  },
  {
    slug: 'l-gaudillat-schemas-de-radiorecepteurs-fascicule-4',
    description:    'Collection of detailed circuit schematics for radio receivers — Fascicule 4. Published by Société des Éditions Radio.',
    description_fr: 'Recueil de schémas électriques de radiorécepteurs — Fascicule 4. Édité par la Société des Éditions Radio.',
  },

  // ── STIHL — listes de pièces détachées ───────────────────────────────────
  {
    slug: 'stihl-stihl-fr-350-fr-450-fr-480-spare-parts-list',
    description:    'Official illustrated spare parts list for STIHL FR 350, FR 450 and FR 480 brushcutter models.',
    description_fr: 'Liste officielle illustrée des pièces de rechange pour les débroussailleuses STIHL FR 350, FR 450 et FR 480.',
  },
  {
    slug: 'stihl-stihl-fr460tc-em-brush-cutter-parts-list',
    description:    'Official illustrated parts list for the STIHL FR460 TC-EM brush cutter.',
    description_fr: 'Liste officielle illustrée des pièces détachées pour la débroussailleuse STIHL FR460 TC-EM.',
  },
  {
    slug: 'stihl-stihl-ms290-ms310-ms390-spare-parts-list',
    description:    'Official illustrated spare parts list for STIHL MS 290, MS 310 and MS 390 chainsaw models.',
    description_fr: 'Liste officielle illustrée des pièces de rechange pour les tronçonneuses STIHL MS 290, MS 310 et MS 390.',
  },

  // ── Singer — listes de pièces illustrées ─────────────────────────────────
  {
    slug: 'singer-singer-212g140-212g141-212g145-212g146-illustrated-parts-list',
    description:    'Illustrated parts list for Singer industrial sewing machines models 212G140, 212G141, 212G145 and 212G146.',
    description_fr: 'Liste illustrée des pièces détachées pour les machines à coudre industrielles Singer 212G140, 212G141, 212G145 et 212G146.',
  },
  {
    slug: 'singer-singer-2491d-instruction-manual-illustrated-parts-list',
    description:    'Instruction manual and illustrated parts list for Singer 2491D sewing machines, models 200A and 300A.',
    description_fr: 'Manuel d\'instruction et liste illustrée des pièces pour les machines à coudre Singer 2491D, modèles 200A et 300A.',
  },
  {
    slug: 'singer-singer-99-24-parts-list',
    description:    'Parts list for the Singer Model 99-24 lock stitch sewing machine.',
    description_fr: 'Liste des pièces détachées pour la machine à coudre Singer modèle 99-24 à point noué.',
  },

  // ── UNAOHM ────────────────────────────────────────────────────────────────
  {
    slug: 'unaohm-oscilloscope-unaohm-g4030-electronic-schema',
    description:    'Electronic schematic for the UNAOHM G4030 oscilloscope.',
    description_fr: 'Schéma électronique de l\'oscilloscope UNAOHM G4030.',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Fix post-Lot-1 schema/parts-list (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) — ${fixes.length} docs ===\n`);

let ok = 0, fail = 0;

for (const fix of fixes) {
  const { error } = DRY_RUN
    ? { error: null }
    : await supabase.from('documents').update({
        description:    fix.description,
        description_fr: fix.description_fr,
      }).eq('slug', fix.slug);

  if (error) {
    console.error(`❌ ${fix.slug} : ${error.message}`);
    fail++;
  } else {
    console.log(`${DRY_RUN ? '[DRY-RUN]' : '✅'} ${fix.slug}`);
    console.log(`   EN : ${fix.description}`);
    console.log(`   FR : ${fix.description_fr}`);
    ok++;
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
