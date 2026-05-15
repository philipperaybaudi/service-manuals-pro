import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let data = [];
let from = 0;
while (true) {
  const { data: page } = await s.from('documents')
    .select('slug, title, title_fr, description_fr, description')
    .eq('active', true)
    .range(from, from + 999);
  data = data.concat(page);
  if (page.length < 1000) break;
  from += 1000;
}

const badDesc = data.filter(d =>
  !d.description_fr ||
  d.description_fr === d.description ||
  (d.description_fr && !/[éàèêîôùûç]/i.test(d.description_fr))
);

const badTitle = data.filter(d =>
  !d.title_fr ||
  d.title_fr === d.title
);

console.log(`\nFiches avec description_fr absente ou en anglais : ${badDesc.length} / ${data.length}`);
badDesc.forEach(d => console.log(' -', d.slug));

console.log(`\nFiches avec title_fr absent ou en anglais : ${badTitle.length} / ${data.length}`);
badTitle.forEach(d => console.log(' -', d.slug, '|', d.title));
