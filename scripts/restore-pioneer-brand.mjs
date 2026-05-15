import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OLD_BRAND_ID = 'feac2849-734a-4085-a625-adee3042bacd';

// Compter les docs orphelins
const { data: orphans } = await supabase.from('documents')
  .select('id, slug, category_id')
  .eq('brand_id', OLD_BRAND_ID);
console.log(`Docs orphelins PIONEER : ${orphans.length}`);

// Créer la marque PIONEER
const { data: brand, error } = await supabase.from('brands').insert({
  slug: 'pioneer', name: 'PIONEER',
}).select().single();
if (error) { console.error('✗', error.message); process.exit(1); }
console.log(`✓ Marque PIONEER créée (id: ${brand.id})`);

// Mettre à jour tous les docs orphelins
const { error: upErr } = await supabase.from('documents')
  .update({ brand_id: brand.id })
  .eq('brand_id', OLD_BRAND_ID);
if (upErr) { console.error('✗ Update docs :', upErr.message); process.exit(1); }
console.log(`✓ ${orphans.length} documents mis à jour → PIONEER`);
