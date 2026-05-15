import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUGS_DOCS = [
  'noirot-manuel-depannage-thermostat-noirot',
  'airelec-manuel-depannage-thermostat-airelec',
  'acova-manuel-depannage-thermostat-acova',
];
const SLUGS_BRANDS = ['noirot', 'airelec', 'acova'];

const { data: docs } = await sb.from('documents')
  .select('slug,title,title_fr,brand_id,file_path,preview_url,active')
  .in('slug', SLUGS_DOCS);

const { data: brands } = await sb.from('brands')
  .select('id,name,slug,category_id')
  .in('slug', SLUGS_BRANDS);

console.log('=== Docs (3 attendus) ===');
console.log(JSON.stringify(docs, null, 2));
console.log('\n=== Marques (3 attendues) ===');
console.log(JSON.stringify(brands, null, 2));
