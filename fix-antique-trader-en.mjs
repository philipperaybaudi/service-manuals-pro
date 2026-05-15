import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAntiqueTraderEN() {
  const { error } = await supabase
    .from('documents')
    .update({
      description: '<p>Documentation for the Antique Trader Cameras and Photographica Price Guide.</p><p>Comprehensive 306-page documentation.</p><p>This guide will allow you to identify and evaluate the value of your cameras and photographic equipment with confidence.</p>'
    })
    .eq('slug', 'collection-antique-trader-cameras-price-guide-complete');

  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✓ Antique Trader description (EN) fixed`);
  }
}

fixAntiqueTraderEN().catch(console.error);
