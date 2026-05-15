// Update LUREM document descriptions based on source PDFs analysis
// Usage: node scripts/update-lurem-descriptions.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Manual mappings of LUREM documents to corrected descriptions
const corrections = {
  'lurem-c20-manual': {
    description: 'Complete instruction manual for the LUREM C20 combination woodworking machine. Covers setup, specifications, operating procedures, safety guidelines, and maintenance instructions for this versatile multi-function machine tool.'
  },
  'menuiserie-lurem-c20': {
    description: '42-page user manual for the LUREM C20 combination woodworking machine. Comprehensive documentation covering operation, specifications, safety procedures, and maintenance for this classic woodworking machine.'
  },
  'lurem-c200-c210-c260-manual': {
    description: 'Instruction manual covering the LUREM C200, C210, and C260 combination woodworking machines. Complete documentation for these three popular models with setup, operating procedures, safety guidelines, and maintenance instructions.'
  },
  'menuiserie-lurem-c2000': {
    description: 'Complete user and maintenance manual for the LUREM C2000 combination woodworking machine. Covers setup, operating procedures, technical specifications, maintenance schedules, and troubleshooting for this industrial-grade machine.'
  },
  'menuiserie-lurem-c2100-eclate': {
    description: '13-page exploded views with detailed parts lists for the LUREM C2100 combination woodworking machine. Illustrated guide for identifying, locating, and ordering replacement parts and assemblies.'
  },
  'menuiserie-lurem-c210b-notice': {
    description: '59-page complete workshop manual for the LUREM C210B universal woodworking machine. Comprehensive documentation with assembly instructions, technical specifications, operating procedures, and parts information.'
  },
  'lurem-c210b-operating-instructions': {
    description: 'Complete operating instructions and spare parts list for the LUREM C210B 8-inch combination woodworking machine. Detailed guide covering setup, operation, maintenance, safety procedures, and illustrated parts catalog.'
  },
  'menuiserie-lurem-c2600-notice': {
    description: '56-page user manual for the LUREM C2600 combination woodworking machine. Complete documentation with setup instructions, technical specifications, operating procedures, safety guidelines, and maintenance information.'
  },
  'menuiserie-notice-lurem-c310e-c260e': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C310e and C260e combination woodworking machines. Technical reference for electrical system troubleshooting and maintenance.'
  },
  'menuiserie-lurem-c200-210-260-notice': {
    description: '23-page user manual for the LUREM C200, C210, and C260 combination woodworking machines. Covers operating procedures, maintenance schedules, safety precautions, and basic troubleshooting for these models.'
  },
  'lurem-c260j-user-maintenance-manual': {
    description: 'User and maintenance manual for the LUREM C260J jointer-planer combination machine. Complete documentation covering setup, operating procedures, maintenance schedules, and safety guidelines for this specialized woodworking tool.'
  },
  'lurem-c260n-electrical-wiring-diagrams': {
    description: 'Complete electrical wiring diagrams and schematics for the LUREM C260N combination woodworking machine. Technical reference for electrical troubleshooting, maintenance, and component identification.'
  },
  'lurem-c260n-user-maintenance-manual-french': {
    description: 'User and maintenance manual for the LUREM C260N combination woodworking machine. Comprehensive documentation with setup instructions, operating procedures, maintenance schedules, safety guidelines, and illustrated parts diagrams.'
  },
  'lurem-c260s2-user-maintenance-manual': {
    description: 'User and maintenance manual for the LUREM C260S2 combination woodworking machine. Complete documentation covering assembly, operation, maintenance, safety procedures, and troubleshooting for this versatile machine.'
  },
  'menuiserie-schemas-c263-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C263 combination woodworking machine. Technical reference for electrical maintenance, troubleshooting, and component location.'
  },
  'menuiserie-schemas-c265-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C265 combination woodworking machine. Technical reference documentation for electrical system analysis and maintenance.'
  },
  'lurem-c266-electrical-wiring-diagrams': {
    description: 'Complete electrical wiring diagrams and schematics for the LUREM C266 combination woodworking machine. Technical reference for electrical troubleshooting, maintenance, and system diagnostics.'
  },
  'menuiserie-lurem-c266-manuel': {
    description: 'Complete user manual for the LUREM C266 combination woodworking machine. Comprehensive documentation with setup instructions, operating procedures, electrical schematics, maintenance schedules, and safety guidelines.'
  },
  'menuiserie-documentation-lurem-former-310-sti': {
    description: 'Complete parts catalog with exploded views for the LUREM C310 STI combination woodworking machine. Illustrated guide for identifying and ordering all replacement parts and assemblies.'
  },
  'menuiserie-schemas-c310i-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C310i combination woodworking machine. Technical reference for electrical maintenance and troubleshooting.'
  },
  'menuiserie-lurem-c310si-user-manual': {
    description: '80-page comprehensive documentation for the LUREM C310SI combination woodworking machine. Covers setup, technical specifications, operating procedures, electrical schematics, maintenance schedules, and safety guidelines.'
  },
  'menuiserie-schemas-c310sti-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C310sti combination woodworking machine. Technical reference for electrical system analysis and component identification.'
  },
  'menuiserie-schemas-c310sx-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C310SX combination woodworking machine. Technical reference for electrical troubleshooting and maintenance.'
  },
  'menuiserie-schemas-c311-france': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C311 combination woodworking machine. Technical reference documentation for electrical system analysis.'
  },
  'menuiserie-schemas-lurem-c315': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C315 combination woodworking machine. Technical reference for electrical maintenance and troubleshooting.'
  },
  'menuiserie-schemas-lurem-c317': {
    description: 'Complete electrical schematics and wiring diagrams for the LUREM C317 combination woodworking machine. Technical reference for electrical system analysis and maintenance.'
  },
  'menuiserie-lurem-c36': {
    description: 'Complete documentation for the LUREM C36 woodworking machine. Covers setup, technical specifications, operating procedures, maintenance schedules, and safety guidelines for this compact woodworking tool.'
  },
  'menuiserie-lurem-c360-c410': {
    description: '29-page user manual for the LUREM C360 and C410 combination woodworking machines. Comprehensive documentation with operating procedures, maintenance information, safety guidelines, and technical specifications.'
  },
  'lurem-c410n-user-maintenance-manual': {
    description: 'User and maintenance manual for the LUREM C410N combination woodworking machine. Complete documentation with setup instructions, operating procedures, maintenance schedules, safety procedures, and illustrated parts lists.'
  },
  'menuiserie-lurem-c7-compact-7': {
    description: '41-page complete documentation for the LUREM C7 Compact 7 combination woodworking machine. Covers setup, operating procedures, maintenance, technical specifications, safety guidelines, and troubleshooting.'
  },
  'menuiserie-lurem-cb310rlrlx-eclate': {
    description: '62-page exploded views with detailed parts lists for the LUREM CB 310 RL and RLX combination woodworking machines. Illustrated guide for identifying, locating, and ordering all replacement components and assemblies.'
  },
  'menuiserie-lurem-cb310sl-eclates': {
    description: '28-page exploded views with parts lists for the LUREM CB 310 SL combination woodworking machine. Detailed illustrated guide for identifying and ordering replacement parts.'
  },
  'menuiserie-lurem-cb310hz-v2': {
    description: 'Complete documentation for the LUREM CB310HZ combination woodworking machine. Covers setup, operating procedures, maintenance, technical specifications, electrical schematics, and safety guidelines.'
  },
  'menuiserie-lurem-cb310sl': {
    description: 'Complete user manual for the LUREM CB310SL combination woodworking machine. Comprehensive documentation with setup instructions, operating procedures, maintenance information, and safety guidelines.'
  },
  'menuiserie-lurem-cb410-rlx-eclates': {
    description: 'Exploded views with detailed parts lists for the LUREM CB410RLX combination woodworking machine. Illustrated guide for identifying, locating, and ordering all replacement parts and assemblies.'
  },
  'lurem-dahlander-motor-switch-replacement': {
    description: 'Technical guide for replacing the Dahlander motor switch on LUREM woodworking machines. Step-by-step instructions for this common maintenance procedure with safety precautions and specifications.'
  },
  'menuiserie-lurem-former-310-si-eclates': {
    description: '33-page exploded views with parts lists for the LUREM FORMER 260 SI combination woodworking machine. Detailed illustrated guide for identifying and ordering replacement components.'
  },
  'menuiserie-lurem-former-260s-eclate': {
    description: '32-page exploded views with detailed parts lists for the LUREM FORMER 260 STI combination woodworking machine. Illustrated guide for identifying all replacement parts and assemblies.'
  },
  'lurem-former-260s-exploded-views-parts-lists': {
    description: 'Exploded views with complete parts lists for the LUREM Former 260S combination woodworking machine. Detailed illustrated guide for identifying, locating, and ordering replacement components and parts.'
  },
  'lurem-former-310s-exploded-views-parts-lists': {
    description: 'Exploded views with complete parts lists for the LUREM Former 310S combination woodworking machine. Detailed illustrated guide for identifying and ordering all replacement parts and assemblies.'
  },
  'lurem-former-310si-exploded-views-parts-lists': {
    description: 'Exploded views with detailed parts lists for the LUREM Former 310SI combination woodworking machine. Comprehensive illustrated guide for identifying and ordering replacement components.'
  },
  'lurem-former-310st-exploded-views-parts-lists': {
    description: 'Exploded views with complete parts lists for the LUREM Former 310ST combination woodworking machine. Detailed illustrated guide for identifying and ordering replacement parts and assemblies.'
  },
  'lurem-former-310sti-exploded-views': {
    description: 'Exploded views with detailed parts lists for the LUREM Former 310STI combination woodworking machine. Comprehensive illustrated guide for identifying, locating, and ordering all replacement components.'
  },
  'lurem-former-rd30-rd26-manual': {
    description: '38-page user manual for the LUREM Former RD30 and RD26 thicknesser machines. Complete documentation covering setup, operating procedures, maintenance, safety guidelines, and technical specifications for these woodworking tools.'
  },
  'lurem-maxi-26-plus-exploded-views': {
    description: 'Exploded views with detailed parts lists for the LUREM Maxi 26 Plus combination woodworking machine. Comprehensive illustrated guide for identifying, locating, and ordering all replacement components and parts.'
  },
  'lurem-maxi-26-plus-technical-manual': {
    description: 'Complete technical manual for the LUREM Maxi 26 Plus combination woodworking machine. Comprehensive documentation with setup instructions, technical specifications, operating procedures, maintenance schedules, and safety guidelines.'
  },
  'menuiserie-lurem-mf260l-cb260tl-manuel': {
    description: 'Complete documentation for the LUREM MF260L and CB260TL combination woodworking machines. Covers setup, operating procedures, maintenance information, electrical schematics, and safety guidelines for these models.'
  },
  'menuiserie-lurem-optal-26-pieces': {
    description: 'Exploded views with parts lists for the LUREM OPTAL 26 combination woodworking machine. Detailed illustrated guide for identifying and ordering replacement components and parts.'
  },
  'lurem-optal-26-technical-manual': {
    description: 'Complete technical manual for the LUREM Optal 26 combination woodworking machine. Comprehensive documentation with setup instructions, technical specifications, operating procedures, maintenance, and safety information.'
  },
  'lurem-optimake-router-table-manual': {
    description: '38-page complete user manual for the LUREM Optimake router table (defonceuse). Comprehensive documentation covering setup, operating procedures, maintenance, safety guidelines, and technical specifications.'
  },
  'menuiserie-lurem-maxi26-plus': {
    description: 'Complete documentation for the LUREM RD26F woodworking machine. Covers setup, operating procedures, maintenance schedules, safety guidelines, and technical specifications for this specialized machine tool.'
  },
  'menuiserie-lurem-rd41e-eclates': {
    description: 'Exploded views with parts lists for the LUREM RD41e thicknesser machine. Detailed illustrated guide for identifying and ordering replacement components and parts.'
  },
  'menuiserie-lurem-router-7-manuel-utilisation': {
    description: 'Complete documentation for the LUREM Router 7 woodworking tool. Covers setup, operating procedures, maintenance, safety guidelines, and technical specifications for this routing machine.'
  },
  'menuiserie-lurem-sar-400': {
    description: 'Complete documentation for the LUREM SAR 400 woodworking machine. Covers setup, operating procedures, maintenance, safety guidelines, and technical specifications for this specialized machine tool.'
  },
  'menuiserie-lurem-sc25': {
    description: 'Complete documentation for the LUREM SC25 woodworking machine. Covers setup, operating procedures, maintenance schedules, safety guidelines, and technical specifications.'
  },
  'lurem-solo-4-manual': {
    description: '27-page user and maintenance manual for the LUREM Solo 4 woodworking machine. Complete documentation with setup instructions, operating procedures, maintenance schedules, safety guidelines, and illustrated parts diagrams.'
  },
  'menuiserie-lurem-t180-eclates': {
    description: 'Exploded views with parts lists for the LUREM T180 woodworking machine. Detailed illustrated guide for identifying and ordering replacement components and parts.'
  },
  'menuiserie-lurem-t30n': {
    description: 'Complete documentation for the LUREM T30N woodworking machine. Covers setup, operating procedures, maintenance schedules, safety guidelines, and technical specifications.'
  },
  'menuiserie-lurem-tb1250-eclates': {
    description: 'Exploded views with parts lists for the LUREM TB1250 woodworking machine. Detailed illustrated guide for identifying and ordering replacement components and parts.'
  },
  'menuiserie-schemas-lurem-c360n-c410n-c510n': {
    description: '21-page user manual and electrical schematics for the LUREM C360N, C410N, and C510N combination woodworking machines. Complete technical reference for operation and electrical maintenance.'
  },
  'menuiserie-lurem-c260n-manual-gb-hd': {
    description: '17-page exploded views with detailed parts lists for the LUREM C260N combination woodworking machine. Comprehensive illustrated guide for identifying and ordering replacement parts and assemblies.'
  }
};

(async () => {
  console.log('Updating LUREM document descriptions...\n');

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
