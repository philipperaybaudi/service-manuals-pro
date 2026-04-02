/**
 * Second pass fixes for specific description patterns.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Manual overrides for known bad descriptions
const overrides: Record<string, string> = {
  // Canonet issues
  'canonet 28 cuirettes': 'Step-by-step tutorial for replacing the leatherette covering on the Canon Canonet 28 camera. Illustrated with detailed photos and instructions. Instant PDF download.',
  'CANON-canonet 28 cellule v2': 'Repair tutorial for the light meter cell on the Canon Canonet 28 camera. Illustrated with detailed photos and step-by-step instructions. Instant PDF download.',

  // Hasselblad duplicates
  'HASSELBLAD 500 C et CM': 'User guide and operating instructions for the Hasselblad 500 C and 500 CM medium-format cameras. Instant PDF download.',
  'Hasselblad 500 C et CM manuel de service': 'Factory service manual for the Hasselblad 500 C and 500 CM with French translation of key explanations. Covers disassembly and calibration. Instant PDF download.',

  // Photography books/collections
  'Russian and Soviet cameras 1840-1991': 'Comprehensive reference book on Russian and Soviet cameras from 1840 to 1991. Collector\'s guide with detailed specifications and history. Instant PDF download.',
  'Classic Cameras by Colin Harding': 'Reference book on classic cameras by Colin Harding. Illustrated collector\'s guide. Instant PDF download.',
  'All You Need to Know About Design and Repair of Russian Cameras': 'Complete guide to design principles and repair techniques for Russian cameras. Essential for collectors and repair technicians. Instant PDF download.',

  // Restoration/specific tutorials
  'Restauration des freins d une Adria Prima 350 TD de 1989': 'Step-by-step tutorial for restoring the braking system on Adria Prima 350 TD caravans (1989 and similar models). Illustrated with photos. Instant PDF download.',
  'Restauration-des-freins-dune-Adria-Prima-350-TD-de-1989-nkoi6l': 'Step-by-step tutorial for restoring the braking system on Adria Prima 350 TD caravans (1989 and similar models). Illustrated with photos. Instant PDF download.',

  // Conversion/specific repair
  'Conversion posemètre pour remplacer les piles au mercure': 'Tutorial for converting mercury battery light meters to modern battery alternatives on vintage film cameras. Instant PDF download.',
  'Le remplacement des joints de lumière sur les appareils photos réflex': 'Tutorial for replacing light seals on SLR film cameras. Applicable to most brands and models. Instant PDF download.',
  'Reparer la séparation du baume à la maison': 'Tutorial for repairing balsam separation in vintage camera lenses at home. Step-by-step instructions. Instant PDF download.',
  'Photo Repa Maintenance flashs electroniques': 'Comprehensive guide to maintenance and repair of electronic photographic flash units. Instant PDF download.',

  // Machining
  'Le tournage des metaux partie 1': 'Comprehensive metalworking and lathe turning course (Part 1). 25 pages. Technical reference for machining operations. Instant PDF download.',
  'Cours complet usinage': 'Complete machining course covering turning, milling, and metalworking techniques. Technical reference manual. Instant PDF download.',
  'Comment reparer une alimentation a decoupage': 'Repair guide for switching power supplies used in flat-screen TVs and monitors. All brands and models. Instant PDF download.',

  // Specific equipment
  'auto-pet-feeder': 'User guide for the automatic pet food dispenser (dogs and cats). Operating instructions and setup guide. Instant PDF download.',
  'Handy 2 ': 'User guide for the EMS Air-Flow Handy 2+ dental prophylaxis device. Operating and maintenance instructions. Instant PDF download.',
  'Kit de protection CYBER CONTROL': 'Technical documentation for the Cyber Control protection kit. Computer/IT security equipment guide. Instant PDF download.',

  // Minolta
  'Comment reparer son Minolta TC1': 'Step-by-step repair tutorial for the Minolta TC-1 compact camera. Illustrated with detailed photos. Instant PDF download.',
  'Démontage et réglages télémètre Minolta CLE': 'Disassembly and rangefinder calibration tutorial for the Minolta CLE camera. Illustrated with detailed photos and step-by-step instructions. Instant PDF download.',
  'Démontage et réparation minolta miniflex': 'Disassembly and repair tutorial for the Minolta Miniflex 4x4 TLR camera. Illustrated with detailed photos. Instant PDF download.',

  // Olympus, Nikon, etc.
  'Démontage des OLYMPUS PEN F FT et FV': 'Disassembly tutorial for the Olympus PEN F, PEN FT, and PEN FV half-frame cameras. Illustrated guide in French. Instant PDF download.',
  'Démontage et Réparation du Zoom Nikkor AF 24 50 f3,3 4,5': 'Repair manual for the Nikon Zoom Nikkor AF 24-50mm f/3.3-4.5 lens. 132 pages. Covers disassembly, repair, and reassembly. Instant PDF download.',
  'Démontage NIKONOS III': 'Complete disassembly tutorial for the Nikonos III underwater camera. Illustrated step-by-step guide. Instant PDF download.',
  'Tutoriel de démontage complet du Nikon F4': 'Complete disassembly tutorial for the Nikon F4 professional SLR camera. Fully illustrated step-by-step guide. Instant PDF download.',
  'Tutoriel demontage et SPT Nikon F4': 'Disassembly and service procedure tutorial for the Nikon F4 professional SLR camera. Instant PDF download.',
  'NIKON FE miroir bloqué en haut': 'Troubleshooting guide for fixing a stuck mirror on the Nikon FE SLR camera. Step-by-step repair instructions. Instant PDF download.',
  'The Nikon Model S microscope Replacing the fine focus spur gear': 'Repair guide for replacing the fine focus spur gear on the Nikon Model S microscope. Instant PDF download.',
  'Repair Nikkor 24mm f2 AiS': 'Service manual for the Nikkor 24mm f/2 AI-S lens. Covers disassembly, repair, and calibration. Instant PDF download.',
  'nikon 35 ti qd repair': 'Repair manual for the Nikon 35Ti QD premium compact camera. Covers disassembly, diagnosis, and reassembly. Instant PDF download.',

  // Kodak
  'Comment renover un Kodak Brownie Hawkeye': 'Step-by-step tutorial for restoring and renovating a Kodak Brownie Hawkeye camera. Illustrated guide. Instant PDF download.',
  'Demontage Kodak Retina Reflex': 'Complete disassembly manual for the Kodak Retina Reflex camera. Detailed step-by-step guide. Instant PDF download.',

  // Contax
  'Demontage et revision CONTAX 139 Quartz': 'Complete overhaul and disassembly guide for the Contax 139 Quartz SLR camera. Detailed step-by-step instructions. Instant PDF download.',

  // Rollei
  'Cremaillere de mise au point sur Rolleiflex SL66': 'Repair guide for the focus rack mechanism on the Rolleiflex SL66 medium-format camera. Instant PDF download.',
  'Miroir et armement bloque sur Rolleiflex SL66': 'Troubleshooting guide for stuck mirror and cocking mechanism on the Rolleiflex SL66. Step-by-step repair instructions. Instant PDF download.',
  'Rollei 35 led service manual': 'Complete service manual for the Rollei 35 LED compact camera. Covers disassembly, repair, and calibration. Instant PDF download.',
  'Rolleiflex-2.8F Methode de Reparation': 'Original technician\'s repair manual for the Rolleiflex 2.8F TLR camera. Professional service procedures. Instant PDF download.',
  'Manuel de Reparation Rolleiflex T': 'Original technician\'s repair manual for the Rolleiflex T TLR camera. Professional service procedures. Instant PDF download.',

  // Foca
  'Entretien et reparation des FOCAFLEX': 'Maintenance and repair guide for FOCA Focaflex cameras. Covers servicing and restoration. Instant PDF download.',
  'Universel Notice': 'User guide for the FOCA Universel rangefinder camera. Operating instructions. Instant PDF download.',
  'manuel foca-universel': 'Repair manual for the FOCA Universel R, RC, and URC rangefinder cameras. 60 pages. Instant PDF download.',
  'PF2B Notice': 'User guide for the FOCA PF2B camera. Operating instructions. Instant PDF download.',
  'PF2B PF3 Notice': 'User guide for the FOCA PF2B and PF3 cameras. Operating instructions. Instant PDF download.',

  // Specific vehicles
  'SIMCA NOT.8 354': 'Workshop manual for SIMCA F594WML and F569WML trucks. Complete service and repair procedures. Instant PDF download.',

  // Vestel
  'Manuel VESTEL': 'Repair manual for VESTEL TV power supply boards. Covers fault finding and component replacement. Instant PDF download.',
  'Schema Vestel': 'Electronic schematics for VESTEL TV power supply boards (17IPS62, 17IPS6 series, 17PW06, 17PW25, 17IPS19 series). Essential for troubleshooting. Instant PDF download.',
  '17PW25 4 VESTEL': 'Repair guide for the VESTEL 17PW25-4 TV power supply board. Schematics and troubleshooting procedures. Instant PDF download.',

  // Yashica
  'Yashica Mat 124 Tutoriel en francais': 'Repair tutorial for the Yashica Mat 124 and 124G TLR cameras. Illustrated step-by-step guide in French. Instant PDF download.',

  // KMZ
  'Zenit FS12 Notice': 'User guide for the Zenit FS-12 Fotosnaiper (Photosniper) camera system including FS-12 and FS-3 versions. Instant PDF download.',
  'Zorki 4 repair manual': 'Complete repair manual for the Zorki 4 rangefinder camera. Detailed service procedures. Instant PDF download.',

  // Seagull
  'Seagull 4 Shutter CLA': 'Tutorial for cleaning, lubricating, and adjusting (CLA) the shutter on the Seagull 4 TLR camera. Instant PDF download.',

  // Pentax
  'Deblocage du miroir sur Pentax 6X7': 'Troubleshooting tutorial for fixing a stuck mirror on the Pentax 6x7 medium-format camera. Step-by-step guide. Instant PDF download.',
  'Pentax LX BLOQUE': 'Troubleshooting tutorial for fixing a stuck/jammed Pentax LX camera. Step-by-step repair guide. Instant PDF download.',
  'PENTAX P3-P30 NE DECLENCHE PLUS': 'Troubleshooting guide for fixing the shutter release mechanism on the Pentax P3/P30 camera. Instant PDF download.',

  // Leica stuck cameras
  'Leica R4s et R5 qui ne déclenche plus': 'Troubleshooting guide for fixing stuck shutter release on the Leica R4s and R5 SLR cameras. Step-by-step repair instructions. Instant PDF download.',

  // Scenic Renault - remaining French terms
  'SCENIC 2 Garnissage et Sellerie': 'Service manual for the Renault Scénic 2 - Upholstery and Trim section. Covers seat coverings, door panels, and interior trim. Instant PDF download.',
  'espace-automobile-europeen-scenic-3-notice': 'User guide and operating instructions for the Renault Scénic 3 automobile. Instant PDF download.',
  'SCENIC 2 Equipement Electrique': 'Service manual for the Renault Scénic 2 - Electrical Equipment section (Volume 1). Covers wiring, fuses, and electrical components. Instant PDF download.',
  'SCENIC 2 Equipement Electrique 2': 'Service manual for the Renault Scénic 2 - Electrical Equipment section (Volume 2). Covers wiring, fuses, and electrical components. Instant PDF download.',

  // Wollensak
  'Wollensak Rapax Shutters Disassembly': 'Technical manual for servicing and repairing Wollensak Rapax camera shutters. 68 pages. Covers complete disassembly procedures. Instant PDF download.',

  // Singer
  'Singer 401G': 'User guide for the Singer 401G sewing machine. Operating instructions and maintenance. Instant PDF download.',
  'Singer 401A1 parts': 'Parts list and exploded views for the Singer 401A sewing machine. Essential for identifying replacement parts. Instant PDF download.',
  'singer-401-users-manual': 'User manual for the Singer 401 sewing machine. Complete operating instructions. Instant PDF download.',

  // Bronica
  'bronica-s2 service-manual': 'Service manual for the Zenza Bronica S2 medium-format camera. Complete repair and calibration procedures. Instant PDF download.',
  'Bronica ETRSI Repair Manual': 'Repair manual for the Zenza Bronica ETRSi medium-format camera. Covers disassembly, repair, and calibration. Instant PDF download.',
  'Bronica S2A Notice Fr': 'User guide for the Zenza Bronica S2A medium-format camera. Operating instructions in French. Instant PDF download.',

  // Minox
  'Demonter un Minox Espion': 'Disassembly tutorial for the Minox spy camera. Step-by-step guide with detailed photos. Instant PDF download.',

  // Pentacon
  'Manuel du Pentacon Six': 'Repair manual for the Pentacon Six TL medium-format camera. Service and maintenance procedures. Instant PDF download.',
};

async function main() {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, description')
    .eq('active', true);

  if (error || !docs) { console.error(error); return; }

  let fixed = 0;

  for (const doc of docs) {
    let desc = doc.description || '';
    let newDesc = overrides[doc.title];

    if (!newDesc) {
      // Auto-fix remaining patterns
      let changed = false;

      // Fix "HASSELBLAD HASSELBLAD"
      if (desc.includes('HASSELBLAD HASSELBLAD')) {
        desc = desc.replace('HASSELBLAD HASSELBLAD', 'HASSELBLAD');
        changed = true;
      }

      // Fix "Upholstery and Sellerie"
      if (desc.includes('Sellerie')) {
        desc = desc.replace('Sellerie', 'Trim');
        changed = true;
      }

      // Fix "DUGUÉ Dugué" or "DUGUÉ Dugue"
      if (/DUGUÉ Dugu[eé]/i.test(desc)) {
        desc = desc.replace(/DUGUÉ Dugu[eé]\s*/gi, 'DUGUÉ ');
        changed = true;
      }

      // Fix Lurem items with French accented words in model
      if (/LUREM.*éclatés/i.test(desc)) {
        desc = desc.replace(/éclatés\s*/gi, '');
        changed = true;
      }

      // Fix empty model after cleanups: "for the BRAND  equipment"
      desc = desc.replace(/for the (\w+)\s{2,}/g, 'for the $1 ');

      // Fix "d'" remaining
      if (/\bd'/.test(desc)) {
        desc = desc.replace(/\bd'une?\b/g, '');
        desc = desc.replace(/\bd'un\b/g, '');
        changed = true;
      }

      // Fix "Restauration freins"
      if (desc.includes('Restauration freins')) {
        desc = desc.replace('Restauration freins', 'Brake restoration -');
        changed = true;
      }

      if (changed) newDesc = desc;
    }

    if (newDesc) {
      // Clean up double spaces
      newDesc = newDesc.replace(/\s+/g, ' ').trim();

      const { error: updateErr } = await supabase
        .from('documents')
        .update({ description: newDesc })
        .eq('id', doc.id);

      if (updateErr) {
        console.log(`✗ ${doc.title}: ${updateErr.message}`);
      } else {
        fixed++;
      }
    }
  }

  console.log(`Fixed: ${fixed} descriptions`);
}

main().catch(console.error);
