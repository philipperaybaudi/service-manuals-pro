import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// IDs cibles
const { data: targetBrand }    = await supabase.from('brands').select('id').eq('slug', 'automobile').single();
const { data: targetCategory } = await supabase.from('categories').select('id').eq('slug', 'diy-home-improvement').single();
const { data: bbsBrand }       = await supabase.from('brands').select('id').eq('slug', 'bbs').single();
const { data: contiBrand }     = await supabase.from('brands').select('id').eq('slug', 'conti').single();

// 1. Déplacer le doc BBS → brand AUTOMOBILE + catégorie DIY
const { error: moveErr } = await supabase.from('documents').update({
  brand_id:    targetBrand.id,
  category_id: targetCategory.id,
}).eq('slug', 'bbs-automotive-air-conditioning-and-climate-control-systems');
if (moveErr) { console.error('✗ Move :', moveErr.message); process.exit(1); }
console.log('✓ Document déplacé → AUTOMOBILE / DIY & Home Improvement');

// 2. Supprimer brand BBS
const { error: bssErr } = await supabase.from('brands').delete().eq('id', bbsBrand.id);
if (bssErr) { console.error('✗ Delete BBS :', bssErr.message); process.exit(1); }
console.log('✓ Marque BBS supprimée');

// 3. Supprimer brand CONTI
const { error: contiErr } = await supabase.from('brands').delete().eq('id', contiBrand.id);
if (contiErr) { console.error('✗ Delete CONTI :', contiErr.message); process.exit(1); }
console.log('✓ Marque CONTI supprimée');
