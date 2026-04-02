/**
 * Bundle all McKeown sections into a single ZIP file,
 * upload it, and create a single document entry.
 * Deactivates the 19 individual sections.
 */

const { createClient } = require('@supabase/supabase-js');
const archiver = require('archiver');
const { Writable } = require('stream');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== McKeown Bundle Creation ===\n');

  // 1. Get all McKeown docs
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, file_path, file_size, price, brand_id, category_id, preview_url')
    .eq('active', true)
    .ilike('slug', '%mckeown%')
    .order('slug');

  if (error || !docs) {
    console.log('Error:', error?.message);
    return;
  }

  console.log(`Found ${docs.length} McKeown sections`);
  const totalSize = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);
  console.log(`Total PDF size: ${Math.round(totalSize / 1024 / 1024)} MB`);

  // 2. Download all PDFs and create ZIP
  const tmpZipPath = path.join(process.env.TEMP || '/tmp', 'mckeown-complete.zip');
  console.log(`\nCreating ZIP at: ${tmpZipPath}`);

  const output = fs.createWriteStream(tmpZipPath);
  const archive = archiver('zip', { zlib: { level: 1 } }); // level 1 = fast (PDFs don't compress much)

  archive.pipe(output);

  let downloadedCount = 0;
  for (const doc of docs) {
    try {
      console.log(`  Downloading ${doc.file_path}...`);
      const { data: fileData, error: dlErr } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (dlErr || !fileData) {
        console.log(`  ✗ ${doc.slug}: ${dlErr?.message}`);
        continue;
      }

      const buf = Buffer.from(await fileData.arrayBuffer());
      const filename = doc.file_path.split('/').pop();
      archive.append(buf, { name: filename });
      downloadedCount++;
      console.log(`  ✓ ${filename} (${Math.round(buf.length / 1024 / 1024)}MB)`);
    } catch (err) {
      console.log(`  ✗ ${doc.slug}: ${err.message}`);
    }
  }

  console.log(`\nFinalizing ZIP (${downloadedCount} files)...`);
  await archive.finalize();

  // Wait for write to complete
  await new Promise((resolve) => output.on('close', resolve));
  const zipSize = fs.statSync(tmpZipPath).size;
  console.log(`ZIP created: ${Math.round(zipSize / 1024 / 1024)} MB`);

  // 3. Upload ZIP to Supabase storage
  console.log('\nUploading ZIP to Supabase storage...');
  const zipBuffer = fs.readFileSync(tmpZipPath);
  const zipPath = 'photography/collection/McKeown_s_Complete.zip';

  const { error: uploadErr } = await supabase.storage
    .from('documents')
    .upload(zipPath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    });

  if (uploadErr) {
    console.log('Upload error:', uploadErr.message);
    console.log('\nIf upload fails due to size, you may need to update Supabase file size limits.');
    // Clean up
    fs.unlinkSync(tmpZipPath);
    return;
  }

  console.log('ZIP uploaded successfully!');

  // 4. Create the bundle document
  const firstDoc = docs[0];
  const bundleData = {
    title: "McKeown's Price Guide to Antique & Classic Cameras 2001-2002 (Complete)",
    slug: 'collection-mckeowns-price-guide-complete',
    description: "Complete edition of McKeown's Price Guide to Antique and Classic Cameras 2001-2002. Over 900 pages with more than 6,000 photographs covering virtually every camera ever made. The definitive reference for camera collectors and enthusiasts. Delivered as a ZIP file containing all 19 sections.",
    brand_id: firstDoc.brand_id,
    category_id: firstDoc.category_id,
    price: 4990, // $49.90 for the complete bundle (vs $188.10 if buying all individually)
    file_path: zipPath,
    file_size: zipSize,
    page_count: 906,
    preview_url: firstDoc.preview_url,
    language: 'en',
    active: true,
    featured: true,
    seo_title: "McKeown's Price Guide to Antique & Classic Cameras 2001-2002 - Complete Edition",
    seo_description: "Complete digital edition of McKeown's Price Guide - 906 pages, 6000+ photos. The essential reference for vintage camera collectors.",
    seo_tags: ['mckeown', 'camera', 'antique', 'classic', 'price guide', 'collector', 'photography', 'vintage'],
  };

  // Check if bundle already exists
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('slug', bundleData.slug);

  if (existing && existing.length > 0) {
    // Update existing
    const { error: updateErr } = await supabase
      .from('documents')
      .update(bundleData)
      .eq('id', existing[0].id);
    console.log(updateErr ? `Update error: ${updateErr.message}` : 'Bundle document updated!');
  } else {
    // Insert new
    const { error: insertErr } = await supabase
      .from('documents')
      .insert(bundleData);
    console.log(insertErr ? `Insert error: ${insertErr.message}` : 'Bundle document created!');
  }

  // 5. Deactivate individual sections
  console.log('\nDeactivating individual sections...');
  const ids = docs.map(d => d.id);
  const { error: deactivateErr } = await supabase
    .from('documents')
    .update({ active: false })
    .in('id', ids);

  console.log(deactivateErr
    ? `Deactivation error: ${deactivateErr.message}`
    : `${ids.length} sections deactivated.`);

  // Clean up temp file
  fs.unlinkSync(tmpZipPath);
  console.log('\nDone! Bundle is live at /docs/collection-mckeowns-price-guide-complete');
}

main().catch(console.error);
