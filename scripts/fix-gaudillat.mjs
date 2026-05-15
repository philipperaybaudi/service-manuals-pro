/**
 * Consolide L. GAUDILLAT → GAUDILLAT en base
 * - Réassigne tous les documents de L. GAUDILLAT vers GAUDILLAT
 * - Supprime la marque L. GAUDILLAT devenue vide
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Trouver la marque GAUDILLAT (la bonne)
const { data: gaudillat } = await supabase
  .from('brands').select('id, name').eq('name', 'GAUDILLAT').maybeSingle();
console.log('GAUDILLAT    :', gaudillat);

// 2. Trouver la marque L. GAUDILLAT (à supprimer)
const { data: lgaudillat } = await supabase
  .from('brands').select('id, name').ilike('name', 'L. GAUDILLAT').maybeSingle();
console.log('L. GAUDILLAT :', lgaudillat);

if (!gaudillat || !lgaudillat) { console.error('Marque introuvable'); process.exit(1); }

// 3. Réassigner les documents de L. GAUDILLAT vers GAUDILLAT
const { data: updated, error: updErr } = await supabase
  .from('documents')
  .update({ brand_id: gaudillat.id })
  .eq('brand_id', lgaudillat.id)
  .select('slug');
if (updErr) console.error('Erreur update:', updErr.message);
else console.log('Documents réassignés :', updated.map(d => d.slug));

// 4. Supprimer la marque L. GAUDILLAT vide
const { error: delErr } = await supabase.from('brands').delete().eq('id', lgaudillat.id);
if (delErr) console.error('Erreur suppression marque:', delErr.message);
else console.log('✓ Marque L. GAUDILLAT supprimée');

console.log('\nTerminé.');
