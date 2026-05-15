import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tous les docs Renault actuels
const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'renault').single();
const { data: docs } = await supabase
  .from('documents')
  .select('slug, title_fr, file_path')
  .eq('brand_id', brand.id)
  .order('slug');

console.log(`\n=== ${docs.length} documents Renault actuels ===`);
for (const d of docs) console.log(`  ${d.slug}`);

// Fichiers EAVT présents dans DOCS EN LIGNE
const eavts = [
  'EAVT716A', 'EAVT723A', 'EAVT724A', 'EAVT726A', 'EAVT730A',
  'EAVT732A', 'EAVT742A', 'EAVT749A', 'EAVT756A', 'EAVT758A',
  'EAVT759A', 'EAVT763A', 'EAVT771A', 'EAVT773A', 'EAVT780A',
];

console.log('\n=== Vérification EAVT dans le catalogue ===');
for (const e of eavts) {
  // Chercher par file_path ou slug contenant le numéro
  const num = e.replace('EAVT', '').replace('A', '').toLowerCase();
  const match = docs.find(d =>
    d.file_path?.includes(e.toLowerCase()) ||
    d.slug?.includes(`eavt${num}`) ||
    d.file_path?.includes(`eavt${num}`)
  );
  if (match) {
    console.log(`  ✓ ${e} → ${match.slug}`);
  } else {
    console.log(`  ✗ ${e} → NON TROUVÉ dans le catalogue`);
  }
}
