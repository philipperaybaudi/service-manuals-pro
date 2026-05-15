import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [
  {
    slug: 'rollei-rollei-abschlusskasten-closure-box-repair-manual-parts-list',
    title:    'Rollei Closure Box - Repair Manual and Parts List',
    title_fr: 'Rollei Boîtier de Fermeture - Manuel de Réparation et Liste de Pièces',
  },
  {
    slug: 'rollei-rolleiflex-teilmontiert-service-manual-parts-list',
    title:    'Rolleiflex Partially Assembled - Repair Manual and Parts List',
    title_fr: 'Rolleiflex Partiellement Assemblé - Manuel de Réparation et Liste de Pièces',
  },
  {
    slug: 'rollei-rollei-objektiv-lens-carrier-service-and-parts-manual',
    title:    'Rollei Lens Carrier Repair Manual and Parts List',
    title_fr: 'Manuel de Réparation et Liste de Pièces du Porte-Objectif Rollei',
  },
  {
    slug: 'rollei-rollei-lichtschacht-chest-viewing-hood-repair-manual-parts-list',
    title:    'Rollei Chest Viewing Hood - Repair Manual and Parts List',
    title_fr: 'Rollei Viseur de Poitrine - Manuel de Réparation et Liste des Pièces',
  },
  {
    slug: 'rollei-rollei-weitwinkel-rolleiflex-kpl-service-manual',
    title:    'Rollei Wide-Angle Rolleiflex KPL Repair Manual',
    title_fr: 'Manuel de Réparation Rollei Rolleiflex Grand-Angle KPL',
  },
  {
    slug: 'rollei-rolleiflex-6008-integral-user-manual',
    title:    'Rolleiflex 6008 Integral User Manual',
    title_fr: null, // inchangé
  },
  {
    slug: 'rollei-rolleiflex-2-8-gx-user-manual',
    title:    'Rolleiflex 2.8 GX User Manual',
    title_fr: null, // inchangé
  },
];

for (const fix of fixes) {
  const update = { title: fix.title };
  if (fix.title_fr) update.title_fr = fix.title_fr;

  const { error } = await supabase.from('documents').update(update).eq('slug', fix.slug);
  if (error) {
    console.error(`❌ ${fix.slug}`, error.message);
  } else {
    console.log(`✅ ${fix.slug}`);
    console.log(`   EN: ${fix.title}`);
    if (fix.title_fr) console.log(`   FR: ${fix.title_fr}`);
  }
}

console.log('\nTerminé.');
