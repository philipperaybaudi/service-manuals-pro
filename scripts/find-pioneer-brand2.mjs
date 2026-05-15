import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Trouver un doc Pioneer connu en Audio & HiFi via son slug
const { data: doc } = await supabase.from('documents')
  .select('brand_id, slug, title_fr')
  .ilike('slug', '%pioneer%')
  .limit(5);
console.log('Docs avec "pioneer" dans le slug :', doc);

// Chercher dans title_fr
const { data: doc2 } = await supabase.from('documents')
  .select('brand_id, slug, title_fr')
  .ilike('title_fr', '%pioneer%')
  .limit(5);
console.log('Docs avec "pioneer" dans le titre :', doc2);

// Si on a un brand_id, le récupérer
if (doc2?.length > 0) {
  const { data: brand } = await supabase.from('brands')
    .select('id, slug, name, active')
    .eq('id', doc2[0].brand_id)
    .single();
  console.log('Brand associé :', brand);
}
