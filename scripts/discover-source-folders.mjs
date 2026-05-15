/**
 * Découverte de l'arborescence source
 * C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories
 * → liste catégories / marques / PDFs + prix détectés
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SOURCE_ROOT = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Récupérer toutes les catégories Supabase
const { data: dbCats } = await s.from('categories').select('id, name, slug').order('display_order');

// Noms FR des catégories (pour le matching)
const FR_NAMES = {
  'pet-care':             'Animaux & Soins',
  'audio-hifi':           'Audio & HiFi',
  'automotive':           'Automobile',
  'biomedical':           'Biomédical',
  'diy-home-improvement': 'Bricolage & DIY',
  'camping-rv':           'Camping & Caravaning',
  'cinema-video':         'Cinéma & Vidéo',
  'drones':               'Drones',
  'home-appliances':      'Électroménager',
  'electronics':          'Électronique',
  'sports-equipment':     'Équipements Sportifs',
  'computers-it':         'Informatique',
  'machine-tools':        'Machines-Outils',
  'marine':               'Marine',
  'outdoor-power':        'Motoculture',
  'photography':          'Photographie',
  'radio-communications': 'Radio & Communications',
  'phones-telecom':       'Téléphonie & Télécom',
  'television':           'Télévision',
  'machining':            'Usinage',
};

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
}

function matchCategory(folderName) {
  const normFolder = normalize(folderName);
  // Try FR name match
  for (const [slug, frName] of Object.entries(FR_NAMES)) {
    if (normalize(frName) === normFolder) {
      return dbCats.find(c => c.slug === slug);
    }
  }
  // Try partial match
  for (const [slug, frName] of Object.entries(FR_NAMES)) {
    if (normalize(frName).includes(normFolder) || normFolder.includes(normalize(frName).substring(0, 6))) {
      return dbCats.find(c => c.slug === slug);
    }
  }
  // Try EN name match
  for (const cat of dbCats) {
    if (normalize(cat.name) === normFolder) return cat;
  }
  return null;
}

function parsePrice(filename) {
  const match = filename.match(/[€$]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  return Math.round(amount * 100); // en centimes
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Explorer l'arborescence
const catFolders = fs.readdirSync(SOURCE_ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

let totalPdfs = 0;
let unmatchedCats = [];

console.log(`Source : ${SOURCE_ROOT}\n`);
console.log('='.repeat(80));

for (const catFolder of catFolders) {
  const catPath = path.join(SOURCE_ROOT, catFolder);
  const brandFolders = fs.readdirSync(catPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  // Compter PDFs dans tous les sous-dossiers
  let catPdfCount = 0;
  for (const brand of brandFolders) {
    const brandPath = path.join(catPath, brand);
    const pdfs = fs.readdirSync(brandPath).filter(f => f.toLowerCase().endsWith('.pdf'));
    catPdfCount += pdfs.length;
  }

  if (brandFolders.length === 0 && catPdfCount === 0) {
    console.log(`\n[VIDE] ${catFolder}`);
    continue;
  }

  const matched = matchCategory(catFolder);
  const matchStr = matched
    ? `→ ${matched.name} (${matched.slug})`
    : `→ ⚠ NON MAPPÉE`;

  if (!matched) unmatchedCats.push(catFolder);

  console.log(`\n📁 ${catFolder} ${matchStr}`);
  console.log(`   ${brandFolders.length} marque(s), ${catPdfCount} PDF(s)`);

  for (const brand of brandFolders) {
    const brandPath = path.join(catPath, brand);
    const pdfs = fs.readdirSync(brandPath).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) continue;

    console.log(`   └─ ${brand} (${pdfs.length} PDF)`);
    for (const pdf of pdfs) {
      const price = parsePrice(pdf);
      const nameNoExt = pdf.replace(/\.pdf$/i, '').replace(/[€$]\s*\d+[.,]?\d*\s*$/, '').trim();
      const slug = `${slugify(brand)}-${slugify(nameNoExt)}`;
      const priceStr = price ? `${price / 100}€` : '⚠ PRIX MANQUANT';
      console.log(`      • ${pdf}`);
      console.log(`        slug: ${slug} | prix: ${priceStr}`);
      totalPdfs++;
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\nTOTAL : ${totalPdfs} PDFs à importer`);
if (unmatchedCats.length > 0) {
  console.log(`\n⚠ Catégories NON MAPPÉES (à corriger manuellement) :`);
  unmatchedCats.forEach(c => console.log(`  - "${c}"`));
}
