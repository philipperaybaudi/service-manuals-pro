import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixClassicCameras() {
  const { error } = await supabase
    .from('documents')
    .update({ title_fr: 'Classic Cameras par Colin Harding' })
    .eq('slug', 'collection-classic-cameras-by-colin-harding');

  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✓ Updated: Classic Cameras par Colin Harding`);
  }
}

fixClassicCameras().catch(console.error);
