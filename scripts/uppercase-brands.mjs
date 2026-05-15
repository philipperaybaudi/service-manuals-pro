/**
 * Met tous les noms de marques en MAJUSCULES dans la table brands,
 * sauf "Ouvrages de référence" qui reste intact.
 * Usage : node scripts/uppercase-brands.mjs [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXCLUDE = ['Ouvrages de référence'];

const { data: brands, error } = await supabase.from('brands').select('id, name').order('name');
if (error) { console.error('Erreur lecture:', error.message); process.exit(1); }

console.log(`${brands.length} marques trouvées. Mode : ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}\n`);

let updated = 0, skipped = 0, unchanged = 0;

for (const brand of brands) {
  if (EXCLUDE.includes(brand.name)) { skipped++; continue; }

  const newName = brand.name.toUpperCase();
  if (newName === brand.name) { unchanged++; continue; }

  console.log(`${brand.name.padEnd(40)} → ${newName}`);
  if (!DRY_RUN) {
    const { error: upErr } = await supabase
      .from('brands').update({ name: newName }).eq('id', brand.id);
    if (upErr) console.error('  ✗ ' + upErr.message);
  }
  updated++;
}

console.log(`\nÀ modifier  : ${updated}`);
console.log(`Déjà OK     : ${unchanged}`);
console.log(`Exclus      : ${skipped}`);
if (DRY_RUN) console.log('\n→ Relance sans --dry-run pour appliquer.');
else console.log('\n✓ Terminé.');
