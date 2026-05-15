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
const BUCKET = 'service-manuals-documents';

const SLUGS = [
  'audi-audi-a4-a3-auto-volt-repair-manuals',
  'bmw-bmw-318-tds-325-td-325-tds-525-tds-auto-volt-schema',
];

for (const slug of SLUGS) {
  const { error } = await supabase.from('documents').delete().eq('slug', slug);
  if (error) { console.error(`✗ DB ${slug} :`, error.message); continue; }
  console.log(`✓ Supprimé en base : ${slug}`);

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `documents/${slug}.pdf` }));
    console.log(`✓ Supprimé R2 : documents/${slug}.pdf`);
  } catch(e) { console.log(`⚠ R2 : ${e.message}`); }

  await supabase.storage.from('logos').remove([`previews/${slug}.jpg`]);
  console.log(`✓ Preview supprimée`);
}
