/**
 * v3 - Complete sync of descriptions + images from FR site.
 *
 * This script:
 * 1. Fetches ALL FR product pages from sitemap
 * 2. Extracts the SPECIFIC product image and short description for each
 * 3. Matches each FR product to EN documents using brand + model matching
 * 4. Downloads the CORRECT product image and uploads to Supabase
 * 5. Translates description and updates both image + description
 *
 * Key difference from v2: uploads the correct image for EVERY match,
 * even if the doc already has an (incorrect) preview image.
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── HTTP ──

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 25000
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
      timeout: 25000
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

// ── HTML extraction ──

function htmlDecode(str: string): string {
  return str
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…').replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ')
    .replace(/&#215;/g, 'x')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<h1[^>]*class="product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  return m ? htmlDecode(m[1]) : '';
}

function extractImage(html: string): string | null {
  // wp-post-image is the primary product image
  const m = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/);
  if (m) {
    // Get full-size URL (remove -WxH suffix)
    return m[1].replace(/-\d+x\d+\./, '.');
  }
  // Fallback: gallery image
  const g = html.match(/woocommerce-product-gallery__image[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (g) return g[1].replace(/-\d+x\d+\./, '.');
  return null;
}

function extractShortDescription(html: string): string {
  const m = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/);
  if (!m) return '';
  let desc = m[1];
  // Remove "En téléchargement immédiat..." line
  desc = desc.replace(/<[^>]*>En\s+t[eé]l[eé]chargement.*$/gis, '');
  return htmlDecode(desc).replace(/\s*En téléchargement.*$/i, '').trim();
}

function extractMetaDescription(html: string): string {
  const m = html.match(/<meta name="description" content="([^"]+)"/);
  return m ? htmlDecode(m[1]) : '';
}

// ── Matching ──

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract meaningful tokens for matching */
function getModelTokens(str: string): string[] {
  const norm = normalize(str);
  const stopWords = new Set([
    'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'en',
    'ce', 'ces', 'cette', 'pour', 'par', 'sur', 'avec', 'dans', 'son',
    'the', 'and', 'for', 'with', 'from', 'of', 'on', 'in', 'to', 'by',
    'manual', 'manuel', 'notice', 'service', 'repair', 'schema', 'schemas',
    'guide', 'mode', 'emploi', 'utilisation', 'utilisateur', 'user',
    'technique', 'documentation', 'complet', 'complete', 'dossier',
    'depannage', 'reparation', 'entretien', 'maintenance', 'tutoriel',
    'instructions', 'bd', 'hd', 'type', 'serie', 'series',
    'pdf', 'page', 'pages', 'tome', 'part', 'partie', 'version',
    'fiche', 'fiches', 'livret', 'article', 'descriptif',
    'eclate', 'eclates', 'eclatee', 'pieces', 'nomenclature',
    'cablage', 'cablages', 'electrique', 'electriques', 'electronique',
    'list', 'parts', 'exploded', 'schematics', 'wiring',
    'assembly', 'adjustment', 'diagnostic', 'calibration',
    'demontage', 'remontage', 'revision', 'blocage', 'deblocage',
    'bloque', 'bloquer', 'miroir', 'mir', 'shutter', 'stuck',
    'fr', 'gb', 'hd', 'bd', 'pro', 'mk', 'mki', 'mkii',
    'ocr', 'avec', 'sans', 'sur', 'dans',
    'magnetophone', 'magnetophones', 'bandes', 'appareil', 'photo',
    'photographique', 'camera', 'boitier', 'objectif', 'lens',
    'tronconneuse', 'tronconneuses', 'chainsaw',
    'combine', 'combines', 'bois', 'woodworking', 'machine',
    'notice', 'owner', 'owners', 'manuals', 'manuels',
    'flash', 'nikon', 'canon', 'leica', 'pentax', 'minolta',
    'hasselblad', 'hasselbald', 'bronica', 'zenza', 'rollei', 'rolleiflex',
    'mamiya', 'olympus', 'contax', 'yashica', 'kodak', 'fuji', 'fujica',
    'foca', 'kmz', 'zenit', 'zorki', 'seagull', 'minox', 'pentacon',
    'wollensak', 'akai', 'nagra', 'revox', 'studer', 'uher', 'pioneer',
    'grundig', 'hameg', 'yaesu', 'midland', 'stihl', 'lurem', 'dugue',
    'singer', 'rowenta', 'vestel', 'samsung', 'toyota', 'suzuki',
    'yamaha', 'polaris', 'renault', 'citroen', 'simca', 'lotus',
    'bombardier', 'volvo', 'penta', 'dietrich', 'hubsan', 'newgy',
    'kavo', 'kaiser', 'adria', 'panasonic', 'sony', 'opti', 'emco',
    'habegger', 'asahi', 'nikkor', 'nikkormat',
    'comment', 'reparer', 'renover', 'changer',
    'quad', 'quads', 'moto', 'voiture', 'camion', 'atelier',
    'workshop', 'datum', 'extrait', 'complet',
  ]);
  return norm.split(' ').filter(w => w.length >= 2 && !stopWords.has(w));
}

interface EnDoc {
  id: string;
  title: string;
  slug: string;
  file_path: string;
  brand: { name: string } | null;
}

/**
 * Match a FR product to the best EN document.
 * Strategy: extract model identifiers from both sides and find overlap.
 */
function findBestMatch(frTitle: string, frSlug: string, candidates: EnDoc[]): { doc: EnDoc | null; score: number; method: string } {
  const frTokens = getModelTokens(frTitle);
  const frSlugTokens = getModelTokens(frSlug);
  const allFrTokens = [...new Set([...frTokens, ...frSlugTokens])];

  let best: EnDoc | null = null;
  let bestScore = 0;
  let bestMethod = '';

  for (const enDoc of candidates) {
    const enFileTokens = getModelTokens(enDoc.file_path.replace(/\//g, ' ').replace(/\.\w+$/, ''));
    const enTitleTokens = getModelTokens(enDoc.title);
    const allEnTokens = [...new Set([...enFileTokens, ...enTitleTokens])];

    if (allEnTokens.length === 0) continue;

    // Count matching tokens
    let overlap = 0;
    const matched: string[] = [];
    for (const ft of allFrTokens) {
      if (ft.length < 2) continue;
      for (const et of allEnTokens) {
        if (et.length < 2) continue;
        if (ft === et) {
          overlap++;
          matched.push(ft);
          break;
        }
        // Substring match for model numbers (e.g., "gx625" in "gx625")
        if (ft.length >= 3 && et.length >= 3) {
          if (ft.includes(et) || et.includes(ft)) {
            overlap += 0.8;
            matched.push(`${ft}~${et}`);
            break;
          }
        }
      }
    }

    // Score: proportion of matched tokens relative to the smaller set
    const minSize = Math.min(allFrTokens.length, allEnTokens.length);
    if (minSize === 0) continue;
    const score = overlap / minSize;

    // Require at least 1 strong match (model number with digits)
    const hasModelMatch = matched.some(m => /\d/.test(m) && m.replace(/~.*/, '').length >= 2);
    const hasStrongTextMatch = matched.length >= 2;

    if (!hasModelMatch && !hasStrongTextMatch) continue;

    if (score > bestScore) {
      bestScore = score;
      best = enDoc;
      bestMethod = matched.join(',');
    }
  }

  return { doc: best, score: Math.round(bestScore * 100), method: bestMethod };
}

// Brand name extraction & mapping (same as v2 but simplified)
function extractBrand(title: string): string | null {
  const patterns = [
    /\b(AKAI|BOMBARDIER|BRONICA|CANON|CITROEN|CONTAX|DIETRICH|FOCA|FUJI|GRUNDIG|HAMEG|HASSELBLAD|HEURTIER|HUBSAN|KAISER|KAVO|KMZ|KODAK|LEICA|LOTUS|LUREM|DUGUE|DUGUÉ|MAMIYA|MIDLAND|MINOLTA|MINOX|NAGRA|NIKON|NIKKORMAT|OLYMPUS|PANASONIC|PENTACON|PENTAX|PIONEER|POLARIS|REVOX|ROLLEI|ROLLEIFLEX|ROWENTA|SAMSUNG|SEAGULL|SIMCA|SINGER|STIHL|SONY|STUDER|SUZUKI|TOYOTA|UHER|VESTEL|VOLVO|WOLLENSAK|YAESU|YAMAHA|YASHICA|ZENZA|ZENIT|ZORKI|NEWGY|OPTI|EMCO|HABEGGER|ADRIA|ASAHI)\b/i,
    /\b(SCENIC|NIKKOR)\b/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function mapBrandToEnBrands(frBrand: string): string[] {
  const map: Record<string, string[]> = {
    'HASSELBLAD': ['HASSELBALD'],
    'REVOX': ['STUDER REVOX'],
    'STUDER': ['STUDER REVOX'],
    'FUJI': ['FUJICA'],
    'ROLLEI': ['ROLLEI'],
    'ROLLEIFLEX': ['ROLLEI'],
    'SCENIC': ['RENAULT'],
    'DIETRICH': ['DE DIETRICH'],
    'LUREM': ['MENUISERIE'],
    'DUGUE': ['MENUISERIE'],
    'DUGUÉ': ['MENUISERIE'],
    'NEWGY': ['Robot Ping-Pong'],
    'BRONICA': ['ZENZA BRONICA'],
    'ZENZA': ['ZENZA BRONICA'],
    'OPTI': ['MACHINES OUTIL'],
    'EMCO': ['MACHINES OUTIL'],
    'HABEGGER': ['MACHINES OUTIL'],
    'ZORKI': ['ZORKI', 'KMZ'],
    'ZENIT': ['KMZ'],
    'ASAHI': ['PENTAX'],
    'NIKKORMAT': ['NIKON'],
    'NIKKOR': ['NIKON'],
  };
  return map[frBrand] || [frBrand];
}

// ── Translation ──

function translateDesc(fr: string): string {
  if (!fr) return '';
  let t = fr;

  // Ordered replacements
  const reps: [RegExp, string][] = [
    [/Mode d'emploi d[ée]taill[ée] en fran[çc]ais et en italien/gi, 'Detailed user manual in French and Italian'],
    [/Mode d'emploi en fran[çc]ais/gi, 'User manual in French'],
    [/Mode d'emploi/gi, 'User manual'],
    [/Manuel de r[ée]paration/gi, 'Repair manual'],
    [/Manuel de d[ée]pannage/gi, 'Service manual'],
    [/Manuel de service/gi, 'Service manual'],
    [/Manuel d'entretien/gi, 'Maintenance manual'],
    [/Manuel d'utilisation/gi, 'User manual'],
    [/Manuels? de Service Apr[eè]s Vente/gi, 'After-sales service manual'],
    [/Manuel d'atelier complet/gi, 'Complete workshop manual'],
    [/Manuel d'atelier/gi, 'Workshop manual'],
    [/Manuel complet constructeur/gi, 'Complete manufacturer manual'],
    [/Manuel complet/gi, 'Complete manual'],
    [/Notice d'utilisation compl[eè]te/gi, 'Complete user guide'],
    [/Notice d'utilisation/gi, 'User guide'],
    [/Notice utilisateur/gi, 'User guide'],
    [/Notice/gi, 'User guide'],
    [/Sch[ée]mas? [ée]lectroniques? permettant la recherche de pannes ou la restauration/gi, 'Electronic schematics for troubleshooting and restoration'],
    [/Sch[ée]mas? [ée]lectroniques?/gi, 'Electronic schematics'],
    [/Sch[ée]mas? et c[aâ]blages? [ée]lectriques?/gi, 'Electrical schematics and wiring diagrams'],
    [/Documentation compl[eè]te [ée]dit[ée]e en fran[çc]ais/gi, 'Complete documentation in French'],
    [/Documentation technique/gi, 'Technical documentation'],
    [/Revue Moto Technique/gi, 'Motorcycle Technical Review'],
    [/Revue Technique Automobile/gi, 'Automobile Technical Review'],
    [/[EÉ]clat[ée]s? avec listes? des pi[eè]ces/gi, 'Exploded views with parts lists'],
    [/[EÉ]clat[ée]s? m[ée]caniques?/gi, 'Mechanical exploded views'],
    [/Catalogue complet des pi[eè]ces d[ée]tach[ée]es/gi, 'Complete spare parts catalog'],
    [/Liste des pi[eè]ces/gi, 'Parts list'],

    // Equipment
    [/magn[ée]tophones? [àa] bandes?/gi, 'reel-to-reel tape recorder'],
    [/magn[ée]tophones?/gi, 'tape recorder'],
    [/cam[ée]ra semi-professionnelle/gi, 'semi-professional camcorder'],
    [/appareil photographique professionnel argentique/gi, 'professional film camera'],
    [/appareil photographique argentique/gi, 'film camera'],
    [/appareil photographique/gi, 'camera'],
    [/appareils? photos?/gi, 'camera'],
    [/boitier photographique/gi, 'camera body'],
    [/boîtier photographique/gi, 'camera body'],
    [/boitiers?/gi, 'camera body'],
    [/boîtiers?/gi, 'camera body'],
    [/objectifs?/gi, 'lens'],
    [/tron[çc]onneuses?/gi, 'chainsaw'],
    [/aspirateurs?/gi, 'vacuum cleaner'],
    [/lave-vaisselle/gi, 'dishwasher'],
    [/combin[ée]s? bois/gi, 'woodworking combination machine'],
    [/combin[ée]s?/gi, 'combination machine'],
    [/machine [àa] coudre/gi, 'sewing machine'],
    [/poste radiophonique/gi, 'radio receiver'],
    [/r[ée]cepteur/gi, 'receiver'],
    [/drone/gi, 'drone'],
    [/enregistreur num[ée]rique/gi, 'digital recorder'],
    [/four/gi, 'oven'],
    [/moteur/gi, 'engine'],

    // Actions
    [/pour la r[ée]paration et l'entretien/gi, 'for repair and maintenance'],
    [/pour la maintenance et l'entretien/gi, 'for maintenance and servicing'],
    [/pour l'utilisation en toute s[ée]curit[ée], la maintenance et l'entretien/gi, 'for safe use, maintenance, and servicing'],
    [/pour l'utilisation en toute s[ée]curit[ée]/gi, 'for safe use'],
    [/pour l'utilisation/gi, 'for use'],
    [/pour d[ée]couvrir toutes les fonctionnalit[ée]s/gi, 'to discover all features'],
    [/permettant l'utilisation de toutes les fonctionnalit[ée]s/gi, 'covering all features and functions'],
    [/permettant l'utilisation/gi, 'for use'],

    // Quantities / languages
    [/de (\d+) pages?/gi, '$1-page'],
    [/(\d+) pages?/gi, '$1 pages'],
    [/en fran[çc]ais et en italien/gi, 'in French and Italian'],
    [/en fran[çc]ais et en anglais/gi, 'in French and English'],
    [/en fran[çc]ais/gi, 'in French'],
    [/en anglais/gi, 'in English'],
    [/multilingue/gi, 'multilingual'],
    [/de marque fran[çc]aise/gi, 'French-made'],

    // Connectors
    [/\bpour\b/gi, 'for'],
    [/\bavec\b/gi, 'with'],
    [/\bet\b/gi, 'and'],
    [/\bou\b/gi, 'or'],
    [/\bdes?\b/gi, 'of'],
    [/\bdu\b/gi, 'of the'],
    [/\bde la\b/gi, 'of the'],
    [/\bde l'/gi, 'of the '],
    [/\bles\b/gi, 'the'],
    [/\bla\b/gi, 'the'],
    [/\ble\b/gi, 'the'],
    [/\bl'/gi, 'the '],
    [/\bun\b/gi, 'a'],
    [/\bune\b/gi, 'a'],
    [/\bce\b/gi, 'this'],
    [/\bcette\b/gi, 'this'],
    [/\bces\b/gi, 'these'],
    [/\bsur\b/gi, 'on'],
    [/\bdans\b/gi, 'in'],
    [/\bremarquable\b/gi, 'remarkable'],
    [/\bses accessoires\b/gi, 'its accessories'],
    [/24x36/gi, '35mm'],
    [/[àa] vis[ée]e t[ée]l[ée]m[ée]trique/gi, 'rangefinder'],
    [/sans fil/gi, 'cordless'],
    [/rechargeables?/gi, 'rechargeable'],
  ];

  for (const [p, r] of reps) {
    t = t.replace(p, r);
  }

  t = t.replace(/\s+/g, ' ').trim();
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

// ── Main ──

async function main() {
  console.log('=== Sync v3 - Descriptions + Images ===\n');

  // 1. Get all EN docs
  const { data: enDocs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, brand:brands(name)')
    .eq('active', true);
  if (error || !enDocs) { console.error(error); return; }
  console.log(`EN documents: ${enDocs.length}`);

  // Index by brand
  const byBrand: Record<string, EnDoc[]> = {};
  for (const d of enDocs as EnDoc[]) {
    const b = d.brand?.name || 'NONE';
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(d);
  }

  // 2. Get FR product URLs
  console.log('Fetching FR sitemap...');
  const sitemapXml = await fetchUrl('https://la-documentation-technique.eu/product-sitemap.xml');
  const frUrls: string[] = [];
  let m;
  const re = /<loc>(.*?)<\/loc>/g;
  while ((m = re.exec(sitemapXml)) !== null) frUrls.push(m[1]);
  console.log(`FR products: ${frUrls.length}\n`);

  // Track which EN docs got updated (to avoid overwriting with worse matches)
  const enUpdated: Record<string, { score: number; frTitle: string }> = {};

  const results: any[] = [];
  let matched = 0, imgUploaded = 0, descUpdated = 0, errors = 0;

  for (let i = 0; i < frUrls.length; i++) {
    const frUrl = frUrls[i];
    const frSlug = frUrl.split('/').filter(Boolean).pop() || '';
    process.stdout.write(`\r  [${i + 1}/${frUrls.length}] ${frSlug.substring(0, 55).padEnd(55)}`);

    try {
      const html = await fetchUrl(frUrl);
      const frTitle = extractTitle(html);
      const imageUrl = extractImage(html);
      const shortDesc = extractShortDescription(html);
      const metaDesc = extractMetaDescription(html);
      const rawDesc = shortDesc || metaDesc;

      // Find brand
      const frBrand = extractBrand(frTitle);
      const enBrandNames = frBrand ? mapBrandToEnBrands(frBrand) : [];

      // Collect candidates
      let candidates: EnDoc[] = [];
      for (const bn of enBrandNames) {
        if (byBrand[bn]) candidates.push(...byBrand[bn]);
      }
      if (candidates.length === 0) candidates = enDocs as EnDoc[];

      // Match
      const { doc: bestDoc, score, method } = findBestMatch(frTitle, frSlug, candidates);

      const result: any = {
        frUrl, frTitle, frBrand,
        imageUrl, rawDesc,
        enId: bestDoc?.id, enTitle: bestDoc?.title,
        score, method,
        updated: false, imgUploaded: false,
      };

      if (bestDoc && score >= 50) {
        // Check if a better match already updated this EN doc
        const prev = enUpdated[bestDoc.id];
        if (prev && prev.score >= score) {
          result.skipped = `Already matched by "${prev.frTitle}" with score ${prev.score}`;
          results.push(result);
          await sleep(200);
          continue;
        }

        matched++;
        enUpdated[bestDoc.id] = { score, frTitle };

        const updateData: any = {};

        // Translate description
        if (rawDesc) {
          const translated = translateDesc(rawDesc);
          updateData.description = translated;
          result.translatedDesc = translated;
        }

        // Upload image
        if (imageUrl) {
          try {
            const imgBuffer = await fetchBuffer(imageUrl);
            const ext = imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
            const storagePath = `previews/${bestDoc.slug}.${ext}`;

            const { error: uploadErr } = await supabase.storage
              .from('logos')
              .upload(storagePath, imgBuffer, {
                contentType: ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg',
                upsert: true,
              });

            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
              updateData.preview_url = urlData.publicUrl;
              result.imgUploaded = true;
              imgUploaded++;
            }
          } catch (imgErr: any) {
            // Image download failed, skip
          }
        }

        // Apply update
        if (Object.keys(updateData).length > 0) {
          const { error: updateErr } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', bestDoc.id);

          if (!updateErr) {
            result.updated = true;
            descUpdated++;
          }
        }
      }

      results.push(result);
      await sleep(250);

    } catch (err: any) {
      errors++;
      results.push({ frUrl, frSlug, error: err.message });
    }
  }

  // Save results
  fs.writeFileSync('scripts/sync-results-v3.json', JSON.stringify(results, null, 2));

  // Summary
  const uniqueEnIds = new Set(results.filter(r => r.enId).map(r => r.enId));
  const unmatched = results.filter(r => !r.enId && !r.error);

  console.log(`\n\n=== Results ===`);
  console.log(`  FR products processed: ${frUrls.length}`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Unique EN docs updated: ${uniqueEnIds.size}`);
  console.log(`  Descriptions updated: ${descUpdated}`);
  console.log(`  Images uploaded: ${imgUploaded}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\n  --- Unmatched ---`);
    unmatched.forEach(r => console.log(`    ${r.frTitle}`));
  }
}

main().catch(console.error);
