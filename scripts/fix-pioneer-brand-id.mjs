import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OLD_ID = 'feac2849-734a-4085-a625-adee3042bacd';

// Trouver le vrai ID du brand pioneer (contourne le .single() qui retourne null)
const { data: brands, error } = await supabase.from('brands').select('id, slug, name').eq('slug', 'pioneer');
console.log('Brands pioneer :', brands, error);

if (brands && brands.length > 0) {
  const newId = brands[0].id;
  console.log(`Nouveau brand_id PIONEER : ${newId}`);

  // Mettre à jour tous les docs orphelins
  const { data, error: upErr } = await supabase.from('documents')
    .update({ brand_id: newId })
    .eq('brand_id', OLD_ID)
    .select('slug');
  if (upErr) { console.error('✗', upErr.message); process.exit(1); }
  console.log(`✓ ${data.length} documents mis à jour → brand_id PIONEER correct`);
}
