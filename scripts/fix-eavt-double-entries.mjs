/**
 * Corrige les doublons EAVT* dans le rapport Automobile.
 *
 * Problème : chaque fichier EAVT* avait 2 entrées dans le rapport :
 *   - 1 mauvaise (1ère passe : "Electrolux", "vierge", "Eberspächer"…)
 *   - 1 bonne  (2ème passe --force-jpeg : vraie description Auto-Volt)
 * L'import a traité les mauvaises en premier.
 *
 * Ce script :
 *   1. Supprime les 4 mauvaises entrées déjà importées (DB + R2 + Storage)
 *   2. Met à jour original_path des 4 bonnes entrées (PDF déplacé vers DOCS EN LIGNE)
 *   3. Supprime TOUTES les autres mauvaises entrées EAVT "done" du rapport
 *
 * Usage : node scripts/fix-eavt-double-entries.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile';
const REPORT_PATH   = path.join('scripts', 'docs-a-classer-report-automobile.json');

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

// ─── 1. Mauvaises entrées DÉJÀ IMPORTÉES (à supprimer de DB + R2 + Storage) ──
// Pour chacune : slug mauvais, nom de fichier, marque, slug de la BONNE entrée
const IMPORTED_BAD = [
  {
    badSlug:  'audi-electrolux-eavt720a',
    filename: 'EAVT720A.pdf',
    brand:    'AUDI',
    goodSlug: 'audi-audi-a4-4-cylindres-essence-et-diesel-schema-fiche',
  },
  {
    badSlug:  'audi-document-technique-eavt755a',
    filename: 'EAVT755A.pdf',
    brand:    'AUDI',
    goodSlug: 'audi-audi-a3-diesel-1-9-tdi-schema-fiche',
  },
  {
    badSlug:  'bmw-document-technique-vide-ou-non-analysable',
    filename: 'EAVT721A.pdf',
    brand:    'BMW',
    goodSlug: 'bmw-bmw-318-325-td-tds-diesel-schema-fiche-1996',
  },
  {
    badSlug:  'bmw-eberspacher-airtronic-d2-service-manual',
    filename: 'EAVT733A.pdf',
    brand:    'BMW',
    goodSlug: 'bmw-bmw-525-tds-e39-1996-electrical-schema',
  },
];

// ─── 2. Mauvaises entrées "done" à supprimer du rapport (PDF encore en SOURCE) ─
// Correspondance : fichier → bonne entrée connue (ou null si reclassification nécessaire)
const DONE_BAD_SLUGS = [
  // CITROEN
  'citroen-eavt715a-manual',
  'citroen-document-technique-incomplet-ou-illisible',
  'citroen-eberspacher-eavt741a-technical-documentation',
  'citroen-eberspaecher-airtronic-d2-schematic',
  // DAEWOO
  'daewoo-unknown-technical-document',
  // FIAT
  'fiat-eavt735a',
  'fiat-eavt745a-manual',
  'fiat-eavt769a-document',
  'fiat-document-vierge-ou-non-traitable',
  // HONDA
  'honda-eberspaecher-eavt713a',
  // NISSAN
  'nissan-eavt725a-manual',
  'nissan-document-vierge',
  'nissan-unknown-document-blank-pages',
  // TOYOTA
  'toyota-document-technique-pages-blanches',
  'toyota-eberspacher-airtronic-d2-installation-manual',
  // VOLKSWAGEN
  'volkswagen-document-sans-contenu-visible',
  'volkswagen-eavt750a-service-manual',
  'volkswagen-eberspacher-airtronic-d2-service-manual',
  'volkswagen-eavt760a',
];

// ─── Main ────────────────────────────────────────────────────────────────────
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

// ── Étape 1 : Supprimer les 4 mauvaises entrées importées ───────────────────
console.log('\n══ ÉTAPE 1 : Suppression des 4 mauvaises entrées importées ══\n');

for (const { badSlug, filename, brand, goodSlug } of IMPORTED_BAD) {
  console.log(`── ${filename} (${brand})`);
  console.log(`   Mauvais slug : ${badSlug}`);

  // 1a. Supabase DB
  const { error: dbErr } = await supabase.from('documents').delete().eq('slug', badSlug);
  if (dbErr) console.log(`   ✗ DB : ${dbErr.message}`);
  else       console.log(`   ✓ Enregistrement Supabase supprimé`);

  // 1b. R2 — PDF
  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key:    `documents/${badSlug}.pdf`,
    }));
    console.log(`   ✓ R2 PDF supprimé`);
  } catch (e) { console.log(`   ✗ R2 PDF : ${e.message}`); }

  // 1c. Supabase Storage — preview
  const { error: previewErr } = await supabase.storage
    .from('logos').remove([`previews/${badSlug}.jpg`]);
  if (previewErr) console.log(`   ✗ Preview : ${previewErr.message}`);
  else            console.log(`   ✓ Preview Supabase Storage supprimée`);

  // 1d. Preview locale
  const localPreview = path.join('scripts', 'temp_previews', `${badSlug}.jpg`);
  if (fs.existsSync(localPreview)) { fs.unlinkSync(localPreview); console.log(`   ✓ Preview locale supprimée`); }

  // 1e. Rapport : supprimer la mauvaise entrée
  const before = report.docs.length;
  report.docs  = report.docs.filter(d => d.slug !== badSlug);
  console.log(`   ✓ Rapport : ${before - report.docs.length} entrée(s) mauvaise(s) retirée(s)`);

  // 1f. Rapport : mettre à jour original_path de la BONNE entrée
  // Le PDF a été déplacé vers DOCS EN LIGNE par le mauvais import
  const newPath = path.join(DOCS_EN_LIGNE, brand, filename);
  const goodEntry = report.docs.find(d => d.slug === goodSlug);
  if (goodEntry) {
    goodEntry.original_path = newPath;
    console.log(`   ✓ Bonne entrée (${goodSlug}) : original_path → DOCS EN LIGNE`);
  } else {
    console.log(`   ⚠ Bonne entrée introuvable dans le rapport (slug: ${goodSlug})`);
  }
}

// ── Étape 2 : Supprimer les mauvaises entrées "done" restantes ──────────────
console.log('\n══ ÉTAPE 2 : Suppression des mauvaises entrées "done" ══\n');

let removedDone = 0;
for (const badSlug of DONE_BAD_SLUGS) {
  const before = report.docs.length;
  report.docs  = report.docs.filter(d => d.slug !== badSlug);
  const removed = before - report.docs.length;
  if (removed > 0) {
    console.log(`   ✓ Supprimé : ${badSlug}`);
    removedDone += removed;
  } else {
    console.log(`   ⚠ Non trouvé : ${badSlug}`);
  }
}
console.log(`\n   Total retiré du rapport : ${removedDone} entrée(s)`);

// ── Sauvegarde ───────────────────────────────────────────────────────────────
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log('\n✓ Rapport sauvegardé\n');

// ── Étape 3 : Récapitulatif des fichiers à reclassifier ─────────────────────
console.log('══ ÉTAPE 3 : Fichiers sans bonne entrée → à reclassifier ══\n');
console.log('Exécute ces commandes après ce script :');
console.log('');
const toReclassify = [
  { brand: 'CITROEN',    file: 'EAVT729A.pdf' },
  { brand: 'CITROEN',    file: 'EAVT747A.pdf' },
  { brand: 'DAEWOO',     file: 'EAVT744A.pdf' },
  { brand: 'NISSAN',     file: 'EAVT725A.pdf' },
  { brand: 'NISSAN',     file: 'EAVT765A.pdf' },
  { brand: 'TOYOTA',     file: 'EAVT736A.pdf' },
  { brand: 'TOYOTA',     file: 'EAVT775A.pdf' },
  { brand: 'VOLKSWAGEN', file: 'EAVT750A.pdf' },
  { brand: 'VOLKSWAGEN', file: 'EAVT757A.pdf' },
];
for (const { file } of toReclassify) {
  console.log(`  node scripts/classify-single.mjs Automobile "${file}" --force-jpeg`);
}
console.log('');
console.log('Puis relancer : node scripts/import-from-report.mjs Automobile');
