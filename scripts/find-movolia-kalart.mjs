import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Chercher MOVOLIA
const { data: mov } = await s.from('brands').select('id, name, slug, category_id').ilike('name', '%movolia%');
console.log('MOVOLIA brands:', JSON.stringify(mov, null, 2));

// Chercher KALART
const { data: kal1 } = await s.from('documents').select('id, slug, title').ilike('title', '%kalart%');
console.log('\nDocs contenant KALART:', JSON.stringify(kal1, null, 2));

// Chercher Victor 16mm
const { data: kal2 } = await s.from('documents').select('id, slug, title').ilike('slug', '%victor%16%');
console.log('\nDocs slug victor+16:', JSON.stringify(kal2, null, 2));

// Chercher dans la marque VICTOR
const { data: victorBrand } = await s.from('brands').select('id').ilike('name', 'victor').limit(5);
if (victorBrand?.length > 0) {
  for (const b of victorBrand) {
    const { data: vDocs } = await s.from('documents').select('id, slug, title').eq('brand_id', b.id);
    console.log(`\nDocs marque Victor (${b.id}):`, JSON.stringify(vDocs, null, 2));
  }
}
