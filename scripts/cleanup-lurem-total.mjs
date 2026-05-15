// COMPLETE LUREM CLEANUP - Delete everything LUREM
// Usage: node scripts/cleanup-lurem-total.mjs

import { readdirSync, unlinkSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

const SOURCE_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/MACHINES/LUREM';
const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc';

(async () => {
  console.log('='.repeat(100));
  console.log('COMPLETE LUREM CLEANUP - Deleting everything');
  console.log('='.repeat(100) + '\n');

  // Step 1: Delete all LUREM from database
  console.log('Step 1: Deleting all LUREM documents from database...\n');

  const { data: allLuremDocs } = await supabase
    .from('documents')
    .select('id, file_path, preview_url')
    .eq('brand_id', BRAND_ID);

  let deletedFromDb = 0;
  let deletedFromR2 = 0;

  for (const doc of allLuremDocs) {
    // Delete from R2
    if (doc.file_path) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: 'service-manuals-documents',
          Key: doc.file_path
        }));
        deletedFromR2++;
      } catch (e) {}
    }
    if (doc.preview_url) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: 'service-manuals-documents',
          Key: doc.preview_url
        }));
        deletedFromR2++;
      } catch (e) {}
    }

    // Delete from DB
    await supabase.from('documents').delete().eq('id', doc.id);
    deletedFromDb++;
  }

  console.log(`✅ Deleted ${deletedFromDb} documents from database`);
  console.log(`✅ Deleted ${deletedFromR2} files from R2\n`);

  // Step 2: Empty source folder
  console.log('Step 2: Emptying source folder...\n');

  let deletedFromFolder = 0;
  try {
    const files = readdirSync(SOURCE_PATH);
    for (const file of files) {
      try {
        unlinkSync(`${SOURCE_PATH}/${file}`);
        deletedFromFolder++;
      } catch (e) {
        console.log(`  ⚠️  Could not delete: ${file}`);
      }
    }
  } catch (e) {
    console.log(`⚠️  Error reading folder: ${e.message}`);
  }

  console.log(`✅ Deleted ${deletedFromFolder} files from source folder\n`);

  console.log('='.repeat(100));
  console.log('CLEANUP COMPLETE');
  console.log(`  - Database: ${deletedFromDb} documents deleted`);
  console.log(`  - R2: ${deletedFromR2} files deleted`);
  console.log(`  - Source folder: ${deletedFromFolder} files deleted`);
  console.log('='.repeat(100) + '\n');
})();
