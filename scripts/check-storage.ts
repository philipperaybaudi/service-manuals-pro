/**
 * Check Supabase Storage usage across all buckets.
 * Run with: npx tsx scripts/check-storage.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countFiles(bucket: string, prefix = ''): Promise<{ count: number; size: number }> {
  let total = { count: 0, size: 0 };

  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    console.error(`  Error listing ${bucket}/${prefix}: ${error.message}`);
    return total;
  }

  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      // folder
      const sub = await countFiles(bucket, fullPath);
      total.count += sub.count;
      total.size += sub.size;
    } else {
      total.count++;
      total.size += (item.metadata?.size || 0);
    }
  }

  return total;
}

async function main() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error.message);
    return;
  }

  console.log('=== SUPABASE STORAGE BUCKETS ===\n');

  let grandTotal = 0;

  for (const b of buckets) {
    console.log(`Bucket: "${b.name}" (public: ${b.public})`);
    const { count, size } = await countFiles(b.name);
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    console.log(`  -> ${count} files, ${sizeMB} MB`);
    grandTotal += size;
  }

  console.log(`\n=== TOTAL: ${(grandTotal / 1024 / 1024).toFixed(1)} MB ===`);
  console.log(`Quota Free Plan: 1000 MB`);
  console.log(`Usage: ${((grandTotal / 1024 / 1024 / 1000) * 100).toFixed(0)}%`);
}

main().catch(console.error);
