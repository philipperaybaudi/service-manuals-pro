import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importBatch(filename) {
  const translations = JSON.parse(fs.readFileSync(filename, 'utf8'));
  console.log(`Importing ${translations.length} documents from ${filename}...`);

  for (const doc of translations) {
    const { error } = await supabase
      .from('documents')
      .update({
        title_fr: doc.title_fr,
        description_fr: doc.description_fr
      })
      .eq('id', doc.id);

    if (error) {
      console.error(`Error updating ${doc.id}:`, error.message);
    }
  }

  console.log(`✓ Imported ${translations.length} documents from ${filename}`);
}

async function main() {
  try {
    await importBatch('batch3-translations.json');
    await importBatch('batch4-translations.json');
    await importBatch('batch5-translations.json');
    console.log('\n✓ All translations imported successfully!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
