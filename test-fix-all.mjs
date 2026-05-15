import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MyMemory API
async function translateWithMyMemory(text) {
  if (!text || text.length < 3) return text;

  try {
    const encoded = encodeURIComponent(text.substring(0, 500));
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|fr`);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText || text;
    }
    return text;
  } catch (err) {
    console.error(`  ⚠️ MyMemory error: ${err.message}`);
    return text;
  }
}

async function testFix() {
  console.log('🔍 Test correction des 373 docs - 5 exemples\n');

  const excluded = ['antique-trader', 'classic-cameras', 'mckeon', 'russian-soviet', 'camera-craftsman'];

  const { data: allDocs } = await supabase
    .from('documents')
    .select('id, slug, title, title_fr, description, description_fr')
    .eq('active', true);

  // Docs problématiques
  const problemDocs = allDocs?.filter(doc => {
    if (excluded.some(p => doc.slug.includes(p))) return false;

    const titleProblem = !doc.title_fr || doc.title_fr.trim() === '' ||
                         doc.title_fr.toLowerCase() === 'resize' ||
                         doc.title_fr.length < 3 ||
                         doc.title_fr === doc.title;

    const descProblem = !doc.description_fr || doc.description_fr.trim() === '' ||
                        doc.description_fr.toLowerCase() === 'resize' ||
                        doc.description_fr.length < 3 ||
                        doc.description_fr === doc.description;

    return titleProblem || descProblem;
  }) || [];

  console.log(`Trouvé ${problemDocs.length} docs problématiques. Test sur les 5 premiers...\n`);

  for (let i = 0; i < Math.min(5, problemDocs.length); i++) {
    const doc = problemDocs[i];
    console.log(`📄 ${doc.slug}`);

    if (doc.title_fr === 'resize' || doc.title_fr === doc.title || !doc.title_fr) {
      console.log(`   TITLE EN: ${doc.title}`);
      const titleFr = await translateWithMyMemory(doc.title);
      console.log(`   TITLE FR (MyMemory): ${titleFr}`);
    }

    if (doc.description_fr === 'resize' || doc.description_fr === doc.description || !doc.description_fr) {
      console.log(`   DESC EN: ${doc.description?.substring(0, 80)}...`);
      const descFr = await translateWithMyMemory(doc.description || '');
      console.log(`   DESC FR (MyMemory): ${descFr.substring(0, 80)}...`);
    }
    console.log('');
  }
}

testFix();
