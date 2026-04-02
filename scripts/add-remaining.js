require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks))); res.on('error', reject);
      }).on('error', reject);
    }; get(url);
  });
}

async function createDoc({ localPdfPath, storagePath, slug, title, description, price, brandId, categoryId, imageUrl }) {
  const { data: ex } = await sb.from('documents').select('id').eq('slug', slug).single();
  if (ex) { console.log('  Skip exists: ' + slug); return; }

  if (!fs.existsSync(localPdfPath)) { console.log('  FILE NOT FOUND: ' + localPdfPath); return; }

  const buf = fs.readFileSync(localPdfPath);
  const sz = fs.statSync(localPdfPath).size;
  console.log('  Upload ' + path.basename(localPdfPath) + ' (' + (sz / 1024 / 1024).toFixed(1) + 'MB)...');
  const { error: ue } = await sb.storage.from('documents').upload(storagePath, buf, { contentType: 'application/pdf', upsert: true });
  if (ue) { console.log('  Upload fail: ' + ue.message); return; }

  let previewUrl = null;
  if (imageUrl) {
    try {
      const img = await downloadImage(imageUrl);
      const ext = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
      const pp = 'previews/' + slug + '.' + ext;
      const { error: pe } = await sb.storage.from('logos').upload(pp, img, { contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext), upsert: true });
      if (!pe) { const { data } = sb.storage.from('logos').getPublicUrl(pp); previewUrl = data.publicUrl; }
    } catch (e) { console.log('  Preview fail: ' + e.message); }
  }

  const { data, error } = await sb.from('documents').insert({ slug, title, description, price, file_path: storagePath, file_size: sz, brand_id: brandId, category_id: categoryId, preview_url: previewUrl, active: true }).select('id').single();
  if (error) { console.log('  Insert fail: ' + error.message); return; }
  console.log('  OK: ' + slug);
}

const BASE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

async function main() {
  // LUREM CB 310 SL
  console.log('--- LUREM CB 310 SL ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'LUREM', 'LUREM CB310SL France \u00e9clat\u00e9.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_CB310SL_eclate.pdf',
    slug: 'menuiserie-lurem-cb310sl-eclates',
    title: 'LUREM CB 310 SL - Exploded Views with Parts Lists',
    description: '<p>Exploded views with parts lists for the LUREM CB 310 SL woodworking combination machine.</p><p>28-page document for use and maintenance of the LUREM CB 310 SL woodworking machine.</p><p>Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.</p>',
    price: 1000,
    brandId: '28491821-7883-44e9-8a69-fe4b61cd1633',
    categoryId: '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/LUREM-CB310SL-1.jpg',
  });

  // LUREM FORMER 260 SI
  console.log('--- LUREM FORMER 260 SI ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'LUREM', 'LUREM FORMER 260SI-04 \u00e9clat\u00e9.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_FORMER_260SI_eclate.pdf',
    slug: 'menuiserie-lurem-former-260si-eclates',
    title: 'LUREM FORMER 260 SI - Exploded Views with Parts Lists',
    description: '<p>Exploded views with parts lists for the LUREM FORMER 260 SI woodworking combination machine.</p><p>33-page document for use and maintenance of the LUREM FORMER 260 SI woodworking machine.</p><p>Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.</p>',
    price: 1000,
    brandId: '28491821-7883-44e9-8a69-fe4b61cd1633',
    categoryId: '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/LUREM-FORMER-260SI-1-scaled.jpg',
  });

  // LUREM C310SI
  console.log('--- LUREM C310SI ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'DUGU\u00c9', 'Lurem C310 SI.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_C310SI_manuel.pdf',
    slug: 'menuiserie-lurem-c310si-user-manual',
    title: 'LUREM C310SI - User Manual',
    description: '<p>LUREM C310SI User Manual</p><p>80-page user manual for the use and maintenance of the LUREM C310SI woodworking combination machine.</p><p>Includes complete parts nomenclature and exploded diagrams.</p><p>Essential documentation for anyone wishing to maintain this machine efficiently and safely.</p>',
    price: 1500,
    brandId: '28491821-7883-44e9-8a69-fe4b61cd1633',
    categoryId: '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/Lurem-C310-SI-1.jpg',
  });

  // Décollage doublet optique
  console.log('--- Doublet optique ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'PHOTOGRAPHIE', 'REPARATION & DEPANNAGE', 'Reparer la separation du baume a la maison', 'Reparer la separation du baume a la maison.pdf'),
    storagePath: 'photography/repair/optical_doublet_balsam_repair.pdf',
    slug: 'reparation-decollage-doublet-optique',
    title: 'Optical Doublet Delamination & Rebonding - Photo Lens Repair Tutorial',
    description: '<p>Optical doublet delamination and rebonding for photo lenses.</p><p>This tutorial demonstrates that delaminating and UV-rebonding optical doublets (separating lens elements from an optical group) can be done at home with a few inexpensive tools (spanner, small Phillips or JIS screwdrivers, etc.).</p><ul><li>How and why balsam separation occurs</li><li>Step-by-step delamination process</li><li>UV rebonding technique</li><li>Tools and materials needed</li></ul>',
    price: 1000,
    brandId: 'f04e8a9f-f4fb-4dfa-9fa1-2b6b9adadeb0',
    categoryId: '79ea117d-8952-4b9e-aab9-4b10fc2dec7a',
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/01-1.jpg',
  });

  // Update all brand counts
  console.log('\n--- Updating counts ---');
  const { data: brands } = await sb.from('brands').select('id, name, document_count');
  for (const b of brands) {
    const { count } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('brand_id', b.id).eq('active', true);
    if (count !== b.document_count) {
      await sb.from('brands').update({ document_count: count }).eq('id', b.id);
      console.log('  ' + b.name + ': ' + b.document_count + ' -> ' + count);
    }
  }
  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);
  console.log('\nTotal active: ' + total);
}

main().catch(console.error);
