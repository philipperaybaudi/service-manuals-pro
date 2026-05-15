/**
 * update-renault-prices.mjs
 *
 * Met tous les documents RENAULT à 1200 (12€),
 * sauf :
 *   - "Vel Satis"          → 1800 (18€)
 *   - "Manuel Équipement Électrique Renault Clio Section 8" → 900 (9€)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Récupérer tous les docs Renault
const { data: docs, error } = await supabase
  .from('documents')
  .select('id, slug, title, title_fr, price')
  .eq('brand_id', (
    await supabase.from('brands').select('id').eq('slug', 'renault').single()
  ).data.id);

if (error) { console.error('Erreur fetch:', error); process.exit(1); }

console.log(`${docs.length} documents Renault trouvés\n`);

let updated = 0;
let skipped = 0;

for (const doc of docs) {
  const title = (doc.title_fr || doc.title || '').toLowerCase();

  // Exceptions
  if (title.includes('vel satis')) {
    if (doc.price !== 1800) {
      const { error: e } = await supabase.from('documents').update({ price: 1800 }).eq('id', doc.id);
      if (e) console.error(`✗ ${doc.slug}:`, e);
      else console.log(`⚠ Vel Satis conservé à 18€ : ${doc.title_fr || doc.title}`);
    } else {
      console.log(`✓ Vel Satis déjà à 18€ : ${doc.title_fr || doc.title}`);
    }
    skipped++;
    continue;
  }

  if (title.includes('clio') && title.includes('section 8')) {
    if (doc.price !== 900) {
      const { error: e } = await supabase.from('documents').update({ price: 900 }).eq('id', doc.id);
      if (e) console.error(`✗ ${doc.slug}:`, e);
      else console.log(`⚠ Clio Section 8 conservé à 9€ : ${doc.title_fr || doc.title}`);
    } else {
      console.log(`✓ Clio Section 8 déjà à 9€ : ${doc.title_fr || doc.title}`);
    }
    skipped++;
    continue;
  }

  // Mise à jour standard → 1200
  if (doc.price !== 1200) {
    const { error: e } = await supabase.from('documents').update({ price: 1200 }).eq('id', doc.id);
    if (e) { console.error(`✗ ${doc.slug}:`, e); }
    else {
      console.log(`✓ ${doc.price} → 1200 : ${doc.title_fr || doc.title}`);
      updated++;
    }
  }
}

console.log(`\n════════════════════════════════`);
console.log(`Total Renault   : ${docs.length}`);
console.log(`Mis à jour      : ${updated}`);
console.log(`Exceptions      : ${skipped}`);
console.log(`Déjà à 12€      : ${docs.length - updated - skipped}`);
