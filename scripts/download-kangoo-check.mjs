import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'service-manuals-documents';

async function downloadR2(slug) {
  const key = `documents/${slug}.pdf`;
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const a = await downloadR2('renault-eavt749a-technical-documentation');
const b = await downloadR2('renault-renault-kangoo-diesel-schema-fiche-f8q');
console.log(`renault-eavt749a          : ${a.length} octets`);
console.log(`kangoo-diesel-schema-f8q  : ${b.length} octets`);
console.log(a.length === b.length ? '=> DOUBLON CONFIRMÉ (taille identique)' : '=> DOCUMENTS DIFFÉRENTS');
