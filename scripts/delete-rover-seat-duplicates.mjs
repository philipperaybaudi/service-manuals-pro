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

const DUPLICATES = [
  // doublon de rover-rover-600-essence-diesel-schema-fiche (6830 KB identiques)
  'rover-eberspacher-eavt722a',
  // doublon de seat-seat-leon-toledo-diesel-tdi-90-110-schema-fiche (8813 KB identiques)
  'seat-document-technique-non-identifiable',
];

for (const slug of DUPLICATES) {
  const { error: dbErr } = await supabase.from('documents').delete().eq('slug', slug);
  if (dbErr) { console.error(`✗ DB ${slug} :`, dbErr.message); continue; }
  console.log(`✓ Supprimé en base : ${slug}`);

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `documents/${slug}.pdf` }));
    console.log(`✓ Supprimé R2 : documents/${slug}.pdf`);
  } catch(e) { console.log(`⚠ R2 : ${e.message}`); }

  // preview dans Supabase Storage
  await supabase.storage.from('logos').remove([`previews/${slug}.jpg`]);
  console.log(`✓ Preview supprimée : previews/${slug}.jpg`);
}
