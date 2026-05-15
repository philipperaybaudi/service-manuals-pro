import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Test 1 : select explicite (comme le script de diagnostic)
const { data: explicit } = await s
  .from('documents')
  .select('slug, title, title_fr, description, description_fr')
  .ilike('slug', '%alligator-jed-63%')
  .limit(1);

// Test 2 : select avec wildcard + jointures (comme la page marque)
const { data: withJoins } = await s
  .from('documents')
  .select('*, brand:brands(*), category:categories(*)')
  .ilike('slug', '%alligator-jed-63%')
  .limit(1);

console.log('=== SELECT EXPLICITE ===');
const d1 = explicit[0];
console.log('title_fr    :', d1.title_fr ?? '(null)');
console.log('desc_fr(60) :', d1.description_fr?.slice(0, 60) ?? '(null)');

console.log('\n=== SELECT * + JOINTURES (comme page marque) ===');
const d2 = withJoins[0];
console.log('title_fr    :', d2.title_fr ?? '(null)');
console.log('desc_fr(60) :', d2.description_fr?.slice(0, 60) ?? '(null)');
console.log('\nToutes les clés retournées :', Object.keys(d2).join(', '));
