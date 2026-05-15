import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ITEMS = [
  'volkswagen-polo-95-1-3-1-6-schema-fiche-auto-volt-718',
  'yamaha-grizzly-700-fi-yfm7fgpy-parts-catalogue-2008',
];

for (const slug of ITEMS) {
  const jpg = `C:\\Users\\adm\\Desktop\\${slug}.jpg`;
  const key = `previews/${slug}.jpg`;

  const buf = fs.readFileSync(jpg);
  const { error } = await supabase.storage.from('logos').upload(key, buf, { contentType: 'image/jpeg', upsert: true });
  if (error) { console.error(`✗ ${slug} :`, error.message); continue; }

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(key);
  await supabase.from('documents').update({ preview_url: publicUrl }).eq('slug', slug);
  console.log(`✓ ${slug}`);
}
