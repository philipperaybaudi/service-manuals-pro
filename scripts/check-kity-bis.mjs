// Vérifie les docs KITY "bis" — doublons ou versions distinctes ?
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://ylsbqehotapcprfinsnu.supabase.co', 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X');

const { data: kity } = await supabase
  .from('documents')
  .select('slug, title, file_size, page_count, price')
  .ilike('slug', 'kity-%')
  .order('slug');

console.log(`Total KITY : ${kity.length} docs\n`);

// Identifier les paires avec/sans "bis"
const bisDoc  = kity.filter(d => d.slug.includes('-bis'));
const nonBis  = kity.filter(d => !d.slug.includes('-bis'));

console.log(`Docs "bis" : ${bisDoc.length}`);
console.log(`Docs sans "bis" : ${nonBis.length}\n`);

console.log('── Comparaison des paires ──────────────────────────────────────');
for (const b of bisDoc) {
  // Chercher le slug équivalent sans "-bis"
  const baseSlug = b.slug.replace(/-bis(-part\d)?$/, '$1').replace(/-part\d$/, '');
  const pair = nonBis.find(d => d.slug === baseSlug || b.slug.startsWith(d.slug + '-bis'));

  if (pair) {
    const same = pair.file_size === b.file_size ? '⚠ MÊME TAILLE → doublon probable' : '✓ tailles différentes → versions distinctes';
    console.log(`\n  BIS  : ${b.slug}`);
    console.log(`  BASE : ${pair.slug}`);
    console.log(`         ${pair.file_size.toLocaleString()} o  vs  ${b.file_size.toLocaleString()} o   ${same}`);
    console.log(`         ${pair.page_count}p  vs  ${b.page_count}p   $${pair.price/100} vs $${b.price/100}`);
  } else {
    console.log(`\n  BIS sans paire trouvée : ${b.slug} (${b.file_size.toLocaleString()} o, ${b.page_count}p)`);
  }
}

// Chercher aussi les doublons par file_size dans tout KITY
console.log('\n── Doublons par taille de fichier (toutes paires KITY) ──────────');
const sizeMap = {};
for (const d of kity) {
  if (!sizeMap[d.file_size]) sizeMap[d.file_size] = [];
  sizeMap[d.file_size].push(d);
}
const dupes = Object.entries(sizeMap).filter(([, docs]) => docs.length > 1);
if (dupes.length === 0) {
  console.log('  Aucun doublon de taille détecté.');
} else {
  for (const [size, docs] of dupes) {
    console.log(`\n  Taille ${Number(size).toLocaleString()} o :`);
    docs.forEach(d => console.log(`    ${d.slug}  (${d.page_count}p, $${d.price/100})`));
  }
}
