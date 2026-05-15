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

const SLUG = 'renault-laguna-diesel-atmospherique-schema-fiche-1996';
const BUCKET = 'service-manuals-documents';

const { error: dbErr } = await supabase.from('documents').delete().eq('slug', SLUG);
if (dbErr) { console.error('✗ Supabase :', dbErr.message); process.exit(1); }
console.log(`✓ Supprimé en base : ${SLUG}`);

await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `documents/${SLUG}.pdf` }));
console.log(`✓ Supprimé R2 : documents/${SLUG}.pdf`);
