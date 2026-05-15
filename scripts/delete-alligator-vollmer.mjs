import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const s = createClient('https://ylsbqehotapcprfinsnu.supabase.co', 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X');

(async () => {
  const { data: brand } = await s.from('brands').select('id').eq('slug', 'alligator-vollmer').single();
  const { error } = await s.from('documents').delete().eq('brand_id', brand.id);
  if (error) console.error('Error:', error);
  else console.log('✓ Documents supprimés');
})();
