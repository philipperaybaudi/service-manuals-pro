import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

for (const brandSlug of ['rover', 'seat']) {
  const { data: brand } = await supabase.from('brands').select('id').eq('slug', brandSlug).single();
  if (!brand) { console.log(`\n✗ Marque introuvable : ${brandSlug}`); continue; }

  const { data: docs } = await supabase.from('documents')
    .select('id, slug, title_fr, page_count, file_size, preview_url')
    .eq('brand_id', brand.id)
    .order('slug');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`MARQUE : ${brandSlug.toUpperCase()} — ${docs.length} documents`);
  console.log('='.repeat(70));
  for (const d of docs) {
    console.log(`slug       : ${d.slug}`);
    console.log(`title_fr   : ${d.title_fr}`);
    console.log(`pages      : ${d.page_count} | taille : ${d.file_size ? (d.file_size/1024).toFixed(0)+' KB' : 'N/A'}`);
    console.log(`preview    : ${d.preview_url ? 'OK' : 'NULL'}`);
    console.log('---');
  }
}

// Les 2 docs suspects spécifiques
console.log(`\n${'='.repeat(70)}`);
console.log('DOCS SUSPECTS SPÉCIFIQUES');
console.log('='.repeat(70));
const suspects = ['yamaha-43pc-2009', 'volkswagen-document-technique-pages-blanches'];
for (const slug of suspects) {
  const { data: d } = await supabase.from('documents')
    .select('id, slug, title_fr, page_count, file_size, preview_url')
    .eq('slug', slug).single();
  if (!d) { console.log(`✗ Introuvable : ${slug}`); continue; }
  console.log(`slug     : ${d.slug}`);
  console.log(`title_fr : ${d.title_fr}`);
  console.log(`pages    : ${d.page_count} | ${d.file_size ? (d.file_size/1024).toFixed(0)+' KB' : 'N/A'}`);
  console.log('---');
}
