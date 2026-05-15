import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Toutes les catégories
const { data: cats } = await supabase.from('categories').select('id, slug, name').order('slug');
console.log('CATÉGORIES :');
for (const c of cats) console.log(`  ${c.slug} — ${c.name}`);

// Documents BBS
const { data: bbs } = await supabase.from('brands').select('id').eq('slug', 'bbs').single();
const { data: bbsDocs } = await supabase.from('documents').select('id, slug, title_fr, file_path').eq('brand_id', bbs.id);
console.log(`\nBBS — ${bbsDocs.length} document(s) :`);
for (const d of bbsDocs) console.log(`  ${d.slug} | ${d.title_fr} | ${d.file_path}`);

// Marque CONTI
const { data: conti } = await supabase.from('brands').select('id').eq('slug', 'conti').single();
if (conti) {
  const { data: contiDocs } = await supabase.from('documents').select('id, slug').eq('brand_id', conti.id);
  console.log(`\nCONTI — ${contiDocs.length} document(s)`);
} else {
  console.log('\nCONTI : marque introuvable');
}

// Chercher catégorie Bricolage/DIY
const diy = cats.find(c => c.slug.includes('bricol') || c.slug.includes('diy') || c.name?.toLowerCase().includes('bricol'));
console.log(`\nCatégorie Bricolage/DIY trouvée : ${diy ? diy.slug + ' — ' + diy.name : 'INTROUVABLE'}`);

// Chercher marque "Automobile" dans toutes les marques
const { data: brands } = await supabase.from('brands').select('id, slug, name').ilike('name', '%automobile%');
console.log(`\nMarques contenant "Automobile" :`);
for (const b of brands) console.log(`  ${b.slug} — ${b.name}`);
