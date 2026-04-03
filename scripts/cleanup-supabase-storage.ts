/**
 * Cleanup script: delete all PDF files from Supabase Storage
 * after successful migration to Cloudflare R2.
 *
 * Run with: npx tsx scripts/cleanup-supabase-storage.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'documents';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listAllFiles(prefix = ''): Promise<string[]> {
  const allPaths: string[] = [];

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });

  if (error) {
    console.error(`❌ Error listing ${prefix}:`, error.message);
    return [];
  }

  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder, recurse
      const subFiles = await listAllFiles(fullPath);
      allPaths.push(...subFiles);
    } else {
      allPaths.push(fullPath);
    }
  }

  return allPaths;
}

async function main() {
  console.log('📋 Listing all files in Supabase Storage bucket:', BUCKET);
  const files = await listAllFiles();

  if (files.length === 0) {
    console.log('✅ Bucket is already empty!');
    return;
  }

  console.log(`\n🗑️  Found ${files.length} files to delete.\n`);

  // Delete in batches of 20
  const BATCH_SIZE = 20;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(batch);

    if (error) {
      console.error(`❌ Failed batch ${i}-${i + batch.length}:`, error.message);
      failed += batch.length;
    } else {
      deleted += batch.length;
      console.log(`✅ Deleted ${deleted}/${files.length} files...`);
    }
  }

  console.log(`\n🏁 Done! Deleted: ${deleted} | Failed: ${failed}`);
}

main().catch(console.error);
