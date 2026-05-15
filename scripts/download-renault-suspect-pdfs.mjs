import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'service-manuals-documents';
const OUT_DIR = 'C:\\Users\\adm\\Desktop\\renault-audit';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FILES = [
  'renault-citroen-saxo-diesel-schema-fiche',
  'renault-eavt732a-technical-documentation',
  'renault-eavt749a-technical-documentation',
  'renault-eavt756a',
  'renault-eavt780a',
  'renault-eberspacher-airtronic-d2-schema-electronique',
  'renault-eberspacher-eavt759a-technical-documentation',
  // Doublons potentiels
  'renault-renault-megane-diesel-schema-fiche-1996',
  'renault-megane-diesel-schema-fiche-1996',
  'renault-renault-safrane-2l-essence-schema-fiche-1997',
  'renault-safrane-2l-essence-schema-fiche-1999',
  'renault-renault-laguna-2-2d-diesel-schema-fiche-mai-1996',
  'renault-laguna-diesel-atmospherique-schema-fiche-1996',
  'renault-renault-megane-1-6-essence-schema-fiche-auto-volt-732',
];

for (const slug of FILES) {
  const key = `documents/${slug}.pdf`;
  const outPath = path.join(OUT_DIR, `${slug}.pdf`);
  process.stdout.write(`${slug} ... `);
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    fs.writeFileSync(outPath, Buffer.concat(chunks));
    console.log(`✓ (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
}
console.log(`\nDossier : ${OUT_DIR}`);
