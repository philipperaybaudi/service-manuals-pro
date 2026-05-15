import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://ylsbqehotapcprfinsnu.supabase.co', 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X');

(async () => {
  console.log('Fixing LUREM prices (cents format)...\n');

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, price')
    .eq('brand_id', 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc')
    .order('created_at', { ascending: false })
    .limit(30);

  const toFix = docs.filter(d => /\$\d+/.test(d.title));
  console.log(`Found ${toFix.length} docs to fix\n`);

  let fixed = 0;

  for (const doc of toFix) {
    const match = doc.title.match(/\$(\d+)/);
    const priceInCents = match ? parseInt(match[1]) * 100 : 1500;

    console.log(`${doc.title}`);
    console.log(`  Old price: ${doc.price} cents`);
    console.log(`  New price: ${priceInCents} cents ($${(priceInCents/100).toFixed(2)})`);

    const { error } = await supabase
      .from('documents')
      .update({ price: priceInCents })
      .eq('id', doc.id);

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Fixed`);
      fixed++;
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log(`Fixed: ${fixed}/${toFix.length}\n`);
})();
