/**
 * Delete and recreate the empty "documents" bucket to force GC.
 * Run with: npx tsx scripts/reset-documents-bucket.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('1. Deleting documents bucket...');
  const { error: e1 } = await sb.storage.deleteBucket('documents');
  console.log(e1 ? '   Error: ' + e1.message : '   OK deleted');

  console.log('2. Recreating documents bucket...');
  const { error: e2 } = await sb.storage.createBucket('documents', { public: false });
  console.log(e2 ? '   Error: ' + e2.message : '   OK created');

  console.log('3. Current buckets:');
  const { data } = await sb.storage.listBuckets();
  for (const b of data || []) {
    console.log('   - ' + b.name + ' (public: ' + b.public + ')');
  }

  console.log('\nDone! Check the Supabase dashboard in a few minutes to see if storage size dropped.');
}

main().catch(console.error);
