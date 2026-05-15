/**
 * Renomme la marque "REPAIR & TROUBLESHOOTING" → "Réparation & Dépannage"
 * dans la catégorie Photographie.
 * Le slug reste inchangé pour ne pas casser les URLs existantes.
 *
 * Usage : node scripts/fix-brand-repair-troubleshooting.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Trouver la marque
const { data: brand, error: findErr } = await supabase
  .from('brands')
  .select('id, name, slug, category_id')
  .ilike('name', '%repair%troubleshooting%')
  .maybeSingle();

if (findErr || !brand) {
  console.error('❌ Marque introuvable :', findErr?.message || 'aucun résultat');
  process.exit(1);
}

console.log(`Marque trouvée : "${brand.name}" (slug: ${brand.slug})`);
console.log(`Nouveau nom    : "Réparation & Dépannage"`);

if (DRY_RUN) {
  console.log('\n[DRY-RUN] Aucune modification.');
  process.exit(0);
}

const { error: updateErr } = await supabase
  .from('brands')
  .update({ name: 'Réparation & Dépannage' })
  .eq('id', brand.id);

if (updateErr) {
  console.error('❌ Erreur :', updateErr.message);
} else {
  console.log('✅ Nom mis à jour.');
}
