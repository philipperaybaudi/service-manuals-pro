/**
 * Generate clean English descriptions for all documents.
 * Uses metadata (brand, category, title, file_path) + FR description hints
 * to create proper English product descriptions.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Extract page count from French description
function extractPageCount(desc: string): number | null {
  const match = desc.match(/(\d+)\s*pages?/i);
  return match ? parseInt(match[1]) : null;
}

// Extract languages from French description
function extractLanguages(desc: string): string[] {
  const langs: string[] = [];
  if (/fran[çc]ais/i.test(desc)) langs.push('French');
  if (/anglais|english/i.test(desc)) langs.push('English');
  if (/allemand|german|deutsch/i.test(desc)) langs.push('German');
  if (/italien|italian/i.test(desc)) langs.push('Italian');
  if (/espagnol|spanish/i.test(desc)) langs.push('Spanish');
  if (/multilingue|multilingual/i.test(desc)) langs.push('multilingual');
  return langs;
}

// Determine document type from title/file_path
function detectDocType(title: string, filePath: string, desc: string): string {
  const combined = (title + ' ' + filePath + ' ' + desc).toLowerCase();

  if (/schema|schematic|wiring|câblage|cablage/.test(combined)) return 'schematics';
  if (/eclate|exploded|parts.?list|nomenclature|pieces/.test(combined)) return 'exploded-views';
  if (/service.?manual|repair|reparation|depannage|troubleshoot/.test(combined)) return 'service-manual';
  if (/notice|user.?manual|user.?guide|mode.?d.?emploi|owner/.test(combined)) return 'user-guide';
  if (/tutori|tutorial|demontage|disassembly|comment|how.?to/.test(combined)) return 'tutorial';
  if (/dossier|documentation.?compl|complete.?doc/.test(combined)) return 'complete-documentation';
  if (/catalogue|catalog|price.?guide/.test(combined)) return 'catalog';
  if (/revue.?moto|revue.?technique|rta|rmt/.test(combined)) return 'technical-review';
  if (/manuel|manual/.test(combined)) return 'manual';

  return 'documentation';
}

// Map category slug to readable name
function categoryToEquipment(category: string): string {
  const map: Record<string, string> = {
    'audio-hifi': 'audio equipment',
    'photography': 'photographic equipment',
    'automotive': 'vehicle',
    'radio-communications': 'radio equipment',
    'home-appliances': 'home appliance',
    'outdoor-power': 'outdoor power equipment',
    'workshop-diy': 'workshop equipment',
    'cinema-video': 'cinema/video equipment',
    'electronics': 'electronic equipment',
    'biomedical': 'biomedical equipment',
    'drones': 'drone',
    'phones-telecom': 'phone/telecom device',
    'computers-it': 'computer/IT equipment',
    'television': 'television',
    'marine': 'marine engine',
    'machining': 'machining equipment',
    'sports-equipment': 'sports equipment',
    'pet-care': 'pet care device',
    'camping-rv': 'camping/RV equipment',
  };
  return map[category] || 'equipment';
}

// Extract model number from title
function extractModel(title: string, brand: string): string {
  // Remove brand name from title to isolate model
  let model = title;
  if (brand) {
    const brandRegex = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    model = model.replace(brandRegex, '').trim();
  }
  // Remove common suffixes
  model = model
    .replace(/\b(manuel|manual|notice|schema|schematic|service|repair|user|guide|bd|hd|pro|notice|eclate|pieces|parts)\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return model;
}

// Detect specific equipment type from brand/category/title
function detectEquipmentName(brand: string, category: string, title: string, filePath: string): string {
  const combined = (title + ' ' + filePath).toLowerCase();

  // Brand-specific equipment types
  const brandEquipment: Record<string, string> = {
    'AKAI': 'reel-to-reel tape recorder',
    'NAGRA': 'professional audio recorder',
    'STUDER REVOX': 'reel-to-reel tape recorder',
    'PIONEER': 'amplifier',
    'UHER': 'portable tape recorder',
    'STIHL': 'chainsaw',
    'GRUNDIG': 'radio receiver',
    'HAMEG': 'electronic test instrument',
    'KAVO': 'dental equipment',
    'ROWENTA': 'vacuum cleaner',
    'SINGER': 'sewing machine',
    'VESTEL': 'TV power supply board',
    'HUBSAN': 'drone',
    'YAESU': 'amateur radio transceiver',
    'MIDLAND': 'walkie-talkie',
    'VOLVO PENTA': 'marine diesel engine',
    'EMS': 'dental equipment',
    'Robot Ping-Pong': 'table tennis robot',
    'SAMSUNG': 'mobile phone',
    'KODAK': 'camera/projector',
    'WOLLENSAK': 'camera shutter',
  };

  // Category-specific overrides
  if (category === 'photography' || /photography|photo|camera|lens|objectif|appareil/.test(combined)) {
    if (/objectif|lens|nikkor|canon.?ef/i.test(combined)) return 'camera lens';
    if (/flash/i.test(combined)) return 'electronic flash';
    if (/microscope/i.test(combined)) return 'microscope';
    if (/projecteur|projector|carousel/i.test(combined)) return 'slide projector';
    return 'camera';
  }
  if (category === 'automotive' || /automotive/i.test(filePath)) {
    if (/moto|yamaha.*(dt|fzr|virago|xv)/i.test(combined)) return 'motorcycle';
    if (/quad|polaris|sportsman|outlander/i.test(combined)) return 'ATV/quad';
    if (/camion|truck/i.test(combined)) return 'truck';
    if (/scenic|megane|clio/i.test(combined)) return 'automobile';
    return 'vehicle';
  }
  if (/menuiserie|woodwork|lurem|dugue|former/i.test(combined)) return 'woodworking combination machine';
  if (/machines?.?outil|tour |lathe|emco|opti|habegger/i.test(combined)) return 'metalworking lathe';
  if (/television|tv|ecran|monitor/i.test(combined)) return 'television/monitor';

  return brandEquipment[brand] || categoryToEquipment(category);
}

interface DocData {
  id: string;
  title: string;
  slug: string;
  file_path: string;
  description: string | null;
  brand: { name: string } | null;
  category: { name: string; slug: string } | null;
}

function generateDescription(doc: DocData): string {
  const brand = doc.brand?.name || '';
  const categorySlug = doc.category?.slug || '';
  const categoryName = doc.category?.name || '';
  const oldDesc = doc.description || '';
  const docType = detectDocType(doc.title, doc.file_path, oldDesc);
  const equipment = detectEquipmentName(brand, categorySlug, doc.title, doc.file_path);
  const model = extractModel(doc.title, brand);
  const pageCount = extractPageCount(oldDesc);
  const languages = extractLanguages(oldDesc);

  // Build the description
  let desc = '';

  const docTypeLabels: Record<string, string> = {
    'schematics': 'Electronic schematics and wiring diagrams',
    'exploded-views': 'Exploded views with parts list',
    'service-manual': 'Service and repair manual',
    'user-guide': 'User guide and operating instructions',
    'tutorial': 'Step-by-step repair and disassembly tutorial',
    'complete-documentation': 'Complete technical documentation package',
    'catalog': 'Illustrated catalog and reference guide',
    'technical-review': 'Technical review with maintenance and repair procedures',
    'manual': 'Technical manual',
    'documentation': 'Technical documentation',
  };

  const docLabel = docTypeLabels[docType] || 'Technical documentation';

  // Construct description
  if (brand && model) {
    desc = `${docLabel} for the ${brand} ${model} ${equipment}.`;
  } else if (brand) {
    desc = `${docLabel} for ${brand} ${equipment}.`;
  } else if (model) {
    desc = `${docLabel} for the ${model} ${equipment}.`;
  } else {
    desc = `${docLabel} for this ${equipment}.`;
  }

  // Add page count
  if (pageCount) {
    desc += ` ${pageCount} pages.`;
  }

  // Add language info
  if (languages.length > 0) {
    if (languages.includes('multilingual')) {
      desc += ' Multilingual document.';
    } else if (languages.length === 1 && languages[0] === 'French') {
      desc += ' Document in French.';
    } else if (languages.length === 1 && languages[0] === 'English') {
      desc += ' Document in English.';
    } else if (languages.length > 1) {
      desc += ` Available in ${languages.join(' and ')}.`;
    }
  }

  // Add use case hint based on doc type
  switch (docType) {
    case 'schematics':
      desc += ' Essential for fault finding, troubleshooting, and restoration.';
      break;
    case 'exploded-views':
      desc += ' Invaluable for identifying parts during maintenance and restoration.';
      break;
    case 'service-manual':
      desc += ' Covers diagnostics, disassembly, calibration, and reassembly procedures.';
      break;
    case 'tutorial':
      desc += ' Illustrated with detailed photos and step-by-step instructions.';
      break;
    case 'complete-documentation':
      desc += ' Includes user manual, service manual, schematics, and technical specifications.';
      break;
  }

  // Add download format
  desc += ' Instant PDF download.';

  return desc;
}

async function main() {
  console.log('=== Generate English Descriptions ===\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, description, brand:brands(name), category:categories(name, slug)')
    .eq('active', true)
    .order('title');

  if (error || !docs) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total documents: ${docs.length}\n`);

  let updated = 0;
  let skipped = 0;
  const updates: { id: string; title: string; oldDesc: string; newDesc: string }[] = [];

  for (const doc of docs as DocData[]) {
    const newDesc = generateDescription(doc);
    updates.push({
      id: doc.id,
      title: doc.title,
      oldDesc: (doc.description || '').substring(0, 100),
      newDesc,
    });
  }

  // Save preview for review
  fs.writeFileSync('scripts/description-preview.json', JSON.stringify(updates, null, 2));
  console.log(`Preview saved to scripts/description-preview.json`);

  // Show some samples
  console.log('\n--- Samples ---\n');
  const samples = updates.filter((_, i) => i % 20 === 0).slice(0, 15);
  samples.forEach(u => {
    console.log(`[${u.title}]`);
    console.log(`  OLD: ${u.oldDesc}`);
    console.log(`  NEW: ${u.newDesc}`);
    console.log('');
  });

  // Apply updates
  console.log('\n=== Applying Updates ===\n');
  for (const u of updates) {
    const { error: updateErr } = await supabase
      .from('documents')
      .update({ description: u.newDesc })
      .eq('id', u.id);

    if (updateErr) {
      console.log(`  ✗ ${u.title}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch(console.error);
