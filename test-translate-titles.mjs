import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Google Translate API
async function translateWithGoogle(text) {
  if (!text || text.length < 3) return text;

  try {
    const encoded = encodeURIComponent(text.substring(0, 500));
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/element.js?req=2&client=gtx&sl=en&tl=fr&dt=t&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    );

    const text_result = await response.text();
    const match = text_result.match(/,"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
    return text;
  } catch (err) {
    console.error(`  ⚠️ Google error: ${err.message}`);
    return text;
  }
}

async function testTitleTranslations() {
  console.log('🔍 Test traduction des TITRES - 5 exemples\n');

  const excluded = ['antique-trader', 'classic-cameras', 'mckeon', 'russian-soviet', 'camera-craftsman'];

  const { data: allDocs } = await supabase
    .from('documents')
    .select('slug, title, title_fr')
    .eq('active', true)
    .limit(500);

  // Docs sans title_fr
  const noTitleFr = allDocs?.filter(d => {
    if (excluded.some(p => d.slug.includes(p))) return false;
    return !d.title_fr || d.title_fr.trim() === '' || d.title_fr === d.title;
  }) || [];

  console.log(`Trouvé ${noTitleFr.length} docs sans title_fr. Test sur les 5 premiers...\n`);

  for (let i = 0; i < Math.min(5, noTitleFr.length); i++) {
    const doc = noTitleFr[i];
    console.log(`📄 ${doc.slug}`);
    console.log(`   EN: ${doc.title}`);

    const googleTranslation = await translateWithGoogle(doc.title);
    console.log(`   FR (Google): ${googleTranslation}`);
    console.log('');
  }
}

testTitleTranslations();
