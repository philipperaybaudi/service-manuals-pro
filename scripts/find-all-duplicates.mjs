// Détecte tous les doublons sur le site entier (par file_size identique)
// + supprime kity-degauchisseuse-kity-635-636 (doublon confirmé)
// Usage: node scripts/find-all-duplicates.mjs

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

// ── 1. Supprimer le doublon KITY confirmé ────────────────────────────────────
const SLUG_TO_DELETE = 'kity-degauchisseuse-kity-635-636';
console.log(`Suppression du doublon KITY : ${SLUG_TO_DELETE}`);
const { data: toDelete } = await supabase.from('documents')
  .select('id, file_path').eq('slug', SLUG_TO_DELETE).maybeSingle();

if (toDelete) {
  await supabase.storage.from('logos').remove([`previews/${SLUG_TO_DELETE}.jpg`]);
  try { await r2.send(new DeleteObjectCommand({ Bucket: 'service-manuals-documents', Key: toDelete.file_path })); } catch {}
  await supabase.from('documents').delete().eq('id', toDelete.id);
  console.log(`  ✓ Supprimé\n`);
} else {
  console.log(`  ⚠ Non trouvé (déjà supprimé ?)\n`);
}

// ── 2. Charger tous les docs du site ────────────────────────────────────────
console.log('Chargement de tous les documents...');
let allDocs = [];
let from = 0;
const pageSize = 1000;
while (true) {
  const { data } = await supabase.from('documents')
    .select('id, slug, title, file_size, page_count, price, brand_id, created_at')
    .order('file_size')
    .range(from, from + pageSize - 1);
  if (!data || data.length === 0) break;
  allDocs.push(...data);
  if (data.length < pageSize) break;
  from += pageSize;
}
console.log(`Total docs : ${allDocs.length}\n`);

// ── 3. Grouper par file_size et trouver les doublons ────────────────────────
const sizeMap = {};
for (const d of allDocs) {
  if (!sizeMap[d.file_size]) sizeMap[d.file_size] = [];
  sizeMap[d.file_size].push(d);
}

const dupes = Object.entries(sizeMap)
  .filter(([, docs]) => docs.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

if (dupes.length === 0) {
  console.log('✓ Aucun doublon détecté sur le site entier.');
} else {
  console.log(`⚠ ${dupes.length} groupe(s) de fichiers de même taille :\n`);
  for (const [size, docs] of dupes) {
    console.log(`  Taille ${Number(size).toLocaleString()} o (${docs[0].page_count}p) :`);
    docs.forEach(d => {
      const date = d.created_at.substring(0, 10);
      console.log(`    ${date}  $${d.price/100}  ${d.slug}`);
    });
    console.log();
  }
}
