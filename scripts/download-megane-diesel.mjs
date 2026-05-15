import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const SLUG = 'renault-megane-diesel-schema-fiche-1996';
const res = await r2.send(new GetObjectCommand({ Bucket: 'service-manuals-documents', Key: `documents/${SLUG}.pdf` }));
const bytes = await res.Body.transformToByteArray();
fs.writeFileSync(`C:\\Users\\adm\\Desktop\\${SLUG}.pdf`, bytes);
console.log(`✓ Téléchargé : C:\\Users\\adm\\Desktop\\${SLUG}.pdf (${(bytes.length/1024).toFixed(0)} KB)`);
