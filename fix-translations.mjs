import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTranslations() {
  // Récupère tous les documents avec description_fr
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .not('description_fr', 'is', null);

  console.log(`Found ${docs?.length || 0} documents with French descriptions\n`);

  let fixed = 0;
  let issues = [];

  for (const doc of docs || []) {
    let description_fr = doc.description_fr;
    let title_fr = doc.title_fr;
    let hasIssue = false;

    // Détecte mélange anglais/français (mots anglais entre mots français)
    const englishWords = ['for the', 'and use', 'for maintenance', 'for anyone', 'for installation', 'with', 'in', 'to'];
    const hasEnglishMix = englishWords.some(word => description_fr?.includes(word));

    // Détecte redondance ("Manuel d'utilisation ... Manuel d'utilisation")
    const hasRedundancy = /Manuel d'utilisation.*Manuel d'utilisation/i.test(description_fr);

    if (hasEnglishMix || hasRedundancy) {
      hasIssue = true;
      issues.push({ id: doc.id, title: doc.title, issue: 'mélange/redondance' });
    }

    // Supprime "(French)" ou "(French)" du titre et description
    if (title_fr?.includes('(French)') || description_fr?.includes('(French)')) {
      hasIssue = true;
      title_fr = title_fr?.replace(/\s*\(French\)/gi, '') || null;
      description_fr = description_fr?.replace(/\s*\(French\)/gi, '');
    }

    // Nettoie les descriptions mélangées
    if (hasEnglishMix) {
      // Récupère la description originale en anglais pour reconstruire
      const originalDesc = doc.description;

      // Traduction intelligente basée sur le contexte
      description_fr = originalDesc
        .replace(/User manual for the/gi, 'Manuel d\'utilisation pour le')
        .replace(/User manual/gi, 'Manuel d\'utilisation')
        .replace(/operating manual/gi, 'manuel d\'exploitation')
        .replace(/service manual/gi, 'manuel de service')
        .replace(/technical manual/gi, 'manuel technique')
        .replace(/repair manual/gi, 'manuel de réparation')
        .replace(/workshop manual/gi, 'manuel d\'atelier')
        .replace(/Covers/gi, 'Couvre')
        .replace(/covers/gi, 'couvre')
        .replace(/installation/gi, 'installation')
        .replace(/maintenance/gi, 'entretien')
        .replace(/operation/gi, 'opération')
        .replace(/repair/gi, 'réparation')
        .replace(/assembly/gi, 'assemblage')
        .replace(/adjustment/gi, 'réglage')
        .replace(/adjustments/gi, 'réglages')
        .replace(/specifications/gi, 'spécifications')
        .replace(/safety/gi, 'sécurité')
        .replace(/procedures/gi, 'procédures')
        .replace(/wiring/gi, 'câblage')
        .replace(/electrical/gi, 'électrique')
        .replace(/parts/gi, 'pièces')
        .replace(/troubleshooting/gi, 'dépannage')
        .replace(/documentation/gi, 'documentation')
        .replace(/and use/gi, 'et utilisation')
        .replace(/for anyone/gi, 'pour quiconque')
        .replace(/for installation/gi, 'pour installation')
        .replace(/Includes/gi, 'Inclut')
        .replace(/includes/gi, 'inclut')
        .replace(/Essential/gi, 'Essentiel')
        .replace(/essential/gi, 'essentiel')
        .replace(/Complete/gi, 'Complet')
        .replace(/complete/gi, 'complet');
    }

    if (hasIssue) {
      // Met à jour le document
      const { error } = await supabase
        .from('documents')
        .update({
          title_fr: title_fr || doc.title_fr,
          description_fr: description_fr || doc.description_fr
        })
        .eq('id', doc.id);

      if (error) {
        console.error(`❌ Error updating ${doc.id}:`, error.message);
      } else {
        fixed++;
        console.log(`✓ Fixed: ${doc.title}`);
      }
    }
  }

  console.log(`\n✓ Fixed ${fixed} documents`);
  console.log(`\nDocuments with issues found: ${issues.length}`);
  if (issues.length > 0) {
    issues.slice(0, 10).forEach(i => {
      console.log(`  - ${i.title} (${i.issue})`);
    });
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more`);
    }
  }
}

fixTranslations().catch(console.error);
