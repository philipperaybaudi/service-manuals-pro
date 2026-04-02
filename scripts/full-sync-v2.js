/**
 * FULL SYNC V2: Complete synchronization of EN site from FR site.
 *
 * Phase 1: Generate mapping report (FR product → EN doc)
 * Phase 2: Update all matched EN docs with FR data
 * Phase 3: Deactivate unmatched EN docs
 * Phase 4: Update brand counts
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// =====================================================================
// Translation helpers
// =====================================================================
function translateHtml(html) {
  if (!html) return '';
  let t = html;
  // Common FR → EN patterns
  const replacements = [
    [/Mode d'emploi/gi, 'User Manual'],
    [/Notice d'utilisation/gi, 'User Manual'],
    [/Notice utilisateur/gi, 'User Manual'],
    [/Manuel d'atelier/gi, 'Workshop Manual'],
    [/Manuel de service/gi, 'Service Manual'],
    [/Manuel de dépannage/gi, 'Troubleshooting Manual'],
    [/Manuel de réparation/gi, 'Repair Manual'],
    [/Manuel d'utilisation/gi, 'User Manual'],
    [/Manuel utilisateur/gi, 'User Manual'],
    [/Manuel complet/gi, 'Complete Manual'],
    [/Documentation complète/gi, 'Complete Documentation'],
    [/Documentation technique/gi, 'Technical Documentation'],
    [/Documentation indispensable/gi, 'Essential documentation'],
    [/Dossier technique et utilisateur/gi, 'Technical and user dossier'],
    [/Éclatés avec listes? des pièces/gi, 'Exploded views with parts lists'],
    [/Liste des pièces détachées/gi, 'Parts list'],
    [/Catalogue complet des pièces détachées/gi, 'Complete spare parts catalog'],
    [/Schéma électronique/gi, 'Electronic schematic'],
    [/Schéma électrique/gi, 'Electrical schematic'],
    [/Schémas? et câblages? électriques?/gi, 'Electrical schematics and wiring diagrams'],
    [/Schéma du câblage électrique/gi, 'Electrical wiring diagram'],
    [/Tutoriel de dépannage/gi, 'Troubleshooting tutorial'],
    [/Tutoriel de démontage/gi, 'Disassembly tutorial'],
    [/Tutoriel de réparation/gi, 'Repair tutorial'],
    [/Conseils de réparation/gi, 'Repair tips'],
    [/en français/gi, ''],
    [/en anglais/gi, 'in English'],
    [/en version originale du constructeur/gi, "original manufacturer's version"],
    [/pour atelier de SAV/gi, 'for service workshops'],
    [/imprimé en/gi, 'printed in'],
    [/pour l'utilisation et l'entretien/gi, 'for use and maintenance'],
    [/pour l'entretien et le dépannage/gi, 'for maintenance and troubleshooting'],
    [/pour l'entretien, la restauration, la remise en route et le dépannage/gi, 'for maintenance, restoration, recommissioning and troubleshooting'],
    [/à toute personne désireuse d'/gi, 'for anyone wishing to '],
    [/à toute personne désireuse de /gi, 'for anyone wishing to '],
    [/installer, d'entretenir et d'utiliser efficacement et en toute sécurité cette machine/gi, 'install, maintain and use this machine efficiently and safely'],
    [/entretenir efficacement et en toute sécurité/gi, 'maintain efficiently and safely'],
    [/utiliser efficacement et en toute sécurité/gi, 'use efficiently and safely'],
    [/utiliser en toute tranquillité/gi, 'use with complete confidence'],
    [/découvrir toutes ses fonctionnalités/gi, 'discover all its features'],
    [/Sommaire des points traités par cette documentation\s*:/gi, 'Topics covered in this documentation:'],
    [/Avec nomenclature de toutes les pièces et schémas éclatés/gi, 'With complete parts nomenclature and exploded diagrams'],
    [/pages?\s+éditée?\s+en\s+français/gi, 'pages'],
    [/pages?\s+en\s+français/gi, 'pages'],
    [/Manuel pour l'atelier de/gi, 'Workshop manual of'],
    [/Manuel pour l'atelier\s*\(/gi, 'Workshop manual ('],
    [/Documentation pour l'atelier\s*\(/gi, 'Workshop documentation ('],
    [/Combiné bois/gi, 'Woodworking combination machine'],
    [/combiné bois/gi, 'woodworking combination machine'],
    [/de la marque/gi, 'by'],
    [/de la machine/gi, 'of the machine'],
    [/En téléchargement/gi, ''],
    [/En dès réception du paiement/gi, ''],
    [/dès réception du paiement/gi, ''],
    [/appareil photo(graphique)?\s+(moyen format\s+)?argentique\s+(professionnel\s+)?/gi, (m, _, mf) => mf ? 'professional medium format film camera ' : 'film camera '],
    [/cette documentation vous permettra d'/gi, 'This documentation will allow you to '],
    [/cette documentation vous permettra de /gi, 'This documentation will allow you to '],
    [/le complément indispensable au mode d'emploi pour l'utilisateur passionné/gi, 'The essential complement to the user manual for the passionate user'],
    [/LE MEILLEUR DE TOUS LES TESTS\s*!?/gi, 'THE BEST OF ALL TESTS!'],
    [/Tous les réglages, les conseils et les tests/gi, 'All settings, tips and tests'],
    [/descriptions techniques avec de nombreuses photographies/gi, 'technical descriptions with numerous photographs'],
    [/cet appareil/gi, 'this device'],
    [/ce boîtier et de tous ses accessoires/gi, 'this camera body and all its accessories'],
    [/de ce boîtier/gi, 'of this camera body'],
    [/ce magnétophone/gi, 'this tape recorder'],
    [/cet équipement/gi, 'this equipment'],
    [/cette machine/gi, 'this machine'],
    [/ce quad/gi, 'this ATV'],
    [/ces quads/gi, 'these ATVs'],
    [/Quads\b/gi, 'ATVs'],
  ];

  for (const [pattern, replacement] of replacements) {
    t = t.replace(pattern, replacement);
  }

  // Clean up empty paragraphs and double spaces
  t = t.replace(/<p[^>]*>\s*<\/p>/gi, '');
  t = t.replace(/\s{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

function translateTitle(frTitle) {
  let t = frTitle;
  t = t.replace(/Notice utilisateur\s*/gi, 'User Manual ');
  t = t.replace(/Mode d'emploi\s*/gi, 'User Manual ');
  t = t.replace(/Manuel de service\s*/gi, 'Service Manual ');
  t = t.replace(/Manuel de dépannage\s*/gi, 'Troubleshooting Manual ');
  t = t.replace(/Manuel de réparation\s*/gi, 'Repair Manual ');
  t = t.replace(/Manuel d'atelier\s*/gi, 'Workshop Manual ');
  t = t.replace(/Manuel complet de dépannage/gi, 'Complete Troubleshooting Manual');
  t = t.replace(/Documentation complète/gi, 'Complete Documentation');
  t = t.replace(/Dossier\s*/gi, '');
  t = t.replace(/Éclatés avec listes? des pièces/gi, 'Exploded Views with Parts Lists');
  t = t.replace(/Liste des pièces/gi, 'Parts List');
  t = t.replace(/Catalogue complet des pièces détachées/gi, 'Complete Parts Catalog');
  t = t.replace(/Schéma électronique/gi, 'Electronic Schematic');
  t = t.replace(/Schémas? et câblages? électriques?/gi, 'Electrical Schematics');
  t = t.replace(/Schéma du câblage électrique/gi, 'Wiring Diagram');
  t = t.replace(/Tutoriel de dépannage/gi, 'Troubleshooting Tutorial');
  t = t.replace(/Tutoriel de démontage/gi, 'Disassembly Tutorial');
  t = t.replace(/Combiné bois\s*/gi, '');
  t = t.replace(/Combiné\s*/gi, '');
  t = t.replace(/Tourne disque/gi, 'Turntable');
  t = t.replace(/magnétophones?\s*/gi, 'Tape Recorders ');
  t = t.replace(/enregistreur numérique/gi, 'Digital Recorder');
  t = t.replace(/bloqué/gi, 'Stuck');
  t = t.replace(/qui ne déclenche plus/gi, '- Not Triggering');
  t = t.replace(/Camions/gi, 'Trucks');
  t = t.replace(/–/g, '-');
  t = t.replace(/\s{2,}/g, ' ').trim();
  // Remove trailing brand repetitions like "MAMIYA" at end
  return t;
}

// =====================================================================
// Matching helpers
// =====================================================================
const STOP_WORDS = new Set([
  'de', 'du', 'la', 'le', 'les', 'des', 'un', 'une', 'et', 'en', 'a', 'au',
  'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'ce', 'cette', 'ces',
  'the', 'an', 'and', 'or', 'for', 'in', 'on', 'of', 'to', 'with',
  'manuel', 'manual', 'notice', 'mode', 'emploi', 'service',
  'reparation', 'repair', 'depannage', 'troubleshooting',
  'produit', 'product', 'documentation', 'complete', 'complet',
  'hd', 'bd', 'fr', 'gb', 'pdf', 'dossier',
]);

function tokenize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function matchScore(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const overlap = [...setA].filter(t => setB.has(t)).length;
  return (2 * overlap) / (setA.size + setB.size); // Dice coefficient
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    };
    get(url);
  });
}

async function updatePreview(slug, imgUrl) {
  try {
    const img = await downloadImage(imgUrl);
    const ext = imgUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
    const pp = 'previews/' + slug + '.' + ext;
    await sb.storage.from('logos').upload(pp, img, {
      contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext),
      upsert: true
    });
    const { data } = sb.storage.from('logos').getPublicUrl(pp);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
}

// =====================================================================
// Manual overrides: FR slug → EN slug (for cases auto-matching can't handle)
// =====================================================================
const MANUAL_MAP = {
  // AKAI
  'article-magnetophones-akai-4000-ds-db': 'akai-akai-gx-4000-d-et-db-manuel',
  '4000-db-manuel-de-depannage-akai-copie': null, // will need separate EN doc
  'gx-4000-d-db-manuel-de-depannage-akai': 'akai-gx-4000-d-schematics-complete',
  'akai-gx-625-manuel-de-depannage': 'akai-akai-gx-625-manuel',
  'magnetophone-akai-x-201d-manuel-de-depannage': 'akai-akai-x-201-d-service-manual',

  // BRONICA
  'documentation-complete-du-bronica-zenza-ec': null, // no EN PDF
  'bronica-zenza-s-2-c-manuel-de-reparation': 'zenza-bronica-bronica-s2a-notice-fr',
  'bronica-zenza-etr-etrs-etrsi-notice-mode-demploi': 'zenza-bronica-bronica-etrs',
  'notice-bronica-zenza-s2a-mode-demploi': null, // duplicate
  'bronica-zenzanon-lenses-and-seiko-shutter-repair-manuals': null, // no separate EN

  // CANON
  'canonet-28-manuel-de-reparation-de-la-cellule': 'canon-canonet-28-cuirettes',
  'canonet-28-tutoriel-de-changement-des-cuirettes': 'canon-canon-canonet-28-cellule-v2',
  'depannage-canon-powershot-g6': 'canon-powershot-canon-g6-service-manual',
  'canon-powershot-a410-notice-utilisateur-canon': 'canon-canon-powershot-a410-notice',

  // CONTAX
  'contax139q-bloque-qui-ne-declenche-plus': 'contax-demontage-et-revision-contax-139-quartz',

  // FOCA
  'notice-du-foca-fp2b-pf3': 'foca-pf2b-notice',
  'foca-pf3-notice-mode-demploi': 'foca-pf2b-pf3-notice',

  // GRUNDIG
  'schemas-du-grundig-satellit-1400sl-pro': 'grundig-grundig-1400-sl-pro-schema',
  'mode-demploi-du-grundig-satellit-1400sl-pro': 'grundig-grundig-satellit-1400-sl-pro-notice-fr-hd',

  // HASSELBLAD
  'la-photographie-darchitecture-par-hasselblad': 'hasselbald-archi-hd',
  'photographie-industrielle-par-hasselblad': 'hasselbald-industrie1-hd',
  'photographie-industrielle-par-hasselblad-1975': 'hasselbald-industrie2-hd',
  'la-photographie-au-teleobjectif-par-hasselblad': 'hasselbald-tele-hd',
  'composition-en-format-carre-par-hasselblad': 'hasselbald-formatcarre1-hd',
  'photographie-rapprochee-par-hasselblad': 'hasselbald-macro-hd',
  'loeil-et-la-photo-par-hasselblad': 'hasselbald-oeil-hd',
  'photographie-grand-angulaire-par-hasselblad': 'hasselbald-grand-angulaire-hd',
  'photographie-monochrome-par-hasselblad': 'hasselbald-monochrome-hd',
  'photographie-de-paysage-par-hasselblad': 'hasselbald-paysage-hd',
  'vision-photographique-par-hasselblad': 'hasselbald-vision-hd',
  'la-photographie-denfants-par-hasselblad': 'hasselbald-enfants-hd',
  'hasselblad-500-c-et-cm-manuel-spt-en-francais-de-demontage-et-detalonnage': 'hasselbald-hasselblad-500-c-et-cm-manuel-de-service',
  'depannage-hasselblad-500-c-et-cm-manuel-de-service': 'hasselbald-hasselblad-500-c-et-cm-manuel-de-service',
  'rollei-sl-66-manuel-de-reparation-du-miroir-bloque': 'hasselbald-miroir-et-armement-bloque-sur-rolleiflex-sl66',

  // LEICA
  'leica-r4-mot-bloque-qui-ne-declenche-plus': 'leica-leica-r4s-et-r5-qui-ne-declenche-plus',
  'leica-r4s-bloque-qui-ne-declenche-plus-copie': 'leica-leica-r4s-et-r5-qui-ne-declenche-plus',
  'leica-r4-bloque-qui-ne-declenche-plus-copie-2': 'leica-leica-r4s-et-r5-qui-ne-declenche-plus',
  'leica-r4s2-bloque-qui-ne-declenche-plus-copie-2': 'leica-leica-r4s-et-r5-qui-ne-declenche-plus',
  'leica-r5-bloque-qui-ne-declenche-plus-copie': 'leica-leica-r4s-et-r5-qui-ne-declenche-plus',
  'mode-demploi-du-leica-m6': 'leica-leica-m6-notice',
  'leica-m6-documentation-complete': null, // uses same EN doc
  'mode-demploi-du-leica-m7': 'leica-m7-notice',
  'leica-m2-manuel-de-reparation-leica-m2': 'leica-leica-m2-manuel',
  'manuel-de-reparation-leica-m2': 'leica-leica-m2-manuel',
  'leica-m4-notice-utilisateur-leica': 'leica-leica-m4-notice',
  'leica-m4-p-notice-utilisateur-leica': 'leica-m4p-notice',
  'leica-m8-et-m8-2-notice-utilisateur-leica': 'leica-m8-notice',
  'leica-r3-electronic-documentation-complete': null, // maps to phot-argus

  // MINOLTA
  'minolta-xm-documentation-complete': 'phot-argus-xm-bd',
  'minolta-srt303-documentation-complete': 'phot-argus-srt303-hd',
  'minolta-x700-documentation-complete': 'phot-argus-x700-hd',
  'minolta-xg-1-tutoriel-de-depannage': 'minolta-demontage-et-reparation-minolta-xg1',
  'tutoriel-de-demontage-minolta-miniflex-4x4': 'minolta-demontage-et-reparation-minolta-miniflex',

  // NAGRA
  'mode-demploi-et-schemas-du-nagra-3': 'nagra-nagraiii',
  'mode-demploi-de-lenregistreur-nagra-lb': 'nagra-nagra-ares-lb',
  'nagra-iv-s-owners-manual-nagra': 'nagra-nagra-iv-s-owners-manual',
  'nagra-4-2-notice-utilisateur': 'nagra-4-2-notice-gb-complete',
  'nagra-is-service-manual-nagra': 'nagra-nagra-is-service-manual',

  // NIKON
  'nikon-f-documentation-complete': 'nikon-nikon-f',
  'manuel-de-depannage-du-nikon-d70': 'nikon-nikon-d70-notice',
  'manuels-de-reparation-nikon-f3': 'nikon-service-manual-nikon-f3',
  'manuel-de-reparation-flash-nikon-sb24': 'nikon-nikon-sb-24-repair-manual',
  'nikon-d3x-notice-utilisateur-nikon': 'nikon-d3x-nikon',
  'mode-demploi-nikon-d3': 'nikon-nikon-d3-notice',
  'nikon-d3-manuel-de-reparation-des-boitiers-professionnels': null, // same EN doc
  'manuel-de-reparation-des-nikon-f4-f4s': 'nikon-nikon-f4-assembly-adjustment',
  'nikon-f4-nikon-f4s-documentation-complete': 'nikon-nikon-f4s-notice',
  'tutoriel-de-reparation-du-microscope-nikon-s': 'nikon-the-nikon-model-s-microscope-replacing-the-fine-focus-spur-gear',
  'mode-demploi-nikon-f': null, // same as nikon-f doc
  'tutoriel-de-demontage-nikon-f4': 'nikon-tutoriel-de-demontage-complet-du-nikon-f4',

  // PENTAX
  'documentation-complete-du-pentax-lx': 'phot-argus-lx-hd',
  'pentax-lx-bloque-tutoriel-de-depannage': 'pentax-pentax-lx-bloque',

  // PHOT ARGUS
  'phot-argus-mamiya-rb-67-pros': 'phot-argus-rb67-hd',
  'phot-argus-mamiya-rz-67': 'phot-argus-rz67-hd',
  'phot-argus-rolleiflex-sl-35-e': 'phot-argus-sl35e-hd',
  'phot-argus-pentax-6x7': 'phot-argus-pentax-6x7-hd',
  'phot-argus-leica-m6': 'phot-argus-leica-m6-hd',
  'phot-argus-rolleiflex-sl35': 'phot-argus-sl35-hd',
  'phot-argus-leica-r3-electronic': 'phot-argus-r3-hd',
  'phot-argus-nikon-f': 'phot-argus-nikon-f-hd',
  'phot-argus-rolleiflex-6006': 'phot-argus-6006-hd',
  'phot-argus-pentax-lx': 'phot-argus-lx-hd',
  'phot-argus-nikon-f4s': 'phot-argus-f4s-bd',
  'phot-argus-minolta-srt303': 'phot-argus-srt303-hd',
  'phot-argus-minolta-x700': 'phot-argus-x700-hd',
  'phot-argus-bronica-zenza-ec': 'phot-argus-ec-bd',
  'phot-argus-minolta-xm': 'phot-argus-xm-bd',

  // POLARIS (already fixed)
  'quads-polaris-sportsman-400-et-500-cc': 'polaris-400-500-service-manual-complete',
  'quads-polaris-sportsman-700-800-800x2-efi-manuel-de-service': 'polaris-polaris-700-et-800-efi-service-manual',
  'quads-polaris-sportsman-850-cc-efi-hd-eps': 'polaris-polaris-850-series-service-manual',
  'quads-polaris-sportsman-800-efi': 'polaris-sportsman-800-twin-efi',
  'quads-polaris-sportsman-500-des-pieces-copie': 'polaris-sportsman-500',

  // RENAULT SCENIC 2 (many FR → few EN bundles)
  'climatisation-scenic-2-manuel-de-service-tome-1': 'renault-scenic-2-climatisation-complete',
  'climatisation-scenic-2-manuel-de-service-tome-2': 'renault-scenic-2-climatisation-complete',
  'manuel-datelier-transmission-bm-bva-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-complet-injection-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'generalites-scenic-2-manuel-de-service': 'renault-scenic-2-transmission-complete',
  'etancheite-et-insonorisation-scenic-2-manuel-de-service': 'renault-scenic-2-transmission-complete',
  'chassis-scenic-2-manuel-de-service-tome-1': 'renault-scenic-2-transmission-complete',
  'chassis-scenic-2-manuel-de-service-tome-2': 'renault-scenic-2-transmission-complete',
  'equipement-electrique-scenic-2-manuel-de-service-complet': 'renault-scenic-2-equipement-electrique-complete',
  'equipement-electrique-scenic-2-manuel-de-service-tome-2': 'renault-scenic-2-equipement-electrique-complete',
  'manuel-datelier-boite-de-vitesses-automatique-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-carrosserie-tolerie-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-moteur-et-peripheriques-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-mecanismes-et-accessoires-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-caracteristiques-et-generalites-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'manuel-datelier-introduction-au-diagnostic-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'scenic-3-notice-utilisateur-renault': 'renault-espace-automobile-europeen-scenic-3-notice',

  // REVOX
  'mode-demploi-revox-b77-mk1-mk2': 'studer-revox-revox-b77-mki-mkii-manuel',
  'manuel-de-depannage-revox-b77-mk1-mk2': 'studer-revox-revox-b77-mki-mkii-manuel',
  'manuel-de-depannage-du-revox-pr99-mk1-mk2': 'studer-revox-revox-pr-99-manuel',

  // YAMAHA
  'fzr-1000-yamaha-fazer-catalogue-complet-des-pieces-detachees': 'yamaha-yamaha-1000-fazer-manual',
  'yamaha-xv16al-xv16alc-xv16atl-xv16atlc-manuel-de-service': 'yamaha-yamaha-16-al-alc-atl-atlc-road-star',

  // MENUISERIE - DUGUE
  'combinees-bois-dugue-c260-et-c360': 'menuiserie-combine-dugue-c260-c360',
  'notice-combine-dugue-c360': 'menuiserie-combine-dugue',
  'combine-dugue-c360-schema-du-cablage-electrique': 'menuiserie-dugue-guillet-c360-schema-elec',

  // MENUISERIE - LUREM
  'combine-bois-lurem-c260s2-notice-et-manuel-dentretien': null, // maps to same as C200/210/260
  'combine-bois-lurem-c360-notice-et-manuel-dentretien-copie': 'menuiserie-lurem-c360-c410',
  'combine-bois-lurem-c410n-notice-et-manuel-dentretien-copie-2': 'menuiserie-schemas-lurem-c360n-c410n-c510n',
  'combines-lurem-c360n-c410n-c510n-schemas-et-cablages-electriques': 'menuiserie-schemas-lurem-c360n-c410n-c510n',
  'combine-bois-lurem-c200-210-260-notice-technique': 'menuiserie-lurem-c200-210-260-notice',
  'combine-bois-lurem-c-260-e-notice-technique-copie': 'menuiserie-lurem-c200-210-260-notice',
  'combine-bois-lurem-c-260-n-notice-technique-copie-2': 'menuiserie-lurem-c260n-manual-gb-hd',
  'combine-lurem-c260n-schema-du-cablage-electrique': 'menuiserie-lurem-c260n-manual-gb-hd',
  'combine-bois-lurem-c260n-utilisation-entretien': 'menuiserie-lurem-c260n-manual-gb-hd',
  'woodworker-lurem-c260n-owner-en-service-manual': 'menuiserie-lurem-c260n-manual-gb-hd',
  'combine-lurem-c266-schemas-et-cablages-electriques': 'menuiserie-lurem-c266-manuel',
  'combine-bois-lurem-c266-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c266-manuel',
  'combine-lurem-c310e-c260e-schemas-et-cablages-electriques': 'menuiserie-notice-lurem-c310e-c260e',
  'combines-bois-lurem-c260e-c310e-eclates-avec-listes-des-pieces': 'menuiserie-notice-lurem-c310e-c260e',
  'combine-bois-lurem-c-2100-eclates-avec-listes-des-pieces': 'menuiserie-lurem-c2100-eclate',
  'combine-bois-lurem-c2100-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c2100-eclate',
  'combine-bois-lurem-cb-310-rl-rlx-eclates-avec-listes-des-pieces': 'menuiserie-lurem-cb310rlrlx-eclate',
  'combine-bois-lurem-cb410rlx-eclates-avec-listes-des-pieces': 'menuiserie-lurem-cb410-rlx-eclates',
  'combine-bois-lurem-former-260-sti-eclates-avec-listes-des-pieces-copie-2': 'menuiserie-lurem-former-260s-eclate',
  'combine-bois-lurem-former-310-s-eclates-avec-listes-des-pieces': null, // deactivated
  'combine-bois-lurem-former-310-si-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-former-310-st-eclates-avec-listes-des-pieces': null,
  'combine-lurem-c310-sti-documentation-technique': 'menuiserie-documentation-lurem-former-310-sti',
  'combines-bois-lurem-rd26f-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-maxi26-plus',
  'machine-lurem-router7-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-router-7-manuel-utilisation',
  'lurem-sc25-manuel-dutilisation-et-dentretien-copie': 'menuiserie-lurem-sc25',
  'lurem-t30n-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-t30n',
  'combine-bois-lurem-c2000-et-c2100-notice-et-manuel-dentretien': 'menuiserie-lurem-c2000',

  // Products without PDFs (won't create)
  'pulverisateur-moto-fruidor-tracte-notice-et-listing-des-pieces': null,
  'lave-vaisselle-dw100w-ikea-whirlpool-manuel-de-depannage': null,
  'lave-vaisselle-dw100w-ikea-whirlpool-notice-dutilisation': null,
  'audi-tt-coupe-v-1-manuel-complet-de-depannage-electrique-electronique': null,
  'kyoritsu-ef-8000-notice-dutilisation-et-dentretien': null,
  'reparer-soi-meme-son-televiseur-a-ecran-plat-toutes-marques-et-modeles': null,
  'reparer-soi-meme-son-ecran-plat-dordinateur': null,
  'changer-batterie-apple-iphone-x': null,
  'rx-650-pro-conti-catalogue-complet-des-pieces-detachees': null,
  'manuel-de-service-ak-47-kalachnikov': null, // no weapons section
};

async function main() {
  const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));

  // Get ALL EN docs
  const { data: allEnDocs } = await sb.from('documents')
    .select('id, slug, title, description, price, active, preview_url, brand_id, category_id, file_path, brands(name)')
    .order('slug');

  const enBySlug = {};
  allEnDocs.forEach(d => { enBySlug[d.slug] = d; });

  // Phase 1: Map each FR product to an EN doc
  console.log('=== PHASE 1: Mapping FR → EN ===\n');

  const mapping = []; // { frProduct, enSlug, method }
  const frUsed = new Set();
  const enUsed = new Set();
  const noMatch = [];

  for (const fr of frProducts) {
    // 1. Check manual map
    if (MANUAL_MAP.hasOwnProperty(fr.slug)) {
      const enSlug = MANUAL_MAP[fr.slug];
      if (enSlug === null) {
        mapping.push({ fr, enSlug: null, method: 'manual-skip' });
      } else {
        mapping.push({ fr, enSlug, method: 'manual' });
        enUsed.add(enSlug);
      }
      frUsed.add(fr.slug);
      continue;
    }

    // 2. Token matching
    const frTokens = tokenize(fr.title + ' ' + fr.slug);
    let bestMatch = null;
    let bestScore = 0;

    for (const en of allEnDocs) {
      if (enUsed.has(en.slug)) continue;
      const enTokens = tokenize(en.title + ' ' + en.slug);
      const score = matchScore(frTokens, enTokens);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = en;
      }
    }

    if (bestScore >= 0.30 && bestMatch) {
      mapping.push({ fr, enSlug: bestMatch.slug, method: 'auto', score: bestScore });
      enUsed.add(bestMatch.slug);
    } else {
      mapping.push({ fr, enSlug: null, method: 'no-match', bestScore, bestSlug: bestMatch?.slug });
    }
    frUsed.add(fr.slug);
  }

  // Count results
  const matched = mapping.filter(m => m.enSlug);
  const skipped = mapping.filter(m => m.method === 'manual-skip');
  const unmatched = mapping.filter(m => m.method === 'no-match');

  console.log(`Matched: ${matched.length}`);
  console.log(`Skipped (no PDF): ${skipped.length}`);
  console.log(`Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\n--- UNMATCHED FR PRODUCTS ---');
    for (const m of unmatched) {
      console.log(`  ${m.fr.title}`);
      console.log(`    FR: ${m.fr.slug}`);
      console.log(`    Best: ${m.bestSlug} (score ${m.bestScore?.toFixed(2)})`);
    }
  }

  // EN docs not matched to any FR product
  const orphanEn = allEnDocs.filter(d => !enUsed.has(d.slug) && d.active);
  console.log(`\nOrphan EN docs (active, no FR match): ${orphanEn.length}`);

  // Phase 2: Update matched EN docs
  console.log('\n=== PHASE 2: Updating matched EN docs ===\n');

  let updated = 0;
  let reactivated = 0;
  let previewsUpdated = 0;

  for (const m of matched) {
    const en = enBySlug[m.enSlug];
    if (!en) {
      console.log(`  ⚠ EN doc not found: ${m.enSlug}`);
      continue;
    }

    const translatedTitle = translateTitle(m.fr.title);
    const translatedDesc = translateHtml(m.fr.longDesc || '');
    const frPrice = m.fr.price * 100; // EUR to cents

    const updates = {};
    let changed = false;

    // Update title if different
    if (en.title !== translatedTitle) {
      updates.title = translatedTitle;
      changed = true;
    }

    // Update description
    if (translatedDesc && en.description !== translatedDesc) {
      updates.description = translatedDesc;
      changed = true;
    }

    // Update price
    if (en.price !== frPrice) {
      updates.price = frPrice;
      changed = true;
    }

    // Reactivate if needed
    if (!en.active) {
      updates.active = true;
      reactivated++;
      changed = true;
    }

    // Update preview image from FR
    if (m.fr.image) {
      const newPreview = await updatePreview(en.slug, m.fr.image);
      if (newPreview && newPreview !== en.preview_url) {
        updates.preview_url = newPreview;
        previewsUpdated++;
        changed = true;
      }
    }

    if (changed) {
      const { error } = await sb.from('documents').update(updates).eq('id', en.id);
      if (error) {
        console.log(`  ✗ ${en.slug}: ${error.message}`);
      } else {
        updated++;
        if (updated % 20 === 0) console.log(`  ... ${updated} updated`);
      }
    }
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Reactivated: ${reactivated}`);
  console.log(`Previews updated: ${previewsUpdated}`);

  // Phase 3: Deactivate orphan EN docs
  console.log('\n=== PHASE 3: Deactivating orphan EN docs ===\n');

  let deactivated = 0;
  for (const en of orphanEn) {
    const { error } = await sb.from('documents').update({ active: false }).eq('id', en.id);
    if (!error) {
      console.log(`  ❌ ${en.slug} (${en.title})`);
      deactivated++;
    }
  }
  console.log(`\nDeactivated: ${deactivated}`);

  // Phase 4: Update brand counts
  console.log('\n=== PHASE 4: Updating brand counts ===\n');
  const { data: brands } = await sb.from('brands').select('id, name, document_count');
  let brandsUpdated = 0;
  for (const b of brands) {
    const { count } = await sb.from('documents').select('id', { count: 'exact', head: true })
      .eq('brand_id', b.id).eq('active', true);
    if (count !== b.document_count) {
      await sb.from('brands').update({ document_count: count }).eq('id', b.id);
      console.log(`  ${b.name}: ${b.document_count} → ${count}`);
      brandsUpdated++;
    }
  }

  const { count: total } = await sb.from('documents').select('id', { count: 'exact', head: true }).eq('active', true);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  FR products: ${frProducts.length}`);
  console.log(`  EN active docs: ${total}`);
  console.log(`  Gap: ${frProducts.length - total}`);
  console.log(`  (Gap = FR products without available PDFs)`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Reactivated: ${reactivated}`);
  console.log(`  Deactivated: ${deactivated}`);
  console.log(`  Brands updated: ${brandsUpdated}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(console.error);
