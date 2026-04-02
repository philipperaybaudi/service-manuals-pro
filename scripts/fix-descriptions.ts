/**
 * Fix description issues:
 * 1. Replace "MENUISERIE" brand with actual brand (LUREM/DUGUÉ) from title
 * 2. Clean French words from model names (Démontage, Réparation, etc.)
 * 3. Fix "et" → "and" in model names
 * 4. Fix duplicate brand names (HASSELBALD + Hasselblad)
 * 5. Clean "éclatés" and other French leftovers
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, description, brand:brands(name), category:categories(name, slug)')
    .eq('active', true);

  if (error || !docs) { console.error(error); return; }

  let fixed = 0;

  for (const doc of docs) {
    let desc = doc.description || '';
    let changed = false;

    // 1. Fix MENUISERIE → actual brand
    if (desc.includes('MENUISERIE')) {
      const title = doc.title.toLowerCase();
      let realBrand = 'LUREM';
      if (/dugu[eé]/i.test(doc.title)) realBrand = 'DUGUÉ';
      desc = desc.replace(/MENUISERIE /g, realBrand + ' ');
      changed = true;
    }

    // 2. Fix HASSELBALD → HASSELBLAD (typo in DB)
    if (desc.includes('HASSELBALD')) {
      desc = desc.replace(/HASSELBALD /g, 'HASSELBLAD ');
      // Remove duplicate: "HASSELBLAD Hasselblad" → "HASSELBLAD"
      desc = desc.replace(/HASSELBLAD\s+Hasselblad/g, 'HASSELBLAD');
      changed = true;
    }

    // 3. Clean French words from model name sections
    // Pattern: "for the BRAND <model> equipment"
    const modelCleanups: [RegExp, string][] = [
      // Remove French prefixes from model
      [/Démontage et [Rr]é(?:paration|glages?) (?:du |des |de la |de l')?/g, ''],
      [/Démontage (?:du |des |de la |de l')?/g, ''],
      [/Réparation (?:du |des |de la |de l')?/g, ''],
      [/Comment (?:rénover|réparer|reparer) (?:un |une |son |sa )?/g, ''],
      [/Entretien et (?:réparation|reparation) des /g, ''],
      [/Manuel de [Rr]éparation (?:du |des |de la |de l')?/g, ''],
      [/Déblocage du miroir sur /g, 'Mirror fix - '],
      [/Miroir et armement bloqué sur /g, 'Stuck mirror fix - '],
      [/Crémaillère de mise au point sur /g, 'Focus rack repair - '],
      // Clean French in model area
      [/ et /g, ' and '],
      [/ du /g, ' '],
      [/ de la /g, ' '],
      [/ de l'/g, ' '],
      [/ des /g, ' '],
      [/ de /g, ' '],
      [/ qui ne déclenche plus/g, ' (shutter stuck)'],
      [/ bloqué/g, ' (stuck)'],
      [/éclatés?/g, ''],
      [/cuirettes/g, 'leatherette replacement'],
      [/cellule/g, 'light meter'],
      [/télémètre/g, 'rangefinder'],
      [/Garnissage et Sellerie/g, 'Upholstery and Trim'],
      [/Climatisation/g, 'Air Conditioning'],
      [/Équipement [ÉE]lectrique/g, 'Electrical Equipment'],
      [/Transmission/g, 'Transmission'],
      [/Carrosserie tôlerie/g, 'Body and Metalwork'],
      [/Moteur et périphériques/g, 'Engine and Peripherals'],
      [/Caractéristiques/g, 'Specifications'],
      [/Diagnostic/g, 'Diagnostics'],
      [/Généralités/g, 'General Information'],
      [/Garnissage/g, 'Upholstery'],
      [/[ÉE]tanchéité et insonorisation/g, 'Sealing and Sound Insulation'],
      [/Mécanismes et Accessoires/g, 'Mechanisms and Accessories'],
      [/Injection/g, 'Fuel Injection'],
      [/Boite de vitesses automatique/g, 'Automatic Gearbox'],
      [/Combiné /g, ''],
      [/Combinés /g, ''],
      [/Notice /g, ''],
      [/ notice/g, ''],
      [/Zoom /g, ''],
    ];

    for (const [pattern, replacement] of modelCleanups) {
      if (pattern.test(desc)) {
        desc = desc.replace(pattern, replacement);
        changed = true;
      }
    }

    // 4. Clean up double spaces and bad model names
    desc = desc.replace(/\s+/g, ' ').trim();
    // Fix "for the BRAND  camera" (empty model)
    desc = desc.replace(/for the (\w+)\s+camera/g, 'for the $1 camera');
    desc = desc.replace(/for the (\w+)\s+reel/g, 'for the $1 reel');
    // Fix double "the the"
    desc = desc.replace(/the the /g, 'the ');
    // Fix trailing spaces before periods
    desc = desc.replace(/ +\./g, '.');

    if (changed) {
      const { error: updateErr } = await supabase
        .from('documents')
        .update({ description: desc })
        .eq('id', doc.id);

      if (updateErr) {
        console.log(`✗ ${doc.title}: ${updateErr.message}`);
      } else {
        fixed++;
        if (fixed <= 20) {
          console.log(`✓ ${doc.title}`);
          console.log(`  → ${desc.substring(0, 150)}`);
        }
      }
    }
  }

  console.log(`\nFixed: ${fixed} descriptions`);
}

main().catch(console.error);
