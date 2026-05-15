// Check LUREM brand and Machine Tools category in DB
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ylsbqehotapcprfinsnu.supabase.co',
  'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X'
);

const { data: cats } = await supabase.from('categories').select('id, name, slug').ilike('name', '%machine%');
console.log('Machine Tools category:');
console.log(cats);

const { data: brands } = await supabase.from('brands').select('id, name, slug, logo_url').ilike('name', '%lurem%');
console.log('\nLUREM brand:');
console.log(brands);

const { data: luremDocs, count } = await supabase
  .from('documents')
  .select('id, title, slug', { count: 'exact' })
  .ilike('title', '%lurem%');
console.log(`\nExisting LUREM docs in DB: ${count || 0}`);
if (luremDocs && luremDocs.length) luremDocs.forEach(d => console.log('  -', d.title));
