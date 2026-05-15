// Clean LUREM titles by removing price info ($5, $15, $19, etc.)
// Usage: node scripts/clean-lurem-titles.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc'; // LUREM

(async () => {
  console.log('Cleaning LUREM titles (removing price info)...\n');

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(28);

  console.log(`Found ${docs.length} documents\n`);

  let cleaned = 0;

  for (const doc of docs) {
    // Remove price info: " $5", " $15", " $19", etc. and also " 5", " 15", " 19" at end
    const cleanTitle = doc.title
      .replace(/\s+\$?\d+\s*$/, '')
      .trim();

    if (cleanTitle !== doc.title) {
      const { error } = await supabase
        .from('documents')
        .update({ title: cleanTitle })
        .eq('id', doc.id);

      if (error) {
        console.log(`❌ ${doc.title}`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ ${cleanTitle}`);
        cleaned++;
      }
    } else {
      console.log(`- ${doc.title} (no change needed)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Cleaned: ${cleaned}/${docs.length}\n`);
})();
