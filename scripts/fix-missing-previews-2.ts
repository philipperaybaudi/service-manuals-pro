/**
 * Fetch actual image URLs from the FR site for remaining docs without previews.
 * Strategy: search the FR site for each brand/model and extract the og:image.
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
      timeout: 20000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
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
      timeout: 20000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location!).then(resolve).catch(reject);
      }
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

// Manual mapping: EN doc title -> FR product URL slug
const frUrlMappings: Record<string, string> = {
  // Polaris
  'Polaris 400 500 Service Manual 001 156': 'quads-polaris-sportsman-400-et-500-cc',
  'Polaris 400 500 Service Manual 157 312': 'quads-polaris-sportsman-400-et-500-cc',
  // Suzuki
  'Suzuki Samurai Service Manual 1': 'manuel-datelier-4x4-suzuki-samourai-1986-1988',
  'Suzuki Samurai Service Manual 2': 'manuel-datelier-4x4-suzuki-samourai-1986-1988',
  'Suzuki Samurai Service Manual 3': 'manuel-datelier-4x4-suzuki-samourai-1986-1988',
  'Suzuki Samurai Service Manual 4': 'manuel-datelier-4x4-suzuki-samourai-1986-1988',
  'Suzuki Samurai Service Manual 5': 'manuel-datelier-4x4-suzuki-samourai-1986-1988',
  // Citroen
  'Xsara Picasso Notice': 'mode-demploi-citroen-xsara-picasso',
  // Canon
  'canonet 28 cuirettes': 'canonet-28-tutoriel-de-changement-des-cuirettes',
  'CANON canonet 28 cellule v2': 'canonet-28-manuel-de-reparation-de-la-cellule',
  'Restoration Canonflex RP': 'canonflex-rp-tutoriel-de-reparation',
  // Contax
  'Démontage et révision CONTAX 139 Quartz': 'contax139q-bloque-qui-ne-declenche-plus',
  // Rowenta
  'Rowenta RH8771': 'aspirateur-air-force-extreme-rowenta-notice-utilisateur',
  // Vestel
  'Manuel VESTEL': 'reparer-soi-meme-son-televiseur-a-ecran-plat-toutes-marques-et-modeles',
  'Schema Vestel': 'schema-et-conseils-de-reparation-pour-les-cartes-vestel-17ips62-17ips6-1-17ips6-2-17ips6-3-17pw06-2-17pw25-4-17ips19-5-17ips19-5p',
  // Minolta
  'Comment réparer son Minolta TC1': 'comment-reparer-son-minolta-tc-1',
  // Minox
  'Démonter un Minox Espion': 'tutoriel-de-demontage-minox-c-et-autres',
  // Zorki
  'Zorki 4 repair manual': 'zorki-4-manuel-de-reparation',
  // Bronica
  'Bronica ETRSI Repair Manual': 'bronica-etrsi-manuel-de-reparation',
  'bronica s2 service manual': 'bronica-zenza-s-2-c-manuel-de-reparation',
  'etrs fr': 'bronica-zenza-etr-etrs-etrsi-notice-mode-demploi',
  'notice bronica zenza etrs': 'bronica-zenza-etr-etrs-etrsi-notice-mode-demploi',
  // Renault Scenic
  'SCENIC 2 Climatisation': 'climatisation-scenic-2-manuel-de-service-tome-1',
  'SCENIC 2 Climatisation 2': 'climatisation-scenic-2-manuel-de-service-tome-2',
  'SCENIC 2 Equipement Electrique': 'equipement-electrique-scenic-2-manuel-de-service-complet',
  'SCENIC 2 Equipement Electrique 2': 'equipement-electrique-scenic-2-manuel-de-service-tome-2',
  'SCENIC 2 Transmission 1': 'manuel-datelier-transmission-bm-bva-du-renault-scenic-2',
  'SCENIC 2 Transmission 2': 'manuel-datelier-transmission-bm-bva-du-renault-scenic-2',
  'SCENIC 2 Garnissage et Sellerie': 'garnissage-et-sellerie-scenic-2-manuel-de-service',
  'espace automobile europeen scenic 3 notice': 'equipement-electrique-scenic-2-manuel-de-service-complet',
  // LUREM / Menuiserie
  'c 360 410 n 04': 'combine-bois-lurem-c360-notice-et-manuel-dentretien-copie',
  'Lurem RD 26 F': 'combines-bois-lurem-rd26f-manuel-dutilisation-et-dentretien',
  'Dugué Guillet C360 schéma élec': 'combine-dugue-c360-schema-du-cablage-electrique',
  // Adria
  'Restauration des freins dune Adria Prima 350 TD de 1989 nkoi6l': 'restauration-des-freins-dune-adria-prima-350-td-de-1989',
  // Repair guides
  'Conversion posemètre pour remplacer les piles au mercure': 'conversion-cellule-dun-appareil-photo-pour-remplacer-les-piles-au-mercure',
  'Réparer la séparation du baume à la maison': 'decollage-et-recollage-dun-doublet-optique-dobjectif-photo',
  'Comment réparer une alimentation à découpage': 'reparer-soi-meme-son-televiseur-a-ecran-plat-toutes-marques-et-modeles',
  // Flash
  'gemini r and pro controls': 'kyoritsu-ef-8000-notice-dutilisation-et-dentretien',
};

async function main() {
  console.log('=== Fix Missing Previews v2 ===\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, preview_url, brand:brands(name)')
    .eq('active', true)
    .is('preview_url', null);

  if (error || !docs) { console.error(error); return; }

  console.log(`Docs without preview: ${docs.length}\n`);

  let uploaded = 0;

  for (const doc of docs) {
    const frSlug = frUrlMappings[doc.title];
    if (!frSlug) {
      console.log(`  ⚠ No mapping for: ${doc.title}`);
      continue;
    }

    const frUrl = `https://la-documentation-technique.eu/produit/${frSlug}`;

    try {
      const html = await fetchUrl(frUrl);
      // Try wp-post-image first, then og:image, then gallery image
      let imageUrl: string | null = null;
      const wpMatch = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/);
      if (wpMatch) {
        // Get the full-size version (remove dimension suffix like -600x419)
        imageUrl = wpMatch[1].replace(/-\d+x\d+\./, '.');
      }
      if (!imageUrl) {
        const ogMatch = html.match(/<meta property="og:image"\s+content="([^"]+)"/);
        if (ogMatch) imageUrl = ogMatch[1];
      }
      if (!imageUrl) {
        const galleryMatch = html.match(/woocommerce-product-gallery__image[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
        if (galleryMatch) imageUrl = galleryMatch[1].replace(/-\d+x\d+\./, '.');
      }
      if (!imageUrl) {
        console.log(`  ⚠ No image found on ${frSlug}`);
        continue;
      }
      const imgBuffer = await fetchBuffer(imageUrl);
      const ext = imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
      const storagePath = `previews/${doc.slug}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(storagePath, imgBuffer, {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
        const { error: updateErr } = await supabase
          .from('documents')
          .update({ preview_url: urlData.publicUrl })
          .eq('id', doc.id);

        if (!updateErr) {
          uploaded++;
          console.log(`  ✓ ${doc.title}`);
        }
      } else {
        console.log(`  ✗ Upload failed: ${doc.title}: ${uploadErr.message}`);
      }

      await sleep(300);
    } catch (err: any) {
      console.log(`  ✗ ${doc.title}: ${err.message}`);
    }
  }

  console.log(`\nUploaded: ${uploaded}`);
}

main().catch(console.error);
