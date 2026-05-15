import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'service-manuals-documents';

const slugs = [
  'renault-renault-espace-2-2-dt-schema-fiche',
  'renault-renault-clio-ii-1-9d-engine-management-and-fuel-system-technical-manual',
  'renault-renault-kangoo-1-2-essence-schema-electrique',
];

import fs from 'fs';
const localFiles = [
  { name: 'EAVT742A.pdf', path: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\RENAULT\\EAVT742A.pdf' },
  { name: 'EAVT763A.pdf', path: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\RENAULT\\EAVT763A.pdf' },
  { name: 'EAVT771A.pdf', path: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\RENAULT\\EAVT771A.pdf' },
];

console.log('Tailles locales (DOCS EN LIGNE) :');
for (const f of localFiles) {
  const size = fs.statSync(f.path).size;
  console.log(`  ${f.name}: ${size} octets`);
}

console.log('\nTailles R2 (catalogue actuel) :');
for (const slug of slugs) {
  try {
    const res = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `documents/${slug}.pdf` }));
    console.log(`  ${slug}: ${res.ContentLength} octets`);
  } catch (e) {
    console.log(`  ${slug}: ERREUR ${e.message}`);
  }
}
