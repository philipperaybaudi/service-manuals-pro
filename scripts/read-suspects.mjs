import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const slugs = [
  'bang-olufsen-beomaster-1700-type-2607-service-manual',
  'bang-olufsen-beomaster-3000-type-2402-service-manual',
  'bang-olufsen-bang-olufsen-beovox-beolab-service-manual-schematics',
  'bang-olufsen-bang-olufsen-beovox-3000-5000-beolab-service-manual',
  'grundig-grundig-studio-3000-electronic-schematic',
  'atelier-how-to-use-battery-tubes-technical-guide',
  'grundig-grundig-satellit-2400-professional-stereo-schematic',
  'grundig-grundig-satellit-600-electronic-schematics',
  'racal-racal-ra17-communications-receiver-schematic',
];

const { data } = await supabase.from('documents').select('slug,page_count,description,description_fr').in('slug', slugs);
data.forEach(d => {
  console.log('---');
  console.log(d.slug, '(' + d.page_count + 'p)');
  console.log('EN:', d.description);
  console.log('FR:', d.description_fr);
});
