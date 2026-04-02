/**
 * Add missing documents that exist on FR site but not on EN site.
 * Uploads PDFs to Supabase Storage and creates document entries.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

async function uploadPreview(slug, imageUrl) {
  try {
    const imgBuffer = await downloadImage(imageUrl);
    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
    const previewPath = `previews/${slug}.${ext}`;
    const { error } = await supabase.storage
      .from('logos')
      .upload(previewPath, imgBuffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: true,
      });
    if (error) { console.log(`    ⚠ Preview upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from('logos').getPublicUrl(previewPath);
    return data.publicUrl;
  } catch (e) {
    console.log(`    ⚠ Preview download failed: ${e.message}`);
    return null;
  }
}

async function uploadLocalPreview(slug, localPath) {
  try {
    const imgBuffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).slice(1).toLowerCase() || 'jpg';
    const previewPath = `previews/${slug}.${ext}`;
    const { error } = await supabase.storage
      .from('logos')
      .upload(previewPath, imgBuffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: true,
      });
    if (error) { console.log(`    ⚠ Local preview upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from('logos').getPublicUrl(previewPath);
    return data.publicUrl;
  } catch (e) {
    console.log(`    ⚠ Local preview read failed: ${e.message}`);
    return null;
  }
}

async function createDoc({ localPdfPath, storagePath, slug, title, description, price, brandId, categoryId, imageUrl, localImagePath }) {
  // Check if slug already exists
  const { data: existing } = await supabase.from('documents').select('id').eq('slug', slug).single();
  if (existing) {
    console.log(`  ⏭ Already exists: ${slug}`);
    return;
  }

  // Upload PDF
  const fileBuffer = fs.readFileSync(localPdfPath);
  const fileSize = fs.statSync(localPdfPath).size;
  console.log(`  📤 Uploading ${path.basename(localPdfPath)} (${(fileSize / 1024 / 1024).toFixed(1)}MB)...`);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.log(`    ✗ Upload failed: ${uploadError.message}`);
    return;
  }

  // Upload preview
  let previewUrl = null;
  if (localImagePath && fs.existsSync(localImagePath)) {
    previewUrl = await uploadLocalPreview(slug, localImagePath);
  } else if (imageUrl) {
    previewUrl = await uploadPreview(slug, imageUrl);
  }

  // Create document entry
  const { data, error } = await supabase.from('documents').insert({
    slug, title, description, price,
    file_path: storagePath,
    file_size: fileSize,
    brand_id: brandId,
    category_id: categoryId,
    preview_url: previewUrl,
    active: true,
  }).select('id').single();

  if (error) {
    console.log(`    ✗ Insert failed: ${error.message}`);
    return;
  }
  console.log(`  ✓ Created: ${slug}`);
  return data.id;
}

async function updateAllBrandCounts() {
  const { data: brands } = await supabase.from('brands').select('id, name, document_count');
  let updated = 0;
  for (const brand of brands) {
    const { count } = await supabase.from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .eq('active', true);
    if (count !== brand.document_count) {
      await supabase.from('brands').update({ document_count: count }).eq('id', brand.id);
      console.log(`  ${brand.name}: ${brand.document_count} → ${count}`);
      updated++;
    }
  }
  return updated;
}

const BASE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

// Brand IDs
const BRANDS = {
  mamiya: '9f94bf16-191f-4c70-ad0d-e4d70865aa5b',
  ems: '66449665-79bb-42c0-b754-5094304b3370',
  distributeur: 'e1e7460e-670b-486e-b3f5-a8bf4413f007',
  menuiserie: '28491821-7883-44e9-8a69-fe4b61cd1633',
  reparation: 'f04e8a9f-f4fb-4dfa-9fa1-2b6b9adadeb0',
  vestel: '5cb77903-96a1-40da-a6a4-033de2d5eb8b',
  teppaz: '7b123b72-8a87-4ab8-8756-65fbeded96e0',
  pingpong: 'f32c2ba3-725b-43b1-b83e-3f51b2a7bbfd',
};

const CATS = {
  photography: '79ea117d-8952-4b9e-aab9-4b10fc2dec7a',
  biomedical: '0cc59f0f-1636-40af-90e1-82eb60126a05',
  petcare: '9a064eb7-1b7f-447d-8736-0ee4d0ea8eaa',
  workshop: '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
  television: '982bd7fe-fbf9-4c94-999f-652daaebcaf2',
  audio: 'fac320cd-12a4-4022-b011-aa39931c3062',
  sports: '4b9310a5-024d-4987-880c-aac3f26a242e',
};

async function main() {
  console.log('=== Adding Missing Documents ===\n');

  // 1. MAMIYA RB 67
  console.log('--- 1. MAMIYA RB 67 ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'PHOTOGRAPHIE', 'PHOT ARGUS', 'MAMIYA RB67 ProS', 'RB67_HD.pdf'),
    storagePath: 'photography/mamiya/RB67_HD.pdf',
    slug: 'mamiya-rb67-documentation-complete',
    title: 'MAMIYA RB 67 - Complete Documentation',
    description: '<p>MAMIYA RB 67 Dossier</p><p>THE BEST OF ALL TESTS!<br />The essential complement to the user manual for the passionate user.<br />Technical and user dossier on the famous MAMIYA RB67.<br />All settings, tips and tests.<br />20 pages of technical descriptions with numerous photographs for the use of this camera body and all its accessories.</p>',
    price: 1000,
    brandId: BRANDS.mamiya,
    categoryId: CATS.photography,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/RB67.jpg',
  });

  // 2. MAMIYA RZ 67
  console.log('\n--- 2. MAMIYA RZ 67 ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'PHOTOGRAPHIE', 'PHOT ARGUS', 'MAMIYA RZ67', 'RZ67_HD.pdf'),
    storagePath: 'photography/mamiya/RZ67_HD.pdf',
    slug: 'mamiya-rz67-documentation-complete',
    title: 'MAMIYA RZ 67 - Complete Documentation',
    description: '<p>MAMIYA RZ 67 Dossier</p><p>THE BEST OF ALL TESTS!<br />The essential complement to the user manual for the passionate user.<br />Technical and user dossier on the famous MAMIYA RZ67.<br />All settings, tips and tests.<br />36 pages of technical descriptions with numerous photographs for the use of this camera body and all its accessories.</p>',
    price: 1000,
    brandId: BRANDS.mamiya,
    categoryId: CATS.photography,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/RZ67.jpg',
  });

  // 3. AIR-FLOW handy 2+ (EMS)
  console.log('\n--- 3. AIR-FLOW handy 2+ ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BIOMEDICAL', 'EMS', 'EMS AIR-FLOW handy 2+', 'Handy 2+.pdf'),
    storagePath: 'biomedical/ems/Handy_2_plus.pdf',
    slug: 'ems-air-flow-handy-2-plus-user-manual',
    title: 'AIR-FLOW Handy 2+ User Manual',
    description: '<p>AIR-FLOW Handy 2+ User Manual</p><p>72-page multilingual user manual including English.</p><h3>Topics covered in this documentation:</h3><ul><li>Handpiece</li><li>Powder chamber cap</li><li>Body</li><li>Adapter</li><li>Powder outlet tube</li><li>Water outlet</li><li>Nozzle</li><li>Cap ring</li><li>Cap dome</li><li>Powder chamber seal</li><li>Powder chamber</li></ul>',
    price: 1000,
    brandId: BRANDS.ems,
    categoryId: CATS.biomedical,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/air-flow_handy.jpg',
  });

  // 4. Newgy Robo-Pong 2040/1040/540
  console.log('\n--- 4. Newgy Robo-Pong 2040/1040/540 ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'SPORTS', 'Robot Ping-Pong', 'Robot Ping-Pong Newgy', 'Newgy-notice.pdf'),
    storagePath: 'sports/newgy/Newgy-notice-2040-1040-540.pdf',
    slug: 'newgy-robo-pong-2040-1040-540-user-manual',
    title: 'Newgy Robo-Pong 2040, 1040 & 540 - User Manual',
    description: '<p>Newgy Robo-Pong</p><p>User manual for Newgy Robo-Pong table tennis robots models 2040, 1040 and 540 (manufactured from August 2010).</p><p>31-page manual for installation, adjustment and operation of Newgy Robo-Pong table tennis robots models 2040, 1040 and 540.</p><p>Essential documentation for anyone wishing to use this equipment efficiently and safely.</p>',
    price: 500,
    brandId: BRANDS.pingpong,
    categoryId: CATS.sports,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/robo-pong-newgy.jpg',
  });

  // 5. Distributeur nourriture chiens/chats
  console.log('\n--- 5. Distributeur nourriture ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'ANIMAUX', 'Distributeur nourriture', 'auto-pet-feeder.pdf'),
    storagePath: 'pet-care/auto-pet-feeder.pdf',
    slug: 'auto-pet-feeder-user-manual',
    title: 'Automatic Pet Feeder for Dogs and Cats - User Manual',
    description: '<p>Automatic Pet Feeder User Manual for Dogs and Cats</p><p>THE USER MANUAL for the automatic pet feeder for dogs and cats.</p><p>5 pages of clear explanations to install and program the automatic food dispenser for your favorite pet.</p><p>A perfect translation that will suit most of these devices that usually only come with a poorly translated manual from Chinese.</p>',
    price: 500,
    brandId: BRANDS.distributeur,
    categoryId: CATS.petcare,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/02/distributeur.jpg',
  });

  // 6. VESTEL 17IPS62 repair guide
  console.log('\n--- 6. VESTEL 17IPS62 ---');
  // This FR product matches the existing vestel-manuel-vestel doc but the FR product
  // is a bundle of Manuel VESTEL + Schema Vestel + 17PW25-4
  // The main doc is Manuel VESTEL which already exists, let's check and update it
  {
    const { data: existingVestel } = await supabase.from('documents')
      .select('id,slug,title,description,price')
      .eq('slug', 'vestel-manuel-vestel').single();
    if (existingVestel) {
      console.log(`  Updating existing vestel-manuel-vestel...`);
      await supabase.from('documents').update({
        title: 'VESTEL Power Board Repair Guide - 17IPS62, 17IPS6-1/2/3, 17PW06-2, 17PW25-4, 17IPS19-5/5P',
        description: '<h3>Schematics and repair tips for VESTEL boards</h3><p>Schematics and repair tips for VESTEL boards 17IPS62 17IPS6-1 17IPS6-2 17IPS6-3 17PW06-2 17PW25-4 17IPS19-5 17IPS19-5P.</p><p>Repair manual for VESTEL switch-mode power supply boards.</p><p>Additional tips included: "How to repair a switch-mode power supply".</p><p>These boards are used in many TV brands: Telefunken, Continental Edison, Techwood, JVC, Hitachi, Sharp, Toshiba, Panasonic, and many others.</p>',
        price: 1000,
      }).eq('id', existingVestel.id);
      console.log(`  ✓ Updated vestel-manuel-vestel with full FR description and price`);
    }
  }

  // 7. LUREM CB 310 SL - Exploded views with parts lists
  console.log('\n--- 7. LUREM CB 310 SL ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'LUREM', 'LUREM CB310SL France eclate.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_CB310SL_eclate.pdf',
    slug: 'menuiserie-lurem-cb310sl-eclates',
    title: 'LUREM CB 310 SL - Exploded Views with Parts Lists',
    description: '<p>Exploded views with parts lists for the LUREM CB 310 SL woodworking combination machine.</p><p>28-page document for use and maintenance of the LUREM CB 310 SL woodworking machine.</p><p>Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.</p>',
    price: 1000,
    brandId: BRANDS.menuiserie,
    categoryId: CATS.workshop,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/LUREM-CB310SL-1.jpg',
  });

  // 8. LUREM FORMER 260 SI - Exploded views
  console.log('\n--- 8. LUREM FORMER 260 SI ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'LUREM', 'LUREM FORMER 260SI-04 eclate.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_FORMER_260SI_eclate.pdf',
    slug: 'menuiserie-lurem-former-260si-eclates',
    title: 'LUREM FORMER 260 SI - Exploded Views with Parts Lists',
    description: '<p>Exploded views with parts lists for the LUREM FORMER 260 SI woodworking combination machine.</p><p>33-page document for use and maintenance of the LUREM FORMER 260 SI woodworking machine.</p><p>Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.</p>',
    price: 1000,
    brandId: BRANDS.menuiserie,
    categoryId: CATS.workshop,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/LUREM-FORMER-260SI-1-scaled.jpg',
  });

  // 9. LUREM C310SI - User Manual
  console.log('\n--- 9. LUREM C310SI ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'BRICOLAGE', 'MENUISERIE', 'DUGUE', 'Lurem C310 SI.pdf'),
    storagePath: 'workshop/menuiserie/LUREM_C310SI_manuel.pdf',
    slug: 'menuiserie-lurem-c310si-user-manual',
    title: 'LUREM C310SI - User Manual',
    description: '<p>LUREM C310SI User Manual</p><p>80-page user manual for the use and maintenance of the LUREM C310SI woodworking combination machine.</p><p>Includes complete parts nomenclature and exploded diagrams.</p><p>Essential documentation for anyone wishing to maintain this machine efficiently and safely.</p>',
    price: 1500,
    brandId: BRANDS.menuiserie,
    categoryId: CATS.workshop,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/Lurem-C310-SI-1.jpg',
  });

  // 10. Décollage doublet optique - the local file is "Reparer la separation du baume a la maison.pdf"
  console.log('\n--- 10. Décollage doublet optique ---');
  await createDoc({
    localPdfPath: path.join(BASE, 'PHOTOGRAPHIE', 'REPARATION & DEPANNAGE', 'Reparer la separation du baume a la maison', 'Reparer la separation du baume a la maison.pdf'),
    storagePath: 'photography/repair/optical_doublet_balsam_repair.pdf',
    slug: 'reparation-decollage-doublet-optique',
    title: 'Optical Doublet Delamination & Rebonding - Photo Lens Repair Tutorial',
    description: '<p>Optical doublet delamination and rebonding for photo lenses.</p><p>This tutorial demonstrates that delaminating and UV-rebonding optical doublets (separating lens elements from an optical group) can be done at home with a few inexpensive tools (spanner, small Phillips or JIS screwdrivers, etc.).</p><ul><li>How and why balsam separation occurs</li><li>Step-by-step delamination process</li><li>UV rebonding technique</li><li>Tools and materials needed</li></ul>',
    price: 1000,
    brandId: BRANDS.reparation,
    categoryId: CATS.photography,
    imageUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/01-1.jpg',
  });

  // 11. Teppaz Transit - no PDF found, only images. Skip for now.
  console.log('\n--- 11. Teppaz Transit ---');
  console.log('  ⏭ No PDF found locally, only images. Needs user input.');

  // Update all brand counts
  console.log('\n--- Updating brand counts ---');
  const updated = await updateAllBrandCounts();
  console.log(`  ${updated} brands updated`);

  // Final count
  const { count } = await supabase.from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);
  console.log(`\n========================================`);
  console.log(`  Total active docs: ${count}`);
  console.log(`  FR products: 302`);
  console.log(`  Gap: ${302 - count}`);
  console.log(`========================================`);
}

main().catch(console.error);
