/**
 * Corrige l'ordre d'affichage des revues périodiques en ajustant created_at.
 * Le site affiche par created_at DESC → le plus récent apparaît en premier.
 * Pour afficher N°1 en premier, N°1 doit avoir le created_at le plus récent.
 *
 * Usage : node scripts/update-created-at.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ordre souhaité à l'affichage : N°1 → N°2 → N°3 → N°4 → N°64
// Site = DESC created_at → N°1 doit avoir le created_at le plus récent
const UPDATES = [
  { slug: 'elektor-elektor-magazine-issue-1-may-june-1978',                       created_at: '2026-05-17T22:05:00.000Z' },
  { slug: 'elektor-elektor-magazine-july-august-1978-issue-2',                    created_at: '2026-05-17T22:04:00.000Z' },
  { slug: 'elektor-elektor-magazine-september-october-1978-issue-3',              created_at: '2026-05-17T22:03:00.000Z' },
  { slug: 'elektor-elektor-electronics-magazine-november-december-1978-issue-4',  created_at: '2026-05-17T22:02:00.000Z' },
  { slug: 'elektor-elektor-october-1983-issue-64',                                created_at: '2026-05-17T22:01:00.000Z' },
];

console.log('\nMise à jour created_at — ELEKTOR\n');

for (const { slug, created_at } of UPDATES) {
  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('slug, title')
    .eq('slug', slug)
    .single();

  if (fetchErr || !doc) {
    console.error(`✗ Introuvable : ${slug}`);
    continue;
  }

  const { error: updateErr } = await supabase
    .from('documents')
    .update({ created_at })
    .eq('slug', slug);

  if (updateErr) {
    console.error(`✗ Erreur sur ${slug} : ${updateErr.message}`);
  } else {
    console.log(`  ✓ ${doc.title}`);
    console.log(`    → created_at = ${created_at}`);
  }
}

console.log('\nTerminé. Vérifier l\'ordre sur le site.\n');
