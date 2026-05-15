import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG = 'can-am-bombardier-outlander-cvt-one-way-clutch-lubrication-guide';

// Récupérer le doc
const { data: doc } = await supabase.from('documents')
  .select('id, title_fr, file_path, brand_id')
  .eq('slug', SLUG).single();
console.log(`Doc trouvé : ${doc.title_fr}`);
console.log(`file_path  : ${doc.file_path}`);

// Récupérer brand_id Bombardier
const { data: brand } = await supabase.from('brands').select('id, name').eq('slug', 'bombardier').single();
if (!brand) { console.error('✗ Marque BOMBARDIER introuvable (slug: bombardier)'); process.exit(1); }
console.log(`Brand BOMBARDIER : ${brand.id} (${brand.name})`);

// Mettre à jour brand_id
const { error } = await supabase.from('documents').update({ brand_id: brand.id }).eq('slug', SLUG);
if (error) { console.error('✗', error.message); process.exit(1); }
console.log(`✓ brand_id mis à jour → BOMBARDIER`);
