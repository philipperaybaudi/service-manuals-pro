/**
 * Optimize Supabase storage: delete files from inactive docs
 * and unused preview images to reduce storage below 1.1 GB.
 *
 * Phase 1: Delete storage files only used by inactive docs (not shared with active)
 * Phase 2: Delete unused preview images from logos/previews/
 * Phase 3: Delete inactive document rows from the database
 * Phase 4: Update brand document_count
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== OPTIMIZE SUPABASE STORAGE ===\n');

  // Get all docs
  const { data: allDocs } = await sb.from('documents').select('id, slug, active, file_path, file_size, seo_tags, brand_id');

  // Collect all file paths used by ACTIVE docs
  const activeFilePaths = new Set();
  const activePreviewNames = new Set();

  for (const d of allDocs) {
    if (!d.active) continue;
    if (d.file_path) activeFilePaths.add(d.file_path);
    if (d.seo_tags && Array.isArray(d.seo_tags)) {
      for (const tag of d.seo_tags) {
        if (tag.startsWith('file:')) activeFilePaths.add(tag.slice(5));
      }
    }
  }

  // ========== PHASE 1: Delete inactive-only PDF files ==========
  console.log('--- PHASE 1: Delete inactive PDF files from storage ---');
  const filesToDelete = [];

  for (const d of allDocs) {
    if (d.active) continue;
    const paths = [];
    if (d.file_path) paths.push(d.file_path);
    if (d.seo_tags && Array.isArray(d.seo_tags)) {
      for (const tag of d.seo_tags) {
        if (tag.startsWith('file:')) paths.push(tag.slice(5));
      }
    }

    for (const p of paths) {
      if (!activeFilePaths.has(p) && !filesToDelete.includes(p)) {
        filesToDelete.push(p);
      }
    }
  }

  console.log(`Files to delete: ${filesToDelete.length}`);

  // Delete in batches of 20
  let deleted = 0;
  let errors = 0;
  for (let i = 0; i < filesToDelete.length; i += 20) {
    const batch = filesToDelete.slice(i, i + 20);
    const { data, error } = await sb.storage.from('documents').remove(batch);
    if (error) {
      console.log(`  Batch error at ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      deleted += batch.length;
    }
  }
  console.log(`  Deleted: ${deleted} files, Errors: ${errors}\n`);

  // ========== PHASE 2: Delete unused preview images ==========
  console.log('--- PHASE 2: Delete unused preview images ---');

  // Get active docs preview URLs
  for (const d of allDocs) {
    if (d.active && d.preview_url) {
      // Extract filename from URL
      const parts = d.preview_url.split('/');
      const fname = parts[parts.length - 1];
      activePreviewNames.add(fname);
    }
  }

  // Also check brand logo_url
  const { data: brands } = await sb.from('brands').select('logo_url');
  for (const b of brands || []) {
    if (b.logo_url) {
      const parts = b.logo_url.split('/');
      activePreviewNames.add(parts[parts.length - 1]);
    }
  }

  // List all preview files
  const { data: previewFiles } = await sb.storage.from('logos').list('previews', { limit: 1000 });
  const unusedPreviews = [];

  for (const f of previewFiles || []) {
    if (!f.metadata) continue;
    if (!activePreviewNames.has(f.name)) {
      unusedPreviews.push('previews/' + f.name);
    }
  }

  console.log(`Unused preview images: ${unusedPreviews.length}`);

  if (unusedPreviews.length > 0) {
    for (let i = 0; i < unusedPreviews.length; i += 20) {
      const batch = unusedPreviews.slice(i, i + 20);
      const { error } = await sb.storage.from('logos').remove(batch);
      if (error) console.log(`  Preview batch error: ${error.message}`);
    }
    console.log(`  Deleted ${unusedPreviews.length} unused preview images\n`);
  }

  // ========== PHASE 3: Delete inactive document rows ==========
  console.log('--- PHASE 3: Delete inactive document rows ---');

  const inactiveDocs = allDocs.filter(d => !d.active);
  console.log(`Inactive docs to delete: ${inactiveDocs.length}`);

  // Delete in batches
  let rowsDeleted = 0;
  for (let i = 0; i < inactiveDocs.length; i += 50) {
    const batch = inactiveDocs.slice(i, i + 50);
    const ids = batch.map(d => d.id);
    const { error } = await sb.from('documents').delete().in('id', ids);
    if (error) {
      console.log(`  Row delete error: ${error.message}`);
    } else {
      rowsDeleted += ids.length;
    }
  }
  console.log(`  Deleted ${rowsDeleted} inactive document rows\n`);

  // ========== PHASE 4: Update brand counts ==========
  console.log('--- PHASE 4: Update brand document counts ---');

  const { data: activeDocs } = await sb.from('documents')
    .select('brand_id')
    .eq('active', true);

  const brandCounts = {};
  for (const d of activeDocs) {
    brandCounts[d.brand_id] = (brandCounts[d.brand_id] || 0) + 1;
  }

  const { data: allBrands } = await sb.from('brands').select('id, document_count');
  let brandsUpdated = 0;
  for (const b of allBrands) {
    const newCount = brandCounts[b.id] || 0;
    if (b.document_count !== newCount) {
      await sb.from('brands').update({ document_count: newCount }).eq('id', b.id);
      brandsUpdated++;
    }
  }
  console.log(`  Updated ${brandsUpdated} brand counts\n`);

  // Final summary
  const { count } = await sb.from('documents').select('id', { count: 'exact', head: true });
  console.log('=== DONE ===');
  console.log(`Remaining documents: ${count}`);
  console.log(`PDF files deleted: ${deleted}`);
  console.log(`Preview images deleted: ${unusedPreviews.length}`);
  console.log(`DB rows deleted: ${rowsDeleted}`);
}

main().catch(console.error);
