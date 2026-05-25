/**
 * Corrige les titres des 5 numéros Elektor déjà importés pour garantir
 * un tri alphabétique = tri chronologique sur la page marque.
 * Format cible : "ELEKTOR No. XXX - [date]" (numéro zero-paddé sur 3 chiffres)
 *
 * Usage : node scripts/fix-elektor-titles.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIXES = [
  {
    slug:     'elektor-elektor-magazine-issue-1-may-june-1978',
    title:    'ELEKTOR No. 001 - mai-juin 1978',
    title_fr: 'ELEKTOR N°001 - mai-juin 1978',
  },
  {
    slug:     'elektor-elektor-magazine-july-august-1978-issue-2',
    title:    'ELEKTOR No. 002 - juil-aout 1978',
    title_fr: 'ELEKTOR N°002 - juil-août 1978',
  },
  {
    slug:     'elektor-elektor-magazine-september-october-1978-issue-3',
    title:    'ELEKTOR No. 003 - sept-oct 1978',
    title_fr: 'ELEKTOR N°003 - sept-oct 1978',
  },
  {
    slug:     'elektor-elektor-electronics-magazine-november-december-1978-issue-4',
    title:    'ELEKTOR No. 004 - nov-dec 1978',
    title_fr: 'ELEKTOR N°004 - nov-déc 1978',
  },
  {
    slug:     'elektor-elektor-october-1983-issue-64',
    title:    'ELEKTOR No. 064 - oct 1983',
    title_fr: 'ELEKTOR N°064 - oct 1983',
  },
];

console.log('\nCorrection des titres Elektor\n');

for (const { slug, title, title_fr } of FIXES) {
  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('slug, title')
    .eq('slug', slug)
    .single();

  if (fetchErr || !doc) {
    console.error(`  ✗ Introuvable : ${slug}`);
    continue;
  }

  const { error: updateErr } = await supabase
    .from('documents')
    .update({ title, title_fr })
    .eq('slug', slug);

  if (updateErr) {
    console.error(`  ✗ Erreur : ${updateErr.message}`);
  } else {
    console.log(`  ✓ ${slug}`);
    console.log(`    title    = ${title}`);
    console.log(`    title_fr = ${title_fr}`);
  }
}

console.log('\nTerminé. Vérifier l\'ordre sur la page ELEKTOR.\n');
