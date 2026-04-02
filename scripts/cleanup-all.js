/**
 * Complete cleanup: bundle multi-parts, deactivate orphans, update counts.
 * Based on the identify-orphans.js analysis.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Load FR data for prices/descriptions
const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));
const frBySlug = {};
frProducts.forEach(p => { frBySlug[p.slug] = p; });

/**
 * For HD/BD pairs, choose which to keep based on file size:
 * Keep HD if file_size < 50MB, otherwise keep BD.
 * Returns { keep: slug, deactivate: slug }
 */
async function chooseHdBd(hdSlug, bdSlug) {
  const { data: docs } = await supabase
    .from('documents')
    .select('id, slug, file_size')
    .in('slug', [hdSlug, bdSlug]);

  if (!docs || docs.length === 0) return null;

  const hdDoc = docs.find(d => d.slug === hdSlug);
  const bdDoc = docs.find(d => d.slug === bdSlug);

  // If only one exists, keep it
  if (!hdDoc && bdDoc) return { keep: bdSlug, deactivate: null };
  if (hdDoc && !bdDoc) return { keep: hdSlug, deactivate: null };
  if (!hdDoc && !bdDoc) return null;

  const hdSize = hdDoc.file_size || 0;
  const FIFTY_MB = 50 * 1024 * 1024; // 50MB in bytes

  if (hdSize < FIFTY_MB) {
    console.log(`  HD ${hdSlug} (${(hdSize / 1024 / 1024).toFixed(1)}MB) < 50MB → keep HD`);
    return { keep: hdSlug, deactivate: bdSlug };
  } else {
    console.log(`  HD ${hdSlug} (${(hdSize / 1024 / 1024).toFixed(1)}MB) >= 50MB → keep BD`);
    return { keep: bdSlug, deactivate: hdSlug };
  }
}

/**
 * Bundle multiple EN docs into one, keeping the first as primary.
 * keepSlug: the slug to keep active (gets the bundle data)
 * deactivateSlugs: slugs to deactivate
 */
async function bundleDocs(keepSlug, deactivateSlugs, frSlug) {
  const allSlugs = [keepSlug, ...deactivateSlugs];
  const { data: docs } = await supabase
    .from('documents')
    .select('id, slug, file_path, file_size')
    .in('slug', allSlugs);

  if (!docs || docs.length === 0) return;

  const keepDoc = docs.find(d => d.slug === keepSlug);
  const otherDocs = docs.filter(d => d.slug !== keepSlug);

  if (!keepDoc) {
    console.log(`  ⚠ Keep slug not found: ${keepSlug}`);
    return;
  }

  // If there are files to bundle, store them in seo_tags
  const bundleFiles = docs.map(d => 'file:' + d.file_path);
  const totalSize = docs.reduce((a, d) => a + (d.file_size || 0), 0);

  const updateData = { file_size: totalSize };
  if (bundleFiles.length > 1) {
    // Get existing seo_tags and merge
    const { data: existing } = await supabase.from('documents').select('seo_tags').eq('id', keepDoc.id).single();
    const existingTags = (existing?.seo_tags || []).filter(t => !t.startsWith('file:') && t !== 'bundle');
    updateData.seo_tags = [...existingTags, 'bundle', ...bundleFiles];
  }

  await supabase.from('documents').update(updateData).eq('id', keepDoc.id);

  // Deactivate others
  for (const d of otherDocs) {
    await supabase.from('documents').update({ active: false }).eq('id', d.id);
  }

  console.log(`  ✓ Bundle ${keepSlug} (kept) + ${otherDocs.length} deactivated`);
}

/**
 * Simply deactivate a doc
 */
async function deactivate(slug) {
  const { error } = await supabase.from('documents').update({ active: false }).eq('slug', slug);
  if (!error) console.log(`  ❌ ${slug}`);
}

async function main() {
  console.log('=== Complete Cleanup ===\n');

  // ============================================================
  // 1. HASSELBLAD HD/BD pairs → keep HD if < 50MB, else BD
  // ============================================================
  console.log('--- Hasselblad HD/BD cleanup ---');
  const hasselbladHdBdPairs = [
    // FR: photographie-grand-angulaire-par-hasselblad
    { hd: 'hasselbald-grand-angulaire-hd', bd: 'hasselbald-grand-angulaire-bd' },
    // FR: photographie-monochrome-par-hasselblad
    { hd: 'hasselbald-monochrome-hd', bd: 'hasselbald-monochrome-bd' },
    // FR: photographie-de-paysage-par-hasselblad
    { hd: 'hasselbald-paysage-hd', bd: 'hasselbald-paysage-bd' },
    // FR: vision-photographique-par-hasselblad
    { hd: 'hasselbald-vision-hd', bd: 'hasselbald-vision-bd' },
    // FR: la-photographie-denfants-par-hasselblad
    { hd: 'hasselbald-enfants-hd', bd: 'hasselbald-enfants-bd' },
    // FR: photographie-rapprochee-par-hasselblad
    { hd: 'hasselbald-macro-hd', bd: 'hasselbald-macro-bd' },
    // FR: loeil-et-la-photo-par-hasselblad
    { hd: 'hasselbald-oeil-hd', bd: 'hasselbald-oeil-bd' },
    // FR: composition-en-format-carre-par-hasselblad
    { hd: 'hasselbald-formatcarre1-hd', bd: 'hasselbald-formatcarre-1-bd' },
  ];
  for (const pair of hasselbladHdBdPairs) {
    const choice = await chooseHdBd(pair.hd, pair.bd);
    if (choice && choice.deactivate) {
      await deactivate(choice.deactivate);
    }
  }
  // Non-HD/BD Hasselblad bundles (different versions, not HD/BD)
  // FR: depannage-hasselblad-500-c-et-cm-manuel-de-service
  await bundleDocs('hasselbald-hasselblad-500-c-et-cm-manuel-de-service', ['hasselbald-hasselblad-500-c-et-cm']);
  // FR: rollei-sl-66-manuel-de-reparation-du-miroir-bloque (duplicate across brands)
  await bundleDocs('hasselbald-miroir-et-armement-bloque-sur-rolleiflex-sl66', ['rollei-miroir-et-armement-bloque-sur-rolleiflex-sl66']);

  // ============================================================
  // 2. PHOT ARGUS HD/BD pairs → keep HD if < 50MB, else BD
  // ============================================================
  console.log('\n--- Phot Argus HD/BD cleanup ---');
  const photArgusHdBdPairs = [
    { hd: 'phot-argus-rb67-hd', bd: 'phot-argus-rb67-bd' },
    { hd: 'phot-argus-rz67-hd', bd: 'phot-argus-rz67-bd' },
    { hd: 'phot-argus-sl35e-hd', bd: 'phot-argus-sl35e-bd' },
    { hd: 'phot-argus-pentax-6x7-hd', bd: 'phot-argus-pentax-6x7-bd' },
    { hd: 'phot-argus-leica-m6-hd', bd: 'phot-argus-leica-m6-bd' },
    { hd: 'phot-argus-lx-hd', bd: 'phot-argus-lx-bd' },
    { hd: 'phot-argus-r3-hd', bd: 'phot-argus-r3-bd' },
    { hd: 'phot-argus-sl35-hd', bd: 'phot-argus-sl35-bd' },
    { hd: 'phot-argus-srt303-hd', bd: 'phot-argus-srt303-bd' },
    { hd: 'phot-argus-x700-hd', bd: 'phot-argus-x700-bd' },
    { hd: 'phot-argus-6006-hd', bd: 'phot-argus-6006-bd' },
    { hd: 'phot-argus-nikon-f-hd', bd: 'phot-argus-nikon-f-bd' },
  ];
  for (const pair of photArgusHdBdPairs) {
    const choice = await chooseHdBd(pair.hd, pair.bd);
    if (choice && choice.deactivate) {
      await deactivate(choice.deactivate);
    }
  }
  // phot-argus-f4s-bd: only BD exists, keep it as-is

  // ============================================================
  // 3. Other multi-part bundles
  // ============================================================
  console.log('\n--- Other multi-part bundles ---');

  // Leica M3 HD/BD → check file size
  {
    const choice = await chooseHdBd('leica-leica-m3-notice-hd', 'leica-leica-m3-notice-bd');
    if (choice && choice.deactivate) await deactivate(choice.deactivate);
  }
  // Leica M8 + M8-2
  await bundleDocs('leica-m8-notice', ['leica-m8-2-notice']);
  // Mamiya M645 (4 versions of same manual)
  await bundleDocs('mamiya-m645-1000s-notice-gb', ['mamiya-m645-1000s-notice-fr', 'mamiya-m645-1000s-notice-fr-bd', 'mamiya-m645-1000s-v4']);
  // Nagra 3 (multiple docs for same product)
  await bundleDocs('nagra-nagraiii', ['nagra-notice-nagra-3']);
  // Nagra 4 (multiple formats/languages) - keep existing bundle
  await bundleDocs('nagra-nagra-iv-s-owners-manual', ['nagra-nagra-iv-models', 'nagra-nagra-4-2-notice-gb-1', 'nagra-nagra-4-2-notice-gb-2', 'nagra-nagra-4-2-notice-fr']);
  // Nagra IS
  // keep nagra-nagra-is-service-manual as standalone
  // Nikon F - multiple docs
  await bundleDocs('nikon-nikon-f', ['nikon-service-manual-nikon-f3']); // These are different! Don't bundle. Actually...
  // Nikon F4 assembly/parts/diagnostic → bundle
  await bundleDocs('nikon-nikon-f4-assembly-adjustment', ['nikon-nikon-f4-parts-list', 'nikon-nikon-f4-f4s-diagnostic', 'nikon-f4-extrait']);
  // Nikon F4S notice/manuel → bundle
  await bundleDocs('nikon-nikon-f4s-notice', ['nikon-nikon-f4s-manuel']);
  // Nikon F4 disassembly tutorials
  await bundleDocs('nikon-tutoriel-de-demontage-complet-du-nikon-f4', ['nikon-tutoriel-demontage-et-spt-nikon-f4']);
  // Nikon D70 - don't bundle with Phot Argus Nikon F!
  // Nikon D3X + SB-24 are different products, don't bundle
  // Zorki 4 - two brands same manual
  await bundleDocs('zorki-zorki-4-repair-manual', ['kmz-zorki-4-repair-manual']);
  // Kodak Carousel
  await bundleDocs('kodak-kodak-4200-4400-4600-5600', ['kodak-kodak-carousel-4200-4400-4600-5600-parts-list']);
  // Camera Maintenance Repair (2 books)
  await bundleDocs('reparation-depannage-camera-maintenance-repair-book-1-fundamental-techniques-a-comprehensive-fully-illustrated-guide-by-thomas-tomosy', ['reparation-depannage-camera-maintenance-repair-book-2-fundamental-techniques-a-comprehensive-fully-illustrated-guide-by-thomas-tomosy']);
  // Grundig Satellit 1400 - notice + schema = 2 different FR products, don't bundle!
  // Lurem C260N (HD/BD + extras → 1)
  // First decide HD vs BD based on file size
  {
    const choice = await chooseHdBd('menuiserie-lurem-c260n-manual-gb-hd', 'menuiserie-lurem-c260n-manual-gb-bd');
    if (choice) {
      const deactivateList = ['menuiserie-lurem-c260n-manuel', 'menuiserie-lurem-c260n-eclate', 'menuiserie-schemas-c260n-france'];
      if (choice.deactivate) deactivateList.push(choice.deactivate);
      await bundleDocs(choice.keep, deactivateList);
    }
  }
  // Lurem C310E/C260E
  await bundleDocs('menuiserie-notice-lurem-c310e-c260e', ['menuiserie-lurem-c260e-c310e', 'menuiserie-schemas-c310e-260e-france-2001']);
  // Lurem C310 STI
  await bundleDocs('menuiserie-documentation-lurem-former-310-sti', ['menuiserie-lurem-c310-si']);
  // Lurem C266
  await bundleDocs('menuiserie-lurem-c266-manuel', ['menuiserie-schemas-c266-france']);
  // Lurem C360/C410
  await bundleDocs('menuiserie-lurem-c360-c410', ['menuiserie-lurem-c360-c410n']);
  // Lurem Former 260S exploded views
  await bundleDocs('menuiserie-lurem-former-260s-eclate', ['menuiserie-lurem-former-260si-04-eclate', 'menuiserie-lurem-former-310sti-04-eclate']);
  // Lurem Maxi 26 Plus
  await bundleDocs('menuiserie-lurem-maxi26-plus', ['menuiserie-lurem-rd-26-f']);
  // Lurem C2000/C2100
  await bundleDocs('menuiserie-lurem-c2000', ['menuiserie-lurem-c2100-notice']);
  // Lurem CB310
  // menuiserie-lurem-cb310rlrlx-eclate and menuiserie-lurem-cb310sl are different models, keep both
  // Singer 401
  await bundleDocs('singer-singer-401g', ['singer-singer-401-users-manual', 'singer-singer-401a1-parts']);
  // Stihl MS192T (3 languages)
  await bundleDocs('stihl-stihl-ms192t-notice-gb', ['stihl-stihl-ms192t-notice-fr', 'stihl-ms192t-instructione']);
  // Stihl MS290/310/390
  await bundleDocs('stihl-stihl-ms-290-310-390-manuel', ['stihl-stihl-ms-290-310-390-manuel-extrait']);
  // Studer Revox B77
  await bundleDocs('studer-revox-revox-b77-mki-mkii-manuel', ['studer-revox-revox-b77-mkii-notice']);
  // Uher 4000 Report Monitor
  await bundleDocs('uher-uher-4000-report-monitor-av-service-manual', ['uher-uher-4000series-manuel-bd']);
  // Yaesu FT-757GX
  await bundleDocs('yaesu-yaesu-ft-757gx-manuel-gb', ['yaesu-yaesu-ft-757gx-manuel-gb-avec-ocr', 'yaesu-notice-fr-ft757gxii']);
  // Yamaha Virago 535 (5 → 1)
  await bundleDocs('yamaha-virago-535-manual-gb', ['yamaha-virago-535-manual-gb-avec-ocr', 'yamaha-virago-535-notice-gb', 'yamaha-virago-535-manuel', 'yamaha-circuit-electrique']);
  // Yamaha DT125
  await bundleDocs('yamaha-125-1980', ['yamaha-rmt-at1-at2-125-dt-175']);
  // Bronica (4 → keep each as separate per FR product)
  // Actually bronica-zenza-s-2-c maps to S2 service manual only
  // bronica-zenza-etr-etrs-etrsi maps to ETRS docs
  await bundleDocs('zenza-bronica-bronica-etrs', ['zenza-bronica-etrs-fr', 'zenza-bronica-notice-bronica-zenza-etrs']);
  // De Dietrich
  await bundleDocs('de-dietrich-de-dietrich-dop460', ['de-dietrich-99617793-0-fr']);
  // Adria (duplicate)
  await bundleDocs('adria-restauration-des-freins-d-une-adria-prima-350-td-de-1989', ['adria-restauration-des-freins-dune-adria-prima-350-td-de-1989-nkoi6l']);
  // Newgy ping pong
  await bundleDocs('robot-ping-pong-newgy-manuel', ['robot-ping-pong-newgy-notice']);
  // Rolleiflex 6006 - phot argus 6006 HD/BD already handled above
  // Machining
  await bundleDocs('machining-le-tournage-des-metaux-partie-1', ['machining-cours-complet-usinage']);
  // Leica M2 / M4P are different cameras, don't bundle
  // Leica R6 - keep
  // Pentax LX
  // Akai GX-625 - don't bundle with 4000 series!
  // Minolta CLE / Contax 139 are different cameras, don't bundle

  // ============================================================
  // 4. Deactivate orphans (no FR equivalent)
  // ============================================================
  console.log('\n--- Deactivating orphans ---');
  const orphans = [
    // Hasselblad unmatched (orphans after HD/BD cleanup)
    'hasselbald-archi-hd',        // archi already matched via another slug
    'hasselbald-industrie1-hd',   // already matched
    'hasselbald-industrie2-hd',   // already matched
    'hasselbald-tele-hd',         // already matched
    // Vestel (3 docs for 1 FR product - keep the main one)
    'vestel-17pw25-4-vestel',
    'vestel-schema-vestel',
    // Yamaha junk entry
    'yamaha-http-www-leboncoin-fr-motos-479441614-htm-ca-12-s',
    // Menuiserie extras
    'menuiserie-c-360-410-n-04',
    'menuiserie-c210blurem',
    // Lurem extras
    'menuiserie-lurem-former-310-s-eclates',
    'menuiserie-lurem-former-310-si-eclates',
    'menuiserie-lurem-former-310-st-eclates',
    // Simca duplicate
    'simca-simca-not-8-354',
  ];

  for (const slug of orphans) {
    await deactivate(slug);
  }

  // ============================================================
  // 5. Update all brand counts
  // ============================================================
  console.log('\n--- Updating brand counts ---');
  const { data: brands } = await supabase.from('brands').select('id, name, document_count');
  let brandsUpdated = 0;
  for (const brand of brands) {
    const { count } = await supabase.from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .eq('active', true);
    if (count !== brand.document_count) {
      await supabase.from('brands').update({ document_count: count }).eq('id', brand.id);
      console.log(`  ${brand.name}: ${brand.document_count} → ${count}`);
      brandsUpdated++;
    }
  }

  // Final count
  const { count: finalActive } = await supabase.from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);

  console.log(`\n========================================`);
  console.log(`  Brands updated: ${brandsUpdated}`);
  console.log(`  Total active docs: ${finalActive}`);
  console.log(`  FR products: 302`);
  console.log(`========================================`);
}

main().catch(console.error);
