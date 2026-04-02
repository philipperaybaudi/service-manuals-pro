/**
 * Manual sync for unmatched FR→EN products.
 * Maps specific FR product URLs to EN document slugs,
 * downloads the correct image and description for each.
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 25000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchUrl(res.headers.location!).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 25000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchBuffer(res.headers.location!).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function htmlDecode(str: string): string {
  return str
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…').replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&').replace(/&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#215;/g, 'x')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImage(html: string): string | null {
  const m = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/);
  if (m) return m[1].replace(/-\d+x\d+\./, '.');
  return null;
}

function extractShortDesc(html: string): string {
  const m = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/);
  if (!m) return '';
  let desc = m[1].replace(/<[^>]*>En\s+t[eé]l[eé]chargement.*$/gis, '');
  return htmlDecode(desc).replace(/\s*En téléchargement.*$/i, '').trim();
}

// FR product slug → EN document slug(s) mapping
// One FR product can map to multiple EN documents
const mappings: [string, string[], string][] = [
  // [FR slug, [EN slugs], English description]

  // Nikon
  ['manuels-de-reparation-nikkormat-ftn', ['nikon-nikkormat-ftn'], 'After-sales service manual (83 pages) for the repair and maintenance of the Nikkormat FTN camera body.'],
  ['mode-demploi-nikon-f', ['nikon-nikon-f'], 'User manual in French for the Nikon F professional SLR camera.'],
  ['mode-demploi-nikon-fe', ['nikon-manuel-nikon-fe-fr'], 'User manual in French for the Nikon FE SLR camera.'],
  ['nikon-fe-manuel-de-reparation-du-miroir-bloque', ['nikon-nikon-fe-miroir-bloque-en-haut'], 'Repair guide for fixing a stuck mirror on the Nikon FE SLR camera. Step-by-step instructions.'],
  ['nikon-af-s-vr-nikkor-105mm-f-2-8g-manuel-de-depannage', ['nikon-nikkor-afs-vr-micro105g'], 'Service manual for the Nikon AF-S VR Micro-Nikkor 105mm f/2.8G IF-ED lens.'],
  ['tutoriel-de-reparation-du-microscope-nikon-s', ['nikon-the-nikon-model-s-microscope-replacing-the-fine-focus-spur-gear'], 'Repair tutorial for replacing the fine focus spur gear on the Nikon Model S microscope.'],
  ['tutoriel-de-demontage-complet-nikonos-iii-en-francais', ['nikon-demontage-nikonos-iii'], 'Complete disassembly tutorial for the Nikonos III underwater camera. Illustrated guide in French.'],
  ['nikon-f-documentation-complete', ['nikon-nikon-f'], 'Complete documentation package for the Nikon F professional SLR camera.'],

  // Nagra
  ['mode-demploi-et-schemas-du-nagra-3', ['nagra-nagraiii', 'nagra-notice-nagra-3'], 'User manual and schematics for the Nagra III professional portable audio recorder.'],
  ['mode-demploi-magnetophone-nagra-4', ['nagra-nagra-4-2-notice-gb-1', 'nagra-nagra-4-2-notice-gb-2', 'nagra-nagra-4-2-notice-fr', 'nagra-nagra-iv-models', 'nagra-nagra-iv-s-owners-manual'], 'User manual for the Nagra IV professional portable audio recorder.'],
  ['mode-demploi-de-lenregistreur-nagra-lb', ['nagra-nagra-ares-lb'], 'User guide for the Nagra Ares LB digital recorder.'],

  // Suzuki
  ['manuel-datelier-4x4-suzuki-samourai-1986-1988', ['suzuki-suzuki-samurai-service-manual-1', 'suzuki-suzuki-samurai-service-manual-2', 'suzuki-suzuki-samurai-service-manual-3', 'suzuki-suzuki-samurai-service-manual-4', 'suzuki-suzuki-samurai-service-manual-5'], 'Workshop manual for the 4x4 Suzuki Samurai 1986-1988. Complete service and repair procedures.'],

  // Renault Scenic
  ['manuel-datelier-boite-de-vitesses-automatique-du-renault-scenic-2', ['renault-scenic-2-transmission-1', 'renault-scenic-2-transmission-2'], 'Workshop manual for the Renault Scénic 2 automatic gearbox and transmission.'],
  ['manuel-datelier-carrosserie-tolerie-du-renault-scenic-2', [], 'Workshop manual for the Renault Scénic 2 bodywork and sheet metal.'],
  ['manuel-datelier-moteur-et-peripheriques-du-renault-scenic-2', [], 'Workshop manual for the Renault Scénic 2 engine and peripherals.'],
  ['manuel-datelier-complet-injection-du-renault-scenic-2', [], 'Complete workshop manual for the Renault Scénic 2 fuel injection system.'],
  ['manuel-datelier-mecanismes-et-accessoires-du-renault-scenic-2', [], 'Workshop manual for the Renault Scénic 2 mechanisms and accessories.'],
  ['manuel-datelier-caracteristiques-et-generalites-du-renault-scenic-2', [], 'Workshop manual for the Renault Scénic 2 specifications and general information.'],
  ['manuel-datelier-introduction-au-diagnostic-du-renault-scenic-2', [], 'Workshop manual for the Renault Scénic 2 diagnostic introduction.'],
  ['generalites-scenic-2-manuel-de-service', [], 'Renault Scénic 2 service manual - General information section.'],
  ['etancheite-et-insonorisation-scenic-2-manuel-de-service', [], 'Renault Scénic 2 service manual - Sealing and sound insulation section.'],
  ['chassis-scenic-2-manuel-de-service-tome-1', [], 'Renault Scénic 2 service manual - Chassis section (Volume 1).'],
  ['chassis-scenic-2-manuel-de-service-tome-2', [], 'Renault Scénic 2 service manual - Chassis section (Volume 2).'],

  // Hasselblad
  ['les-animaux-dans-la-nature-par-hasselblad', ['hasselbald-animaux-hd'], 'Photography guide: Animals in Nature by Hasselblad.'],
  ['la-photographie-darchitecture-par-hasselblad', ['hasselbald-archi-hd'], 'Photography guide: Architecture by Hasselblad.'],
  ['du-crepuscule-a-laube-par-hasselblad', ['hasselbald-crepuscule-hd'], 'Photography guide: From Dusk to Dawn by Hasselblad.'],
  ['la-photographie-denfants-par-hasselblad', ['hasselbald-enfants-hd', 'hasselbald-enfants-bd'], 'Photography guide: Children Photography by Hasselblad.'],
  ['photographie-industrielle-par-hasselblad', ['hasselbald-industrie1-hd'], 'Photography guide: Industrial Photography by Hasselblad (1979).'],
  ['photographie-industrielle-par-hasselblad-1975', ['hasselbald-industrie2-hd'], 'Photography guide: Industrial Photography by Hasselblad (1975).'],
  ['photographie-rapprochee-par-hasselblad', ['hasselbald-macro-hd', 'hasselbald-macro-bd'], 'Photography guide: Close-up/Macro Photography by Hasselblad.'],
  ['photographie-monochrome-par-hasselblad', ['hasselbald-monochrome-hd', 'hasselbald-monochrome-bd'], 'Photography guide: Monochrome Photography by Hasselblad.'],
  ['loeil-et-la-photo-par-hasselblad', ['hasselbald-oeil-hd', 'hasselbald-oeil-bd'], 'Photography guide: The Eye and the Photo by Hasselblad.'],
  ['photographie-de-paysage-par-hasselblad', ['hasselbald-paysage-hd', 'hasselbald-paysage-bd'], 'Photography guide: Landscape Photography by Hasselblad.'],
  ['photographie-portrait-par-hasselblad', ['hasselbald-portrait-hd'], 'Photography guide: Portrait Photography by Hasselblad.'],
  ['photographie-de-reportage-par-hasselblad', ['hasselbald-reportage-hd'], 'Photography guide: Reportage Photography by Hasselblad.'],
  ['la-photographie-de-sport-par-hasselblad', ['hasselbald-sport-hd'], 'Photography guide: Sports Photography by Hasselblad.'],
  ['la-photographie-au-teleobjectif-par-hasselblad', ['hasselbald-tele-hd'], 'Photography guide: Telephoto Photography by Hasselblad.'],
  ['vision-photographique-par-hasselblad', ['hasselbald-vision-hd', 'hasselbald-vision-bd'], 'Photography guide: Photographic Vision by Hasselblad.'],
  ['hasselblad-et-la-photographie-aerienne', ['hasselbald-aerienne-hd'], 'Photography guide: Aerial Photography by Hasselblad.'],
  ['composition-en-format-carre-par-hasselblad', ['hasselbald-formatcarre1-hd', 'hasselbald-formatcarre-1-bd'], 'Photography guide: Square Format Composition by Hasselblad.'],
  ['photographie-grand-angulaire-par-hasselblad', ['hasselbald-grand-angulaire-hd', 'hasselbald-grand-angulaire-bd'], 'Photography guide: Wide-angle Photography by Hasselblad.'],
  ['rollei-sl-66-manuel-de-reparation-du-miroir-bloque', ['hasselbald-miroir-et-armement-bloque-sur-rolleiflex-sl66'], 'Repair guide for stuck mirror and cocking mechanism on the Rolleiflex SL66 medium format camera.'],

  // Bronica
  ['bronica-zenza-s-2-c-manuel-de-reparation', ['zenza-bronica-bronica-s2-service-manual'], 'Repair manual for the Zenza Bronica S2-C medium format camera.'],
  ['bronica-etrsi-manuel-de-reparation', ['zenza-bronica-bronica-etrsi-repair-manual'], 'Repair manual for the Zenza Bronica ETRSi medium format camera.'],
  ['notice-bronica-zenza-s2a-mode-demploi', ['bronica-bronica-s2a-notice-fr'], 'User guide for the Zenza Bronica S2A medium format camera. In French.'],
  ['bronica-zenza-etr-etrs-etrsi-notice-mode-demploi', ['zenza-bronica-bronica-etrs', 'zenza-bronica-etrs-fr', 'zenza-bronica-notice-bronica-zenza-etrs'], 'User guide for the Zenza Bronica ETR, ETRS, and ETRSi medium format cameras.'],
  ['bronica-zenzanon-lenses-and-seiko-shutter-repair-manuals', [], 'Repair manual for Bronica Zenzanon lenses and Seiko shutters.'],

  // Misc cameras
  ['zorki-4-manuel-de-reparation', ['zorki-zorki-4-repair-manual', 'kmz-zorki-4-repair-manual'], 'Complete repair manual for the Zorki 4 rangefinder camera.'],
  ['tutoriel-de-demontage-minolta-miniflex-4x4', ['minolta-demontage-et-reparation-minolta-miniflex'], 'Disassembly and repair tutorial for the Minolta Miniflex 4x4 TLR camera with detailed photos.'],
  ['comment-reparer-son-minolta-tc-1', ['minolta-comment-reparer-son-minolta-tc1'], 'Step-by-step repair tutorial for the Minolta TC-1 compact camera.'],
  ['demontage-et-revision-du-minolta-cle', ['minolta-demontage-et-reglages-telemetre-minolta-cle'], 'Disassembly and rangefinder adjustment tutorial for the Minolta CLE camera.'],
  ['minolta-xg-1-tutoriel-de-depannage', [], 'Troubleshooting tutorial for the Minolta XG-1 SLR camera.'],
  ['pentax-lx-bloque-tutoriel-de-depannage', ['pentax-pentax-lx-bloque'], 'Troubleshooting tutorial for fixing a stuck/jammed Pentax LX camera.'],
  ['pentacon-six-tl-manuel-de-reparation', ['pentacon-six-manuel-du-pentacon-six'], 'Repair manual for the Pentacon Six TL medium format camera.'],
  ['tutoriel-de-demontage-seagull-4', ['seagull-seagull-4-shutter-cla'], 'Shutter CLA (cleaning, lubricating, adjusting) tutorial for the Seagull 4 TLR camera.'],
  ['contax139q-bloque-qui-ne-declenche-plus', ['contax-demontage-et-revision-contax-139-quartz'], 'Complete overhaul and disassembly guide for the stuck Contax 139 Quartz SLR camera.'],
  ['tutoriel-de-demontage-minox-c-et-autres', ['minox-demonter-un-minox-espion'], 'Disassembly tutorial for the Minox C and other Minox spy cameras.'],
  ['kodak-brownie-flash-camera-manuel-de-reparation-complet', ['kodak-comment-renover-un-kodak-brownie-hawkeye'], 'Complete repair guide for renovating a Kodak Brownie camera.'],
  ['kodak-retina-reflex-manuel-de-reparation-complet', ['kodak-demontage-kodak-retina-reflex'], 'Complete disassembly manual for the Kodak Retina Reflex camera.'],
  ['rolleiflex-t-manuel-de-reparation-original-du-technicien', ['rollei-manuel-de-reparation-rolleiflex-t'], 'Original technician repair manual for the Rolleiflex T TLR camera.'],
  ['canon-powershot-a410-notice-utilisateur-canon', ['canon-powershot-canon-g6-service-manual'], 'Service manual for Canon PowerShot cameras.'],
  ['canonflex-rp-tutoriel-de-reparation', ['canon-restoration-canonflex-rp'], 'Restoration and repair tutorial for the Canon Canonflex RP SLR camera.'],
  ['canonet-28-manuel-de-reparation-de-la-cellule', ['canon-canon-canonet-28-cellule-v2'], 'Repair tutorial for the light meter cell on the Canon Canonet 28 camera.'],
  ['canonet-28-tutoriel-de-changement-des-cuirettes', ['canon-canonet-28-cuirettes'], 'Step-by-step tutorial for replacing the leatherette covering on the Canon Canonet 28 camera.'],

  // EMCO / Workshop
  ['notice-tour-emco-unimat-mode-demploi', ['machines-outil-emco-unimat-notice'], 'User manual for the EMCO Unimat metalworking lathe. In French.'],
  ['notice-tour-emco-unimat-basic-pieces', ['machines-outil-emco-unimat-basic-pieces'], 'Parts list for the EMCO Unimat Basic metalworking lathe.'],
  ['tour-metal-habegger-tdle', ['machines-outil-habegger-tdle-manuel'], 'Technical manual for the Habegger TDLE metalworking lathe. 26 pages, multilingual including French.'],

  // Misc
  ['manuel-dentretien-et-de-reparation-des-focaflex', ['foca-entretien-et-reparation-des-focaflex'], 'Maintenance and repair guide for FOCA Focaflex cameras.'],
  ['notice-du-foca-universel-e1', ['foca-universel-notice'], 'User guide for the FOCA Universel E1 rangefinder camera.'],
  ['decollage-et-recollage-dun-doublet-optique-dobjectif-photo', ['reparation-depannage-reparer-la-separation-du-baume-a-la-maison'], 'Tutorial for repairing balsam separation in vintage camera lens doublets.'],
  ['remplacement-joints-photos', ['reparation-depannage-le-remplacement-des-joints-de-lumiere-sur-les-appareils-photos-reflex'], 'Tutorial for replacing light seals on SLR film cameras.'],
  ['conversion-cellule-dun-appareil-photo-pour-remplacer-les-piles-au-mercure', ['reparation-depannage-conversion-posemetre-pour-remplacer-les-piles-au-mercure'], 'Tutorial for converting mercury battery light meters to modern alternatives on vintage cameras.'],
  ['maintenance-et-reparation-des-flashs-photographiques', ['flash-photo-repa-maintenance-flashs-electroniques'], 'Comprehensive guide to maintenance and repair of electronic photographic flash units.'],
  ['depannage-thermostat-noirot-airelec-acova', ['radiateur-calidou-depannage-thermostat-noirot-airelec-acova'], 'Troubleshooting guide for NOIROT, AIRELEC, and ACOVA Calidou radiator thermostats.'],
  ['manuel-utilisateur-toyota-serie-6-hj60-hj61-fj60-fj62', ['toyota-manuel-utilisateur-toyota-serie-6'], 'User manual for Toyota Series 6 Land Cruiser vehicles (HJ60, HJ61, FJ60, FJ62).'],
  ['reparer-soi-meme-son-televiseur-a-ecran-plat-toutes-marques-et-modeles', ['vestel-manuel-vestel'], 'Guide for repairing flat-screen TVs yourself. All brands and models.'],
  ['reparer-soi-meme-son-ecran-plat-dordinateur', ['no-brand-comment-reparer-une-alimentation-a-decoupage'], 'Guide for repairing flat-screen computer monitors. Switching power supply troubleshooting.'],

  // Bombardier
  ['manuel-datelier-quads-bombardier-outlander-brp-400-a-800-cc', ['bombardier-bombardier-outlander-2006'], 'Workshop manual for Bombardier/BRP Outlander 400-800cc ATVs.'],

  // LUREM extras
  ['combines-bois-lurem-rd26f-manuel-dutilisation-et-dentretien', ['menuiserie-lurem-rd-26-f'], 'User and maintenance manual for the LUREM RD26F woodworking combination machine.'],
];

async function main() {
  console.log('=== Manual Sync ===\n');

  // Build slug→id map
  const { data: docs } = await supabase.from('documents').select('id, slug').eq('active', true);
  const slugMap: Record<string, string> = {};
  docs?.forEach(d => { slugMap[d.slug] = d.id; });

  let processed = 0, imgUploaded = 0, descUpdated = 0, notFound = 0;

  for (const [frSlug, enSlugs, engDesc] of mappings) {
    const frUrl = `https://la-documentation-technique.eu/produit/${frSlug}`;

    // Resolve EN doc IDs
    const enIds: { id: string; slug: string }[] = [];
    for (const es of enSlugs) {
      if (slugMap[es]) enIds.push({ id: slugMap[es], slug: es });
      else console.log(`  ⚠ EN slug not found: ${es}`);
    }

    if (enIds.length === 0 && enSlugs.length > 0) {
      notFound++;
      continue;
    }

    // Fetch FR page for image
    let imageUrl: string | null = null;
    try {
      const html = await fetchUrl(frUrl);
      imageUrl = extractImage(html);
    } catch (err: any) {
      console.log(`  ⚠ Could not fetch ${frSlug}: ${err.message}`);
    }

    // Update each EN doc
    for (const en of enIds) {
      const updateData: any = {};
      if (engDesc) updateData.description = engDesc;

      // Upload image
      if (imageUrl) {
        try {
          const imgBuffer = await fetchBuffer(imageUrl);
          const ext = imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
          const storagePath = `previews/${en.slug}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from('logos')
            .upload(storagePath, imgBuffer, {
              contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
            updateData.preview_url = urlData.publicUrl;
            imgUploaded++;
          }
        } catch (imgErr: any) {
          // Skip image
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('documents').update(updateData).eq('id', en.id);
        if (!error) {
          descUpdated++;
          console.log(`  ✓ ${en.slug}`);
        } else {
          console.log(`  ✗ ${en.slug}: ${error.message}`);
        }
      }
    }

    processed++;
    await sleep(250);
  }

  console.log(`\nProcessed: ${processed}, Descriptions: ${descUpdated}, Images: ${imgUploaded}, Not found: ${notFound}`);
}

main().catch(console.error);
