// Fix Lot 3 descriptions — replace French descriptions with English
// Usage: node scripts/fix-lot-3-descriptions.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fixes = [
  {
    slug: 'lurem-c2100-operators-manual',
    description: 'Complete operators manual for the LUREM C2100 combination woodworking machine. Covers installation, adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem C2100 Operators Manual. Complete guide for installation, adjustments, operation and maintenance of the C2100 combination woodworking machine.',
  },
  {
    slug: 'lurem-c260-s2-manual',
    description: 'Operators manual for the LUREM C260 S2 combination woodworking machine. Covers adjustments, safety and maintenance procedures.',
    seo_description: 'Download the Lurem C260 S2 Manual. Complete guide for operation and maintenance of the C260 S2 combination woodworking machine.',
  },
  {
    slug: 'lurem-c260e-c310e-manual',
    description: 'Operators manual for the LUREM C260E and C310E combination woodworking machines. Covers adjustments, safety and maintenance.',
    seo_description: 'Download the Lurem C260E / C310E Manual. Complete guide for operation and maintenance of the C260E and C310E combination woodworking machines.',
  },
  {
    slug: 'lurem-c310e-c260e-manual',
    description: 'Alternative edition of the operators manual for the LUREM C310E and C260E combination woodworking machines. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem C310E / C260E Manual — alternative edition. Complete guide for operation and maintenance of the C310E and C260E combination woodworking machines.',
  },
  {
    slug: 'lurem-c260n-user-manual',
    description: 'Operators manual for the LUREM C260N combination woodworking machine. Covers installation, adjustments, safety and maintenance.',
    seo_description: 'Download the Lurem C260N Operators Manual. Complete guide for installation, adjustments and maintenance of the C260N combination woodworking machine.',
  },
  {
    slug: 'lurem-c266-manual',
    description: 'Operators manual for the LUREM C266 combination woodworking machine. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem C266 Manual. Complete guide for operation and maintenance of the C266 combination woodworking machine.',
  },
  {
    slug: 'lurem-c2600-manual',
    description: 'Operators manual for the LUREM C2600 combination woodworking machine. Covers installation, adjustments and maintenance procedures.',
    seo_description: 'Download the Lurem C2600 Manual. Complete guide for operation and maintenance of the C2600 combination woodworking machine.',
  },
  {
    slug: 'lurem-c36-manual',
    description: 'Operators manual for the LUREM C36 combination woodworking machine. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem C36 Manual. Complete guide for operation and maintenance of the C36 combination woodworking machine.',
  },
  {
    slug: 'lurem-cb310hz-manual',
    description: 'Operators manual for the LUREM CB310 Hz combination woodworking machine with frequency inverter drive. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem CB310 Hz Manual. Complete guide for operation and maintenance of the CB310 Hz combination woodworking machine with frequency inverter.',
  },
  {
    slug: 'lurem-cb310sl-manual',
    description: 'Operators manual for the LUREM CB310SL combination woodworking machine. Covers installation, adjustments and maintenance procedures.',
    seo_description: 'Download the Lurem CB310SL Manual. Complete guide for operation and maintenance of the CB310SL combination woodworking machine.',
  },
  {
    slug: 'lurem-maxi26plus-manual',
    description: 'Operators manual for the LUREM Maxi 26 Plus combination woodworking machine. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem Maxi 26 Plus Manual. Complete guide for operation and maintenance of the Maxi 26 Plus combination woodworking machine.',
  },
  {
    slug: 'lurem-mf260l-cb260tl-manual',
    description: 'Operators manual for the LUREM MF260L and CB260TL woodworking machines. Covers adjustments, safety and maintenance.',
    seo_description: 'Download the Lurem MF260L / CB260TL Manual. Complete guide for operation and maintenance of the MF260L and CB260TL woodworking machines.',
  },
  {
    slug: 'lurem-optal26-manual',
    description: 'Operators manual for the LUREM Optal 26 surface planer and thicknesser. Covers adjustments, operation and maintenance.',
    seo_description: 'Download the Lurem Optal 26 Manual. Complete guide for operation and maintenance of the Optal 26 surface planer and thicknesser.',
  },
];

async function run() {
  console.log('=== Fix Lot 3 descriptions ===\n');
  let ok = 0, err = 0;

  for (const fix of fixes) {
    const { error } = await supabase
      .from('documents')
      .update({
        description: fix.description,
        seo_description: fix.seo_description,
      })
      .eq('slug', fix.slug);

    if (error) {
      console.log(`✗ ${fix.slug}: ${error.message}`);
      err++;
    } else {
      console.log(`✓ ${fix.slug}`);
      ok++;
    }
  }

  console.log(`\nMis à jour : ${ok}/${fixes.length} — Erreurs : ${err}`);
}

run().catch(console.error);
