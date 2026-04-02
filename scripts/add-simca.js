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
  const slug = 'simca-f594wml-f569wml-service-manual';
  const { data: ex } = await sb.from('documents').select('id').eq('slug', slug).single();
  if (ex) { console.log('Already exists'); return; }

  const localPath = path.join(
    'C:', 'Users', 'adm', 'Documents', 'SHEMATHEQUE', 'DOCS EN LIGNE',
    'AUTO MOTO', 'SIMCA', 'SIMCA Simca F594WML.pdf'
  );

  const buf = fs.readFileSync(localPath);
  const sz = fs.statSync(localPath).size;
  console.log('Upload SIMCA Simca F594WML.pdf (' + (sz / 1024 / 1024).toFixed(1) + 'MB)...');

  const { error: ue } = await sb.storage.from('documents').upload(
    'automotive/simca/SIMCA_F594WML_F569WML.pdf', buf,
    { contentType: 'application/pdf', upsert: true }
  );
  if (ue) { console.log('Upload fail:', ue.message); return; }

  // Download preview from FR site
  const imgUrl = 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/simca4x4.jpg';
  const img = await dl(imgUrl);
  await sb.storage.from('logos').upload('previews/' + slug + '.jpg', img, { contentType: 'image/jpeg', upsert: true });
  const { data: pu } = sb.storage.from('logos').getPublicUrl('previews/' + slug + '.jpg');

  const { data, error } = await sb.from('documents').insert({
    slug,
    title: 'SIMCA F594WML F569WML Trucks - Service Manual',
    description: '<p>SIMCA F594WML F569WML Trucks</p><p>Complete workshop manual for maintenance, restoration, recommissioning and troubleshooting of Simca 3-ton 4\u00d74 type F 594 WML and 5-ton 4\u00d72 type F 569 WML trucks.</p><p>200-page workshop manual.</p>',
    price: 2000,
    file_path: 'automotive/simca/SIMCA_F594WML_F569WML.pdf',
    file_size: sz,
    brand_id: '7716b11e-bc33-4954-b74c-ca0fc43d3dd8',
    category_id: 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd',
    preview_url: pu.publicUrl,
    active: true
  }).select('id').single();

  if (error) console.log('ERR:', error.message);
  else console.log('OK:', slug);

  // Update brand count
  const { count } = await sb.from('documents').select('id', { count: 'exact', head: true })
    .eq('brand_id', '7716b11e-bc33-4954-b74c-ca0fc43d3dd8').eq('active', true);
  await sb.from('brands').update({ document_count: count }).eq('id', '7716b11e-bc33-4954-b74c-ca0fc43d3dd8');
  console.log('SIMCA count:', count);

  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);
  console.log('Total active:', total);
}

main().catch(console.error);
