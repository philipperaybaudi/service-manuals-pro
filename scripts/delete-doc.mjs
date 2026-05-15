/**
 * Supprime un document : Supabase DB + R2 + preview Storage
 * Usage : node scripts/delete-doc.mjs <slug>
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const slug = process.argv[2];
if (!slug) { console.error('Usage : node scripts/delete-doc.mjs <slug>'); process.exit(1); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

console.log(`\nSuppression de : ${slug}\n`);

// 1. Supabase DB
const { error: dbErr } = await supabase.from('documents').delete().eq('slug', slug);
if (dbErr) console.error('✗ DB :', dbErr.message);
else console.log('✓ Supabase DB');

// 2. R2 PDF
try {
  await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `documents/${slug}.pdf` }));
  console.log('✓ R2 PDF');
} catch (e) { console.error('✗ R2 :', e.message); }

// 3. Preview Storage
const { error: storErr } = await supabase.storage.from('logos').remove([`previews/${slug}.jpg`]);
if (storErr) console.error('✗ Preview :', storErr.message);
else console.log('✓ Preview Storage');

// 4. Fichier local (déplacé vers Catégories lors de l'import)
const CATEGORIES_ROOT = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories';
const localPath = process.argv[3]; // optionnel : chemin complet du fichier local
if (localPath) {
  try {
    fs.unlinkSync(localPath);
    console.log(`✓ Fichier local supprimé : ${localPath}`);
  } catch (e) { console.error('✗ Fichier local :', e.message); }
}

console.log('\nTerminé.');
