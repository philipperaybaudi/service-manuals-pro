// Update all EMCO descriptions to be in English only
// Usage: node scripts/update-emco-descriptions.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BRAND_ID = '7261ff4a-9840-4f3c-9a2e-ab59d3209606'; // EMCO

const corrections = {
  'emco-compact-5-lathe-user-manual': {
    description: 'French-language user manual for the EMCO Compact 5 benchtop metal lathe. Covers operating instructions, specifications, accessories, maintenance, setup, and lubrication guidelines for this precision machine tool.'
  },
  'machines-outil-notice-emco-compact-8': {
    description: 'User manual for the EMCO Compact 8 lathe. 125-page comprehensive documentation covering setup, machine components, control elements, working procedures, lathe accessories, backlash adjustment, lubrication plan, wiring schematic, and complete spare parts list.'
  },
  'emco-db-5-wood-lathe-betriebsanleitung-serviceteile': {
    description: 'German-language operating instructions and service parts list for the Emco DB-5 wood lathe (Drechselbank). Covers safety precautions, technical specifications (1000 mm turning length, 200 mm height, 400 mm diameter over bed, 600–2700 rpm), assembly, installation, and illustrated service parts. Ausgabe 7801, Ref. Nr. DE 2690.'
  },
  'emco-db-6-wood-lathe-betriebsanleitung-serviceteile': {
    description: 'German-language operating instructions and service parts list for the Emco DB-6 wood lathe (Drechselbank). Covers safety precautions, technical specifications (1000 mm length, 330 mm height, 330 mm diameter, 4 speeds: 550/910/1500/2500 rpm, 1 kW motor), assembly, operating procedures, and illustrated service parts. Best.-Nr. DE6 430.'
  },
  'emco-db-7-drechselbank-betriebsanleitung': {
    description: 'German-language operating instructions for the Emco Drechselbank DB 7 wood lathe. Covers safety precautions, technical specifications (1000 mm length, 330 mm height, 330 mm diameter, 4 speeds: 550/910/1500/2500 rpm at 50 Hz, 1 kW motor, IP 54 protection), operating procedures, and electrical safety standards compliance. Ausgabe 89-8, Ref. Nr. DE6 438.'
  },
  'emco-multistar-combination-woodworking-machine-user-manual': {
    description: 'User manual for the Emco Multistar combination woodworking machine (Model 23-48-030-00). Multi-function machine combining circular saw, jointer, thicknesser, and router functions. CE certified (EC Test Certificate 0070 050 C 5047 10 94, INRS). Comprehensive multilingual documentation.'
  },
  'emco-star-rex-holzbearbeitungsmaschine-betriebsanleitung': {
    description: 'German-language operating instructions for the Emco Star combination woodworking machine and Emco Rex jointer/thicknesser (Abrichte- und Dicktenhobelmaschine). Covers 16 different woodworking operations, safety requirements, assembly and setup, and operating procedures. Includes safety supplement for BRO compliance per Maschinenschutzgesetz and TÜV regulations.'
  },
  'emco-star-rex-machine-bois-multiple-mode-emploi': {
    description: 'French-language user manual for the Emco Star and Emco Rex combination woodworking machines. Covers 16 different woodworking operations with professional precision: circular saw, band saw, scroll saw, jointer, belt and disk sanding, routing, jointing, and planing. Includes assembly, installation, operating procedures for each function, and safety instructions.'
  },
  'emco-star-rex-machine-bois-multiple-mode-emploi-ed-7809': {
    description: 'French-language user manual for the Emco Star and Emco Rex combination woodworking machines (Edition 7809, Ref. FET 820). Covers 16 woodworking operations: circular saw, band saw, scroll saw, jointer, belt and disk sanding, routing, jointing, and planing. Includes assembly and complete operating procedures for each function.'
  },
  'emco-star-3000-junior-combination-woodworking-machine-user-manual': {
    description: 'User manual for the Emco Star 3000 Junior Fant combination woodworking machine (Model 23-90-030-00). Covers safety recommendations, installation dimensions, assembly, electrical connection, wiring diagram, technical specifications, and operating procedures for circular saw, jointer, thicknesser, and router with detailed safety and function descriptions. Multilingual: German, English, French, Spanish.'
  },
  'emco-unimat-3-mode-emploi-modo-de-empleo': {
    description: 'French and Spanish user manual for the Emco Unimat 3 universal mini machine tool. Precision lathe converting into drill press, milling machine, and grinder. Covers full range of machining operations on steel, plastic, and wood, accessories for routing, circular sawing, scroll sawing, planing, profile milling, operating procedures, and specifications. Ref. VS2 031, Auflage 7708.'
  },
  'machines-outil-emco-unimat-notice': {
    description: 'User manual for the EMCO Unimat lathe. 26-page comprehensive documentation for operating and maintaining this precision machine tool. Covers setup, specifications, operating procedures, accessories, and maintenance guidelines.'
  },
  'emco-woodworker-tf-10-tischfrase-betriebsanleitung': {
    description: 'German-language operating instructions for the Emco Woodworker TF 10 table router (Tischfräse). Covers safety requirements and devices, technical specifications, assembly including stand mounting, spindle setup, cutter guard, fence and stop adjustment, routing and milling procedures, tool mounting for various cutter types, maintenance, and electrical specifications. CE compliant per EG-Richtlinie 89/392/EWG. Ausgabe 1994, Ref. Nr. DE 6235.'
  },
  'emco-rex-b20-planing-thicknessing-machine-operating-instructions': {
    description: 'Operating instructions for the Emco-Rex B20 Planing and Thickening Machine. Covers assembly with dimensioned sketch for worktable, preparation, electrical connection, surfacing (jointing) with accident prevention guidance, thickening procedures with safety precautions, knife sharpening and replacement, maintenance, wiring diagrams for single and three-phase motors, and illustrated spare parts list.'
  },
  'machines-outil-emco-unimat-basic-pieces': {
    description: 'Parts catalog for the EMCO Unimat Basic lathe. 22-page illustrated parts list providing essential documentation for identifying, ordering, and maintaining components for this precision machine tool.'
  }
};

(async () => {
  console.log('Updating EMCO descriptions to English...\n');

  const slugs = Object.keys(corrections);
  let updated = 0;
  let errors = 0;

  for (const slug of slugs) {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ description: corrections[slug].description })
        .eq('slug', slug);

      if (error) {
        console.error(`❌ ${slug}: ${error.message}`);
        errors++;
      } else {
        console.log(`✅ ${slug}`);
        updated++;
      }
    } catch (e) {
      console.error(`❌ ${slug}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log(`Updated: ${updated}/${slugs.length}`);
  if (errors > 0) console.log(`Errors: ${errors}`);
  console.log('');
})();
