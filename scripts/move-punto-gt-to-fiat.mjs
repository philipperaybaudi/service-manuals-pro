/**
 * move-punto-gt-to-fiat.mjs
 *
 * Déplace le document "Fiat Punto GT Schéma-Fiche 1995"
 * de la marque RENAULT vers la marque FIAT :
 *   - Met à jour brand_id et slug dans Supabase
 *   - Copie le PDF dans R2 sous le nouveau slug
 *   - Copie la preview sous le nouveau slug
 *   - Supprime les anciens fichiers R2
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const OLD_SLUG = 'renault-fiat-punto-gt-schema-fiche-october-1995';
const NEW_SLUG = 'fiat-fiat-punto-gt-schema-fiche-october-1995';
const BUCKET   = 'service-manuals-documents';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Helper : télécharger un objet R2
async function downloadR2(key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Helper : uploader un objet R2
async function uploadR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

// Helper : supprimer un objet R2
async function deleteR2(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

console.log(`Migration : ${OLD_SLUG} → ${NEW_SLUG}\n`);

// 1. Récupérer le document
const { data: doc, error: fetchErr } = await supabase
  .from('documents')
  .select('id, slug, brand_id, title, title_fr')
  .eq('slug', OLD_SLUG)
  .single();

if (fetchErr || !doc) {
  console.error('✗ Document non trouvé :', fetchErr?.message || 'slug introuvable');
  process.exit(1);
}
console.log(`✓ Document trouvé : ${doc.title_fr || doc.title}`);

// 2. Récupérer le brand_id FIAT
const { data: fiatBrand, error: brandErr } = await supabase
  .from('brands')
  .select('id, name')
  .eq('slug', 'fiat')
  .single();

if (brandErr || !fiatBrand) {
  console.error('✗ Marque FIAT non trouvée :', brandErr?.message);
  process.exit(1);
}
console.log(`✓ Marque FIAT : ${fiatBrand.name} (${fiatBrand.id})`);

// 3. Vérifier que le nouveau slug n'existe pas déjà
const { data: existing } = await supabase
  .from('documents')
  .select('id')
  .eq('slug', NEW_SLUG)
  .single();

if (existing) {
  console.error(`✗ Le slug ${NEW_SLUG} existe déjà — abandon`);
  process.exit(1);
}

// 4. Copier le PDF R2 (old → new)
const oldPdfKey  = `documents/${OLD_SLUG}.pdf`;
const newPdfKey  = `documents/${NEW_SLUG}.pdf`;
console.log(`\nCopie PDF R2 : ${oldPdfKey} → ${newPdfKey}`);
try {
  const pdfBytes = await downloadR2(oldPdfKey);
  await uploadR2(newPdfKey, pdfBytes, 'application/pdf');
  console.log(`✓ PDF copié (${(pdfBytes.length / 1024).toFixed(0)} KB)`);
} catch (e) {
  console.error('✗ Erreur copie PDF :', e.message);
  process.exit(1);
}

// 5. Copier la preview R2 (old → new)
const oldPreviewKey = `logos/previews/${OLD_SLUG}.jpg`;
const newPreviewKey = `logos/previews/${NEW_SLUG}.jpg`;
console.log(`Copie preview R2 : ${oldPreviewKey} → ${newPreviewKey}`);
try {
  const previewBytes = await downloadR2(oldPreviewKey);
  await uploadR2(newPreviewKey, previewBytes, 'image/jpeg');
  console.log(`✓ Preview copiée (${(previewBytes.length / 1024).toFixed(0)} KB)`);
} catch (e) {
  console.warn(`⚠ Preview non trouvée ou erreur : ${e.message}`);
}

// 6. Mettre à jour Supabase
const { error: updateErr } = await supabase
  .from('documents')
  .update({ slug: NEW_SLUG, brand_id: fiatBrand.id })
  .eq('id', doc.id);

if (updateErr) {
  console.error('✗ Erreur mise à jour Supabase :', updateErr.message);
  process.exit(1);
}
console.log(`\n✓ Supabase mis à jour : brand_id → FIAT, slug → ${NEW_SLUG}`);

// 7. Supprimer les anciens fichiers R2
try {
  await deleteR2(oldPdfKey);
  console.log(`✓ Ancien PDF R2 supprimé : ${oldPdfKey}`);
} catch (e) {
  console.warn(`⚠ Suppression ancien PDF : ${e.message}`);
}
try {
  await deleteR2(oldPreviewKey);
  console.log(`✓ Ancienne preview R2 supprimée : ${oldPreviewKey}`);
} catch (e) {
  console.warn(`⚠ Suppression ancienne preview : ${e.message}`);
}

console.log(`\n✅ Migration terminée. Nouvelle URL : /docs/${NEW_SLUG}`);
