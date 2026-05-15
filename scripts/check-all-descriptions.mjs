// Check all documents for language references in descriptions
// Usage: node scripts/check-all-descriptions.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  console.log('Checking all documents for language references...\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, description, language')
    .order('created_at');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${docs.length} total documents\n`);

  const langPatterns = [
    'english-language',
    'german-language',
    'french-language',
    'italian-language',
    'spanish-language',
    'swedish-language',
    'portuguese-language',
    'dutch-language',
    'polish-language',
    'russian-language',
    'czech-language',
    'danish-language',
    'norwegian-language',
    'belgian-language',
    'document in german',
    'document in french',
    'document in english',
    'document in spanish',
    'document in italian',
    'document in swedish',
    'document in portuguese',
    'document in dutch',
    'document in polish',
    'document in russian',
    'document in czech',
    'document in danish',
    'document in norwegian'
  ];

  let withLanguageRef = 0;
  const docsToFix = [];

  docs.forEach(doc => {
    const desc = doc.description.toLowerCase();
    const hasLangRef = langPatterns.some(pattern => desc.includes(pattern));

    if (hasLangRef) {
      withLanguageRef++;
      docsToFix.push({
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        description: doc.description
      });
    }
  });

  console.log(`Documents with language references: ${withLanguageRef}`);
  console.log(`Documents without language references: ${docs.length - withLanguageRef}\n`);

  if (withLanguageRef > 0) {
    console.log('='.repeat(100));
    console.log('Documents to fix:\n');

    docsToFix.forEach((doc, i) => {
      const desc = doc.description.substring(0, 100);
      console.log(`[${i + 1}] ${doc.title}`);
      console.log(`    Slug: ${doc.slug}`);
      console.log(`    Description: ${desc}${doc.description.length > 100 ? '...' : ''}\n`);
    });

    console.log('='.repeat(100));
    console.log(`\nTotal to fix: ${withLanguageRef}/${docs.length}`);
  } else {
    console.log('✅ All descriptions are clean (no language references)');
  }
})();
