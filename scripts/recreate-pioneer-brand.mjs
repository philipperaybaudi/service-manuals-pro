import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Créer la marque PIONEER
const { data: brand, error: brandErr } = await supabase.from('brands').insert({
  slug: 'pioneer', name: 'PIONEER', active: true,
}).select().single();
if (brandErr) { console.error('✗ Création :', brandErr.message); process.exit(1); }
console.log(`✓ Marque PIONEER créée (id: ${brand.id})`);

// 2. Mettre à jour le document avec le nouveau brand_id
const { error: docErr } = await supabase.from('documents').update({
  brand_id: brand.id,
}).eq('slug', 'honda-pioneer-avic-hd1bt-navigation-system-quick-start-guide');
if (docErr) { console.error('✗ Update doc :', docErr.message); process.exit(1); }
console.log('✓ Document mis à jour → PIONEER');
