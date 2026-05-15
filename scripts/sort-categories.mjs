/**
 * Réordonne les catégories par ordre alphabétique du nom français
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ordre alphabétique par nom FR
const ORDER = [
  { slug: 'pet-care',             order: 1  }, // Animaux & Soins
  { slug: 'audio-hifi',           order: 2  }, // Audio & HiFi
  { slug: 'automotive',           order: 3  }, // Automobile
  { slug: 'biomedical',           order: 4  }, // Biomédical
  { slug: 'diy-home-improvement', order: 5  }, // Bricolage & DIY
  { slug: 'camping-rv',           order: 6  }, // Camping & Camping-Cars
  { slug: 'cinema-video',         order: 7  }, // Cinéma & Vidéo
  { slug: 'drones',               order: 8  }, // Drones
  { slug: 'home-appliances',      order: 9  }, // Électroménager
  { slug: 'electronics',          order: 10 }, // Électronique
  { slug: 'sports-equipment',     order: 11 }, // Équipements Sportifs
  { slug: 'computers-it',         order: 12 }, // Informatique
  { slug: 'machine-tools',        order: 13 }, // Machines-Outils
  { slug: 'marine',               order: 14 }, // Marine
  { slug: 'outdoor-power',        order: 15 }, // Motoculture
  { slug: 'photography',          order: 16 }, // Photographie
  { slug: 'radio-communications', order: 17 }, // Radio & Communications
  { slug: 'phones-telecom',       order: 18 }, // Téléphonie & Télécom
  { slug: 'television',           order: 19 }, // Télévision
  { slug: 'machining',            order: 20 }, // Usinage
  { slug: 'video',                order: 21 }, // Vidéo
];

for (const { slug, order } of ORDER) {
  const { error } = await s
    .from('categories')
    .update({ display_order: order })
    .eq('slug', slug);
  if (error) { console.error(`Erreur ${slug}:`, error.message); process.exit(1); }
  console.log(`  [${order}] ${slug} ✓`);
}

console.log('\n✓ Catégories triées par ordre alphabétique (FR)');
