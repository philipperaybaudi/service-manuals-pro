import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [
  {
    slug: 'grundig-grundig-studio-3000-electronic-schematic',
    description: 'Electronic schematic for the Grundig Studio 3000.',
    description_fr: 'Schéma électronique du Grundig Studio 3000.',
  },
  {
    slug: 'grundig-grundig-satellit-2400-professional-stereo-schematic',
    description: 'Electronic schematic for the Grundig Satellit 2400 Professional.',
    description_fr: 'Schéma électronique du Grundig Satellit 2400 Professional.',
  },
  {
    slug: 'grundig-grundig-satellit-600-electronic-schematics',
    description: 'Electronic schematic for the Grundig Satellit 600.',
    description_fr: 'Schéma électronique du Grundig Satellit 600.',
  },
  {
    slug: 'racal-racal-ra17-communications-receiver-schematic',
    description: 'Electronic schematic for the Racal RA17 communications receiver.',
    description_fr: 'Schéma électronique du récepteur de communications Racal RA17.',
  },
  {
    slug: 'bang-olufsen-bang-olufsen-beovox-beolab-service-manual-schematics',
    description: 'Service schematics for Bang & Olufsen Beovox Beolab speakers.',
    description_fr: 'Schémas de service pour les enceintes Bang & Olufsen Beovox Beolab.',
  },
  {
    slug: 'bang-olufsen-bang-olufsen-beovox-3000-5000-beolab-service-manual',
    description: 'Service documentation for Bang & Olufsen Beovox 3000, 5000 and Beolab speakers.',
    description_fr: 'Documentation de service pour les enceintes Bang & Olufsen Beovox 3000, 5000 et Beolab.',
  },
  {
    slug: 'bang-olufsen-beomaster-1700-type-2607-service-manual',
    description: 'Service documentation for the Bang & Olufsen Beomaster 1700 (type 2607).',
    description_fr: 'Documentation de service pour le Bang & Olufsen Beomaster 1700 (type 2607).',
  },
  {
    slug: 'bang-olufsen-beomaster-3000-type-2402-service-manual',
    description: 'Service documentation for the Bang & Olufsen Beomaster 3000 (type 2402).',
    description_fr: 'Documentation de service pour le Bang & Olufsen Beomaster 3000 (type 2402).',
  },
  {
    slug: 'atelier-how-to-use-battery-tubes-technical-guide',
    description: 'Technical guide on the use of battery-powered tubes.',
    description_fr: 'Guide technique sur l\'utilisation des tubes à batteries.',
  },
];

for (const fix of fixes) {
  const { error } = await supabase.from('documents').update({
    description: fix.description,
    description_fr: fix.description_fr,
  }).eq('slug', fix.slug);
  if (error) console.error(`❌ ${fix.slug}:`, error.message);
  else console.log(`✅ ${fix.slug}`);
}
console.log('\nTerminé.');
