// Cleanup des doublons créés par import-from-inventory.mjs
// Supprime les docs importés AUJOURD'HUI qui ont un doublon (même fichier) importé AVANT
// Garde les versions "avant" (titres anglais personnalisés)
// Usage: node scripts/cleanup-duplicate-imports.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const TODAY = '2026-04-10T00:00:00';

// Marques avec doublons confirmés (counts identiques → tout supprimer côté "aujourd'hui")
// DELTA (1:1), DEWALT (8:8), EINHELL (1:1), ERPHI (1:1), EVOLUTION (1:1), FOX (5:5)
const FULL_OVERLAP_BRANDS = [
  '36f3b0a4-b40e-4811-a239-c91f922c7794', // DELTA
  'f10456e3-33ab-4088-9abc-a01c59b1b971', // DEWALT
  '1ae36267-a372-4222-b93c-76abe47592f4', // EINHELL
  '13b3639f-c592-42d0-8871-163978013623', // ERPHI
  '8bbae07d-96e8-47a2-abaa-b4337306cdb7', // EVOLUTION
  '489fce99-f48a-49aa-8258-069e805b11d6', // FOX
];

async function deleteDoc(doc, reason) {
  // 1. Supprimer preview Supabase Storage
  const previewPath = `previews/${doc.slug}.jpg`;
  await supabase.storage.from('logos').remove([previewPath]);

  // 2. Supprimer PDF R2
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: 'service-manuals-documents',
      Key: doc.file_path,
    }));
  } catch (e) {
    // pas bloquant
  }

  // 3. Supprimer DB
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) {
    console.log(`  ✗ DB delete failed: ${error.message} — ${doc.slug}`);
  } else {
    console.log(`  ✓ Supprimé [${reason}] : ${doc.slug}`);
  }
}

async function run() {
  console.log('=== Cleanup doublons import universel ===\n');

  let deleted = 0;
  let kept = 0;

  // ── 1. Marques avec overlap total (supprimer tous les "aujourd'hui") ──────
  console.log('── Marques avec doublons complets (DELTA, DEWALT, EINHELL, ERPHI, EVOLUTION, FOX)');
  for (const brandId of FULL_OVERLAP_BRANDS) {
    const { data: todayDocs } = await supabase.from('documents')
      .select('id,slug,file_path,file_size')
      .eq('brand_id', brandId)
      .gte('created_at', TODAY);

    for (const doc of todayDocs) {
      await deleteDoc(doc, 'doublon total');
      deleted++;
    }
  }

  // ── 2. EMCO — matcher par file_size ──────────────────────────────────────
  console.log('\n── EMCO — matching par file_size');
  const EMCO_BRAND = '7261ff4a-9840-4f3c-9a2e-ab59d3209606';

  const { data: emcoBefore } = await supabase.from('documents')
    .select('id,slug,file_size')
    .eq('brand_id', EMCO_BRAND)
    .lt('created_at', TODAY);

  const { data: emcoToday } = await supabase.from('documents')
    .select('id,slug,file_path,file_size')
    .eq('brand_id', EMCO_BRAND)
    .gte('created_at', TODAY);

  const beforeSizes = new Set(emcoBefore.map(d => d.file_size));

  for (const doc of emcoToday) {
    if (beforeSizes.has(doc.file_size)) {
      await deleteDoc(doc, 'doublon EMCO');
      deleted++;
    } else {
      console.log(`  ○ Conservé (nouveau) : ${doc.slug}`);
      kept++;
    }
  }

  // ── 3. KITY — matcher par file_size ──────────────────────────────────────
  console.log('\n── KITY — matching par file_size');
  const KITY_BRAND = '17b631fa-1fe2-4a91-bf69-8cabbb61a441';

  const { data: kityBefore } = await supabase.from('documents')
    .select('id,slug,file_size')
    .eq('brand_id', KITY_BRAND)
    .lt('created_at', TODAY);

  const { data: kityToday } = await supabase.from('documents')
    .select('id,slug,file_path,file_size')
    .eq('brand_id', KITY_BRAND)
    .gte('created_at', TODAY);

  const kityBeforeSizes = new Set(kityBefore.map(d => d.file_size));

  for (const doc of kityToday) {
    if (kityBeforeSizes.has(doc.file_size)) {
      await deleteDoc(doc, 'doublon KITY');
      deleted++;
    } else {
      console.log(`  ○ Conservé (nouveau) : ${doc.slug}`);
      kept++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Supprimés : ${deleted}`);
  console.log(`Conservés (nouveaux) : ${kept}`);
  console.log('='.repeat(60));
}

run().catch(console.error);
