/**
 * Met à jour le prix d'un document
 * Usage : node scripts/update-price.mjs <slug> <prix_euros>
 * Exemple : node scripts/update-price.mjs mon-slug 3
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const [slug, priceArg] = process.argv.slice(2);
if (!slug || !priceArg) {
  console.error('Usage : node scripts/update-price.mjs <slug> <prix_euros>');
  process.exit(1);
}

const priceCents = Math.round(parseFloat(priceArg) * 100);
if (isNaN(priceCents) || priceCents <= 0) {
  console.error('Prix invalide :', priceArg);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vérification préalable
const { data: doc, error: fetchErr } = await supabase
  .from('documents')
  .select('slug, title, price')
  .eq('slug', slug)
  .single();

if (fetchErr || !doc) {
  console.error('Document introuvable :', slug);
  process.exit(1);
}

console.log(`\nDocument : ${doc.title}`);
console.log(`Prix actuel : ${(doc.price / 100).toFixed(2)} €`);
console.log(`Nouveau prix : ${(priceCents / 100).toFixed(2)} €`);

const { error: updateErr } = await supabase
  .from('documents')
  .update({ price: priceCents })
  .eq('slug', slug);

if (updateErr) {
  console.error('✗ Erreur :', updateErr.message);
  process.exit(1);
}

console.log('✓ Prix mis à jour en base\n');
