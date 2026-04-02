/**
 * Fix descriptions v2: Uses the MANUAL_MAP from full-sync-v2.js (FR→EN)
 * to find the correct FR product for each EN doc, then generates proper English descriptions.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));
const frBySlug = {};
frProducts.forEach(p => { frBySlug[p.slug] = p; });

// =====================================================================
// MANUAL_MAP: FR slug → EN slug (copied from full-sync-v2.js)
// =====================================================================
const FR_TO_EN = {
  // AKAI
  'article-magnetophones-akai-4000-ds-db': 'akai-akai-gx-4000-d-et-db-manuel',
  '4000-db-manuel-de-depannage-akai-copie': null,
  'gx-4000-d-db-manuel-de-depannage-akai': 'akai-gx-4000-d-schematics-complete',
  'manuel-de-reparation-du-akai-gx625': 'akai-akai-gx-625-manuel',
  'manuel-de-depannage-akai-x201d': 'akai-akai-x-201-d-service-manual',
  'manuel-de-depannage-akai-4000-ds-mk2': 'akai-akai-4000ds-mk2-service-manual',
  'manuel-de-depannage-magnetophone-akai-gx77': 'akai-akai-gx77-service-manual',
  'livret-de-maintenance-magnetophone-akai-gx635d': 'akai-akai-gx635d-service-manual',
  'manuel-de-depannage-magnetophone-akai-gx646': 'akai-akai-gx646-service-manual',
  'manuel-de-depannage-akai-gx747': 'akai-akai-gx747-service-manual',

  // BRONICA
  'documentation-complete-du-bronica-zenza-ec': null,
  'bronica-zenza-s-2-c-manuel-de-reparation': 'zenza-bronica-bronica-s2a-notice-fr',
  'bronica-zenza-etr-etrs-etrsi-notice-mode-demploi': 'zenza-bronica-bronica-etrs',
  'notice-bronica-zenza-s2a-mode-demploi': null,
  'bronica-zenzanon-lenses-and-seiko-shutter-repair-manuals': null,
  'bronica-etrsi-manuel-de-reparation': 'zenza-bronica-bronica-etrsi-repair',

  // CANON
  'canonet-28-manuel-de-reparation-de-la-cellule': 'canon-canonet-28-cuirettes',
  'canonet-28-tutoriel-de-changement-des-cuirettes': 'canon-canon-canonet-28-cellule-v2',
  'depannage-canon-powershot-g6': 'canon-powershot-canon-g6-service-manual',
  'canon-powershot-a410-notice-utilisateur-canon': 'canon-canon-powershot-a410-notice',
  'reparation-objectif-canon-ef-17-85-is-usm': 'canon-canon-ef-17-85-is-usm',
  'reparation-objectif-canon-ef-24-70-l-usm': 'canon-canon-ef-24-70-l-usm',
  'reparation-objectif-canon-ef-24-105-f4-l-is-usm': 'canon-canon-ef-24-105-f4-l-is-usm',
  'canonflex-rp-tutoriel-de-reparation': 'canon-canonflex-rp-repair',

  // CONTAX
  'contax139q-bloque-qui-ne-declenche-plus': 'contax-demontage-et-revision-contax-139-quartz',

  // FOCA
  'notice-du-foca-fp2b-pf3': 'foca-pf2b-notice',
  'foca-pf3-notice-mode-demploi': 'foca-pf2b-pf3-notice',
  'notice-du-foca-universel-e1': 'foca-foca-universel-e1-notice',
  'manuel-de-reparation-du-foca-universel-rc': 'foca-foca-universel-rc-repair',
  'manuel-dentretien-et-de-reparation-des-focaflex': 'foca-focaflex-repair',

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
  'leica-m6-documentation-complete': null,
  'mode-demploi-du-leica-m7': 'leica-m7-notice',
  'manuel-de-reparation-leica-m2': 'leica-leica-m2-manuel',
  'leica-m4-notice-utilisateur-leica': 'leica-leica-m4-notice',
  'leica-m4-p-notice-utilisateur-leica': 'leica-m4p-notice',
  'leica-m5-notice-utilisateur-leica': 'leica-leica-m5-notice',
  'leica-m8-et-m8-2-notice-utilisateur-leica': 'leica-m8-notice',
  'leica-r3-electronic-documentation-complete': null,
  'mode-demploi-du-leica-m3': 'leica-leica-m3-notice',

  // MINOLTA
  'minolta-xm-documentation-complete': 'phot-argus-xm-bd',
  'minolta-srt303-documentation-complete': 'phot-argus-srt303-hd',
  'minolta-x700-documentation-complete': 'phot-argus-x700-hd',
  'minolta-xg-1-tutoriel-de-depannage': 'minolta-demontage-et-reparation-minolta-xg1',
  'tutoriel-de-demontage-minolta-miniflex-4x4': 'minolta-demontage-et-reparation-minolta-miniflex',
  'demontage-et-revision-du-minolta-cle': 'minolta-minolta-cle-repair',
  'comment-reparer-son-minolta-tc-1': 'minolta-minolta-tc1-repair',

  // NAGRA
  'mode-demploi-et-schemas-du-nagra-3': 'nagra-nagraiii',
  'mode-demploi-de-lenregistreur-nagra-lb': 'nagra-nagra-ares-lb',
  'nagra-is-service-manual-nagra': 'nagra-nagra-is-service-manual',
  'mode-demploi-magnetophone-nagra-4': 'nagra-nagra-iv-s-owners-manual',

  // NIKON
  'nikon-f-documentation-complete': 'nikon-nikon-f',
  'manuel-de-depannage-du-nikon-d70': 'nikon-nikon-d70-notice',
  'manuels-de-reparation-nikon-f3': 'nikon-service-manual-nikon-f3',
  'manuel-de-reparation-flash-nikon-sb24': 'nikon-nikon-sb-24-repair-manual',
  'nikon-d3x-notice-utilisateur-nikon': 'nikon-d3x-nikon',
  'mode-demploi-nikon-d3': 'nikon-nikon-d3-notice',
  'nikon-d3-manuel-de-reparation-des-boitiers-professionnels': null,
  'manuel-de-reparation-des-nikon-f4-f4s': 'nikon-nikon-f4-assembly-adjustment',
  'nikon-f4-nikon-f4s-documentation-complete': 'nikon-nikon-f4s-notice',
  'tutoriel-de-reparation-du-microscope-nikon-s': 'nikon-the-nikon-model-s-microscope-replacing-the-fine-focus-spur-gear',
  'mode-demploi-nikon-f': null,
  'tutoriel-de-demontage-complet-nikon-f4-en-francais': 'nikon-tutoriel-de-demontage-complet-du-nikon-f4',
  'mode-demploi-nikon-d200': 'nikon-nikon-d200-notice',
  'mode-demploi-nikon-d100': 'nikon-nikon-d100-notice',
  'mode-demploi-nikon-d80': 'nikon-nikon-d80-notice',
  'mode-demploi-nikon-d70': 'nikon-nikon-d70-user-notice',
  'mode-demploi-nikon-d2x': 'nikon-nikon-d2x-notice',
  'mode-demploi-nikon-d1': 'nikon-nikon-d1-notice',
  'mode-demploi-nikon-f2': 'nikon-nikon-f2-notice',
  'mode-demploi-nikon-f5': 'nikon-nikon-f5-notice',
  'mode-demploi-nikon-fe': 'nikon-nikon-fe-notice',
  'manuels-de-reparation-nikkormat-ftn': 'nikon-nikkormat-ftn-repair',
  'manuel-de-depannage-nikon-d700': 'nikon-nikon-d700-service',
  'mode-demploi-nikon-d300': 'nikon-nikon-d300-notice',
  'nikon-fe-manuel-de-reparation-du-miroir-bloque': 'nikon-nikon-fe-mirror-repair',
  'nikon-af-s-nikkor-400mm-f-2-8d-ed-ii-if-manuel-de-depannage': 'nikon-nikkor-400mm-service',
  'nikon-af-s-vr-nikkor-105mm-f-2-8g-manuel-de-depannage': 'nikon-nikkor-105mm-service',
  'zoom-nikkor-af-24-50mm-f-3-3-4-5-manuel-de-reparation': 'nikon-nikkor-24-50mm-repair',
  'nikon-35-ti-manuel-de-reparation-nikon': 'nikon-nikon-35ti-repair',
  'nikkor-24mm-f2-ais-manuel-de-depannage': 'nikon-nikkor-24mm-f2-ais',
  'tutoriel-de-demontage-complet-nikonos-iii-en-francais': 'nikon-nikonos-iii-disassembly',
  'manuel-de-depannage-du-nikon-d70s': 'nikon-nikon-d70s-service',

  // PENTAX
  'documentation-complete-du-pentax-lx': 'phot-argus-lx-hd',
  'pentax-lx-bloque-tutoriel-de-depannage': 'pentax-pentax-lx-bloque',
  'asahi-pentax-6x7-documentation-complete': 'phot-argus-pentax-6x7-hd',
  'pentax-p30-declenche-plus': 'pentax-pentax-p30-repair',
  'miroir-bloque-sur-pentax-6x7-67-tutoriel-de-depannage': 'pentax-pentax-6x7-mirror',
  'pentacon-six-tl-manuel-de-reparation': 'pentax-pentacon-six-tl-repair',

  // PHOT ARGUS (FR dossier → EN phot-argus)
  'rolleiflex-6006-documentation-complete': 'phot-argus-6006-hd',
  'rolleiflex-sl-35e-documentation-complete': 'phot-argus-sl35e-hd',
  'rolleiflex-sl35-documentation-complete': 'phot-argus-sl35-hd',
  'leica-r6-documentation-complete': 'phot-argus-r6-hd',

  // POLARIS
  'quads-polaris-sportsman-400-et-500-cc': 'polaris-400-500-service-manual-complete',
  'quads-polaris-sportsman-700-800-800x2-efi-manuel-de-service': 'polaris-polaris-700-et-800-efi-service-manual',
  'quads-polaris-sportsman-850-cc-efi-hd-eps': 'polaris-polaris-850-series-service-manual',
  'quads-polaris-sportsman-800-efi': 'polaris-sportsman-800-twin-efi',
  'quads-polaris-sportsman-500-des-pieces-copie': 'polaris-sportsman-500',

  // RENAULT SCENIC 2
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
  'garnissage-et-sellerie-scenic-2-manuel-de-service': 'renault-scenic-2-transmission-complete',

  // REVOX / STUDER
  'mode-demploi-revox-b77-mk1-mk2': 'studer-revox-revox-b77-mki-mkii-manuel',
  'manuel-de-depannage-revox-b77-mk1-mk2': 'studer-revox-revox-b77-mki-mkii-manuel',
  'manuel-de-depannage-du-revox-pr99-mk1-mk2': 'studer-revox-revox-pr-99-manuel',
  'mode-demploi-du-revox-b710-mk2': 'studer-revox-revox-b710-mkii',

  // YAMAHA
  'fzr-1000-yamaha-fazer-catalogue-complet-des-pieces-detachees': 'yamaha-yamaha-1000-fazer-manual',
  'yamaha-xv16al-xv16alc-xv16atl-xv16atlc-manuel-de-service': 'yamaha-yamaha-16-al-alc-atl-atlc-road-star',
  'dt-125-mx-yamaha-revue-moto-technique': 'yamaha-yamaha-dt125-mx',
  'ds7-rd250-r5c-rd350-yamaha-manuel-de-service': 'yamaha-yamaha-ds7-rd250-r5c-rd350',
  'manuel-datelier-yamaha-virago-xv535': 'yamaha-yamaha-virago-xv535',

  // MENUISERIE - DUGUE
  'combinees-bois-dugue-c260-et-c360': 'menuiserie-combine-dugue-c260-c360',
  'notice-combine-dugue-c360': 'menuiserie-combine-dugue',
  'combine-dugue-c360-schema-du-cablage-electrique': 'menuiserie-dugue-guillet-c360-schema-elec',
  'combine-dugue-c210e-c260e-c360es-notice-et-manuel-dentretien': 'menuiserie-dugue-c210e-c260e-c360es',
  'combines-dugue-castor-200-250-410-520-notice-et-manuel-dentretien': 'menuiserie-dugue-castor',

  // MENUISERIE - LUREM
  'combine-bois-lurem-c260s2-notice-et-manuel-dentretien': null,
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
  'combine-bois-lurem-former-260s-eclates-avec-listes-des-pieces': 'menuiserie-lurem-former-260s-eclate',
  'combine-bois-lurem-former-310-s-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-former-310-si-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-former-310-st-eclates-avec-listes-des-pieces': null,
  'combine-lurem-c310-sti-documentation-technique': 'menuiserie-documentation-lurem-former-310-sti',
  'combines-bois-lurem-rd26f-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-maxi26-plus',
  'combine-bois-lurem-maxi-26-plus-notice-technique': 'menuiserie-lurem-maxi26-plus',
  'machine-lurem-router7-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-router-7-manuel-utilisation',
  'lurem-sc25-manuel-dutilisation-et-dentretien-copie': 'menuiserie-lurem-sc25',
  'lurem-t30n-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-t30n',
  'combine-bois-lurem-c2000-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c2000',
  'combine-bois-lurem-cb-310-sl-eclates-avec-listes-des-pieces': 'menuiserie-lurem-cb310sl-eclates',
  'combine-bois-lurem-former-260-si-eclates-avec-listes-des-pieces-copie': 'menuiserie-lurem-former-260si-eclates',
  'combine-bois-lurem-c310si-notice-utilisateur': 'menuiserie-lurem-c310si-user-manual',
  'combine-bois-lurem-c210b-manuel-de-service': 'menuiserie-lurem-c210b',
  'combine-bois-lurem-c20-notice-technique-copie': 'menuiserie-lurem-c20',
  'combine-bois-lurem-c-2600-notice-technique': 'menuiserie-lurem-c2600',
  'combine-lurem-c263-schemas-et-cablages-electriques-copie': 'menuiserie-lurem-c263-schema',
  'combine-lurem-c265-schemas-et-cablages-electriques-copie-2': 'menuiserie-lurem-c265-schema',
  'combine-lurem-c310i-schemas-et-cablages-electriques': 'menuiserie-lurem-c310i-schema',
  'combine-lurem-c310si-schemas-et-cablages-electriques': 'menuiserie-lurem-c310si-schema',
  'combine-lurem-c310sti-schemas-et-cablages-electriques': 'menuiserie-lurem-c310sti-schema',
  'combine-lurem-c310sx-schemas-et-cablages-electriques': 'menuiserie-lurem-c310sx-schema',
  'combine-lurem-c311-schemas-et-cablages-electriques': 'menuiserie-lurem-c311-schema',
  'combine-lurem-c315-schemas-et-cablages-electriques': 'menuiserie-lurem-c315-schema',
  'combine-lurem-c317-schemas-et-cablages-electriques': 'menuiserie-lurem-c317-schema',
  'combine-lurem-c260n-schema-du-cablage-electrique': 'menuiserie-lurem-c260n-schema',
  'combine-bois-lurem-c260j-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c260j',
  'combine-bois-lurem-c7-compact7-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c7-compact7',
  'combine-bois-lurem-c36-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-c36',
  'combine-bois-lurem-cb310hz-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-cb310hz',
  'combine-bois-lurem-cb310sl-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-cb310sl-notice',
  'combine-bois-lurem-cb410rlx-eclates-avec-listes-des-pieces': 'menuiserie-lurem-cb410-rlx-eclates',
  'combine-bois-lurem-former-310-s-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-former-310-si-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-former-310-st-eclates-avec-listes-des-pieces': null,
  'combine-bois-lurem-mf260l-cb260tl-manuel-utilisation-et-entretien': 'menuiserie-lurem-mf260l-cb260tl',
  'combine-bois-lurem-optal-26-st-eclates-avec-listes-des-pieces-copie': 'menuiserie-lurem-optal-26',
  'combine-bois-lurem-rd41e-eclates-avec-listes-des-pieces': 'menuiserie-lurem-rd41e',
  'combine-bois-lurem-t180-eclates-avec-listes-des-pieces': 'menuiserie-lurem-t180',
  'combine-bois-lurem-tb1250-eclates-avec-listes-des-pieces': 'menuiserie-lurem-tb1250',
  'lurem-sar400-manuel-dutilisation-et-dentretien': 'menuiserie-lurem-sar400',
  'combine-bois-lurem-c2000-et-c2100-notice-et-manuel-dentretien': 'menuiserie-lurem-c2000',

  // MISC
  'aeropolisseur-air-flow-handy-2-notice-utilisateur': 'ems-air-flow-handy-2-plus-user-manual',
  'electrophone-teppaz-transit-schema-electronique': 'teppaz-transit-electronic-schematic',
  'newgy-robo-pong-type-2040-1040-et-540-notice-utilisateur': 'newgy-robo-pong-2040-1040-540-user-manual',
  'newgy-robo-pong-type-1000-et-1929-manuel-de-reparation': 'newgy-robo-pong-1000-1929-repair',
  'notice-distributeur-automatique-de-nourriture-pour-chiens-et-chats': 'auto-pet-feeder-user-manual',
  'manuel-datelier-des-camions-simca-f594wml-f569wml': 'simca-f594wml-f569wml-service-manual',
  'decollage-et-recollage-dun-doublet-optique-dobjectif-photo': 'reparation-decollage-doublet-optique',
  'singer-401g-notice-utilisateur': 'singer-singer-401g',
  'rta-lotus-elan-m-100-manuel-de-service': 'lotus-elan-m100-service-manual-v2',
  'schema-et-conseils-de-reparation-pour-les-cartes-vestel-17ips62-17ips6-1-17ips6-2-17ips6-3-17pw06-2-17pw25-4-17ips19-5-17ips19-5p': 'television-comment-reparer-une-alimentation-a-decoupage',
  'mode-demploi-du-four-de-dietrich-dop460': 'de-dietrich-de-dietrich-dop460-notice',
  'notice-yaesu-ft-757gxii-en-francais': 'yaesu-yaesu-ft-757gxii-notice',
  'manuel-de-depannage-du-yaesu-ft-757gx': 'yaesu-yaesu-ft-757gx-service',
  'aspirateur-air-force-extreme-rowenta-notice-utilisateur': 'rowenta-rowenta-air-force-extreme',
  'notice-hubsan-h501s-pro-fpv-mode-demploi': 'hubsan-hubsan-h501s-notice',
  'mode-demploi-amplis-pioneer-a209r-a307r': 'pioneer-pioneer-a209r-a307r-notice',
  'mode-demploi-fuji-hd-r': 'fuji-fuji-hdr-notice',
  'notice-projecteur-heurtier-p6-24b': 'heurtier-heurtier-p6-24b-notice',
  'mode-demploi-citroen-xsara-picasso': 'citroen-xsara-picasso-notice',
  'rta-volkswagen-coccinelle': 'volkswagen-coccinelle-rta',
  'manuel-datelier-4x4-suzuki-samourai-1986-1988': 'suzuki-suzuki-samourai-service',
  'manuel-hameg-hm8030': 'hameg-hameg-hm8030',
  'manuel-hameg-hm8030-2': 'hameg-hameg-hm8030-2',
  'mode-demploi-hameg-hm8030-6': 'hameg-hameg-hm8030-6',
  'mode-demploi-kavo-k9-4953-ewl': 'kavo-kavo-k9-4953-ewl',
  'notice-talkie-walkie-midland-g6-mode-demploi': 'midland-midland-g6-notice',
  'sony-kdl-55x4500-manuel-de-service-du-televiseur': 'sony-sony-kdl-55x4500-service',
  'samsung-gt-b2100-manuel-de-reparation': 'samsung-samsung-gt-b2100-repair',
  'notice-kaiser-cpd-4214': 'kaiser-kaiser-cpd-4214-notice',
  'notice-en-francais-panasonic-toughbook-cf-c2': 'panasonic-toughbook-cf-c2-notice',
  'moteur-1hd-ft-manuel-de-service-toyota': 'toyota-toyota-1hd-ft-service',
  'moteurs-marins-penta-volvo-d2-54-et-d2-75-manuel-utilisateur': 'volvo-penta-d2-54-d2-75-notice',
  'manuel-utilisateur-toyota-serie-6-hj60-hj61-fj60-fj62': 'toyota-toyota-serie-6-notice',
  'manuel-datelier-boite-de-vitesses-automatique-du-renault-scenic-2': 'renault-scenic-2-transmission-complete',
  'mini-cooper-1976-a-1989-manuel-de-service-rover': 'mini-cooper-rover-mini-repair-manual-76-89-gb',
  'conversion-cellule-dun-appareil-photo-pour-remplacer-les-piles-au-mercure': 'reparation-conversion-cellule',
  'remplacement-joints-photos': 'reparation-remplacement-joints',
  'maintenance-et-reparation-des-flashs-photographiques': 'flash-flash-repair-maintenance',
  'depannage-thermostat-noirot-airelec-acova': 'noirot-thermostat-repair',
  'restauration-des-freins-dune-adria-prima-350-td-de-1989': 'adria-adria-prima-350-freins',
  'kodak-carousel-projecteur-de-diapositives-manuel-de-service': 'kodak-kodak-carousel-service',
  'notice-tour-emco-unimat-mode-demploi': 'machines-outil-emco-unimat-notice',
  'notice-tour-emco-compact-8-mode-demploi': 'machines-outil-emco-compact-8-notice',
  'notice-tour-emco-compact-5-mode-demploi': 'machines-outil-compact5-bed-fr',
  'notice-tour-emco-unimat-basic-pieces': 'machines-outil-emco-unimat-basic-pieces',
  'tour-metal-habegger-tdle': 'machines-outil-habegger-tdle',
  'notice-tour-opti-d180-x-300-vario-mode-demploi': 'machines-outil-opti-d180-notice',
  'le-tournage-des-metaux-chevalier-jolys': 'machines-outil-tournage-metaux-chevalier',
  'le-tournage-des-metaux': 'machines-outil-tournage-metaux',
  'zenit-fs12-fotosnaiper-notice-utilisateur-zenit-fs12': 'zenit-zenit-fs12-notice',
  'kodak-retina-reflex-manuel-de-reparation-complet': 'kodak-kodak-retina-reflex-repair',
  'kodak-brownie-flash-camera-manuel-de-reparation-complet': 'kodak-kodak-brownie-flash-repair',
  'zorki-4-manuel-de-reparation': 'zorki-zorki-4-repair',
  'rollei-35-led-manuel-de-reparation-complet': 'rollei-rollei-35-led-repair',
  'rolleiflex-t-manuel-de-reparation-original-du-technicien': 'rollei-rolleiflex-t-repair',
  'rolleiflex-2-8f-manuel-de-reparation-rolleiflex-2-8f-en-francais': 'rollei-rolleiflex-28f-repair',
  'rolleiflex-sl-66-manuel-de-reparation-de-la-mise-au-point': 'rollei-rolleiflex-sl66-focus-repair',
  'tutoriel-de-reparation-yashica-mat-124-et-124g': 'yashica-yashica-mat-124-repair',
  'tutoriel-de-demontage-seagull-4': 'seagull-seagull-4-repair',
  'tutoriel-de-demontage-minox-c-et-autres': 'minox-minox-c-disassembly',
  'olympus-pen-f-pen-ft-et-pen-fv-manuel-de-demontage-en-francais': 'olympus-olympus-pen-f-disassembly',
  'fuji-gw-690iii-gsw-690iii-manuel-de-reparation': 'fuji-fuji-gw690iii-repair',
  'disassembly-charts-wollensak-rapax-shutters': 'wollensak-wollensak-rapax-disassembly',
  'manuel-de-depannage-des-tronconneuses-stihl-ms290-310-390': 'stihl-stihl-ms290-310-390-service',
  'stihl-ms201t-notice-utilisateur-tronconneuses-stihl': 'stihl-stihl-ms201t-notice',
  'stihl-017-018-notice-utilisateur-tronconneuses': 'stihl-stihl-017-018-notice',
  'stihl-ms192t-notice-utilisateur-tronconneuse': 'stihl-stihl-ms192t-notice',
  'manuel-de-depannage-des-uher-report-monitor': 'uher-uher-report-monitor-service',
  'all-you-need-to-know-about-repair-of-russian-cameras': 'books-russian-cameras-repair',
  'antique-trader-cameras-and-photographica-price-guide': 'books-antique-trader-cameras',
  'appareils-photo-russes-et-sovietiques-de-1840-a-1991': 'books-russian-cameras-1840-1991',
  'mckeowns-price-guide-to-antique-and-classic-cameras-2001-2002': 'books-mckeowns-price-guide',
  'classic-cameras-by-colin-harding': 'books-classic-cameras-harding',
  'restoring-classic-collectible-cameras-by-thomas-tomosy': 'books-restoring-cameras-tomosy',
  'camera-maintenance-repair-by-thomas-tomosy': 'books-camera-maintenance-tomosy',
  'notice-sony-hdr-fx7': 'sony-sony-hdr-fx7-notice',
  'manuel-datelier-quads-bombardier-outlander-brp-400-a-800-cc': 'bombardier-bombardier-outlander-service',

  // Products without PDFs
  'pulverisateur-moto-fruidor-tracte-notice-et-listing-des-pieces': null,
  'lave-vaisselle-dw100w-ikea-whirlpool-manuel-de-depannage': null,
  'lave-vaisselle-dw100w-ikea-whirlpool-notice-dutilisation': null,
  'audi-tt-coupe-v-1-manuel-complet-de-depannage-electrique-electronique': null,
  'kyoritsu-ef-8000-notice-dutilisation-et-dentretien': null,
  'reparer-soi-meme-son-televiseur-a-ecran-plat-toutes-marques-et-modeles': null,
  'reparer-soi-meme-son-ecran-plat-dordinateur': null,
  'changer-batterie-apple-iphone-x': null,
  'rx-650-pro-conti-catalogue-complet-des-pieces-detachees': null,
  'manuel-de-service-ak-47-kalachnikov': null,
  'hasselblad-et-la-photographie-aerienne': null,
  'les-animaux-dans-la-nature-par-hasselblad': null,
  'du-crepuscule-a-laube-par-hasselblad': null,
  'photographie-portrait-par-hasselblad': null,
  'photographie-de-reportage-par-hasselblad': null,
  'la-photographie-de-sport-par-hasselblad': null,
};

/**
 * Generate clean English description from FR longDesc and title
 */
function generateEnglishDesc(frLongDesc, frTitle) {
  if (!frLongDesc) return null;

  const text = frLongDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract page count
  const pageMatch = text.match(/(\d+)\s*pages?/i);
  const pages = pageMatch ? pageMatch[1] : null;

  // Extract brand/model from title - remove all French doc type suffixes
  let brandModel = frTitle
    .replace(/^Dossier\s*/i, '')
    .replace(/^Combiné bois\s*/i, '')
    .replace(/^Combiné\s*/i, '')
    .replace(/^Combinés bois\s*/i, '')
    .replace(/^Combinés\s*/i, '')
    .replace(/^Quads\s*/i, '')
    .replace(/^Camions\s*/i, '')
    .replace(/\s*[-–]\s*(Manuel|Notice|Mode|Documentation|Sch[eé]ma|Tutoriel|[EÉ]clat[eé]s|Liste|Catalogue|Revue|Article|Livret|R[eé]paration|D[eé]pannage|Cours).*$/i, '')
    .replace(/\s+(Manuel|Notice|Mode d'emploi|Documentation|Sch[eé]ma|Tutoriel|Catalogue|Revue|Article|Livret)\s+.*/i, '')
    .replace(/\s*(Notice|Manuel|Mode d'emploi)\s*(utilisateur|d'utilisation)?\s*$/i, '')
    .replace(/\s*Documentation compl[eè]te\s*$/i, '')
    .trim();

  // Determine document type
  let docType = 'Documentation';
  if (/manuel\s*(d['']atelier|de\s*service)/i.test(text + frTitle)) docType = 'Complete workshop manual';
  else if (/manuel\s*(complet\s*)?de\s*d[eé]pannage/i.test(text + frTitle)) docType = 'Troubleshooting manual';
  else if (/manuel\s*de\s*r[eé]paration/i.test(text + frTitle)) docType = 'Repair manual';
  else if (/livret\s*de\s*(d[eé]pannage|maintenance)/i.test(text + frTitle)) docType = 'Maintenance manual';
  else if (/revue\s*moto\s*technique/i.test(text + frTitle)) docType = 'Workshop manual (Revue Moto Technique)';
  else if (/notice|mode\s*d['']emploi/i.test(text + frTitle)) docType = 'User manual';
  else if (/tutoriel\s*de\s*d[eé]pannage/i.test(text + frTitle)) docType = 'Troubleshooting tutorial';
  else if (/tutoriel\s*de\s*d[eé]montage/i.test(text + frTitle)) docType = 'Disassembly tutorial';
  else if (/tutoriel\s*de\s*r[eé]paration/i.test(text + frTitle)) docType = 'Repair tutorial';
  else if (/[eé]clat[eé]s?\s*(avec)?\s*listes?\s*des?\s*pi[eè]ces/i.test(text + frTitle)) docType = 'Exploded views with parts lists';
  else if (/liste\s*des?\s*pi[eè]ces|catalogue.*pi[eè]ces/i.test(text + frTitle)) docType = 'Parts catalog';
  else if (/sch[eé]ma.*[eé]lectronique/i.test(text + frTitle)) docType = 'Electronic schematic';
  else if (/sch[eé]ma.*[eé]lectr/i.test(text + frTitle)) docType = 'Electrical schematics';
  else if (/sch[eé]ma.*c[aâ]blage/i.test(text + frTitle)) docType = 'Wiring diagram';
  else if (/dossier\s*(technique|complet)/i.test(text + frTitle)) docType = 'Complete technical dossier';
  else if (/article\s*descriptif/i.test(text + frTitle)) docType = 'Descriptive article';
  else if (/RTA/i.test(frTitle)) docType = 'Workshop manual (RTA)';

  // Determine product category
  let category = 'equipment';
  const combined = text + ' ' + frTitle;
  if (/photographie.*(par|grand|monochrome|paysage).*hasselblad|hasselblad.*(photographie|par)/i.test(combined)) category = 'hasselblad-book';
  else if (/phot\s*argus|dossier.*documentation\s*compl[eè]te/i.test(combined) && /pentax|nikon|leica|minolta|rolleiflex|bronica/i.test(combined)) category = 'phot-argus';
  else if (/appareil\s*photo|bo[iî]tier|objectif|argentique|camera|miroir\s*bloqu|obturateur|cellule|d[eé]montage.*nikon|d[eé]montage.*minolta|d[eé]montage.*contax|d[eé]montage.*pentax|d[eé]montage.*canon|d[eé]montage.*leica|d[eé]montage.*olympus|d[eé]montage.*foca|focaflex|nikonos|kodak.*camera|kodak.*projecteur|nikkor|zoom.*nikkor|nikon\s*(f|d\d|sb|fe|35)|leica\s*m\d|leica\s*r\d|canon\s*(ef|canonet|canonflex|powershot)|pentax\s*(lx|p30|6x7)|minolta\s*(xg|cle|tc|miniflex|srt|x700|xm)|contax\s*139|foca\s*(fp|pf|universel)|bronica|rolleiflex|rollei|yashica|seagull|minox|zenit|zorki|pentacon|wollensak/i.test(combined)) category = 'camera';
  else if (/machine\s*[aà]\s*coudre|couture|singer/i.test(combined)) category = 'sewing machine';
  else if (/combin[eé]\s*bois|menuiserie|lurem|dugu[eé]|woodwork/i.test(combined)) category = 'woodworking machine';
  else if (/quad|polaris|sportsman|bombardier.*outlander/i.test(combined)) category = 'ATV';
  else if (/moto|yamaha|virago|fazer|dt\s*125/i.test(combined)) category = 'motorcycle';
  else if (/voiture|auto|renault|scenic|lotus|suzuki|mini.?cooper|simca|audi|camion|citro[eë]n|volkswagen|coccinelle|toyota/i.test(combined)) category = 'vehicle';
  else if (/magn[eé]tophone|enregistreur|nagra|akai|uher|revox|studer/i.test(combined)) category = 'tape recorder';
  else if (/tron[cç]onneuse|stihl|chain/i.test(combined)) category = 'chainsaw';
  else if (/drone|hubsan/i.test(combined)) category = 'drone';
  else if (/t[eé]l[eé]viseur|vestel|tv.*[eé]cran/i.test(combined)) category = 'television';
  else if (/robot.*ping|newgy/i.test(combined)) category = 'table tennis robot';
  else if (/distributeur.*nourriture|pet.*feeder/i.test(combined)) category = 'automatic pet feeder';
  else if (/a[eé]ropolisseur|air.?flow/i.test(combined)) category = 'air polisher';
  else if (/tourne\s*disque|teppaz|[eé]lectrophone/i.test(combined)) category = 'turntable';
  else if (/radio|yaesu|transceiver/i.test(combined)) category = 'radio transceiver';
  else if (/tour\s*(emco|habegger|opti|m[eé]tal)|compact\s*[58]|usinage|tournage/i.test(combined)) category = 'lathe';
  else if (/flash\s*(photographi|gemini|repair|maintenance)/i.test(combined)) category = 'flash unit';
  else if (/aspirateur|rowenta/i.test(combined)) category = 'vacuum cleaner';
  else if (/caravane|adria|camping/i.test(combined)) category = 'caravan';
  else if (/microscope/i.test(combined)) category = 'microscope';
  else if (/thermostat|noirot|airelec|acova/i.test(combined)) category = 'thermostat';
  else if (/moteur.*marin|penta.*volvo/i.test(combined)) category = 'marine engine';
  else if (/hameg/i.test(combined)) category = 'test equipment';
  else if (/talkie|midland/i.test(combined)) category = 'walkie-talkie';
  else if (/four|de\s*dietrich/i.test(combined)) category = 'oven';
  else if (/pulv[eé]risateur/i.test(combined)) category = 'sprayer';
  else if (/samsung|panasonic.*toughbook/i.test(combined)) category = 'electronics';
  else if (/kaiser.*minuteur|labo/i.test(combined)) category = 'darkroom equipment';
  else if (/livre|book|price\s*guide|classic\s*cameras|restoring|camera\s*maintenance/i.test(combined)) category = 'reference book';

  // Build description
  let desc = '';

  if (category === 'hasselblad-book') {
    const topicMap = {
      'grand.angulaire': 'Wide-Angle Photography',
      'monochrome': 'Monochrome Photography',
      'paysage': 'Landscape Photography',
      'vision': 'Photographic Vision',
      'enfant': 'Child Photography',
      'rapproch': 'Close-Up Photography',
      '(œil|oeil)': 'The Eye and Photography',
      'carr[eé]': 'Square Format Composition',
      'architecture': 'Architectural Photography',
      'industrielle.*1975': 'Industrial Photography (1975)',
      'industrielle': 'Industrial Photography',
      't[eé]l[eé]objectif': 'Telephoto Photography',
      'a[eé]rienne': 'Aerial Photography',
      'animaux': 'Wildlife Photography',
      'cr[eé]puscule|aube': 'From Dusk to Dawn Photography',
      'portrait': 'Portrait Photography',
      'reportage': 'Documentary Photography',
      'sport': 'Sports Photography',
    };
    let topic = 'Photography';
    for (const [pattern, eng] of Object.entries(topicMap)) {
      if (new RegExp(pattern, 'i').test(text + ' ' + frTitle)) { topic = eng; break; }
    }
    desc = `<p>${topic} by HASSELBLAD</p>`;
    desc += `<p>A guide from the prestigious Hasselblad photography series, exploring techniques and creative approaches.</p>`;
    if (pages) desc += `<p>${pages} pages of technical descriptions with numerous photographs.</p>`;
    return desc;
  }

  if (category === 'phot-argus') {
    desc = `<p>${brandModel}</p>`;
    desc += `<p>THE BEST OF ALL TESTS! The essential complement to the user manual for the passionate user.</p>`;
    desc += `<p>Technical and user dossier with all settings, tips, and tests.</p>`;
    if (pages) desc += `<p>${pages} pages of technical descriptions with numerous photographs for the use of this camera body and all its accessories.</p>`;
    return desc;
  }

  if (category === 'reference book') {
    desc = `<p>${brandModel}</p>`;
    desc += `<p>Reference book for camera collectors and repair enthusiasts.</p>`;
    if (pages) desc += `<p>${pages}-page documentation.</p>`;
    return desc;
  }

  // Main description paragraph
  desc += `<p>${docType} for the ${brandModel}.</p>`;

  // Page count
  if (pages) {
    desc += `<p>${pages}-page ${docType.toLowerCase()}.`;
    if (/workshop|service/i.test(docType)) {
      desc += ` Original manufacturer version for service workshops.`;
    }
    desc += `</p>`;
  }

  // Category-specific closing
  const closings = {
    'camera': 'This documentation will allow you to use and maintain this camera with complete confidence.',
    'sewing machine': 'Essential documentation for anyone wishing to maintain and use this sewing machine efficiently and safely.',
    'woodworking machine': 'Essential documentation for anyone wishing to install, maintain and use this machine efficiently and safely.',
    'ATV': 'Essential documentation for anyone wishing to maintain and troubleshoot this ATV efficiently and safely.',
    'motorcycle': 'Essential documentation for maintenance and troubleshooting of this motorcycle.',
    'vehicle': 'Essential documentation for maintenance, restoration and troubleshooting.',
    'tape recorder': 'Essential documentation for maintenance and troubleshooting of this equipment.',
    'chainsaw': 'Essential documentation for safe and efficient use of this equipment.',
    'television': 'Schematics and repair tips for TV switch-mode power supply boards.',
    'thermostat': 'Essential documentation for troubleshooting and repair of this equipment.',
    'marine engine': 'Essential documentation for operation and maintenance of this marine engine.',
    'test equipment': 'Essential documentation for operation and maintenance of this test equipment.',
    'lathe': 'Essential documentation for anyone wishing to operate and maintain this machine tool.',
    'equipment': 'Essential documentation for maintenance and use of this equipment.',
  };
  const closing = closings[category] || closings['equipment'];
  desc += `<p>${closing}</p>`;

  // Extract and translate list items from FR HTML
  const liMatches = frLongDesc.match(/<li[^>]*>(.*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    const translations = {
      'Caractéristiques techniques': 'Technical specifications',
      'Caractéristiques': 'Specifications',
      'Entretien': 'Maintenance', 'Réglage': 'Adjustment', 'Réglages': 'Adjustments',
      'Démontage': 'Disassembly', 'Remontage': 'Reassembly',
      'Nettoyage': 'Cleaning', 'Lubrification': 'Lubrication',
      'Installation': 'Installation', 'Sécurité': 'Safety',
      'Accessoires': 'Accessories', 'Diagnostic': 'Diagnostics',
      'Dépannage': 'Troubleshooting', 'Pièces détachées': 'Spare parts',
      'Pièces de rechange': 'Replacement parts',
      'Schéma électrique': 'Electrical diagram',
      'Schéma électronique': 'Electronic schematic',
      'Mise en route': 'Getting started',
      'Fonctionnement': 'Operation',
      'Graissage': 'Lubrication',
      'Utilisation': 'Use',
      'Branchement': 'Connection',
      'Garantie': 'Warranty',
      'Sommaire': 'Contents',
    };

    const items = liMatches.map(li => {
      let item = li.replace(/<[^>]+>/g, '').trim();
      for (const [fr, en] of Object.entries(translations)) {
        item = item.replace(new RegExp(fr, 'gi'), en);
      }
      return item;
    }).filter(i => i.length > 2);

    if (items.length > 0) {
      desc += '<h3>Topics covered:</h3><ul>';
      items.slice(0, 20).forEach(i => { desc += `<li>${i}</li>`; });
      desc += '</ul>';
    }
  }

  return desc;
}

async function main() {
  console.log('=== Fix Descriptions V2 ===\n');

  // Get ALL active docs
  const { data: activeDocs } = await sb.from('documents')
    .select('id, slug, title, description, active')
    .eq('active', true)
    .order('slug');

  console.log(`Active docs: ${activeDocs.length}`);

  // Build reverse mapping: EN slug → FR slug
  const enToFr = {};
  for (const [frSlug, enSlug] of Object.entries(FR_TO_EN)) {
    if (enSlug && !enToFr[enSlug]) {
      enToFr[enSlug] = frSlug;
    }
  }
  console.log(`Manual map entries (EN→FR): ${Object.keys(enToFr).length}`);

  // For unmapped active docs, try auto-matching by slug tokens
  const STOP = new Set(['de','du','la','le','les','des','un','une','et','en','a','au','pour','par','sur','dans','notice','manuel','manual','mode','emploi','service','hd','bd','fr','gb','copie','tome']);

  function tok(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/)
      .filter(w=>w.length>2 && !STOP.has(w));
  }

  let autoMatched = 0;
  for (const doc of activeDocs) {
    if (enToFr[doc.slug]) continue;

    const enTokens = tok(doc.slug + ' ' + doc.title);
    let bestFr = null;
    let bestScore = 0;

    for (const fr of frProducts) {
      const frTokens = tok(fr.slug + ' ' + fr.title);
      const setA = new Set(enTokens);
      const overlap = frTokens.filter(t => setA.has(t)).length;
      const score = (2 * overlap) / (setA.size + frTokens.length);
      if (score > bestScore) {
        bestScore = score;
        bestFr = fr;
      }
    }

    if (bestScore >= 0.30 && bestFr) {
      enToFr[doc.slug] = bestFr.slug;
      autoMatched++;
    }
  }
  console.log(`Auto-matched: ${autoMatched}`);
  console.log(`Total mapped: ${Object.keys(enToFr).length}\n`);

  // Validate all mappings point to existing FR products
  let missing = 0;
  for (const [enSlug, frSlug] of Object.entries(enToFr)) {
    if (!frBySlug[frSlug]) {
      console.log(`  WARNING: FR slug not found: ${frSlug} (for EN: ${enSlug})`);
      missing++;
    }
  }
  if (missing > 0) console.log(`\n${missing} FR slugs not found!\n`);

  // Now update descriptions
  let updated = 0;
  let skipped = 0;

  for (const doc of activeDocs) {
    const frSlug = enToFr[doc.slug];
    if (!frSlug) { skipped++; continue; }

    const fr = frBySlug[frSlug];
    if (!fr || !fr.longDesc) { skipped++; continue; }

    const newDesc = generateEnglishDesc(fr.longDesc, fr.title);
    if (!newDesc) { skipped++; continue; }

    const { error } = await sb.from('documents').update({ description: newDesc }).eq('id', doc.id);
    if (!error) {
      updated++;
      if (updated % 20 === 0) console.log(`  ... ${updated} updated`);
    } else {
      console.log(`  ERROR on ${doc.slug}: ${error.message}`);
    }
  }

  console.log(`\nTotal descriptions updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch(console.error);
