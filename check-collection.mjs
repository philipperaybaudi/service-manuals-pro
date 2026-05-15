import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCollection() {
  const collectionSlugs = [
    'collection-antique-trader-cameras-price-guide-complete',
    'camera-repair-vishnevsky-english',
    'camera-repair-vishnevsky-russian',
    'camera-repairs-yakovlev-english',
    'camera-repairs-yakovlev-russian',
    'collection-classic-cameras-by-colin-harding',
    'collection-mckeowns-price-guide-complete',
    'collection-russian-and-soviet-cameras-1840-1991'
  ];

  console.log('Checking Collection documents for translations...\n');

  const missing = [];
  let toUpdate = [];

  for (const slug of collectionSlugs) {
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!doc) {
      console.log(`❌ NOT FOUND: ${slug}`);
      continue;
    }

    console.log(`\n📄 ${doc.title}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   title_fr: ${doc.title_fr || '❌ MISSING'}`);
    console.log(`   description_fr: ${(doc.description_fr ? '✓ Present' : '❌ MISSING')}`);

    if (!doc.description_fr || !doc.title_fr) {
      missing.push(doc.title);
    }

    // Corrige "Classic Cameras by Colin Harding" → "Classic Cameras par Colin Harding"
    if (doc.title === 'Classic Cameras by Colin Harding' && doc.title_fr !== 'Classic Cameras par Colin Harding') {
      toUpdate.push({
        id: doc.id,
        title: doc.title,
        newTitleFr: 'Classic Cameras par Colin Harding'
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nSummary:`);
  console.log(`Documents missing FR translations: ${missing.length}`);
  if (missing.length > 0) {
    missing.forEach(t => console.log(`  - ${t}`));
  }

  if (toUpdate.length > 0) {
    console.log(`\nDocuments to update:`);
    toUpdate.forEach(doc => {
      console.log(`  - ${doc.title}`);
      console.log(`    → ${doc.newTitleFr}`);
    });
  }
}

checkCollection().catch(console.error);
