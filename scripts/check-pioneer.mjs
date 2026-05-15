import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Vérifier le document
const { data: doc } = await supabase.from('documents')
  .select('id, slug, brand_id, category_id, active')
  .eq('slug', 'honda-pioneer-avic-hd1bt-navigation-system-quick-start-guide')
  .single();
console.log('Document :', doc);

// Vérifier la marque PIONEER
const { data: brand } = await supabase.from('brands')
  .select('id, slug, name, active, logo_url')
  .eq('slug', 'pioneer')
  .single();
console.log('Brand PIONEER :', brand);

// Vérifier la catégorie radio-communications
const { data: cat } = await supabase.from('categories')
  .select('id, slug')
  .eq('slug', 'radio-communications')
  .single();
console.log('Catégorie radio-communications id :', cat?.id);
console.log('Match category_id doc vs cat :', doc?.category_id === cat?.id);
