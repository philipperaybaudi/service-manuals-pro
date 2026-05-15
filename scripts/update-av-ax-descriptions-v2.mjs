// Update descriptions v2 — based on OCR results
// Usage: node scripts/update-av-ax-descriptions-v2.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Only docs that need corrections after OCR analysis
const updates = [

  // ── SM1000: also contains adjustment notes (Notes de réglage — meules) ────
  {
    slug: 'alligator-sm1000-manual',
    newTitle: 'Alligator SM 1000 Adjustment Notes & Parts List',
    description: 'Adjustment notes and illustrated parts catalogue for the Alligator SM 1000 band saw blade sharpening machine (affûteuse). Includes a detailed exploded view diagram, notes on grinding wheel quality, dimensions, mounting, balancing and profiling (with optional profiling and balancing attachments), and complete numbered parts list with reference codes. Document in French.',
    seo_description: 'Download the Alligator SM 1000 Adjustment Notes & Parts List. Exploded view, grinding wheel specifications and complete parts catalogue.',
  },

  // ── JED 63: specific content found by OCR ─────────────────────────────────
  {
    slug: 'alligator-jed-63-manual',
    newTitle: 'Alligator JED 63 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 63 band saw blade sharpening machine (affûteuse). Covers blade placement procedure, cam selection and adjustment for desired tooth profile and pitch, guide and flywheel setup, grinding wheel profile and thickness selection based on tooth pitch, grinding depth and wheel speed settings, and complete numbered parts list. Document in French.',
    seo_description: 'Download the Alligator JED 63 Adjustment Guide & Parts List. Blade setup, cam and grinding wheel adjustment, complete parts catalogue.',
  },

  // ── JED 65: has full Notice d'utilisation + CE declaration ────────────────
  {
    slug: 'alligator-jed-65-manual',
    newTitle: 'Alligator JED 65 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 65 band saw blade sharpening machine, with carousel for blades up to 200 mm wide. Includes operating preamble, CE Declaration of Conformity, blade placement and carousel adjustment, cam selection for tooth profile and pitch, grinding wheel profile and thickness guide, and complete numbered parts list. Document in French.',
    seo_description: 'Download the Alligator JED 65 Adjustment Guide & Parts List. Blade carousel setup, cam adjustment, grinding wheel guide and complete parts catalogue.',
  },

  // ── JED 73: specific content found by OCR ─────────────────────────────────
  {
    slug: 'alligator-jed-73-manual',
    newTitle: 'Alligator JED 73 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 73 band saw blade sharpening machine, with carousel for blades up to 180 mm wide. Covers blade placement on carousel, pusher alignment and eccentric adjustment, cam selection for tooth profile and pitch, grinding wheel profile and thickness selection, grinding depth adjustment, and complete numbered parts list. Document in French.',
    seo_description: 'Download the Alligator JED 73 Adjustment Guide & Parts List. Carousel blade setup, cam and grinding wheel adjustment, complete parts catalogue.',
  },

  // ── JED 75: full Notice d'utilisation + CE declaration ────────────────────
  {
    slug: 'alligator-jed-75-manual',
    newTitle: 'Alligator JED 75 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 75 band saw blade sharpening machine. Includes operating preamble, CE Declaration of Conformity, blade and carousel placement, cam selection for desired tooth profile and pitch, grinding wheel specifications, grinding depth and speed settings, and complete numbered parts list. Document in French.',
    seo_description: 'Download the Alligator JED 75 Adjustment Guide & Parts List. Blade setup, cam and grinding wheel adjustment, complete parts catalogue.',
  },

  // ── NM 1 & 2: specific content found by OCR ───────────────────────────────
  {
    slug: 'alligator-nm-1-2-manual',
    newTitle: 'Alligator NM 1 & 2 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 1 and NM 2 saw tooth setting machines (appareils à écraser). Covers anvil alignment on tooth back, eccentric and setting lever adjustment, optimum end-of-stroke setting, tooth preparation before setting, eccentric lubrication, and complete numbered parts list with reference codes. Document in French.',
    seo_description: 'Download the Alligator NM 1 & 2 Adjustment Guide & Parts List. Saw tooth setting procedure, anvil and eccentric adjustment, complete parts catalogue.',
  },

  // ── NM3: specific content found by OCR ────────────────────────────────────
  {
    slug: 'alligator-nm3-manual',
    newTitle: 'Alligator NM 3 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 3 saw tooth setting machine (appareil à écraser). Includes labelled component diagram (eccentric lever, clamping lever, stop collar, adjustable stop, guide block), operating positions A and B for eccentric lever with adjustment instructions, and complete numbered parts list. Document in French.',
    seo_description: 'Download the Alligator NM 3 Adjustment Guide & Parts List. Component diagram, eccentric and stop adjustment, complete parts catalogue.',
  },

  // ── NM4: same structure as NM1 ────────────────────────────────────────────
  {
    slug: 'alligator-nm4-manual',
    newTitle: 'Alligator NM 4 Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 4 saw tooth setting machine (appareil à écraser). Covers anvil alignment on tooth back, eccentric and setting lever adjustment, end-of-stroke settings, tooth preparation procedure, eccentric and thread lubrication, and complete numbered parts list with reference codes. Document in French.',
    seo_description: 'Download the Alligator NM 4 Adjustment Guide & Parts List. Saw tooth setting procedure, anvil and eccentric adjustment, complete parts catalogue.',
  },

  // ── APTC M900/950: descriptions confirmed adequate, minor enrichment ───────
  {
    slug: 'axminster-aptc-m-900-manual',
    newTitle: 'Axminster APTC M900 Instruction Manual',
    description: 'Instruction manual for the Axminster APTC M900 woodturning lathe. Covers general and machine-specific safety rules (earthing, guards, adjusting keys, work area), machine identification and components, assembly and installation, operating controls, speed settings, woodturning procedures, maintenance, and spare parts list.',
    seo_description: 'Download the Axminster APTC M900 Instruction Manual. Safety rules, machine setup, operating and maintenance instructions.',
  },
  {
    slug: 'axminster-aptc-m-950-manual',
    newTitle: 'Axminster APTC M950 Instruction Manual',
    description: 'Instruction manual for the Axminster APTC M950 woodturning lathe. Covers general and machine-specific safety rules (earthing, guards, adjusting keys, work area), machine identification and components, assembly and installation, operating controls, speed settings, woodturning procedures, maintenance, and spare parts list.',
    seo_description: 'Download the Axminster APTC M950 Instruction Manual. Safety rules, machine setup, operating and maintenance instructions.',
  },
];

async function run() {
  console.log('=== Update descriptions v2 ===\n');
  let ok = 0, err = 0;

  for (const u of updates) {
    const payload = {
      title: u.newTitle,
      description: u.description,
      seo_title: `${u.newTitle} | Service Manuals Pro`,
      seo_description: u.seo_description,
    };
    const { error } = await supabase.from('documents').update(payload).eq('slug', u.slug);
    if (error) { console.error(`✗ ${u.slug}: ${error.message}`); err++; }
    else { console.log(`✓ ${u.newTitle}`); ok++; }
  }

  console.log(`\n${ok} mis à jour, ${err} erreurs.`);
}

run().catch(console.error);
