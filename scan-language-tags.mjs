import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scanLanguageTags() {
  const { data: docs } = await supabase
    .from('documents')
    .select('*');

  console.log(`Scanning ${docs?.length || 0} documents for language tags...\n`);

  const problematicDocs = [];

  // Patterns larges pour détecter les références de langue
  const patterns = [
    /french/i,
    /english/i,
    /german/i,
    /spanish/i,
    /italian/i,
    /portuguese/i,
    /dutch/i,
    /swedish/i,
    /russian/i,
    /japanese/i,
    /chinese/i,
    /korean/i,
    /langue.*édition/i,
    /édition.*langue/i,
    /original en/i,
    /language/i,
  ];

  for (const doc of docs || []) {
    const issues = [];

    // Vérifie le titre EN
    if (patterns.some(p => p.test(doc.title || ''))) {
      issues.push('title EN');
    }

    // Vérifie la description EN
    if (patterns.some(p => p.test(doc.description || ''))) {
      issues.push('description EN');
    }

    // Vérifie le titre FR
    if (patterns.some(p => p.test(doc.title_fr || ''))) {
      issues.push('title FR');
    }

    // Vérifie la description FR
    if (patterns.some(p => p.test(doc.description_fr || ''))) {
      issues.push('description FR');
    }

    if (issues.length > 0) {
      problematicDocs.push({
        id: doc.id,
        title: doc.title,
        issues: issues.join(', '),
        title: doc.title,
        titleFr: doc.title_fr,
        description: doc.description?.substring(0, 80) + '...',
        descriptionFr: doc.description_fr?.substring(0, 80) + '...',
      });
    }
  }

  console.log(`Found ${problematicDocs.length} documents with language references\n`);

  if (problematicDocs.length === 0) {
    console.log('✓ No documents with language tags found!');
    return;
  }

  console.log('Documents with issues:');
  console.log('='.repeat(100));

  problematicDocs.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.title}`);
    console.log(`   Issues: ${doc.issues}`);
    if (doc.titleFr) console.log(`   Title FR: ${doc.titleFr}`);
    console.log('');
  });

  console.log('='.repeat(100));
  console.log(`\nTotal: ${problematicDocs.length} documents need cleaning`);

  // Sauvegarde la liste en fichier
  const fs = await import('fs');
  fs.writeFileSync(
    'language-tags-report.txt',
    problematicDocs
      .map((doc, idx) => `${idx + 1}. ${doc.title}\nIssues: ${doc.issues}\n`)
      .join('\n')
  );
  console.log('\n✓ Report saved to language-tags-report.txt');
}

scanLanguageTags().catch(console.error);
