import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Chercher le brand par son ID exact
const { data: brand } = await supabase.from('brands')
  .select('id, slug, name, active')
  .eq('id', 'feac2849-734a-4085-a625-adee3042bacd')
  .single();
console.log('Brand par ID :', brand);

// Chercher tous les brands contenant "pioneer"
const { data: brands } = await supabase.from('brands')
  .select('id, slug, name, active')
  .ilike('name', '%pioneer%');
console.log('Brands "pioneer" :', brands);
