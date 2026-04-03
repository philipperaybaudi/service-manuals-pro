/**
 * Migration script: Copy all PDFs from Supabase Storage to Cloudflare R2.
 *
 * Prerequisites:
 *   1. Install AWS SDK: npm install @aws-sdk/client-s3
 *   2. Get R2 API credentials from Cloudflare Dashboard → R2 → Manage R2 API Tokens
 *   3. Set these environment variables (or add to .env.local):
 *      - R2_ACCOUNT_ID        (your Cloudflare account ID)
 *      - R2_ACCESS_KEY_ID     (R2 API token access key)
 *      - R2_SECRET_ACCESS_KEY (R2 API token secret key)
 *      - R2_BUCKET_NAME       (default: service-manuals-documents)
 *
 * Usage:
 *   npx tsx scripts/migrate-to-r2.ts
 *
 * The script will:
 *   1. List all files in the Supabase 'documents' storage bucket
 *   2. Download each file via signed URL
 *   3. Upload it to R2 with the same key (path)
 *   4. Report progress and any errors
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'service-manuals-documents';

// Validate env
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  console.error('   Create an R2 API token at: Cloudflare Dashboard → R2 → Manage R2 API Tokens');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listAllFiles(bucket: string, folder: string = ''): Promise<string[]> {
  const allFiles: string[] = [];

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000 });

  if (error) {
    console.error(`Error listing ${folder}:`, error.message);
    return [];
  }

  for (const item of data || []) {
    const path = folder ? `${folder}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder, recurse
      const subFiles = await listAllFiles(bucket, path);
      allFiles.push(...subFiles);
    } else {
      allFiles.push(path);
    }
  }

  return allFiles;
}

async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

async function migrateFile(filePath: string): Promise<boolean> {
  try {
    // Check if already exists in R2
    if (await fileExistsInR2(filePath)) {
      console.log(`  ⏭️  Already in R2: ${filePath}`);
      return true;
    }

    // Generate signed URL from Supabase (valid 10 min)
    const { data: signedUrl, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 600);

    if (error || !signedUrl) {
      console.error(`  ❌ Failed to get signed URL for ${filePath}:`, error?.message);
      return false;
    }

    // Download from Supabase
    const response = await fetch(signedUrl.signedUrl);
    if (!response.ok) {
      console.error(`  ❌ Failed to download ${filePath}: HTTP ${response.status}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: 'application/pdf',
    }));

    const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    console.log(`  ✅ Migrated: ${filePath} (${sizeMB} MB)`);
    return true;
  } catch (err: any) {
    console.error(`  ❌ Error migrating ${filePath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration: Supabase Storage → Cloudflare R2');
  console.log(`   Bucket: ${R2_BUCKET_NAME}`);
  console.log('');

  // List all files in Supabase 'documents' bucket
  console.log('📋 Listing files in Supabase Storage...');
  const files = await listAllFiles('documents');
  console.log(`   Found ${files.length} files\n`);

  if (files.length === 0) {
    console.log('No files to migrate.');
    return;
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[${i + 1}/${files.length}] ${file}`);

    const result = await migrateFile(file);
    if (result) {
      // Check if it was skipped (already existed) or newly migrated
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`   Successful: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${files.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Some files failed. Run the script again to retry.');
  }
}

main().catch(console.error);
