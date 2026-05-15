// Get LUREM brand ID
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name')
    .ilike('name', '%lurem%');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('LUREM brand found:');
    data.forEach(b => console.log(`ID: ${b.id}, Name: ${b.name}`));
  } else {
    console.log('No LUREM brand found. Need to create it.');
  }
})();
