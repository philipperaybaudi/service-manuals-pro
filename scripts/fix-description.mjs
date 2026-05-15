import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [
  {
    slug: 'grundig-grundig-satellit-1000-electronic-schematic-diagram',
    description: "Electronic schematic for the Grundig Satellit 1000 world receiver. Also contains an interior photograph showing component layout, and two routing diagrams for the station selection cable.",
    description_fr: "Document avec le schéma électronique pour le récepteur mondial Grundig Satellit 1000. Contient également une photographie de l'intérieur montrant l'implantation des composants, et deux schémas de cheminement du câble de sélection des stations.",
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
console.log('Terminé.');
