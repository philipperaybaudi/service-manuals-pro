/**
 * Télécharge les 4 PDFs Renault mal décrits depuis R2
 * vers un dossier temp local pour lecture.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'service-manuals-documents';
const OUT_DIR = 'C:\\Users\\adm\\Desktop\\renault-pdfs-temp';

const FILES = [
  'documents/renault-document-technique-pages-blanches.pdf',
  'documents/renault-document-technique-incomplet.pdf',
  'documents/renault-document-technique-eavt773a.pdf',
  'documents/renault-document-vide-ou-non-lisible.pdf',
];

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const key of FILES) {
  const filename = path.basename(key);
  const outPath  = path.join(OUT_DIR, filename);
  process.stdout.write(`Téléchargement : ${filename} ... `);
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    fs.writeFileSync(outPath, Buffer.concat(chunks));
    console.log(`✓ (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
}

console.log(`\nPDFs disponibles dans : ${OUT_DIR}`);
