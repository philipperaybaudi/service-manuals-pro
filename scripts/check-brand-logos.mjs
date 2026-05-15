import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const slugs = ['alfa-romeo', 'rover', 'rowenta', 'toyota', 'zenit'];

// Vérifier ces marques + voir format logo_url existant
const { data: samples } = await supabase
  .from('brands')
  .select('id, slug, name, logo_url')
  .not('logo_url', 'is', null)
  .limit(3);

console.log('Exemples de logo_url existants :');
for (const b of samples) console.log(`  ${b.slug}: ${b.logo_url}`);

console.log('\nMarques à mettre à jour :');
const { data: targets } = await supabase
  .from('brands')
  .select('id, slug, name, logo_url')
  .in('slug', slugs);

for (const b of targets) console.log(`  ${b.slug} (${b.name}) → logo_url actuel: ${b.logo_url}`);
