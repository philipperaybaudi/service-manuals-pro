import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepCleanTranslations() {
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .not('description_fr', 'is', null);

  console.log(`Scanning ${docs?.length || 0} documents...\n`);

  let cleaned = 0;
  let problemDocs = [];

  for (const doc of docs || []) {
    let title_fr = doc.title_fr || '';
    let description_fr = doc.description_fr || '';
    let needsUpdate = false;

    // Nettoie "(French)" du titre
    if (title_fr.includes('(French)')) {
      title_fr = title_fr.replace(/\s*\(French\)/gi, '').trim();
      needsUpdate = true;
    }

    // Détecte les patterns problématiques dans description_fr
    const hasEnglishMix = /\b(for the|and use|for anyone|for installation|with|in|to)\b/.test(description_fr);
    const hasRedundancy = /Manuel d'utilisation.*Manuel d'utilisation/i.test(description_fr);
    const hasFrenchTag = description_fr.includes('(French)');

    if (hasEnglishMix || hasRedundancy || hasFrenchTag) {
      problemDocs.push({
        id: doc.id,
        title: doc.title,
        issue: [
          hasEnglishMix ? 'mélange' : '',
          hasRedundancy ? 'redondance' : '',
          hasFrenchTag ? '(French)' : ''
        ].filter(Boolean).join(', ')
      });

      // Reconstruit à partir de la description anglaise
      const desc = doc.description || '';

      description_fr = desc
        .replace(/\(French\)/gi, '')
        .replace(/User manual for the/gi, 'Manuel d\'utilisation pour le')
        .replace(/operating manual for the/gi, 'Manuel d\'exploitation pour le')
        .replace(/service manual for the/gi, 'Manuel de service pour le')
        .replace(/technical manual for the/gi, 'Manuel technique pour le')
        .replace(/repair manual for the/gi, 'Manuel de réparation pour le')
        .replace(/workshop manual for the/gi, 'Manuel d\'atelier pour le')
        .replace(/User manual/gi, 'Manuel d\'utilisation')
        .replace(/user manual/gi, 'Manuel d\'utilisation')
        .replace(/operating manual/gi, 'Manuel d\'exploitation')
        .replace(/service manual/gi, 'Manuel de service')
        .replace(/technical manual/gi, 'Manuel technique')
        .replace(/repair manual/gi, 'Manuel de réparation')
        .replace(/workshop manual/gi, 'Manuel d\'atelier')
        .replace(/Covers /gi, 'Couvre ')
        .replace(/covers /gi, 'couvre ')
        .replace(/for maintenance/gi, 'pour entretien')
        .replace(/for anyone/gi, 'pour quiconque')
        .replace(/and use of this/gi, 'et utilisation de cet')
        .replace(/and use of/gi, 'et utilisation de')
        .replace(/and maintenance/gi, 'et entretien')
        .replace(/for installation/gi, 'pour installation')
        .replace(/for troubleshooting/gi, 'pour dépannage')
        .replace(/Essential documentation/gi, 'Documentation essentielle')
        .replace(/Complete documentation/gi, 'Documentation complète')
        .trim();

      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error } = await supabase
        .from('documents')
        .update({
          title_fr: title_fr || null,
          description_fr: description_fr || null
        })
        .eq('id', doc.id);

      if (!error) {
        cleaned++;
        console.log(`✓ Cleaned: ${doc.title}`);
      } else {
        console.error(`❌ Error: ${doc.title} - ${error.message}`);
      }
    }
  }

  console.log(`\n✓ Cleaned ${cleaned} documents`);
  console.log(`\nDocuments with issues: ${problemDocs.length}`);

  if (problemDocs.length > 0) {
    console.log('\nExamples:');
    problemDocs.slice(0, 15).forEach(doc => {
      console.log(`  - ${doc.title} (${doc.issue})`);
    });
    if (problemDocs.length > 15) {
      console.log(`  ... and ${problemDocs.length - 15} more`);
    }
  }
}

deepCleanTranslations().catch(console.error);
