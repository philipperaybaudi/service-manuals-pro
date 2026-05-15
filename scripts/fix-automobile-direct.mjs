/**
 * Corrections directes des descriptions automobile - pas besoin de lire les PDFs
 *
 * Traite 4 documents (HTML, langue mélangée) :
 * 1. mini-cooper-rover-manuel-76-89  — HTML → prose (328p, chapitres réels)
 * 2. renault-scenic-2-climatisation  — HTML → prose (135p, chapitres réels)
 * 3. renault-scenic-2-equipement-el  — HTML → prose + "camera" erroné
 * 4. toyota-manuel-moteur-1hd-ft     — HTML + langue mélangée
 *
 * Exclus (traités par d'autres scripts) :
 *  - yamaha-* : rewrite-yamaha-automobile.mjs (lecture PDF)
 *  - simca    : fix-simca-and-wv.mjs (lecture PDF)
 *
 * Usage : node scripts/fix-automobile-direct.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fixes = [
  {
    slug: 'mini-cooper-rover-manuel-76-89-complete',
    // 328 pages. Chapitres réels visibles dans le HTML d'origine.
    description: 'Factory workshop manual for the Mini Cooper, covering model years 1976 to 1989. This 328-page document covers all vehicle systems: engines and engine variants, anti-pollution systems, fuel system, cooling circuit, exhaust manifold and silencer, clutch, manual and automatic gearboxes, drive shafts, final drive reduction, steering, rubber cone suspensions, brakes, bodywork, heating and ventilation, wiper and washer systems, electrical equipment and wiring harness diagrams, and instrument cluster.',
    description_fr: "Manuel d'atelier d'usine pour la Mini Cooper, couvrant les années modèles 1976 à 1989. Ce document de 328 pages couvre l'ensemble des systèmes du véhicule : motorisations, antipollution, alimentation, circuit de refroidissement, collecteur et échappement, embrayage, boîtes de vitesses manuelle et automatique, arbres de roue, réduction finale, direction, suspensions à cône en caoutchouc, freins, carrosserie, chauffage et ventilation, essuie-glaces et lave-glaces, équipement électrique et schémas des faisceaux, et instruments.",
  },

  {
    slug: 'renault-scenic-2-climatisation-complete',
    // 135 pages. Chapitres réels du système Renault visibles dans le HTML d'origine.
    description: 'Official Renault service manual for the Scenic 2 air conditioning system, 135 pages. Covers diagnostic procedures for two distinct systems, with function architecture, general operating mode, configuration readings, conformity verification, customer effects, and fault location decision trees. Each section includes detailed diagnostic sheets, electronic control unit channel assignments, configurations and learning procedures, fault summary tables, fault code interpretation, and state and parameter interpretation.',
    description_fr: "Manuel de service officiel Renault pour la climatisation du Scenic 2, 135 pages. Couvre les procédures de diagnostic pour deux systèmes distincts : architecture de la fonction, mode de fonctionnement général, lectures de configurations, contrôle de conformité, effets clients, et arbres de localisation des pannes. Chaque section comprend des fiches de diagnostic détaillées, l'affectation des voies du calculateur, les configurations et apprentissages, le récapitulatif des défauts, l'interprétation des défauts, des états et des paramètres.",
  },

  {
    slug: 'renault-scenic-2-equipement-electrique-complete',
    // 627 pages. Chapitres réels. La description d'origine disait "this camera" (erreur de catégorie !)
    description: 'Official Renault service manual for the electrical equipment of the Scenic 2, 627 pages. Covers system operation diagnostics, electronic control unit channel assignments, component replacement procedures, command and fault interpretation, conformity verification, state and parameter interpretation, customer effects, and fault location decision trees. Includes configurations and learning procedures and a comprehensive fault summary table.',
    description_fr: "Manuel de service officiel Renault pour l'équipement électrique du Scenic 2, 627 pages. Couvre le diagnostic du fonctionnement système, l'affectation des voies du calculateur, les procédures de remplacement des organes, l'interprétation des commandes et des défauts, le contrôle de conformité, l'interprétation des états et des paramètres, les effets client et les arbres de localisation des pannes. Comprend les configurations et apprentissages ainsi qu'un tableau récapitulatif complet des défauts.",
  },

  {
    slug: 'toyota-manuel-moteur-1hd-ft',
    // 258 pages. Description d'origine : HTML + mélange FR/EN.
    description: 'Complete workshop manual for the Toyota 1HD-FT engine. This 258-page factory service document covers maintenance, repair and troubleshooting procedures for this diesel engine.',
    description_fr: 'Manuel d\'atelier complet pour le moteur Toyota 1HD-FT. Ce document d\'usine de 258 pages couvre les procédures de maintenance, de réparation et de dépannage de ce moteur diesel.',
  },

];

// ─── Main ────────────────────────────────────────────────────────────────────
let ok = 0;
let fail = 0;

for (const fix of fixes) {
  const update = {};
  if (fix.title !== undefined) update.title = fix.title;
  if (fix.description !== undefined) update.description = fix.description;
  if (fix.description_fr !== undefined) update.description_fr = fix.description_fr;

  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('slug', fix.slug);

  if (error) {
    console.error(`❌ ${fix.slug}: ${error.message}`);
    fail++;
  } else {
    console.log(`✅ ${fix.slug}`);
    ok++;
  }
}

console.log(`\nTerminé : ${ok} OK, ${fail} erreurs.`);
