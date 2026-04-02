const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const bundles = [
  {
    slugPattern: ['grundig-1','grundig-2','grundig-3','grundig-4','grundig-5','grundig-6','grundig-7','grundig-8'],
    exact: true,
    bundle: {
      title: 'Grundig Service Documentation (Complete - 8 volumes)',
      slug: 'grundig-service-documentation-complete',
      description: 'Complete Grundig service documentation in 8 volumes. Schematics and repair information for Grundig radio receivers.',
      price: 2990,
      seo_title: 'Grundig Service Documentation - Complete 8-Volume Set',
      seo_description: 'Complete Grundig radio service documentation. 8 volumes of schematics and repair guides.',
    }
  },
  {
    slugPattern: ['foca-280-instructions-1','foca-280-instructions-2','foca-280-instructions-3','foca-280-instructions-4','foca-280-instructions-5'],
    exact: true,
    bundle: {
      title: 'FOCA 280 Repair Instructions (Complete - 5 parts)',
      slug: 'foca-280-instructions-complete',
      description: 'Complete set of FOCA 280 repair instructions. 5 detailed technical diagrams for the Foca Universel camera repair.',
      price: 990,
      seo_title: 'FOCA 280 Repair Instructions - Complete Set',
      seo_description: 'Complete FOCA 280 camera repair instructions in 5 parts.',
    }
  },
  {
    slugPattern: ['suzuki-suzuki-samurai-service-manual-1','suzuki-suzuki-samurai-service-manual-2','suzuki-suzuki-samurai-service-manual-3','suzuki-suzuki-samurai-service-manual-4','suzuki-suzuki-samurai-service-manual-5'],
    exact: true,
    bundle: {
      title: 'Suzuki Samurai Workshop Manual 1986-1988 (Complete - 5 volumes)',
      slug: 'suzuki-samurai-service-manual-complete',
      description: 'Complete workshop manual for the 4x4 Suzuki Samurai 1986-1988 in 5 volumes. Full service and repair procedures.',
      price: 2990,
      seo_title: 'Suzuki Samurai Workshop Manual 1986-1988 - Complete 5-Volume Set',
      seo_description: 'Complete Suzuki Samurai 4x4 service manual. 5 volumes covering all repair and maintenance procedures.',
    }
  },
  {
    slugPattern: 'reparation-depannage-restoring-classic-collectible-cameras-%',
    exact: false,
    bundle: {
      title: 'Restoring Classic & Collectible Cameras (Complete - 128 pages)',
      slug: 'reparation-depannage-restoring-classic-cameras-complete',
      description: 'Complete edition of "Restoring Classic & Collectible Cameras". 128 pages of detailed restoration techniques for vintage cameras.',
      price: 1990,
      page_count: 128,
      seo_title: 'Restoring Classic & Collectible Cameras - Complete 128-page Guide',
      seo_description: 'Complete guide to restoring vintage cameras. 128 pages of expert restoration techniques.',
    }
  },
  {
    slugPattern: ['akai-akai-gx-4000-d-schematic','akai-akai-gx-4000-d-schematic-2','akai-akai-gx-4000-d-schematic-3'],
    exact: true,
    bundle: {
      title: 'Akai GX-4000D Complete Schematics (3 parts)',
      slug: 'akai-gx-4000-d-schematics-complete',
      description: 'Complete set of schematics for the Akai GX-4000D reel-to-reel tape recorder. 3 detailed schematic diagrams.',
      price: 990,
      seo_title: 'Akai GX-4000D Schematics - Complete Set',
      seo_description: 'Complete schematics for the Akai GX-4000D tape recorder.',
    }
  },
  {
    slugPattern: 'mini-cooper-rover-mini-cooper-manuel-76-89-%',
    exact: false,
    bundle: {
      title: 'Mini Cooper Rover Workshop Manual 1976-1989 (Complete - 2 volumes)',
      slug: 'mini-cooper-rover-manuel-76-89-complete',
      description: 'Complete workshop manual for the Mini Cooper Rover 1976-1989 in 2 volumes.',
      price: 1490,
      seo_title: 'Mini Cooper Rover Workshop Manual 1976-1989 - Complete',
      seo_description: 'Complete Mini Cooper Rover workshop manual 1976-1989. 2 volumes.',
    }
  },
  {
    slugPattern: 'nagra-nagra-4-2-notice-gb-%',
    exact: false,
    bundle: {
      title: 'Nagra 4.2 User Manual in English (Complete - 2 parts)',
      slug: 'nagra-4-2-notice-gb-complete',
      description: 'Complete user manual in English for the Nagra 4.2 professional portable audio recorder. 2 parts.',
      price: 990,
      seo_title: 'Nagra 4.2 User Manual - Complete English Edition',
      seo_description: 'Complete Nagra 4.2 user manual in English.',
    }
  },
  {
    slugPattern: 'polaris-polaris-400-500-service-manual-%',
    exact: false,
    bundle: {
      title: 'Polaris 400/500 Service Manual (Complete - 312 pages)',
      slug: 'polaris-400-500-service-manual-complete',
      description: 'Complete service manual for Polaris 400 and 500 ATVs. 312 pages in 2 volumes.',
      price: 1490,
      page_count: 312,
      seo_title: 'Polaris 400/500 ATV Service Manual - Complete 312-page Edition',
      seo_description: 'Complete Polaris 400/500 ATV service manual. 312 pages of repair procedures.',
    }
  },
  {
    slugPattern: ['renault-scenic-2-climatisation','renault-scenic-2-climatisation-2'],
    exact: true,
    bundle: {
      title: 'Renault Scenic 2 Air Conditioning Workshop Manual (Complete)',
      slug: 'renault-scenic-2-climatisation-complete',
      description: 'Complete workshop manual for the Renault Scenic 2 air conditioning system. 2 parts.',
      price: 990,
      seo_title: 'Renault Scenic 2 A/C Workshop Manual - Complete',
      seo_description: 'Complete Renault Scenic 2 air conditioning workshop manual.',
    }
  },
  {
    slugPattern: ['renault-scenic-2-equipement-electrique','renault-scenic-2-equipement-electrique-2'],
    exact: true,
    bundle: {
      title: 'Renault Scenic 2 Electrical Equipment Workshop Manual (Complete)',
      slug: 'renault-scenic-2-equipement-electrique-complete',
      description: 'Complete workshop manual for the Renault Scenic 2 electrical equipment. 2 parts.',
      price: 990,
      seo_title: 'Renault Scenic 2 Electrical Workshop Manual - Complete',
      seo_description: 'Complete Renault Scenic 2 electrical equipment workshop manual.',
    }
  },
  {
    slugPattern: ['renault-scenic-2-transmission-1','renault-scenic-2-transmission-2'],
    exact: true,
    bundle: {
      title: 'Renault Scenic 2 Transmission Workshop Manual (Complete)',
      slug: 'renault-scenic-2-transmission-complete',
      description: 'Complete workshop manual for the Renault Scenic 2 automatic gearbox and transmission. 2 parts.',
      price: 990,
      seo_title: 'Renault Scenic 2 Transmission Workshop Manual - Complete',
      seo_description: 'Complete Renault Scenic 2 transmission workshop manual.',
    }
  },
  {
    slugPattern: 'yamaha-yamaha-ds7-1972-rd-250-1973-r5c-1972-rd-350-1973-manual-%',
    exact: false,
    bundle: {
      title: 'Yamaha DS7/RD250/R5C/RD350 Service Manual 1972-1973 (Complete)',
      slug: 'yamaha-ds7-rd250-r5c-rd350-manual-complete',
      description: 'Complete service manual for Yamaha DS7 (1972), RD 250 (1973), R5C (1972), and RD 350 (1973) motorcycles. 2 volumes.',
      price: 1490,
      seo_title: 'Yamaha DS7/RD250/R5C/RD350 Service Manual - Complete',
      seo_description: 'Complete Yamaha DS7/RD250/R5C/RD350 motorcycle service manual 1972-1973.',
    }
  },
];

async function main() {
  console.log('=== Creating All Bundles ===\n');
  let created = 0, deactivated = 0;

  for (const b of bundles) {
    // Get child docs
    let data;
    if (b.exact) {
      const { data: d } = await s.from('documents').select('id,slug,file_path,file_size,page_count,price,brand_id,category_id,preview_url')
        .eq('active', true).in('slug', b.slugPattern).order('slug');
      data = d;
    } else {
      const { data: d } = await s.from('documents').select('id,slug,file_path,file_size,page_count,price,brand_id,category_id,preview_url')
        .eq('active', true).ilike('slug', b.slugPattern).order('slug');
      data = d;
    }

    if (!data || data.length < 2) {
      console.log(`Skip ${b.bundle.slug} (${data?.length || 0} docs found)`);
      continue;
    }

    const bundleFilePaths = data.map(d => 'file:' + d.file_path);
    const totalSize = data.reduce((a, d) => a + (d.file_size || 0), 0);
    const totalPages = data.reduce((a, d) => a + (d.page_count || 0), 0);

    const seoTags = [...(b.bundle.seo_title || '').toLowerCase().split(/\W+/).filter(w => w.length > 2), 'bundle', ...bundleFilePaths];

    const bundleData = {
      ...b.bundle,
      brand_id: data[0].brand_id,
      category_id: data[0].category_id,
      file_path: data[0].file_path,
      file_size: totalSize,
      page_count: b.bundle.page_count || totalPages || null,
      preview_url: data[0].preview_url,
      language: 'en',
      active: true,
      featured: false,
      seo_tags: seoTags,
    };

    // Check if exists
    const { data: existing } = await s.from('documents').select('id').eq('slug', b.bundle.slug);
    if (existing && existing.length > 0) {
      await s.from('documents').update(bundleData).eq('id', existing[0].id);
    } else {
      const { error } = await s.from('documents').insert(bundleData);
      if (error) { console.log(`✗ ${b.bundle.slug}: ${error.message}`); continue; }
    }

    // Deactivate children
    const ids = data.map(d => d.id);
    await s.from('documents').update({ active: false }).in('id', ids);

    console.log(`✓ ${b.bundle.slug} (${data.length} docs → 1 bundle)`);
    created++;
    deactivated += data.length;
  }

  console.log(`\nCreated ${created} bundles, deactivated ${deactivated} sections.`);

  // Final count
  const { data: all } = await s.from('documents').select('id').eq('active', true);
  console.log('Total active docs:', all.length);
}

main().catch(console.error);
