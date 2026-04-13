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
  if (!text || text.length < 5) return text;

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

async function translateAllIdentical() {
  console.log('🚀 Traduction des 86 docs 100% anglais avec Google...\n');

  const excluded = ['antique-trader', 'classic-cameras', 'mckeon', 'russian-soviet'];

  // Tous les docs
  const { data: docs } = await supabase
    .from('documents')
    .select('id, slug, description, description_fr')
    .eq('active', true)
    .not('description_fr', 'is', null)
    .limit(500);

  // Identiques EN/FR
  const identical = docs?.filter(d => {
    if (excluded.some(p => d.slug.includes(p))) return false;
    return d.description?.trim() === d.description_fr?.trim();
  }) || [];

  console.log(`📊 ${identical.length} docs à traduire\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < identical.length; i++) {
    const doc = identical[i];
    const progress = `[${i + 1}/${identical.length}]`;

    try {
      console.log(`${progress} ${doc.slug}`);

      // Traduire avec Google
      const googleTranslation = await translateWithGoogle(doc.description);

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('documents')
        .update({ description_fr: googleTranslation })
        .eq('id', doc.id);

      if (updateError) {
        console.log(`    ❌ Update error: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`    ✓ Traduit`);
        successCount++;
      }
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
      failCount++;
    }

    // Petit délai
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Traduction terminée`);
  console.log(`   Réussis: ${successCount}`);
  console.log(`   Échoués: ${failCount}`);
  console.log(`   Total: ${successCount + failCount}`);
}

translateAllIdentical();
