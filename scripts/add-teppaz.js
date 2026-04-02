require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
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

async function main() {
  const slug = 'teppaz-transit-electronic-schematic';
  const { data: ex } = await sb.from('documents').select('id').eq('slug', slug).single();
  if (ex) { console.log('Already exists'); return; }

  const localPath = path.join(
    'C:', 'Users', 'adm', 'Documents', 'SHEMATHEQUE', 'DOCS EN LIGNE',
    'SON', 'TEPPAZ', 'Teppaz-Transit', 'Teppaz-Transit.pdf'
  );

  const buf = fs.readFileSync(localPath);
  const sz = fs.statSync(localPath).size;
  console.log('Upload Teppaz-Transit.pdf (' + (sz / 1024).toFixed(0) + 'KB)...');

  const { error: ue } = await sb.storage.from('documents').upload(
    'audio/teppaz/Teppaz-Transit.pdf', buf,
    { contentType: 'application/pdf', upsert: true }
  );
  if (ue) { console.log('Upload fail:', ue.message); return; }

  // Download preview from FR site
  const imgUrl = 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/Teppaz-Transit.jpg';
  const img = await dl(imgUrl);
  await sb.storage.from('logos').upload('previews/' + slug + '.jpg', img, { contentType: 'image/jpeg', upsert: true });
  const { data: pu } = sb.storage.from('logos').getPublicUrl('previews/' + slug + '.jpg');

  const { data, error } = await sb.from('documents').insert({
    slug,
    title: 'Teppaz Transit Turntable - Electronic Schematic',
    description: '<p>Electronic schematic for the Teppaz Transit battery-powered turntable, for comfortable repair or restoration.</p><p>Model aesthetically similar to the Oscar, marketed in 1959. It was the first French record player to be equipped with transistors.</p><p>Available with very chic and fashionable coverings for the time (red plaid or grey gingham fabric, genuine leather for the Luxe models).</p><p>It could be taken anywhere, making it the ideal companion for outings and parties.</p>',
    price: 200,
    file_path: 'audio/teppaz/Teppaz-Transit.pdf',
    file_size: sz,
    brand_id: '7b123b72-8a87-4ab8-8756-65fbeded96e0',
    category_id: 'fac320cd-12a4-4022-b011-aa39931c3062',
    preview_url: pu.publicUrl,
    active: true
  }).select('id').single();

  if (error) console.log('ERR:', error.message);
  else console.log('OK:', slug);

  // Update brand count
  const { count } = await sb.from('documents').select('id', { count: 'exact', head: true })
    .eq('brand_id', '7b123b72-8a87-4ab8-8756-65fbeded96e0').eq('active', true);
  await sb.from('brands').update({ document_count: count }).eq('id', '7b123b72-8a87-4ab8-8756-65fbeded96e0');
  console.log('TEPPAZ count:', count);

  // Total
  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);
  console.log('Total active:', total);
}

main().catch(console.error);
