// Check all EMCO descriptions in database
// Usage: node scripts/check-emco-descriptions.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BRAND_ID = '7261ff4a-9840-4f3c-9a2e-ab59d3209606'; // EMCO

(async () => {
  console.log('Fetching all EMCO documents...\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, description, language')
    .eq('brand_id', BRAND_ID)
    .order('title');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${docs.length} EMCO documents\n`);
  console.log('='.repeat(100));

  let nonEnglishCount = 0;
  const langIndicators = ['english-language', 'german-language', 'french-language', 'italian-language', 'spanish-language', 'swedish-language', 'portuguese-language', 'dutch-language', 'polish-language', 'russian-language', 'czech-language', 'danish-language', 'norwegian-language'];

  docs.forEach((doc, i) => {
    const desc = doc.description.toLowerCase();
    const hasProperLangIndicator = langIndicators.some(ind => desc.includes(ind));

    // Check if description contains text in document's native language (sign of non-English desc)
    const isNonEnglishContent =
      (doc.language === 'fr' && (desc.includes('manuel') || desc.includes('d\'utilisation') || desc.includes('français'))) ||
      (doc.language === 'de' && (desc.includes('bedienungsanleitung') || desc.includes('deutsch') || desc.includes('anleitung'))) ||
      (doc.language === 'it' && (desc.includes('manuale') || desc.includes('italiano'))) ||
      (doc.language === 'es' && (desc.includes('manual') && desc.includes('español')));

    const suspicious = !hasProperLangIndicator || isNonEnglishContent;

    if (suspicious) {
      nonEnglishCount++;
      console.log(`\n[${i + 1}] ⚠️  ${doc.title}`);
      console.log(`    Slug: ${doc.slug}`);
      console.log(`    Language field: ${doc.language}`);
      console.log(`    Description: ${doc.description}`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log(`\nTotal EMCO documents: ${docs.length}`);
  console.log(`Non-English descriptions found: ${nonEnglishCount}`);

  if (nonEnglishCount === 0) {
    console.log('\n✅ All EMCO descriptions are in English');
  } else {
    console.log('\n❌ Some EMCO descriptions need correction');
  }
})();
