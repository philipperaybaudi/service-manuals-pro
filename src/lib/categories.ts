// Category configuration mapping from French folder names to English site
export const CATEGORY_CONFIG: Record<string, {
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}> = {
  'ANIMAUX': {
    name: 'Pet Care',
    slug: 'pet-care',
    description: 'Service manuals for pet care equipment and accessories',
    seoTitle: 'Pet Care Equipment Service Manuals | Download PDF',
    seoDescription: 'Download professional service manuals for pet care equipment. Repair guides, schematics, and technical documentation for pet feeders and accessories.',
  },
  'AUTO MOTO': {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Workshop manuals, repair guides and schematics for cars, motorcycles and vehicles',
    seoTitle: 'Automotive Service & Repair Manuals | Workshop Guides PDF',
    seoDescription: 'Download professional automotive service manuals. Workshop repair guides, wiring diagrams, and technical documentation for cars, motorcycles, ATVs and more.',
  },
  'BIOMEDICAL': {
    name: 'Biomedical',
    slug: 'biomedical',
    description: 'Technical manuals for biomedical and dental equipment',
    seoTitle: 'Biomedical Equipment Service Manuals | Technical PDF',
    seoDescription: 'Download professional biomedical equipment service manuals. Maintenance guides, schematics, and repair documentation for medical and dental devices.',
  },
  'BRICOLAGE': {
    name: 'Workshop & DIY',
    slug: 'workshop-diy',
    description: 'Service manuals for power tools, woodworking machines, machine tools (lathes, milling machines), and sewing equipment',
    seoTitle: 'Workshop & DIY Tool Service Manuals | Repair Guides PDF',
    seoDescription: 'Download professional service manuals for workshop tools and DIY equipment. Repair guides for power tools, woodworking machines, machine tools (lathes, milling machines), and sewing machines.',
  },
  'CAMPING CARAVANING': {
    name: 'Camping & RV',
    slug: 'camping-rv',
    description: 'Technical documentation for caravans, motorhomes and camping equipment',
    seoTitle: 'Camping & RV Service Manuals | Caravan Repair Guides PDF',
    seoDescription: 'Download professional service manuals for caravans, motorhomes and camping equipment. Technical documentation and repair guides.',
  },
  'CINEMA & VIDEO': {
    name: 'Cinema & Video',
    slug: 'cinema-video',
    description: 'Service manuals for film projectors, video cameras and cinema equipment',
    seoTitle: 'Cinema & Video Equipment Service Manuals | Technical PDF',
    seoDescription: 'Download professional service manuals for cinema and video equipment. Repair guides for projectors, cameras, and professional video gear.',
  },
  'DRONES': {
    name: 'Drones',
    slug: 'drones',
    description: 'Technical manuals and repair guides for consumer and professional drones',
    seoTitle: 'Drone Service & Repair Manuals | Technical Documentation PDF',
    seoDescription: 'Download professional drone service manuals. Repair guides, schematics, and technical documentation for consumer and professional UAVs.',
  },
  'ELECTROMENAGER': {
    name: 'Home Appliances',
    slug: 'home-appliances',
    description: 'Service manuals for household appliances, heaters and domestic equipment',
    seoTitle: 'Home Appliance Service Manuals | Repair Guides PDF',
    seoDescription: 'Download professional service manuals for home appliances. Repair guides and schematics for heaters, kitchen appliances, and household equipment.',
  },
  'ELECTRONIQUE': {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Technical manuals for test equipment, oscilloscopes and electronic instruments',
    seoTitle: 'Electronics Service Manuals | Test Equipment Repair Guides PDF',
    seoDescription: 'Download professional electronics service manuals. Repair guides for oscilloscopes, multimeters, signal generators and test instruments.',
  },
  'INFORMATIQUE': {
    name: 'Computers & IT',
    slug: 'computers-it',
    description: 'Service manuals and technical guides for computers and IT equipment',
    seoTitle: 'Computer & IT Service Manuals | Technical Documentation PDF',
    seoDescription: 'Download professional computer and IT service manuals. Repair guides, maintenance documentation, and technical guides for IT hardware.',
  },
  'MOTOCULTURE': {
    name: 'Outdoor Power',
    slug: 'outdoor-power',
    description: 'Service manuals for chainsaws, lawn mowers and outdoor power equipment',
    seoTitle: 'Outdoor Power Equipment Service Manuals | Repair Guides PDF',
    seoDescription: 'Download professional service manuals for outdoor power equipment. Repair guides for chainsaws, trimmers, lawn mowers and garden machinery.',
  },
  'NAUTISME': {
    name: 'Marine',
    slug: 'marine',
    description: 'Technical manuals for marine engines, boat systems and nautical equipment',
    seoTitle: 'Marine Engine Service Manuals | Boat Repair Guides PDF',
    seoDescription: 'Download professional marine service manuals. Repair guides for marine engines, boat electrical systems, and nautical equipment.',
  },
  'PHOTOGRAPHIE': {
    name: 'Photography',
    slug: 'photography',
    description: 'Service manuals for cameras, lenses, flashes and photographic equipment',
    seoTitle: 'Camera Service & Repair Manuals | Photography Equipment PDF',
    seoDescription: 'Download professional camera service manuals. Repair guides for SLR cameras, medium format, lenses, flash units from Nikon, Canon, Leica, Hasselblad and more.',
  },
  'RADIO COM': {
    name: 'Radio & Communications',
    slug: 'radio-communications',
    description: 'Service manuals for radios, transceivers, CB and amateur radio equipment',
    seoTitle: 'Radio & Communications Service Manuals | Repair Guides PDF',
    seoDescription: 'Download professional radio service manuals. Repair guides for transceivers, receivers, CB radios, and amateur radio equipment.',
  },
  'SON': {
    name: 'Audio & HiFi',
    slug: 'audio-hifi',
    description: 'Service manuals for amplifiers, tape recorders, turntables and audio equipment',
    seoTitle: 'Audio & HiFi Service Manuals | Amplifier Repair Guides PDF',
    seoDescription: 'Download professional audio service manuals. Repair guides for amplifiers, reel-to-reel recorders, turntables, and vintage HiFi equipment.',
  },
  'SPORTS': {
    name: 'Sports Equipment',
    slug: 'sports-equipment',
    description: 'Technical manuals for sports training equipment and machines',
    seoTitle: 'Sports Equipment Service Manuals | Technical Guides PDF',
    seoDescription: 'Download professional sports equipment service manuals. Repair guides and technical documentation for training machines and sport devices.',
  },
  'TELEPHONE': {
    name: 'Phones & Telecom',
    slug: 'phones-telecom',
    description: 'Service manuals for smartphones, mobile phones and telecom equipment',
    seoTitle: 'Phone & Telecom Service Manuals | Repair Guides PDF',
    seoDescription: 'Download professional phone service manuals. Repair guides for smartphones, mobile phones, and telecommunications equipment.',
  },
  'TELEVISION': {
    name: 'Television',
    slug: 'television',
    description: 'Service manuals for TVs, monitors, power supplies and display equipment',
    seoTitle: 'TV & Monitor Service Manuals | Television Repair Guides PDF',
    seoDescription: 'Download professional television service manuals. Repair guides for LCD, LED, plasma TVs, monitors, and power supply circuits.',
  },
  'USINAGE': {
    name: 'Machining',
    slug: 'machining',
    description: 'Technical guides for lathes, milling machines and metalworking equipment',
    seoTitle: 'Machining & Metalwork Manuals | Lathe & Mill Guides PDF',
    seoDescription: 'Download professional machining guides. Technical documentation for lathes, milling machines, and metalworking equipment.',
  },
};

export function getCategoryByFolder(folderName: string) {
  return CATEGORY_CONFIG[folderName] || null;
}

export function getAllCategories() {
  return Object.values(CATEGORY_CONFIG).sort((a, b) => a.name.localeCompare(b.name));
}
