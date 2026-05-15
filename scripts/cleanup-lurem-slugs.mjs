// Clean up LUREM slugs by removing price info ($19, $15, $5) from filenames
// Only affects the 28 newly imported LUREM documents
// Usage: node scripts/cleanup-lurem-slugs.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc'; // LUREM

function cleanSlug(slug) {
  // Remove price info from slug (e.g., "lurem-variateurs-hz-5" or "lurem-c2000-schema-electrique-19")
  return slug.replace(/-\d+$/, '');
}

(async () => {
  console.log('Cleaning up LUREM slugs (removing price info)...\n');

  // Get only newly imported LUREM docs (those with price in slug)
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, file_path, preview_url, price')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(30); // Get last 30 to find the 28 new ones

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  // Filter only those with price info in slug (newly imported)
  const toClean = docs.filter(doc => /-\d+$/.test(doc.slug));

  console.log(`Found ${toClean.length} LUREM docs with price info in slug\n`);

  let cleaned = 0;
  let errors = 0;

  for (const doc of toClean) {
    const newSlug = cleanSlug(doc.slug);
    const oldDocPath = doc.file_path;
    const newDocPath = oldDocPath.replace(doc.slug, newSlug);
    const oldPreviewPath = doc.preview_url;
    const newPreviewPath = oldPreviewPath?.replace(doc.slug, newSlug);

    console.log(`Processing: ${doc.slug}`);
    console.log(`  New slug: ${newSlug}`);

    try {
      // Check if new slug already exists
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('slug', newSlug)
        .single();

      if (existing && existing.id !== doc.id) {
        console.error(`  ❌ Slug conflict: ${newSlug} already exists`);
        errors++;
        continue;
      }

      // Download old PDF from R2
      if (oldDocPath) {
        try {
          const getCmd = new GetObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: oldDocPath
          });
          const response = await r2.send(getCmd);
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const pdfBytes = Buffer.concat(chunks);

          // Upload to new path
          await r2.send(new PutObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: newDocPath,
            Body: pdfBytes,
            ContentType: 'application/pdf'
          }));

          // Delete old file
          await r2.send(new DeleteObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: oldDocPath
          }));
        } catch (e) {
          console.warn(`  Warning: Could not move PDF: ${e.message}`);
        }
      }

      // Move preview if exists
      if (oldPreviewPath && newPreviewPath && oldPreviewPath !== newPreviewPath) {
        try {
          const getCmd = new GetObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: oldPreviewPath
          });
          const response = await r2.send(getCmd);
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const imgBytes = Buffer.concat(chunks);

          // Upload to new path
          await r2.send(new PutObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: newPreviewPath,
            Body: imgBytes,
            ContentType: 'image/jpeg'
          }));

          // Delete old file
          await r2.send(new DeleteObjectCommand({
            Bucket: 'service-manuals-documents',
            Key: oldPreviewPath
          }));
        } catch (e) {
          console.warn(`  Warning: Could not move preview: ${e.message}`);
        }
      }

      // Update database
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          slug: newSlug,
          file_path: newDocPath,
          preview_url: newPreviewPath
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error(`  ❌ Database error: ${updateError.message}`);
        errors++;
      } else {
        console.log(`  ✅ Cleaned`);
        cleaned++;
      }
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
      errors++;
    }
    console.log();
  }

  console.log('='.repeat(100));
  console.log(`\nResults:`);
  console.log(`  Cleaned: ${cleaned}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${toClean.length}\n`);
})();
