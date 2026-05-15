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
const DEST   = 'C:\\Users\\adm\\Desktop\\audit-rover-seat';

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST);

// Tous les docs à lire (hors doublons confirmés par taille)
const SLUGS = [
  'rover-eavt737a',
  'rover-eavt751a-technical-documentation',
  'rover-eberspacher-eavt722a',          // garder un des deux doublons pour lire
  'seat-eberspacher-eavt717a-technical-documentation',
  'seat-seat-leon-toledo-diesel-tdi-90-110-schema-fiche', // garder un des deux doublons pour lire
  'yamaha-43pc-2009',
  'volkswagen-document-technique-pages-blanches',
];

for (const slug of SLUGS) {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: `documents/${slug}.pdf` }));
    const bytes = await res.Body.transformToByteArray();
    const dest = `${DEST}\\${slug}.pdf`;
    fs.writeFileSync(dest, bytes);
    console.log(`✓ ${slug} (${(bytes.length/1024).toFixed(0)} KB)`);
  } catch(e) {
    console.log(`✗ ${slug} : ${e.message}`);
  }
}
console.log(`\nFichiers dans : ${DEST}`);
