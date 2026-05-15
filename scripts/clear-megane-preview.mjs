import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { error } = await supabase.from('documents')
  .update({ preview_url: null })
  .eq('slug', 'renault-megane-diesel-schema-fiche-1996');

if (error) { console.error('✗', error.message); process.exit(1); }
console.log('✓ preview_url remis à null');
