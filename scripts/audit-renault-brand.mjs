import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'renault').single();
const { data: docs, error } = await supabase
  .from('documents')
  .select('id, slug, title_fr, file_path, page_count, price')
  .eq('brand_id', brand.id)
  .order('slug');

if (error) { console.error(error); process.exit(1); }

console.log(`Total documents Renault : ${docs.length}\n`);
for (const d of docs) {
  console.log(`${d.slug}`);
  console.log(`  -> ${d.title_fr}`);
  console.log(`  -> file: ${d.file_path} | ${d.page_count}p | ${d.price}`);
}
