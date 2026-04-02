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
  const slug = 'reparation-decollage-doublet-optique';
  const { data: ex } = await sb.from('documents').select('id').eq('slug', slug).single();
  if (ex) { console.log('Already exists'); return; }

  const localPath = path.join(
    'C:', 'Users', 'adm', 'Documents', 'SHEMATHEQUE', 'DOCS EN LIGNE',
    'PHOTOGRAPHIE', 'REPARATION & DEPANNAGE',
    'R\u00e9parer la s\u00e9paration du baume \u00e0 la maison',
    'R\u00e9parer la s\u00e9paration du baume \u00e0 la maison.pdf'
  );

  console.log('Path:', localPath);
  console.log('Exists:', fs.existsSync(localPath));

  const buf = fs.readFileSync(localPath);
  const sz = fs.statSync(localPath).size;
  console.log('Upload ' + (sz / 1024).toFixed(0) + 'KB...');

  const { error: ue } = await sb.storage.from('documents').upload(
    'photography/repair/optical_doublet_balsam_repair.pdf', buf,
    { contentType: 'application/pdf', upsert: true }
  );
  if (ue) { console.log('Upload fail:', ue.message); return; }

  const imgUrl = 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/01-1.jpg';
  const img = await dl(imgUrl);
  await sb.storage.from('logos').upload('previews/' + slug + '.jpg', img, { contentType: 'image/jpeg', upsert: true });
  const { data: pu } = sb.storage.from('logos').getPublicUrl('previews/' + slug + '.jpg');

  const { data, error } = await sb.from('documents').insert({
    slug,
    title: 'Optical Doublet Delamination & Rebonding - Photo Lens Repair Tutorial',
    description: '<p>Optical doublet delamination and rebonding for photo lenses.</p><p>This tutorial demonstrates that delaminating and UV-rebonding optical doublets (separating lens elements from an optical group) can be done at home with a few inexpensive tools.</p><ul><li>How and why balsam separation occurs</li><li>Step-by-step delamination process</li><li>UV rebonding technique</li><li>Tools and materials needed</li></ul>',
    price: 1000,
    file_path: 'photography/repair/optical_doublet_balsam_repair.pdf',
    file_size: sz,
    brand_id: 'f04e8a9f-f4fb-4dfa-9fa1-2b6b9adadeb0',
    category_id: '79ea117d-8952-4b9e-aab9-4b10fc2dec7a',
    preview_url: pu.publicUrl,
    active: true
  }).select('id').single();

  if (error) console.log('ERR:', error.message);
  else console.log('OK:', slug);
}

main().catch(console.error);
