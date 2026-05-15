import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUGS = [
  'leica-leica-m320-service-manual',
  'leica-leica-wild-m680-service-manual',
];

for (const slug of SLUGS) {
  const { error } = await supabase
    .from('documents')
    .update({ price: 2500 })
    .eq('slug', slug);

  if (error) console.error(`❌ ${slug} : ${error.message}`);
  else console.log(`✅ ${slug} → 25€`);
}
