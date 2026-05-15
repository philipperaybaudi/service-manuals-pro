import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Chercher via les documents Audio & HiFi PIONEER connus
const { data: audioCat } = await supabase.from('categories').select('id').eq('slug', 'audio-hifi').single();

// Tous les brands qui ont au moins un doc en audio-hifi
const { data: docs } = await supabase.from('documents')
  .select('brand_id')
  .eq('category_id', audioCat.id)
  .limit(500);

const brandIds = [...new Set(docs.map(d => d.brand_id))];

// Trouver celui qui s'appelle PIONEER
const { data: brands } = await supabase.from('brands')
  .select('id, slug, name, active')
  .in('id', brandIds)
  .ilike('name', '%pioneer%');

console.log('PIONEER trouvé en Audio & HiFi :', brands);

// Aussi chercher dans TOUTE la table brands sans filtre
const { data: allPioneer } = await supabase.from('brands')
  .select('id, slug, name, active')
  .or('name.ilike.%pioneer%,slug.ilike.%pioneer%');
console.log('PIONEER dans toute la table brands :', allPioneer);
