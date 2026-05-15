import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase
  .from('documents')
  .select('*')
  .is('title_fr', null)
  .order('id');

fs.writeFileSync(
  'documents-to-translate.json',
  JSON.stringify(data, null, 2)
);

console.log(`✓ Exported ${data.length} documents to documents-to-translate.json`);
