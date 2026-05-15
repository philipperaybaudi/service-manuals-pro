// List all LUREM documents currently in database
// Usage: node scripts/list-lurem-docs.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  console.log('Fetching all LUREM documents from database...\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, description, language')
    .ilike('title', '%lurem%')
    .order('title');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${docs.length} LUREM documents\n`);
  console.log('='.repeat(120));

  docs.forEach((doc, i) => {
    const desc = doc.description.substring(0, 80);
    console.log(`\n[${i + 1}] ${doc.title}`);
    console.log(`    Slug: ${doc.slug}`);
    console.log(`    Language: ${doc.language}`);
    console.log(`    Description: ${desc}${doc.description.length > 80 ? '...' : ''}`);
  });

  console.log('\n' + '='.repeat(120));
  console.log(`\nTotal LUREM documents: ${docs.length}`);
  console.log('\nNote: Match these with the 28 LUREM PDFs from the analysis');
})();
