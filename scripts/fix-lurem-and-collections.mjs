/**
 * Corrections ciblées :
 *   - 7 docs LUREM (descriptions FR en anglais, title_fr identiques, langue mélangée)
 *   - 2 collections protégées (title_fr absent ou identique à EN)
 *   - 1 doc ATELIER (descriptions trop courtes)
 *
 * Usage : node scripts/fix-lurem-and-collections.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [

  // ── LUREM — descriptions FR entièrement en anglais (critique) ──────────────
  {
    slug: 'lurem-lc260-wiring-diagrams',
    description:    'Three-phase electrical wiring diagrams for the LUREM LC260 combination woodworking machine. Single 1.5 kW braked motor configuration.',
    description_fr: 'Schémas de câblage électrique triphasé pour la machine à bois combinée LUREM LC260. Configuration moteur freiné unique de 1,5 kW.',
  },
  {
    slug: 'lurem-optal26-parts-list',
    description:    'Parts list for the LUREM Optal 26 surface planer and thicknesser. Complete numbered component reference for all assemblies.',
    description_fr: 'Liste des pièces détachées pour la raboteuse-dégauchisseuse LUREM Optal 26. Référencement complet et numéroté de tous les sous-ensembles.',
  },
  {
    slug: 'lurem-ts41sti-parts-list',
    description:    'Exploded views and parts list for the LUREM TS 41 STI spindle moulder. Complete numbered part diagrams with reference listing.',
    description_fr: 'Vues éclatées et liste des pièces détachées pour le toupie LUREM TS 41 STI. Schémas numérotés complets avec liste de référencement.',
  },

  // ── LUREM — description EN contient des mots français ─────────────────────
  {
    slug: 'lurem-sar500-600-700-parts',
    description:    'Spare parts catalog for LUREM SAR 500, 600, 700 and 800 CE band saw models. Complete numbered component reference for identification and ordering of replacement parts.',
    description_fr: 'Catalogue des pièces de rechange pour les scies à ruban LUREM modèles SAR 500, 600, 700 et 800 CE. Référencement complet et numéroté pour l\'identification et la commande des pièces.',
  },

  // ── LUREM — description FR contient des mots anglais ──────────────────────
  {
    slug: 'lurem-protecteur-sf',
    description:    'Complete documentation for the LUREM Protecteur S.F., a safety guard designed for spindle moulder and shaft work. Covers installation, adjustment and safe use of the guard assembly.',
    description_fr: 'Documentation complète du Protecteur S.F. LUREM, un dispositif de sécurité conçu pour le travail à la toupie et aux arbres. Couvre l\'installation, le réglage et l\'utilisation en sécurité du protecteur.',
  },

  // ── LUREM — title_fr identique au titre EN (ces titres sont déjà en français) ─
  // "LUREM MF260L / CB260TL — Manuel" → title_fr correct tel quel, juste forcer la valeur
  {
    slug: 'lurem-mf260l-cb260tl-manual',
    title_fr: 'LUREM MF260L / CB260TL — Manuel',
  },
  {
    slug: 'lurem-optal26-manual',
    title_fr: 'LUREM Optal 26 — Manuel',
  },

  // ── Collections protégées — title_fr absent ou identique ──────────────────
  // Règle : noms de collections intouchables → title_fr = titre EN (déjà correct)
  {
    slug: 'collection-antique-trader-cameras-price-guide-complete',
    title_fr: 'Antique Trader Cameras and Photographica Price Guide',
  },
  {
    slug: 'collection-russian-and-soviet-cameras-1840-1991',
    title_fr: 'Russian & Soviet Cameras 1840-1991',
  },

  // ── ATELIER — descriptions trop courtes ───────────────────────────────────
  {
    slug: 'atelier-how-to-use-battery-tubes-technical-guide',
    description:    'Technical guide on the proper use and maintenance of battery-powered vacuum tubes. Covers the operating principles of battery tubes, their correct installation, precautions to take during use, and practical advice for extending tube life. Suitable for radio amateurs and technicians working with vintage battery-operated equipment.',
    description_fr: 'Guide technique sur l\'utilisation correcte et l\'entretien des tubes à batteries. Aborde les principes de fonctionnement des tubes à batteries, leur installation correcte, les précautions à respecter lors de l\'utilisation et des conseils pratiques pour prolonger la durée de vie des tubes. Convient aux radioamateurs et techniciens travaillant avec des équipements vintage alimentés par batteries.',
  },

];

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Fix LUREM + Collections (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) — ${fixes.length} docs ===\n`);

let ok = 0, fail = 0;

for (const fix of fixes) {
  const update = {};
  if (fix.description    !== undefined) update.description    = fix.description;
  if (fix.description_fr !== undefined) update.description_fr = fix.description_fr;
  if (fix.title_fr       !== undefined) update.title_fr       = fix.title_fr;

  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${fix.slug}`);
    if (fix.title_fr)       console.log(`   title_fr       → ${fix.title_fr}`);
    if (fix.description)    console.log(`   description    → ${fix.description.slice(0, 80)}...`);
    if (fix.description_fr) console.log(`   description_fr → ${fix.description_fr.slice(0, 80)}...`);
    ok++;
    continue;
  }

  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('slug', fix.slug);

  if (error) {
    console.error(`❌ ${fix.slug} : ${error.message}`);
    fail++;
  } else {
    console.log(`✅ ${fix.slug}`);
    ok++;
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
