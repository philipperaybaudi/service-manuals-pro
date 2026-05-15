import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'volkswagen').single();
const { data: docs } = await supabase.from('documents')
  .select('id, slug, title_fr, page_count, file_size')
  .eq('brand_id', brand.id)
  .order('slug');

console.log(`VOLKSWAGEN — ${docs.length} documents\n`);
for (const d of docs) {
  console.log(`slug     : ${d.slug}`);
  console.log(`title_fr : ${d.title_fr}`);
  console.log(`pages    : ${d.page_count} | taille : ${d.file_size ? (d.file_size/1024).toFixed(0)+' KB' : 'N/A'}`);
  console.log('---');
}
