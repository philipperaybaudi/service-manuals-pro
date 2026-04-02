require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function dl(url) {
  return new Promise((r, j) => {
    const g = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return g(res.headers.location);
        const c = []; res.on('data', d => c.push(d)); res.on('end', () => r(Buffer.concat(c)));
      }).on('error', j);
    }; g(url);
  });
}

async function updatePreview(slug, imgUrl) {
  try {
    const img = await dl(imgUrl);
    const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
    const pp = 'previews/' + slug + '.' + ext;
    await sb.storage.from('logos').upload(pp, img, { contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext), upsert: true });
    const { data } = sb.storage.from('logos').getPublicUrl(pp);
    return data.publicUrl;
  } catch (e) {
    console.log('  Preview fail:', e.message);
    return null;
  }
}

async function main() {
  console.log('=== Fix Polaris ===\n');

  // FR has 5 Polaris products:
  // 1. Sportsman 400/500 service manual (20€) → polaris-400-500-service-manual-complete
  // 2. Sportsman 700/800/800X2 service manual (20€) → polaris-polaris-700-et-800-efi-service-manual
  // 3. Sportsman 850 service manual (20€) → polaris-polaris-850-series-service-manual (REACTIVATE)
  // 4. Sportsman 800 EFI parts list (10€) → polaris-sportsman-800-twin-efi (REACTIVATE)
  // 5. Sportsman 500 parts list (10€) → polaris-sportsman-500

  // 1. Fix 400/500 service manual
  console.log('--- Polaris 400/500 ---');
  let preview = await updatePreview('polaris-400-500-service-manual-complete', 'https://la-documentation-technique.eu/wp-content/uploads/2021/03/Polaris-Sportsman-400-et-500.jpg');
  await sb.from('documents').update({
    title: 'Polaris Sportsman 400 & 500 - Service Manual',
    description: '<p>Polaris Sportsman 400 and 500</p><p>Complete workshop manual for maintenance and troubleshooting of these ATVs.</p><p>Workshop manual (312 pages in 2 volumes) printed in 2005, original manufacturer version (for service workshops).</p><p>Essential documentation for anyone wishing to maintain and troubleshoot this ATV efficiently and safely.</p>',
    price: 2000,
    preview_url: preview,
  }).eq('slug', 'polaris-400-500-service-manual-complete');
  console.log('  ✓ Updated');

  // 2. Fix 700/800 service manual
  console.log('--- Polaris 700/800 ---');
  preview = await updatePreview('polaris-polaris-700-et-800-efi-service-manual', 'https://la-documentation-technique.eu/wp-content/uploads/2021/03/Polaris-700-800-800X2-EFI.jpg');
  await sb.from('documents').update({
    title: 'Polaris Sportsman 700 800 800X2 EFI - Service Manual',
    description: '<p>Polaris Sportsman 700 800 800X2 EFI</p><p>Complete workshop manual for maintenance and troubleshooting of Polaris Sportsman 700, 800 and 800X2 EFI ATVs.</p><p>Workshop manual (393 pages) printed in 2007, original manufacturer version (for service workshops).</p><p>Essential documentation for anyone wishing to maintain and troubleshoot this ATV efficiently and safely.</p>',
    price: 2000,
    preview_url: preview,
  }).eq('slug', 'polaris-polaris-700-et-800-efi-service-manual');
  console.log('  ✓ Updated');

  // 3. Reactivate and fix 850
  console.log('--- Polaris 850 (reactivate) ---');
  preview = await updatePreview('polaris-polaris-850-series-service-manual', 'https://la-documentation-technique.eu/wp-content/uploads/2021/03/polaris-sportsman-850-efi-hd-eps.jpg');
  await sb.from('documents').update({
    active: true,
    title: 'Polaris Sportsman 850 EFI / HD / EPS - Service Manual',
    description: '<p>Polaris Sportsman 850 EFI / HD / EPS</p><p>Complete workshop manual for maintenance and troubleshooting of Polaris Sportsman 850 Series ATVs.</p><p>Workshop manual (309 pages) printed in 2009, original manufacturer version (for service workshops).</p><p>Essential documentation for anyone wishing to maintain and troubleshoot this ATV efficiently and safely.</p>',
    price: 2000,
    preview_url: preview,
  }).eq('slug', 'polaris-polaris-850-series-service-manual');
  console.log('  ✓ Reactivated');

  // 4. Reactivate and fix 800 EFI parts list
  console.log('--- Polaris 800 EFI parts (reactivate) ---');
  preview = await updatePreview('polaris-sportsman-800-twin-efi', 'https://la-documentation-technique.eu/wp-content/uploads/2021/03/POLARIS-Sportsman-800-EFI.jpg');
  await sb.from('documents').update({
    active: true,
    title: 'Polaris Sportsman 800 EFI - Parts List',
    description: '<p>Polaris Sportsman 800 EFI - Parts List</p><p>Workshop manual with parts list for Polaris Sportsman 800 EFI ATVs.</p><p>Workshop documentation (66 pages) printed in 2004, original manufacturer version (for service workshops).</p><p>Essential documentation for anyone wishing to maintain this ATV efficiently and safely.</p>',
    price: 1000,
    preview_url: preview,
  }).eq('slug', 'polaris-sportsman-800-twin-efi');
  console.log('  ✓ Reactivated');

  // 5. Fix Sportsman 500 parts list
  console.log('--- Polaris 500 parts ---');
  preview = await updatePreview('polaris-sportsman-500', 'https://la-documentation-technique.eu/wp-content/uploads/2021/03/Polaris-Sportsman-500-de-2005.jpg');
  await sb.from('documents').update({
    title: 'Polaris Sportsman 500 - Parts List',
    description: '<p>Polaris Sportsman 500 - Parts List</p><p>Workshop manual with parts list for Polaris Sportsman 500 ATVs.</p><p>Workshop documentation (60 pages) printed in 2004, original manufacturer version (for service workshops).</p><p>Essential documentation for anyone wishing to maintain this ATV efficiently and safely.</p>',
    price: 1000,
    preview_url: preview,
  }).eq('slug', 'polaris-sportsman-500');
  console.log('  ✓ Updated');

  // Update brand count
  const brandId = (await sb.from('brands').select('id').eq('slug', 'polaris').single()).data.id;
  const { count } = await sb.from('documents').select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId).eq('active', true);
  await sb.from('brands').update({ document_count: count }).eq('id', brandId);
  console.log('\nPOLARIS count:', count);

  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);
  console.log('Total active:', total);
}

main().catch(console.error);
