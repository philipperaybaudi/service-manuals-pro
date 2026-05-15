import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importAntiqueTrader() {
  const { error } = await supabase
    .from('documents')
    .update({
      description_fr: '<p>Documentation du Guide de prix Antique Trader pour appareils photo et objets photographiques.</p><p>Documentation complète de 306 pages.</p><p>Ce guide vous permettra d\'identifier et d\'évaluer la valeur de vos appareils photo et objets photographiques avec confiance.</p>'
    })
    .eq('slug', 'collection-antique-trader-cameras-price-guide-complete');

  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✓ Antique Trader description_fr imported`);
  }
}

importAntiqueTrader().catch(console.error);
