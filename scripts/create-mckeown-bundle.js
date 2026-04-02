/**
 * Create a single McKeown bundle document and deactivate individual sections.
 * The bundle stores child file paths in seo_tags as "file:path/to/file.pdf" entries.
 * The webhook and download system will be updated to handle bundles.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== McKeown Bundle Creation ===\n');

  // 1. Get all McKeown sections
  const { data: docs } = await supabase
    .from('documents')
    .select('id, slug, title, file_path, file_size, price, brand_id, category_id, preview_url, page_count')
    .eq('active', true)
    .ilike('slug', '%mckeown%')
    .order('slug');

  if (!docs || docs.length === 0) {
    console.log('No McKeown docs found');
    return;
  }

  console.log(`Found ${docs.length} McKeown sections`);

  // 2. Prepare bundle file paths as seo_tags entries
  const bundleFilePaths = docs.map(d => `file:${d.file_path}`);
  const totalSize = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);

  // Standard SEO tags + bundle file markers
  const seoTags = [
    'mckeown', 'camera', 'antique', 'classic', 'price guide', 'collector',
    'photography', 'vintage', 'bundle',
    ...bundleFilePaths
  ];

  const bundleData = {
    title: "McKeown's Price Guide to Antique & Classic Cameras 2001-2002 (Complete - 906 pages)",
    slug: 'collection-mckeowns-price-guide-complete',
    description: "Complete edition of McKeown's Price Guide to Antique and Classic Cameras 2001-2002. Over 900 pages with more than 6,000 photographs. The definitive reference for camera collectors and enthusiasts. This bundle includes 19 PDF files covering the entire guide.",
    brand_id: docs[0].brand_id,
    category_id: docs[0].category_id,
    price: 4990, // $49.90 for the complete bundle
    file_path: docs[0].file_path, // Primary file (needed for basic download compat)
    file_size: totalSize,
    page_count: 906,
    preview_url: docs[0].preview_url,
    language: 'en',
    active: true,
    featured: true,
    seo_title: "McKeown's Price Guide to Antique & Classic Cameras - Complete 906-page Edition",
    seo_description: "Complete digital edition of McKeown's Price Guide. 906 pages, 6000+ photos. The essential reference for vintage camera collectors.",
    seo_tags: seoTags,
  };

  // 3. Check if bundle already exists
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('slug', bundleData.slug);

  if (existing && existing.length > 0) {
    const { error } = await supabase.from('documents').update(bundleData).eq('id', existing[0].id);
    console.log(error ? `Update error: ${error.message}` : 'Bundle document updated!');
  } else {
    const { error } = await supabase.from('documents').insert(bundleData);
    console.log(error ? `Insert error: ${error.message}` : 'Bundle document created!');
  }

  // 4. Deactivate individual sections
  const ids = docs.map(d => d.id);
  const { error: deactivateErr } = await supabase
    .from('documents')
    .update({ active: false })
    .in('id', ids);
  console.log(deactivateErr
    ? `Deactivation error: ${deactivateErr.message}`
    : `${ids.length} individual sections deactivated.`);

  console.log('\nBundle file paths stored in seo_tags:');
  bundleFilePaths.forEach(f => console.log('  ', f));

  console.log('\nDone! Now update webhook and download system to handle bundles.');
}

main().catch(console.error);
