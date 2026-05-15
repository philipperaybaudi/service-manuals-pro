// Fix LUREM prices: extract from filename, apply correct format, clean filename
// Usage: node scripts/fix-lurem-prices.mjs

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

function extractPrice(filename) {
  // Extract price from filename (e.g., "$19.pdf" → 19.00)
  const match = filename.match(/\$(\d+)/);
  if (match) {
    return parseFloat(match[1]).toFixed(2);
  }
  return '15.00'; // default price
}

function cleanFilename(filename) {
  // Remove $X from filename (e.g., "file $19.pdf" → "file.pdf")
  return filename.replace(/\s*\$\d+\.pdf$/i, '.pdf');
}

(async () => {
  console.log('Fixing LUREM prices and filenames...\n');

  // Get the 28 newly imported LUREM docs
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, price')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  // Filter to only those with $X in original title
  const toFix = docs.filter(doc => /\$\d+/.test(doc.title));

  console.log(`Found ${toFix.length} LUREM docs with price in title\n`);

  let fixed = 0;
  let errors = 0;

  for (const doc of toFix) {
    const correctPrice = extractPrice(doc.title);
    const cleanedTitle = cleanFilename(doc.title);

    console.log(`Processing: ${doc.title}`);
    console.log(`  Correct price: $${correctPrice}`);
    console.log(`  Old R2 path: ${doc.file_path}`);

    try {
      // Update price in database
      const { error: priceError } = await supabase
        .from('documents')
        .update({ price: parseFloat(correctPrice) })
        .eq('id', doc.id);

      if (priceError) {
        console.error(`  ❌ Price update error: ${priceError.message}`);
        errors++;
        continue;
      }

      console.log(`  ✅ Price updated to $${correctPrice}`);
      fixed++;
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
      errors++;
    }
    console.log();
  }

  console.log('='.repeat(100));
  console.log(`\nResults:`);
  console.log(`  Fixed prices: ${fixed}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${toFix.length}\n`);
})();
