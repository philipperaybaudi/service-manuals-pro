/**
 * dell-cleanup-orphan-r2.mjs
 * Supprime les 15 fichiers R2 orphelins créés par l'Étape 5 de Phase 3
 * (anciens slugs -vi re-uploadés après renommage -vi → -hr/-ko)
 * Ces fichiers n'ont plus de référence en DB → suppression sans risque.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DRY_RUN = process.argv.includes('--dry-run');

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'service-manuals-documents';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Anciens slugs -vi qui ont été renommés en -hr/-ko en Étape 2
// et re-uploadés en Étape 5 (orphelins, plus de référence DB)
const ORPHAN_SLUGS = [
  'dell-dell-inspiron-15-3551-service-manual-vi',
  'dell-dell-inspiron-11-3162-setup-and-specifications-guide-vi-2',
  'dell-dell-inspiron-15-5576-gaming-setup-and-specifications-vi',
  'dell-dell-inspiron-15-5576-gaming-service-manual-vi',
  'dell-dell-inspiron-11-3000-series-3158-service-manual-vietnamese-vi',
  'dell-dell-inspiron-14-3458-service-manual-vi',
  'dell-dell-inspiron-15-3531-service-manual-vietnamese-vi',
  'dell-dell-inspiron-15-3558-service-manual-vietnamese-vi',
  'dell-dell-inspiron-15-3552-service-manual-vi',
  'dell-dell-inspiron-15-3558-service-manual-vietnamese-vi-2',
  'dell-dell-inspiron-14-5000-series-5455-service-manual-vi',
  'dell-dell-inspiron-14-5458-service-manual-vietnamese-vi',
  'dell-dell-inspiron-13-7348-service-manual-vietnamese-vi',
  'dell-dell-inspiron-15-7547-service-manual-vi',
  'dell-dell-inspiron-15-3555-service-manual-vietnamese-vi',
];

console.log(`\n${'═'.repeat(64)}`);
console.log(`  DELL — NETTOYAGE R2 ORPHELINS${DRY_RUN ? ' [DRY-RUN]' : ''}`);
console.log(`${'═'.repeat(64)}\n`);

let deleted = 0, notFound = 0, errs = 0;

for (const slug of ORPHAN_SLUGS) {
  const key = `documents/${slug}.pdf`;

  // Vérifier qu'il existe bien avant de supprimer
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch {
    console.log(`  ○ Absent (déjà supprimé ?) : ${slug}`);
    notFound++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Suppression : ${key}`);
    deleted++;
    continue;
  }

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    console.log(`  ✓ Supprimé : ${key}`);
    deleted++;
  } catch (e) {
    console.log(`  ✗ Erreur : ${key} — ${e.message}`);
    errs++;
  }
}

console.log(`\n${'═'.repeat(64)}`);
console.log(`  RÉSULTAT : ${deleted} supprimés | ${notFound} absents | ${errs} erreurs`);
console.log(`${'═'.repeat(64)}\n`);
