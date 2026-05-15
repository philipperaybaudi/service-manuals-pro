import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const slugs = [
  'renault-document-technique-pages-blanches',
  'renault-document-technique-incomplet',
  'renault-document-technique-eavt773a',
  'renault-document-vide-ou-non-lisible',
];

for (const slug of slugs) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, slug, title, title_fr, description, description_fr, file_path, preview_url')
    .eq('slug', slug)
    .single();
  if (error) { console.log(`✗ ${slug}: ${error.message}`); continue; }
  console.log(`\nSlug: ${slug}`);
  console.log(`  title_fr : ${data.title_fr}`);
  console.log(`  file_path   : ${data.file_path}`);
  console.log(`  preview_url : ${data.preview_url}`);
}
