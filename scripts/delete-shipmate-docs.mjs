/**
 * Supprime les 5 docs SHIPMATE dans Radio & Communications
 * Garde la marque SHIPMATE
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const RADIO_CATEGORY_ID = '98979c8e-d572-461c-bee9-7ada0f605318';

// 1. Trouver la marque SHIPMATE
const { data: brand } = await supabase.from('brands').select('id, name').eq('slug', 'shipmate').single();
if (!brand) { console.error('✗ Marque SHIPMATE introuvable'); process.exit(1); }
console.log(`Marque SHIPMATE : ${brand.id}`);

// 2. Lister les docs SHIPMATE dans Radio & Communications
const { data: docs } = await supabase
  .from('documents')
  .select('id, slug, title')
  .eq('brand_id', brand.id)
  .eq('category_id', RADIO_CATEGORY_ID);

if (!docs || docs.length === 0) { console.log('Aucun document trouvé.'); process.exit(0); }
console.log(`\n${docs.length} documents à supprimer :\n`);
docs.forEach(d => console.log(`  - ${d.slug}`));

// 3. Supprimer chaque doc
for (const doc of docs) {
  console.log(`\n=== ${doc.slug} ===`);

  // DB
  const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id);
  if (dbErr) console.error('  ✗ DB :', dbErr.message);
  else console.log('  ✓ Supabase DB');

  // R2
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `documents/${doc.slug}.pdf` }));
    console.log('  ✓ R2 PDF');
  } catch (e) { console.error('  ✗ R2 :', e.message); }

  // Preview Storage
  const { error: storErr } = await supabase.storage.from('logos').remove([`previews/${doc.slug}.jpg`]);
  if (storErr) console.error('  ✗ Preview :', storErr.message);
  else console.log('  ✓ Preview Storage');
}

console.log('\n✓ Suppression terminée. La marque SHIPMATE est conservée.');
