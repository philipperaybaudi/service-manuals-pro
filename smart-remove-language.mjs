import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function smartRemoveLanguage() {
  // Documents à EXCLURE - ne jamais nettoyer
  const excludedDocuments = [
    'Antique Trader Cameras and Photographica Price Guide',
    'Classic Cameras by Colin Harding',
    "McKeown's Price guide to antique and classic Cameras 2001-2002",
    'Russian & Soviet Cameras 1840-1991'
  ];

  // Les vrais patterns à supprimer
  const cleanPatterns = [
    { pattern: /\s*—\s*(English|French|German|Spanish|Italian|Portuguese|Russian|Japanese|Chinese|Korean)\s*(Edition|Version)?/gi, desc: 'Edition markers' },
    { pattern: /\s*(English|French|German|Spanish|Italian|Portuguese|Russian|Japanese|Chinese|Korean)\s*edition/gi, desc: 'Edition lowercase' },
    { pattern: /\s*\(French\)\s*/gi, desc: '(French) tags' },
    { pattern: /\s*\(English\)\s*/gi, desc: '(English) tags' },
    { pattern: /\s*\(German\)\s*/gi, desc: '(German) tags' },
    { pattern: /\s+german\s+service/gi, desc: 'german service' },
    { pattern: /\s+english\s+version/gi, desc: 'english version' },
    { pattern: /\s+french\s+version/gi, desc: 'french version' },
    { pattern: /Repair\s+(English|French|German|Spanish|Italian|Russian)\s*$/gi, desc: 'Repair + language at end' },
    { pattern: /\s+Original en (français|anglais|allemand)/gi, desc: 'Original en...' },
  ];

  const { data: docs } = await supabase
    .from('documents')
    .select('*');

  console.log(`Smart cleaning ${docs?.length || 0} documents...\n`);

  let cleaned = 0;
  const cleanedDocs = [];

  for (const doc of docs || []) {
    // Saute les documents exclus
    if (excludedDocuments.includes(doc.title)) {
      console.log(`⊘ SKIPPED (excluded): ${doc.title}`);
      continue;
    }

    let title = doc.title || '';
    let description = doc.description || '';
    let title_fr = doc.title_fr || '';
    let description_fr = doc.description_fr || '';
    const originalTitle = title;
    const originalDesc = description;
    let needsUpdate = false;

    // Applique les patterns de nettoyage
    for (const { pattern } of cleanPatterns) {
      if (pattern.test(title)) {
        title = title.replace(pattern, '').trim();
        needsUpdate = true;
      }
      if (pattern.test(description)) {
        description = description.replace(pattern, '').trim();
        needsUpdate = true;
      }
      if (pattern.test(title_fr)) {
        title_fr = title_fr.replace(pattern, '').trim();
        needsUpdate = true;
      }
      if (pattern.test(description_fr)) {
        description_fr = description_fr.replace(pattern, '').trim();
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const { error } = await supabase
        .from('documents')
        .update({
          title: title || null,
          description: description || null,
          title_fr: title_fr || null,
          description_fr: description_fr || null
        })
        .eq('id', doc.id);

      if (!error) {
        cleaned++;
        cleanedDocs.push({
          title: originalTitle,
          newTitle: title !== originalTitle ? title : 'unchanged',
          desc: originalDesc.substring(0, 60)
        });
        console.log(`✓ ${originalTitle}`);
        if (title !== originalTitle) {
          console.log(`  → ${title}`);
        }
      }
    }
  }

  console.log(`\n✓ Smart cleaned ${cleaned} documents`);

  if (cleanedDocs.length > 0) {
    console.log('\nExamples of cleaned documents:');
    cleanedDocs.slice(0, 10).forEach(doc => {
      console.log(`  - ${doc.title}`);
      if (doc.newTitle !== 'unchanged') {
        console.log(`    → ${doc.newTitle}`);
      }
    });
  }
}

smartRemoveLanguage().catch(console.error);
