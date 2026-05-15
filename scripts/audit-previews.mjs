/**
 * Audit des previews : détecte les images suspectes (blanches, vides, trop petites)
 * Méthode : vérifie la taille des fichiers dans Supabase Storage (logos/previews/)
 * Seuil : < 15 KB → suspect (page blanche, image vide ou illisible)
 * Usage : node scripts/audit-previews.mjs [--seuil 20]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args   = process.argv.slice(2);
const seuilIdx = args.indexOf('--seuil');
const SEUIL_KB = seuilIdx !== -1 ? parseInt(args[seuilIdx + 1]) : 15;

console.log(`\n${'═'.repeat(60)}`);
console.log(`Audit previews — seuil suspect : < ${SEUIL_KB} KB`);
console.log(`${'═'.repeat(60)}\n`);

// 1. Récupérer tous les documents actifs avec leur preview_url
console.log('Chargement des documents...');
let allDocs = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await supabase
    .from('documents')
    .select('slug, title, preview_url')
    .eq('active', true)
    .not('preview_url', 'is', null)
    .range(from, from + PAGE - 1)
    .order('slug');
  if (error) { console.error('Erreur DB :', error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  allDocs = allDocs.concat(data);
  if (data.length < PAGE) break;
  from += PAGE;
}
console.log(`${allDocs.length} documents avec preview_url\n`);

// 2. Lister les fichiers dans logos/previews/ par lots de 1000
console.log('Chargement des fichiers Storage...');
let allFiles = [];
let offset = 0;
while (true) {
  const { data, error } = await supabase.storage
    .from('logos')
    .list('previews', { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
  if (error) { console.error('Erreur Storage :', error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  allFiles = allFiles.concat(data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`${allFiles.length} fichiers dans Storage\n`);

// Index par nom de fichier → métadonnées
const fileIndex = new Map();
for (const f of allFiles) {
  fileIndex.set(f.name, f);
}

// 3. Croiser avec les documents
const suspects = [];
const noFile   = [];

for (const doc of allDocs) {
  const filename = `${doc.slug}.jpg`;
  const file = fileIndex.get(filename);

  if (!file) {
    noFile.push(doc);
    continue;
  }

  const sizeKb = (file.metadata?.size || 0) / 1024;
  if (sizeKb < SEUIL_KB) {
    suspects.push({ ...doc, sizeKb: sizeKb.toFixed(1) });
  }
}

// 4. Rapport
console.log(`${'═'.repeat(60)}`);
console.log(`RÉSULTATS`);
console.log(`${'═'.repeat(60)}\n`);

if (suspects.length === 0 && noFile.length === 0) {
  console.log('✓ Aucune anomalie détectée.');
} else {
  if (suspects.length > 0) {
    console.log(`⚠ ${suspects.length} preview(s) suspecte(s) (< ${SEUIL_KB} KB) :\n`);
    for (const d of suspects) {
      console.log(`  ${d.sizeKb} KB  ${d.slug}`);
      console.log(`         ${d.title}`);
      console.log(`         https://service-manuels-pro.fr/docs/${d.slug}\n`);
    }
  }

  if (noFile.length > 0) {
    console.log(`\n✗ ${noFile.length} document(s) sans fichier preview en Storage :\n`);
    for (const d of noFile) {
      console.log(`  ${d.slug}`);
      console.log(`  https://service-manuels-pro.fr/docs/${d.slug}\n`);
    }
  }
}

// 5. Export JSON
const report = {
  generated_at: new Date().toISOString(),
  seuil_kb: SEUIL_KB,
  total_docs: allDocs.length,
  suspects: suspects.map(d => ({ slug: d.slug, title: d.title, size_kb: d.sizeKb })),
  no_file: noFile.map(d => ({ slug: d.slug, title: d.title })),
};
fs.writeFileSync('scripts/audit-previews-report.json', JSON.stringify(report, null, 2), 'utf8');
console.log(`\nRapport JSON : scripts/audit-previews-report.json`);
console.log(`Total suspects : ${suspects.length + noFile.length} / ${allDocs.length}`);
