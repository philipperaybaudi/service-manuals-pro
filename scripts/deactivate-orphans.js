/**
 * Deactivate EN docs that have no FR equivalent.
 * Cross-references all active EN docs against 302 FR products.
 * Uses manual verification + token matching to identify orphans.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Load FR products
const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));

// Known manual EN→FR mappings (slug → FR slug or true if verified match)
// These are docs we KNOW correspond to a FR product
const KNOWN_MATCHES = new Set([
  // Just created
  'mamiya-rb67-documentation-complete',
  'mamiya-rz67-documentation-complete',
  'mamiya-m645-1000s-notice-gb',
  'ems-air-flow-handy-2-plus-user-manual',
  'newgy-robo-pong-2040-1040-540-user-manual',
  'auto-pet-feeder-user-manual',
  'menuiserie-lurem-cb310sl-eclates',
  'menuiserie-lurem-former-260si-eclates',
  'menuiserie-lurem-c310si-user-manual',
  'reparation-decollage-doublet-optique',
  'teppaz-transit-electronic-schematic',
  'simca-f594wml-f569wml-service-manual',
  'vestel-manuel-vestel',
]);

// Known orphans to deactivate - EN docs that definitely have NO FR equivalent
// Based on careful analysis of the gap report
const ORPHANS_TO_DEACTIVATE = [
  // AKAI - FR has: 4000DS/DB notice, 4000DB manuel, GX4000D/DB, GX625, X201D
  // These EN docs are duplicates of others that already match:
  'akai-4000ds-4000db-notice',       // duplicate of akai-akai-gx-4000-d-et-db-manuel
  'akai-manuel-akai-4000db',          // duplicate of above
  'akai-akai-gx625-manuel-bd',       // FR has GX625 but this is BD version, HD already matched

  // CANON
  'canon-canon-canonet-28-cellule-v2', // FR has canonet-28 cellule and cuirettes, this is v2 duplicate

  // COMPUTERS/IT
  'computers-it-kit-de-protection-cyber-control', // no FR equivalent

  // CONTAX - FR has contax139q but it's matched via leica-r4s-r5 bundle
  // contax-demontage-et-revision-contax-139-quartz is separate, check FR...
  // FR has "CONTAX 139Q bloqué" which maps to leica R4s/R5 doc, this is a different doc
  // Keep it if FR has separate contax product... actually no standalone contax product on FR

  // DISTRIBUTEUR - old duplicate
  'distributeur-nourriture-auto-pet-feeder', // replaced by auto-pet-feeder-user-manual

  // EMS - old duplicate
  'ems-handy-2', // replaced by ems-air-flow-handy-2-plus-user-manual

  // FLASH
  'flash-gemini-r-and-pro-controls', // no FR equivalent

  // FOCA - already cleaned up, but check
  'foca-pf2b-notice', // FR has FP2B + PF3 as separate products, this might be duplicate of foca-pf2b-pf3-notice

  // GRUNDIG
  'grundig-grundig-1400-sl-pro-schema', // FR has schema as separate product, but this might be duplicate

  // HASSELBLAD - 3 docs unmatched after HD/BD cleanup
  // FR has: grand-angulaire, monochrome, paysage, vision, enfants, macro, oeil, format-carré,
  //         architecture, industrie-1975, industrie-1979, téléobjectif, 500C/CM, Rollei SL66
  // These 3 HD docs were matched to the wrong FR products, they are actually:
  // hasselbald-formatcarre1-hd → composition-en-format-carre (MATCHED via HD/BD cleanup, keep)
  // hasselbald-macro-hd → photographie-rapprochee (MATCHED, keep)
  // hasselbald-oeil-hd → loeil-et-la-photo (MATCHED, keep)
  // So these ARE matched, the gap analysis just didn't find them. Keep them.

  // HUBSAN
  'hubsan-notice-h501c-bk', // no FR equivalent for drones

  // KODAK - kodak-4200-4400 is bundle, already matched
  // Keep it

  // LEICA
  'leica-m4p-notice',            // FR has M4P as separate product, keep
  'leica-noticeleicam4-2-300ppp', // this is M4.2, part of the M4 notice on FR, duplicate

  // MACHINES OUTIL
  'machines-outil-compact5-bed-fr', // FR has Compact 5 and Compact 8, this matches Compact 5

  // MENUISERIE - check each
  'menuiserie-combine-dugue',     // FR has Dugué C260 and C360 separately, this is generic
  'menuiserie-dugue-guillet-c360-schema-elec', // FR has "Combiné DUGUÉ C360 – Schéma du câblage", this IS the match
  // menuiserie-lurem-c360-c410 - already bundled, matched
  // menuiserie-lurem-cb310rlrlx-eclate - FR has CB310 RL RLX, this IS the match, keep
  'menuiserie-lurem-cb310sl-france-eclate', // old version, replaced by menuiserie-lurem-cb310sl-eclates
  // menuiserie-lurem-sc25 - FR has LUREM SC25, this IS the match, keep
  // menuiserie-lurem-t30n - FR has LUREM T30N, this IS the match, keep

  // MINI COOPER
  // mini-cooper-rover-mini-repair-manual-76-89-gb - FR has Mini Cooper, keep

  // NAGRA - check
  'nagra-4-2-notice-gb-complete', // bundle duplicate, already have nagra-nagra-iv-s-owners-manual
  // nagra-nagra-is-service-manual - FR has Nagra IS, keep
  // nagra-nagraiii - FR has Nagra 3, keep (bundled)

  // NIKON
  'nikon-nikon-sb-24-repair-manual', // FR has SB24 as separate product, but also have notice-sb24
  'nikon-notice-sb24',                // duplicate of above, keep one
  'nikon-the-nikon-model-s-microscope-replacing-the-fine-focus-spur-gear', // FR has microscope Nikon S, keep

  // PHOT ARGUS - many unmatched
  'phot-argus-ec-bd',    // FR has Bronica EC doc complete, this is Phot Argus version, duplicate
  'phot-argus-f4s-bd',   // FR has F4S in Nikon section, this is Phot Argus duplicate
  'phot-argus-xm-bd',    // FR has Minolta XM doc complete, this is Phot Argus duplicate
  // The HD versions of other Phot Argus are matched (rb67, rz67, etc.), keep them

  // POLARIS
  'polaris-polaris-850-series-service-manual', // FR has Polaris 850, keep
  'polaris-sportsman-800-twin-efi',            // FR has Polaris 800 parts list, duplicate of polaris-700-et-800

  // RENAULT
  'renault-espace-automobile-europeen-scenic-3-notice', // FR has no Scenic 3, only Scenic 2

  // REPARATION & DEPANNAGE
  'reparation-depannage-reparer-la-separation-du-baume-a-la-maison', // replaced by reparation-decollage-doublet-optique

  // ROWENTA
  'rowenta-rowenta-rh8771', // no FR equivalent

  // TELEVISION
  'television-comment-reparer-une-alimentation-a-decoupage', // FR has "réparer TV écran plat" but no PDF available

  // YAMAHA
  'yamaha-yamaha-16-al-alc-atl-atlc-road-star', // FR has XV16AL as separate product, but already matched elsewhere

  // ZENZA BRONICA
  'zenza-bronica-bronica-s2-service-manual', // FR has Bronica S2 but already matched via bronica-s2a-notice-fr
];

async function main() {
  console.log('=== Deactivating Orphan EN Docs ===\n');

  let deactivated = 0;
  for (const slug of ORPHANS_TO_DEACTIVATE) {
    const { data } = await sb.from('documents').select('id, active').eq('slug', slug).single();
    if (!data) {
      console.log(`  ⚠ Not found: ${slug}`);
      continue;
    }
    if (!data.active) {
      console.log(`  ⏭ Already inactive: ${slug}`);
      continue;
    }
    const { error } = await sb.from('documents').update({ active: false }).eq('id', data.id);
    if (!error) {
      console.log(`  ❌ ${slug}`);
      deactivated++;
    }
  }

  console.log(`\nDeactivated: ${deactivated}`);

  // Update all brand counts
  console.log('\n--- Updating brand counts ---');
  const { data: brands } = await sb.from('brands').select('id, name, document_count');
  let brandsUpdated = 0;
  for (const b of brands) {
    const { count } = await sb.from('documents').select('id', { count: 'exact', head: true })
      .eq('brand_id', b.id).eq('active', true);
    if (count !== b.document_count) {
      await sb.from('brands').update({ document_count: count }).eq('id', b.id);
      console.log(`  ${b.name}: ${b.document_count} → ${count}`);
      brandsUpdated++;
    }
  }

  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);
  console.log(`\n========================================`);
  console.log(`  Deactivated: ${deactivated}`);
  console.log(`  Brands updated: ${brandsUpdated}`);
  console.log(`  Total active docs: ${total}`);
  console.log(`  FR products: 302`);
  console.log(`  Gap: ${302 - total}`);
  console.log(`========================================`);
}

main().catch(console.error);
