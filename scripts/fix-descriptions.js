/**
 * Fix all descriptions with proper English translations.
 * Instead of regex word-by-word, generates clean English descriptions
 * based on the FR source content patterns.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));

/**
 * Properly translate a FR description to clean English.
 * Understands the common templates used on the FR site and produces
 * natural English equivalents.
 */
function properTranslate(frHtml, frTitle) {
  if (!frHtml) return '';

  // Strip HTML tags for analysis, keep for output
  const text = frHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract key info from the text
  const pageMatch = text.match(/(\d+)\s*pages?/i);
  const pages = pageMatch ? pageMatch[1] : null;

  // Detect product type from title/text
  const isServiceManual = /manuel\s*(d['']atelier|de\s*(service|d[eé]pannage|r[eé]paration))/i.test(text + ' ' + frTitle);
  const isUserManual = /notice\s*(d['']utilisation|utilisateur)|mode\s*d['']emploi/i.test(text + ' ' + frTitle);
  const isExplodedViews = /[eé]clat[eé]s?\s*(avec)?\s*listes?\s*des?\s*pi[eè]ces/i.test(text + ' ' + frTitle);
  const isPartsList = /liste\s*des?\s*pi[eè]ces|catalogue\s*(complet\s*)?(des\s*)?pi[eè]ces/i.test(text + ' ' + frTitle);
  const isWiringDiagram = /sch[eé]ma.*([eé]lectr|c[aâ]blage)/i.test(text + ' ' + frTitle);
  const isPhotArgus = /phot\s*argus|dossier\s*(technique\s*et\s*utilisateur|mamiya|pentax|leica|nikon|rolleiflex|bronica|minolta)/i.test(text + ' ' + frTitle);
  const isTutorial = /tutoriel/i.test(text + ' ' + frTitle);
  const isHasselblad = /hasselblad|photographie\s*(grand|monochrome|paysage|rapproch|enfant|t[eé]l[eé]|industrielle|architecture)|vision\s*photographique|l['']œil|format\s*carr[eé]/i.test(text + ' ' + frTitle);
  const isSewingMachine = /machine\s*[aà]\s*coudre|couture|sewing/i.test(text + ' ' + frTitle);
  const isWoodworking = /combin[eé]\s*bois|menuiserie|lurem|dugu[eé]/i.test(text + ' ' + frTitle);
  const isATV = /quad|polaris|sportsman/i.test(text + ' ' + frTitle);
  const isCar = /auto|voiture|renault|scenic|lotus|mini.?cooper|simca|audi|suzuki/i.test(text + ' ' + frTitle);
  const isMotorcycle = /moto|yamaha|virago|fazer/i.test(text + ' ' + frTitle) && !isATV;
  const isCamera = /appareil\s*photo|bo[iî]tier|objectif|pellicule|argentique/i.test(text);
  const isTapeRecorder = /magn[eé]tophone|enregistreur|tape\s*recorder|nagra|akai|uher|revox|studer/i.test(text + ' ' + frTitle);
  const isChainsaw = /tron[cç]onneuse|stihl|chain\s*saw/i.test(text + ' ' + frTitle);
  const isTV = /t[eé]l[eé]viseur|vestel|television/i.test(text + ' ' + frTitle);

  // Extract brand/model from title
  let brandModel = frTitle
    .replace(/^Dossier\s*/i, '')
    .replace(/\s*[-–]\s*(Manuel|Notice|Mode|Documentation|Sch[eé]ma|Tutoriel|[EÉ]clat[eé]s|Liste|Catalogue).*$/i, '')
    .replace(/\s*(Notice|Manuel|Mode d'emploi)\s*(utilisateur|d'utilisation)?\s*$/i, '')
    .replace(/\s*Documentation compl[eè]te\s*$/i, '')
    .trim();

  // Build clean English description
  let desc = '';

  // Extract list items from HTML
  const listItems = [];
  const liMatches = frHtml.match(/<li[^>]*>(.*?)<\/li>/gi);
  if (liMatches) {
    for (const li of liMatches) {
      let item = li.replace(/<[^>]+>/g, '').trim();
      // Simple word-level translations for list items
      item = item
        .replace(/Pi[eè]ce [aà] main/gi, 'Handpiece')
        .replace(/Bouchon de chambre [aà] poudre/gi, 'Powder chamber cap')
        .replace(/Corps/gi, 'Body')
        .replace(/Adaptateur/gi, 'Adapter')
        .replace(/Tube de sortie de poudre/gi, 'Powder outlet tube')
        .replace(/Orifice de sortie d'eau/gi, 'Water outlet')
        .replace(/Buse/gi, 'Nozzle')
        .replace(/Bague du bouchon/gi, 'Cap ring')
        .replace(/Coupole du bouchon/gi, 'Cap dome')
        .replace(/Joint de chambre [aà] poudre/gi, 'Powder chamber seal')
        .replace(/Chambre [aà] poudre/gi, 'Powder chamber')
        .replace(/D[eé]montage/gi, 'Disassembly')
        .replace(/Remontage/gi, 'Reassembly')
        .replace(/R[eé]glage/gi, 'Adjustment')
        .replace(/Entretien/gi, 'Maintenance')
        .replace(/R[eé]paration/gi, 'Repair')
        .replace(/Nettoyage/gi, 'Cleaning')
        .replace(/Lubrification/gi, 'Lubrication')
        .replace(/Mise en route/gi, 'Getting started')
        .replace(/S[eé]curit[eé]/gi, 'Safety')
        .replace(/Installation/gi, 'Installation')
        .replace(/Caract[eé]ristiques techniques/gi, 'Technical specifications')
        .replace(/Accessoires/gi, 'Accessories')
        .replace(/Sch[eé]ma [eé]lectrique/gi, 'Electrical diagram')
        .replace(/Diagnostic/gi, 'Diagnostics')
        .replace(/Pannes/gi, 'Faults')
        .replace(/Pi[eè]ces d[eé]tach[eé]es/gi, 'Spare parts');
      if (item.length > 2) listItems.push(item);
    }
  }

  if (isHasselblad) {
    // Hasselblad photography books
    const topicMap = {
      'grand.angulaire': 'Wide-Angle Photography',
      'monochrome': 'Monochrome Photography',
      'paysage': 'Landscape Photography',
      'vision': 'Photographic Vision',
      'enfant': 'Child Photography',
      'rapproch': 'Close-Up Photography',
      'œil|oeil': 'The Eye and Photography',
      'carr[eé]': 'Square Format Composition',
      'architecture': 'Architectural Photography',
      'industrielle.*1979': 'Industrial Photography (1979)',
      'industrielle.*1975': 'Industrial Photography (1975)',
      'industrielle': 'Industrial Photography',
      't[eé]l[eé]objectif': 'Telephoto Photography',
    };
    let topic = 'Photography';
    for (const [pattern, eng] of Object.entries(topicMap)) {
      if (new RegExp(pattern, 'i').test(text + ' ' + frTitle)) { topic = eng; break; }
    }
    desc = `<p>${topic} by HASSELBLAD</p><p>A guide from the prestigious Hasselblad photography series, exploring techniques and creative approaches to ${topic.toLowerCase()}.</p>`;
    if (pages) desc += `<p>${pages} pages of technical descriptions with numerous photographs.</p>`;
  } else if (isPhotArgus) {
    desc = `<p>${brandModel}</p><p>THE BEST OF ALL TESTS!</p><p>The essential complement to the user manual for the passionate user. Technical and user dossier with all settings, tips, and tests.</p>`;
    if (pages) desc += `<p>${pages} pages of technical descriptions with numerous photographs for the use of this camera body and all its accessories.</p>`;
  } else if (isWoodworking) {
    const machineType = isExplodedViews ? 'Exploded views with parts lists' :
                        isWiringDiagram ? 'Electrical schematics and wiring diagrams' :
                        'User and maintenance manual';
    desc = `<p>${machineType} for the ${brandModel} woodworking combination machine.</p>`;
    if (pages) desc += `<p>${pages}-page document for the use and maintenance of this machine.</p>`;
    desc += `<p>Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.</p>`;
  } else if (isATV) {
    const docType = isPartsList ? 'Parts list' : 'Complete workshop manual';
    desc = `<p>${brandModel}</p><p>${docType} for maintenance and troubleshooting of ${brandModel} ATVs.</p>`;
    if (pages) desc += `<p>Workshop ${isPartsList ? 'documentation' : 'manual'} (${pages} pages), original manufacturer version for service workshops.</p>`;
    desc += `<p>Essential documentation for anyone wishing to maintain and troubleshoot this ATV efficiently and safely.</p>`;
  } else if (isCar) {
    const docType = isServiceManual ? 'Complete workshop manual' :
                    isUserManual ? 'User manual' :
                    isWiringDiagram ? 'Electrical and electronic troubleshooting manual' :
                    'Service documentation';
    desc = `<p>${brandModel}</p><p>${docType} for the ${brandModel}.</p>`;
    if (pages) desc += `<p>${pages}-page manual, original manufacturer version.</p>`;
    desc += `<p>Essential documentation for maintenance, restoration and troubleshooting.</p>`;
  } else if (isMotorcycle) {
    desc = `<p>${brandModel}</p><p>Complete workshop manual for maintenance and troubleshooting of the ${brandModel}.</p>`;
    if (pages) desc += `<p>${pages}-page workshop manual.</p>`;
    desc += `<p>Essential documentation for anyone wishing to maintain this motorcycle efficiently and safely.</p>`;
  } else if (isCamera) {
    const docType = isServiceManual ? 'Service manual' :
                    isTutorial ? 'Repair tutorial' :
                    isUserManual ? 'User manual' : 'Documentation';
    desc = `<p>${docType} for the ${brandModel}.</p>`;
    if (pages) desc += `<p>${pages}-page documentation.</p>`;
    desc += `<p>This documentation will allow you to use this camera with complete confidence and discover all its features.</p>`;
  } else if (isTapeRecorder) {
    const docType = isServiceManual ? 'Service manual' :
                    isUserManual ? 'User manual' : 'Documentation';
    desc = `<p>${docType} for the ${brandModel}.</p>`;
    if (pages) desc += `<p>${pages}-page documentation.</p>`;
    desc += `<p>Essential documentation for maintenance and troubleshooting of this equipment.</p>`;
  } else if (isChainsaw) {
    desc = `<p>User manual for the ${brandModel} chainsaw.</p>`;
    if (pages) desc += `<p>${pages}-page manual.</p>`;
    desc += `<p>Essential documentation for safe and efficient use of this equipment.</p>`;
  } else if (isSewingMachine) {
    desc = `<p>User and maintenance manual for the ${brandModel} sewing machine.</p>`;
    if (pages) desc += `<p>${pages}-page manual, fully illustrated.</p>`;
    desc += `<p>Essential documentation for anyone wishing to maintain and use this sewing machine efficiently and safely.</p>`;
  } else if (isTV) {
    desc = `<p>Schematics and repair tips for ${brandModel}.</p>`;
    desc += `<p>Repair manual for switch-mode power supply boards used in many TV brands.</p>`;
  } else {
    // Generic: extract key info and build clean description
    const docType = isServiceManual ? 'Service manual' :
                    isUserManual ? 'User manual' :
                    isTutorial ? 'Tutorial' :
                    isExplodedViews ? 'Exploded views with parts lists' :
                    isPartsList ? 'Parts list' :
                    isWiringDiagram ? 'Electrical schematics' :
                    'Documentation';
    desc = `<p>${docType} for the ${brandModel}.</p>`;
    if (pages) desc += `<p>${pages}-page documentation.</p>`;
    desc += `<p>Essential documentation for maintenance and use of this equipment.</p>`;
  }

  // Add list items if present
  if (listItems.length > 0) {
    desc += '<h3>Topics covered:</h3><ul>';
    for (const item of listItems.slice(0, 20)) {
      desc += `<li>${item}</li>`;
    }
    desc += '</ul>';
  }

  return desc;
}

async function main() {
  console.log('=== Fixing All Descriptions ===\n');

  // Get all active EN docs
  const { data: activeDocs } = await sb.from('documents')
    .select('id, slug, title, description')
    .eq('active', true)
    .order('slug');

  console.log(`Active docs: ${activeDocs.length}`);

  // Build FR lookup by matching slugs
  // We need to find which FR product each EN doc corresponds to
  // Use the mapping from full-sync-v2.js approach
  const frBySlug = {};
  frProducts.forEach(p => { frBySlug[p.slug] = p; });

  let updated = 0;
  let skipped = 0;

  for (const doc of activeDocs) {
    // Find the FR product that matches this EN doc
    // Try to find it by checking all FR products' descriptions
    let frMatch = null;

    // Check if description contains French text (sign it needs fixing)
    const desc = doc.description || '';
    const hasFrench = /pour l'|d'utilisation|à toute personne|désireuse|en toute sécurité|de garage|l'maintenance|de this|for l'|and de |éditée|atelier de|proprietaire de|de ce|of the Lotus|of the sewing|de la marque|en français/i.test(desc);

    if (!hasFrench) {
      skipped++;
      continue;
    }

    // Find matching FR product - search through all FR products
    // to find one whose longDesc was used (partially translated) in this doc
    for (const fr of frProducts) {
      if (!fr.longDesc) continue;
      // Check if the EN description contains fragments of the FR description
      const frText = fr.longDesc.replace(/<[^>]+>/g, ' ').substring(0, 50);
      const frWords = frText.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      if (frWords.length > 0 && frWords.some(w => desc.includes(w))) {
        frMatch = fr;
        break;
      }
    }

    if (!frMatch) {
      // Try matching by slug patterns
      for (const fr of frProducts) {
        const frTokens = fr.slug.split('-').filter(w => w.length > 3);
        const enTokens = doc.slug.split('-').filter(w => w.length > 3);
        const overlap = frTokens.filter(t => enTokens.includes(t)).length;
        if (overlap >= 2) {
          frMatch = fr;
          break;
        }
      }
    }

    if (frMatch) {
      const newDesc = properTranslate(frMatch.longDesc, frMatch.title);
      if (newDesc && newDesc !== desc) {
        const { error } = await sb.from('documents').update({ description: newDesc }).eq('id', doc.id);
        if (!error) {
          updated++;
          if (updated % 20 === 0) console.log(`  ... ${updated} fixed`);
        }
      }
    }
  }

  console.log(`\nFixed: ${updated}`);
  console.log(`Skipped (already OK): ${skipped}`);
}

main().catch(console.error);
