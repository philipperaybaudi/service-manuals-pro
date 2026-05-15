import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Compter tous les brands visibles
const { count } = await supabase.from('brands').select('*', { count: 'exact', head: true });
console.log('Total brands visibles :', count);

// 2. Lister les 5 premiers brands (pour voir si la table est lisible)
const { data: first5 } = await supabase.from('brands').select('id, slug, name').limit(5);
console.log('5 premiers brands :', first5);

// 3. Chercher par ID exact (l'ancien ID utilisé par les docs Pioneer)
const OLD_ID = 'feac2849-734a-4085-a625-adee3042bacd';
const { data: byOldId, error: e1 } = await supabase.from('brands').select('id, slug, name').eq('id', OLD_ID);
console.log('Brand par ancien ID :', byOldId, e1?.message);

// 4. Chercher slug 'pioneer' sans .single()
const { data: bySlug, error: e2 } = await supabase.from('brands').select('id, slug, name').eq('slug', 'pioneer');
console.log('Brand slug=pioneer :', bySlug, e2?.message);

// 5. Chercher slug 'pioneer-audio' ou variantes
const { data: variants } = await supabase.from('brands').select('id, slug, name').ilike('slug', '%pioneer%');
console.log('Brands contenant pioneer dans slug :', variants);
