/**
 * move-saxo-to-citroen.mjs
 *
 * Déplace "Citroën Saxo Diesel Schémas Électriques et Fiches Techniques"
 * de la marque RENAULT vers la marque CITROËN.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const OLD_SLUG = 'renault-citroen-saxo-diesel-schema-fiche';
const NEW_SLUG = 'citroen-saxo-diesel-schemas-electriques-fiches-techniques';
const BUCKET   = 'service-manuals-documents';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function downloadR2(key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function uploadR2(key, body, ct) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: ct }));
}
async function deleteR2(key) {
  try { await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); console.log(`✓ Supprimé : ${key}`); }
  catch (e) { console.warn(`⚠ ${e.message}`); }
}

// 1. Récupérer doc
const { data: doc, error: fetchErr } = await supabase
  .from('documents').select('id, slug, brand_id, title, title_fr, file_path, preview_url').eq('slug', OLD_SLUG).single();
if (fetchErr || !doc) { console.error('✗ Document non trouvé'); process.exit(1); }
console.log(`✓ Document trouvé : ${doc.title_fr || doc.title}`);

// 2. Récupérer brand_id CITROËN
const { data: citroen } = await supabase.from('brands').select('id, name').eq('slug', 'citroen').single();
if (!citroen) { console.error('✗ Marque CITROËN non trouvée'); process.exit(1); }
console.log(`✓ Marque CITROËN : ${citroen.name} (${citroen.id})`);

// 3. Vérifier nouveau slug
const { data: existing } = await supabase.from('documents').select('id').eq('slug', NEW_SLUG).single();
if (existing) { console.error(`✗ Slug cible déjà existant`); process.exit(1); }

// 4. Copier PDF
const oldPdfKey = `documents/${OLD_SLUG}.pdf`;
const newPdfKey = `documents/${NEW_SLUG}.pdf`;
console.log(`\nCopie PDF : ${oldPdfKey} → ${newPdfKey}`);
const pdfBytes = await downloadR2(oldPdfKey);
await uploadR2(newPdfKey, pdfBytes, 'application/pdf');
console.log(`✓ PDF copié (${(pdfBytes.length / 1024).toFixed(0)} KB)`);

// 5. Copier preview
const oldPreviewKey = `logos/previews/${OLD_SLUG}.jpg`;
const newPreviewKey = `logos/previews/${NEW_SLUG}.jpg`;
let newPreviewUrl = null;
try {
  const previewBytes = await downloadR2(oldPreviewKey);
  await uploadR2(newPreviewKey, previewBytes, 'image/jpeg');
  console.log(`✓ Preview copiée`);
  if (doc.preview_url) newPreviewUrl = doc.preview_url.replace(OLD_SLUG, NEW_SLUG);
} catch (e) { console.warn(`⚠ Preview : ${e.message}`); }

// 6. Mettre à jour Supabase
const payload = {
  slug:     NEW_SLUG,
  brand_id: citroen.id,
  file_path: newPdfKey,
};
if (newPreviewUrl) payload.preview_url = newPreviewUrl;

const { error: updErr } = await supabase.from('documents').update(payload).eq('id', doc.id);
if (updErr) { console.error(`✗ Supabase : ${updErr.message}`); process.exit(1); }
console.log(`✓ Supabase mis à jour : brand → CITROËN, slug → ${NEW_SLUG}`);

// 7. Supprimer anciens fichiers R2
await deleteR2(oldPdfKey);
await deleteR2(oldPreviewKey);

console.log(`\n✅ Migration terminée → /docs/${NEW_SLUG}`);
