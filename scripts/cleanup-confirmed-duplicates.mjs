// Suppression des 13 doublons confirmés (garder la meilleure version)
// LEICA x5 intentionnel — non touché
// Usage: node scripts/cleanup-confirmed-duplicates.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const supabase = createClient('https://ylsbqehotapcprfinsnu.supabase.co', 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X');
const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const TO_DELETE = [
  'elektra-elektra-beckum-bas-316g-dnb',
  'elektra-elektra-beckum-hc-260-m-instruction',
  'elektra-elektra-beckum-hc-260-manual',
  'elektra-elektra-beckum-bas315',
  'felder-felder-manuel-s-308-f-38-f-48-v-3-v-4',
  'felder-felder-six-series-combi-planer',
  'hameg-hameg-man-en-hm8030-2',
  'rollei-manuel-de-reparation-rolleiflex-t',
  'menuiserie-combine-dugue',
  'lurem-c2000-combination-woodworking-machine-technical-manual',
  'lurem-cb310-rl-rlx-parts-list',
  'lurem-former-rd-30-rd-26-operating-instructions',
  'lurem-c360-c410n-combination-machine-manual',
];

console.log(`=== Suppression de ${TO_DELETE.length} doublons confirmés ===\n`);

let deleted = 0, notFound = 0;

for (const slug of TO_DELETE) {
  const { data } = await supabase.from('documents')
    .select('id, file_path').eq('slug', slug).maybeSingle();

  if (!data) {
    console.log(`  ⚠ Non trouvé : ${slug}`);
    notFound++;
    continue;
  }

  await supabase.storage.from('logos').remove([`previews/${slug}.jpg`]);
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: 'service-manuals-documents',
      Key: data.file_path,
    }));
  } catch {}
  const { error } = await supabase.from('documents').delete().eq('id', data.id);
  if (error) {
    console.log(`  ✗ Erreur DB : ${slug} — ${error.message}`);
  } else {
    console.log(`  ✓ ${slug}`);
    deleted++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Supprimés  : ${deleted}`);
console.log(`Non trouvés: ${notFound}`);
console.log('='.repeat(60));
