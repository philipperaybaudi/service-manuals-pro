/**
 * delete-renault-duplicates.mjs
 *
 * Supprime 5 entrées en double confirmées (taille R2 identique octet par octet).
 * Pour chaque doublon : suppression Supabase + suppression PDF R2 + suppression preview R2.
 * L'entrée "à garder" n'est pas touchée.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'service-manuals-documents';

async function deleteR2(key) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log(`  ✓ R2 supprimé : ${key}`);
  } catch (e) {
    console.warn(`  ⚠ R2 : ${e.message}`);
  }
}

// slug à supprimer → slug à garder (pour info)
const DUPLICATES = [
  { slug: 'renault-eavt732a-technical-documentation',          keep: 'renault-renault-megane-1-6-essence-schema-fiche-auto-volt-732' },
  { slug: 'renault-eavt749a-technical-documentation',          keep: 'renault-renault-kangoo-diesel-schema-fiche-f8q' },
  { slug: 'renault-renault-megane-diesel-schema-fiche-1996',   keep: 'renault-megane-diesel-schema-fiche-1996' },
  { slug: 'renault-renault-safrane-2l-essence-schema-fiche-1997', keep: 'renault-safrane-2l-essence-schema-fiche-1999' },
  { slug: 'renault-renault-laguna-2-2d-diesel-schema-fiche-mai-1996', keep: 'renault-laguna-diesel-atmospherique-schema-fiche-1996' },
];

for (const { slug, keep } of DUPLICATES) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`À supprimer : ${slug}`);
  console.log(`À garder    : ${keep}`);

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (error || !doc) {
    console.log(`  ⚠ Non trouvé en base (déjà supprimé ?)`);
    continue;
  }

  // Supprimer Supabase
  const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id);
  if (delErr) { console.error(`  ✗ Supabase : ${delErr.message}`); continue; }
  console.log(`  ✓ Supabase supprimé (id: ${doc.id})`);

  // Supprimer fichiers R2
  await deleteR2(`documents/${slug}.pdf`);
  await deleteR2(`logos/previews/${slug}.jpg`);
}

console.log(`\n${'═'.repeat(70)}`);
console.log(`5 doublons supprimés.`);
