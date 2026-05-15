// Remove all language references from descriptions
// Usage: node scripts/clean-language-references.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const langPatterns = [
  /English-language\s+/gi,
  /English-Language\s+/gi,
  /German-language\s+/gi,
  /German-Language\s+/gi,
  /French-language\s+/gi,
  /French-Language\s+/gi,
  /Italian-language\s+/gi,
  /Italian-Language\s+/gi,
  /Spanish-language\s+/gi,
  /Spanish-Language\s+/gi,
  /Swedish-language\s+/gi,
  /Swedish-Language\s+/gi,
  /Portuguese-language\s+/gi,
  /Portuguese-Language\s+/gi,
  /Dutch-language\s+/gi,
  /Dutch-Language\s+/gi,
  /Polish-language\s+/gi,
  /Polish-Language\s+/gi,
  /Russian-language\s+/gi,
  /Russian-Language\s+/gi,
  /Czech-language\s+/gi,
  /Czech-Language\s+/gi,
  /Danish-language\s+/gi,
  /Danish-Language\s+/gi,
  /Norwegian-language\s+/gi,
  /Norwegian-Language\s+/gi,
  /Belgian-language\s+/gi,
  /Belgian-Language\s+/gi,
  /Document in German\.\s*/gi,
  /Document in French\.\s*/gi,
  /Document in English\.\s*/gi,
  /Document in Spanish\.\s*/gi,
  /Document in Italian\.\s*/gi,
  /Document in Swedish\.\s*/gi,
  /Document in Portuguese\.\s*/gi,
  /Document in Dutch\.\s*/gi,
  /Document in Polish\.\s*/gi,
  /Document in Russian\.\s*/gi,
  /Document in Czech\.\s*/gi,
  /Document in Danish\.\s*/gi,
  /Document in Norwegian\.\s*/gi,
  /Instruction book \(Instructionsbok\)\s+/gi
];

function cleanDescription(desc) {
  let cleaned = desc;
  langPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

(async () => {
  console.log('Cleaning language references from all descriptions...\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, description, language')
    .order('created_at');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  const langPatternLower = [
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
    'document in norwegian',
    'instruction book (instructionsbok)'
  ];

  let toUpdate = [];
  docs.forEach(doc => {
    const descLower = doc.description.toLowerCase();
    const hasLangRef = langPatternLower.some(pattern => descLower.includes(pattern));

    if (hasLangRef) {
      toUpdate.push(doc);
    }
  });

  console.log(`Found ${toUpdate.length} documents with language references\n`);

  let updated = 0;
  let errors = 0;

  for (const doc of toUpdate) {
    try {
      const cleanedDesc = cleanDescription(doc.description);

      const { error } = await supabase
        .from('documents')
        .update({ description: cleanedDesc })
        .eq('id', doc.id);

      if (error) {
        console.error(`❌ ${doc.slug}: ${error.message}`);
        errors++;
      } else {
        console.log(`✅ ${doc.slug}`);
        updated++;
      }
    } catch (e) {
      console.error(`❌ ${doc.slug}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log(`Updated: ${updated}/${toUpdate.length}`);
  if (errors > 0) console.log(`Errors: ${errors}`);
  console.log('');
})();
