import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG = 'honda-pioneer-avic-hd1bt-navigation-system-quick-start-guide';

// 1. Créer la marque PIONEER si elle n'existe pas
let { data: brand } = await supabase.from('brands').select('id').eq('slug', 'pioneer').single();
if (!brand) {
  const { data: newBrand, error } = await supabase.from('brands').insert({
    slug: 'pioneer', name: 'PIONEER', active: true,
  }).select().single();
  if (error) { console.error('✗ Création PIONEER :', error.message); process.exit(1); }
  brand = newBrand;
  console.log(`✓ Marque PIONEER créée (id: ${brand.id})`);
} else {
  console.log(`✓ Marque PIONEER existante (id: ${brand.id})`);
}

// 2. Récupérer catégorie radio-communications
const { data: category } = await supabase.from('categories').select('id').eq('slug', 'radio-communications').single();
if (!category) { console.error('✗ Catégorie radio-communications introuvable'); process.exit(1); }

// 3. Récupérer le doc pour connaître son file_path actuel
const { data: doc } = await supabase.from('documents').select('id, title_fr, file_path').eq('slug', SLUG).single();
if (!doc) { console.error('✗ Document introuvable'); process.exit(1); }
console.log(`Doc : ${doc.title_fr}`);
console.log(`file_path : ${doc.file_path}`);

// 4. Mettre à jour brand_id + category_id
const { error } = await supabase.from('documents').update({
  brand_id:    brand.id,
  category_id: category.id,
}).eq('slug', SLUG);
if (error) { console.error('✗ Update :', error.message); process.exit(1); }
console.log('✓ Document déplacé → PIONEER / Radio & Communications');
