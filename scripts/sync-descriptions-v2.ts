/**
 * Sync descriptions & preview images from French site to English Supabase DB.
 * v2 - Better matching using brand + model number extraction.
 *
 * Strategy:
 * 1. Get all EN documents with their brand info
 * 2. Get all FR product URLs from sitemap
 * 3. For each FR product, extract description + image
 * 4. Match to EN docs using brand name + model/keyword extraction
 * 5. Translate descriptions FR→EN using dictionary + pattern approach
 * 6. Download preview images and upload to Supabase storage
 * 7. Update Supabase documents with description + preview_url
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── HTTP Helpers ──

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
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
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

// ── HTML Helpers ──

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
    .replace(/&#215;/g, 'x').replace(/&#8242;/g, "'")
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractProductTitle(html: string): string {
  const match = html.match(/<h1[^>]*class="product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  return match ? htmlDecode(match[1]) : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta name="description" content="([^"]+)"/);
  return match ? htmlDecode(match[1]) : '';
}

function extractShortDescription(html: string): string {
  const match = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/);
  if (!match) return '';
  let desc = match[1];
  desc = desc.replace(/<p><span[^>]*>En.*?t[eé]l[eé]chargement.*?<\/span><\/p>/gi, '');
  return htmlDecode(desc);
}

function extractProductImage(html: string): string | null {
  const ogMatch = html.match(/<meta property="og:image"\s+content="([^"]+)"/);
  if (ogMatch) return ogMatch[1];
  const jsonMatch = html.match(/"image"\s*:\s*"(https:\/\/la-documentation-technique\.eu\/wp-content\/uploads\/[^"]+)"/);
  if (jsonMatch) return jsonMatch[1];
  return null;
}

// ── Matching Logic ──

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract meaningful tokens (model numbers, keywords) - skip very short words and common filler */
function extractTokens(str: string): string[] {
  const norm = normalize(str);
  const stopWords = new Set([
    'de', 'du', 'la', 'le', 'les', 'des', 'un', 'une', 'et', 'ou', 'en',
    'ce', 'ces', 'cette', 'pour', 'par', 'sur', 'avec', 'dans', 'son',
    'the', 'and', 'for', 'with', 'from', 'manual', 'manuel', 'notice',
    'service', 'repair', 'schema', 'schemas', 'schematic', 'user',
    'guide', 'mode', 'emploi', 'demploi', 'utilisation', 'utilisateur',
    'technique', 'documentation', 'complet', 'complete', 'dossier',
    'depannage', 'reparation', 'entretien', 'maintenance', 'tutoriel',
    'instructions', 'bd', 'hd', 'pro', 'type', 'serie', 'series',
    'pdf', 'page', 'pages', 'francais', 'anglais', 'french', 'english',
    'tome', 'part', 'partie',
  ]);
  return norm.split(' ').filter(w => w.length >= 2 && !stopWords.has(w));
}

/** Extract brand-relevant name from various sources */
function extractBrandFromFrTitle(frTitle: string): string | null {
  const brandPatterns = [
    /\b(akai|bombardier|bronica|canon|citroen|contax|dietrich|foca|fujica?|grundig|hameg|hasselblad|hasselbald|heurtier|hubsan|kaiser|kavo|kmz|kodak|leica|lotus|lurem|dugue|mamiya|midland|minolta|minox|nagra|nikon|nikkor|olympus|panasonic|pentacon|pentax|pioneer|polaris|renault|revox|studer|rollei|rolleiflex|rowenta|samsung|seagull|simca|singer|stihl|sony|suzuki|toyota|uher|vestel|volvo|wollensak|yaesu|yamaha|yashica|zenza|zorki|newgy|opti|emco)\b/i,
    /\b(mini[\s-]?cooper|rover)\b/i,
    /\b(iphone|apple)\b/i,
    /\b(volkswagen|vw|coccinelle)\b/i,
    /\b(audi)\b/i,
    /\b(scenic|megane|clio)\b/i,
  ];
  for (const pattern of brandPatterns) {
    const match = frTitle.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/** Map FR brand names to EN brand names in the DB */
function mapBrandName(frBrand: string): string[] {
  const mapping: Record<string, string[]> = {
    'hasselblad': ['HASSELBALD'], // Note: typo in DB
    'hasselbald': ['HASSELBALD'],
    'revox': ['STUDER REVOX'],
    'studer': ['STUDER REVOX'],
    'fujica': ['FUJICA'],
    'fuji': ['FUJICA'],
    'rollei': ['ROLLEI'],
    'rolleiflex': ['ROLLEI'],
    'scenic': ['RENAULT'],
    'megane': ['RENAULT'],
    'dietrich': ['DE DIETRICH'],
    'lurem': ['MENUISERIE'],
    'dugue': ['MENUISERIE'],
    'mini': ['Mini-Cooper Rover'],
    'cooper': ['Mini-Cooper Rover'],
    'rover': ['Mini-Cooper Rover'],
    'newgy': ['Robot Ping-Pong'],
    'iphone': ['iPHONE'],
    'apple': ['iPHONE'],
    'kmz': ['KMZ'],
    'zenit': ['KMZ'],
    'bronica': ['ZENZA BRONICA', 'BRONICA'],
    'zenza': ['ZENZA BRONICA'],
    'opti': ['MACHINES OUTIL'],
    'emco': ['MACHINES OUTIL'],
    'zorki': ['ZORKI', 'KMZ'],
  };

  const key = frBrand.toLowerCase();
  if (mapping[key]) return mapping[key];
  return [frBrand.toUpperCase()];
}

interface EnDoc {
  id: string;
  title: string;
  slug: string;
  file_path: string;
  description: string | null;
  preview_url: string | null;
  brand: { name: string } | null;
  category: { name: string } | null;
}

interface MatchResult {
  frUrl: string;
  frTitle: string;
  enDoc: EnDoc | null;
  score: number;
  matchMethod: string;
  frDescription: string;
  imageUrl: string | null;
  translatedDescription: string;
  updated: boolean;
  imageUploaded: boolean;
}

function computeMatch(frTitle: string, enDoc: EnDoc): { score: number; method: string } {
  const frTokens = extractTokens(frTitle);
  const enFileTokens = extractTokens(enDoc.file_path.replace(/\//g, ' ').replace(/\.\w+$/, ''));
  const enTitleTokens = extractTokens(enDoc.title);
  const enAllTokens = [...new Set([...enFileTokens, ...enTitleTokens])];

  if (enAllTokens.length === 0 || frTokens.length === 0) return { score: 0, method: 'none' };

  // Count overlapping tokens
  let overlap = 0;
  const matchedTokens: string[] = [];
  for (const ft of frTokens) {
    for (const et of enAllTokens) {
      // Exact match or one contains the other (for model numbers like "gx77" matching "gx77")
      if (ft === et || (ft.length >= 3 && et.length >= 3 && (ft.includes(et) || et.includes(ft)))) {
        overlap++;
        matchedTokens.push(ft);
        break;
      }
    }
  }

  // Score based on overlap relative to the smaller token set
  const minSize = Math.min(frTokens.length, enAllTokens.length);
  if (minSize === 0) return { score: 0, method: 'none' };

  // Require at least 2 matching tokens (or 1 if it's a long model number)
  const hasModelMatch = matchedTokens.some(t => t.length >= 4 && /\d/.test(t));
  if (overlap < 2 && !hasModelMatch) return { score: 0, method: 'none' };

  const score = Math.round((overlap / minSize) * 100);
  return { score, method: `tokens(${matchedTokens.join(',')})` };
}

// ── Translation ──

function translateToEnglish(frText: string): string {
  if (!frText) return '';

  let text = frText;

  // Ordered replacements - longer phrases first to avoid partial matches
  const replacements: [RegExp, string][] = [
    // Document types - compound phrases first
    [/Mode d'emploi d[ée]taill[ée]/gi, 'Detailed user manual'],
    [/Mode d'emploi/gi, 'User manual'],
    [/Manuel de r[ée]paration complet/gi, 'Complete repair manual'],
    [/Manuel de r[ée]paration/gi, 'Repair manual'],
    [/Manuel de d[ée]pannage/gi, 'Service/troubleshooting manual'],
    [/Manuel de service/gi, 'Service manual'],
    [/Manuel d'entretien/gi, 'Maintenance manual'],
    [/Manuel d'utilisation et d'entretien/gi, 'User and maintenance manual'],
    [/Manuel d'utilisation/gi, 'User manual'],
    [/Manuel utilisateur/gi, 'User manual'],
    [/Manuel complet/gi, 'Complete manual'],
    [/Manuel technique/gi, 'Technical manual'],
    [/Notice d'utilisation/gi, 'User guide'],
    [/Notice technique/gi, 'Technical guide'],
    [/Notice utilisateur/gi, 'User guide'],
    [/Documentation technique/gi, 'Technical documentation'],
    [/Documentation compl[eè]te/gi, 'Complete documentation'],
    [/Sch[ée]mas? [ée]lectroniques?/gi, 'Electronic schematics'],
    [/Sch[ée]mas? [ée]lectriques?/gi, 'Wiring diagrams'],
    [/Sch[ée]mas? et c[aâ]blages? [ée]lectriques?/gi, 'Electrical schematics and wiring diagrams'],
    [/Sch[ée]mas?/gi, 'Schematics'],
    [/[EÉ]clat[ée]s? m[ée]caniques?/gi, 'Mechanical exploded views'],
    [/[EÉ]clat[ée]s? avec listes? des pi[eè]ces/gi, 'Exploded views with parts lists'],
    [/[EÉ]clat[ée]s?/gi, 'Exploded views'],
    [/Nomenclature des? pi[eè]ces/gi, 'Parts list'],
    [/Liste des pi[eè]ces/gi, 'Parts list'],
    [/Listing des pi[eè]ces/gi, 'Parts list'],
    [/Catalogue complet des pi[eè]ces d[ée]tach[ée]es/gi, 'Complete spare parts catalog'],
    [/Pi[eè]ces d[ée]tach[ée]es/gi, 'Spare parts'],
    [/Guide de r[ée]paration/gi, 'Repair guide'],
    [/Guide de d[ée]pannage/gi, 'Troubleshooting guide'],
    [/Proc[ée]dures? d'[ée]talonnage/gi, 'Calibration procedures'],
    [/Tutoriel de d[ée]montage complet/gi, 'Complete disassembly tutorial'],
    [/Tutoriel de d[ée]montage/gi, 'Disassembly tutorial'],
    [/Tutoriel de d[ée]pannage/gi, 'Troubleshooting tutorial'],
    [/Tutoriel de r[ée]paration/gi, 'Repair tutorial'],
    [/Revue Moto Technique/gi, 'Motorcycle Technical Review'],
    [/Revue Technique Automobile/gi, 'Automobile Technical Review'],

    // Equipment types
    [/magn[ée]tophones? [àa] bandes?/gi, 'reel-to-reel tape recorder(s)'],
    [/magn[ée]tophones?/gi, 'tape recorder(s)'],
    [/magn[ée]toscopes?/gi, 'VCR(s)'],
    [/appareils? photographiques? professionnels? argentiques?/gi, 'professional film camera(s)'],
    [/appareils? photographiques? argentiques?/gi, 'film camera(s)'],
    [/appareils? photographiques?/gi, 'camera(s)'],
    [/appareils? photos?/gi, 'camera(s)'],
    [/appareil photo/gi, 'camera'],
    [/tron[çc]onneuses?/gi, 'chainsaw(s)'],
    [/tondeuses?/gi, 'lawn mower(s)'],
    [/d[ée]broussailleuses?/gi, 'brush cutter(s)'],
    [/aspirateurs?/gi, 'vacuum cleaner(s)'],
    [/lave-vaisselle/gi, 'dishwasher'],
    [/cam[ée]ra semi-professionnelle/gi, 'semi-professional camcorder'],
    [/cam[ée]ras?/gi, 'camera(s)'],
    [/objectifs?/gi, 'lens(es)'],
    [/projecteurs? de diapositives/gi, 'slide projector(s)'],
    [/projecteurs?/gi, 'projector(s)'],
    [/amplificateurs?/gi, 'amplifier(s)'],
    [/oscilloscopes?/gi, 'oscilloscope(s)'],
    [/multim[eè]tres?/gi, 'multimeter(s)'],
    [/imprimantes?/gi, 'printer(s)'],
    [/t[ée]l[ée]viseurs?/gi, 'television(s)'],
    [/poste radiophonique/gi, 'radio receiver'],
    [/r[ée]cepteur/gi, 'receiver'],
    [/combiné bois/gi, 'woodworking combination machine'],
    [/combin[ée]s? bois/gi, 'woodworking combination machine(s)'],
    [/combin[ée]s?/gi, 'combination machine(s)'],
    [/tourne[- ]disques?/gi, 'turntable(s)'],
    [/machine [àa] coudre/gi, 'sewing machine'],
    [/minuteur de labo/gi, 'darkroom timer'],
    [/pulv[ée]risateurs?/gi, 'sprayer(s)'],
    [/distributeur automatique de nourriture/gi, 'automatic food dispenser'],
    [/alimentation [àa] d[ée]coupage/gi, 'switching power supply'],
    [/cartes?/gi, 'board(s)'],

    // Actions & descriptors
    [/d[ée]pannage/gi, 'troubleshooting'],
    [/r[ée]paration/gi, 'repair'],
    [/entretien/gi, 'maintenance'],
    [/[ée]talonnage/gi, 'calibration'],
    [/d[ée]montage/gi, 'disassembly'],
    [/remontage/gi, 'reassembly'],
    [/r[ée]glages?/gi, 'adjustment(s)'],
    [/montage/gi, 'assembly'],
    [/nettoyage/gi, 'cleaning'],
    [/remplacement/gi, 'replacement'],
    [/restauration/gi, 'restoration'],
    [/recherche de pannes/gi, 'fault finding'],
    [/bloqu[ée]/gi, 'stuck/jammed'],
    [/qui ne d[ée]clenche plus/gi, 'that no longer triggers'],
    [/qui ne d[ée]clenche pas correctement/gi, 'that does not trigger correctly'],
    [/miroir bloqu[ée]? en haut/gi, 'mirror stuck in the up position'],
    [/miroir bloqu[ée]?/gi, 'stuck mirror'],
    [/Changer batterie/gi, 'Replace battery'],

    // Descriptors
    [/permettant la recherche de pannes ou la restauration/gi, 'for fault finding or restoration'],
    [/permettant l'utilisation/gi, 'for use'],
    [/pour l'utilisation/gi, 'for use'],
    [/pour d[ée]couvrir toutes les fonctionnalit[ée]s/gi, 'to discover all features'],
    [/toutes les fonctionnalit[ée]s/gi, 'all features'],
    [/en fran[çc]ais et en italien/gi, 'in French and Italian'],
    [/en fran[çc]ais et en anglais/gi, 'in French and English'],
    [/en fran[çc]ais/gi, 'in French'],
    [/en anglais/gi, 'in English'],
    [/en allemand/gi, 'in German'],
    [/en italien/gi, 'in Italian'],
    [/remarquable/gi, 'remarkable'],
    [/semi-professionnelle?/gi, 'semi-professional'],
    [/professionnel(?:le)?s?/gi, 'professional'],
    [/complet(?:te)?s?/gi, 'complete'],
    [/d[ée]taill[ée]e?s?/gi, 'detailed'],
    [/toutes versions/gi, 'all versions'],
    [/et de ses accessoires/gi, 'and its accessories'],
    [/ses accessoires/gi, 'its accessories'],
    [/de ce/gi, 'of this'],
    [/de cette/gi, 'of this'],
    [/de ces/gi, 'of these'],

    // Quantity / measure
    [/(\d+)\s*pages?/gi, '$1 pages'],

    // Common prepositions and articles (do these LAST to avoid breaking compound phrases)
    [/\bpour\b/gi, 'for'],
    [/\bavec\b/gi, 'with'],
    [/\bsans\b/gi, 'without'],
    [/\bsur\b/gi, 'on'],
    [/\bdans\b/gi, 'in'],
    [/\bou\b/gi, 'or'],
    [/\bet\b/gi, 'and'],
    [/\bdes\b/gi, 'of the'],
    [/\bdu\b/gi, 'of the'],
    [/\bde la\b/gi, 'of the'],
    [/\bde l'/gi, "of the "],
    [/\bd'une?\b/gi, 'of a'],
    [/\bde\b/gi, 'of'],
    [/\bles\b/gi, 'the'],
    [/\bla\b/gi, 'the'],
    [/\ble\b/gi, 'the'],
    [/\bl'/gi, 'the '],
    [/\bun\b/gi, 'a'],
    [/\bune\b/gi, 'a'],
    [/\bce\b/gi, 'this'],
    [/\bcette\b/gi, 'this'],
    [/\bces\b/gi, 'these'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  // Clean up double spaces and capitalize first letter
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

// ── Main ──

async function main() {
  console.log('=== Sync Descriptions v2 - FR → EN ===\n');

  // 1. Fetch all EN documents
  console.log('Fetching EN documents from Supabase...');
  const { data: enDocs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, description, preview_url, category:categories(name), brand:brands(name)')
    .eq('active', true)
    .order('title');

  if (error || !enDocs) {
    console.error('Error:', error);
    return;
  }
  console.log(`  Found ${enDocs.length} EN documents\n`);

  // Index EN docs by brand
  const enByBrand: Record<string, EnDoc[]> = {};
  for (const doc of enDocs) {
    const brandName = doc.brand?.name || 'NO_BRAND';
    if (!enByBrand[brandName]) enByBrand[brandName] = [];
    enByBrand[brandName].push(doc as EnDoc);
  }

  // 2. Fetch FR product URLs
  console.log('Fetching FR product sitemap...');
  const sitemapXml = await fetchUrl('https://la-documentation-technique.eu/product-sitemap.xml');
  const frUrls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = locRegex.exec(sitemapXml)) !== null) {
    frUrls.push(m[1]);
  }
  console.log(`  Found ${frUrls.length} FR products\n`);

  // 3. Process each FR product
  const results: MatchResult[] = [];
  let matched = 0, noMatch = 0, errors = 0, updated = 0, imagesUploaded = 0;

  for (let i = 0; i < frUrls.length; i++) {
    const frUrl = frUrls[i];
    const urlSlug = frUrl.split('/').filter(Boolean).pop() || '';

    try {
      process.stdout.write(`\r  [${i + 1}/${frUrls.length}] ${urlSlug.substring(0, 60).padEnd(60)}`);

      const html = await fetchUrl(frUrl);
      const frTitle = extractProductTitle(html);
      const metaDesc = extractMetaDescription(html);
      const shortDesc = extractShortDescription(html);
      const imageUrl = extractProductImage(html);
      const frDescription = metaDesc || shortDesc;

      if (!frTitle && !frDescription) {
        noMatch++;
        continue;
      }

      // Find brand in FR title
      const frBrand = extractBrandFromFrTitle(frTitle);
      const possibleEnBrands = frBrand ? mapBrandName(frBrand) : [];

      // Collect candidate EN docs (same brand + general)
      let candidates: EnDoc[] = [];
      for (const enBrandName of possibleEnBrands) {
        if (enByBrand[enBrandName]) candidates.push(...enByBrand[enBrandName]);
      }
      // Also check NO_BRAND docs
      if (enByBrand['NO_BRAND']) candidates.push(...enByBrand['NO_BRAND']);

      // If no brand found, search all docs (slower but catch-all)
      if (candidates.length === 0) {
        candidates = enDocs as EnDoc[];
      }

      // Find best match
      let bestDoc: EnDoc | null = null;
      let bestScore = 0;
      let bestMethod = '';

      for (const enDoc of candidates) {
        const { score, method } = computeMatch(frTitle, enDoc);
        if (score > bestScore) {
          bestScore = score;
          bestDoc = enDoc;
          bestMethod = method;
        }
      }

      // Require minimum score of 50
      if (bestScore < 50) {
        bestDoc = null;
        bestMethod = '';
      }

      const translatedDesc = translateToEnglish(frDescription);

      const result: MatchResult = {
        frUrl,
        frTitle,
        enDoc: bestDoc,
        score: bestScore,
        matchMethod: bestMethod,
        frDescription,
        imageUrl,
        translatedDescription: translatedDesc,
        updated: false,
        imageUploaded: false,
      };

      if (bestDoc) {
        matched++;

        // Update description
        const updateData: any = {};
        if (translatedDesc) {
          updateData.description = translatedDesc;
        }

        // Upload preview image if the EN doc doesn't have one and FR has one
        if (imageUrl && !bestDoc.preview_url) {
          try {
            const imgBuffer = await fetchBuffer(imageUrl);
            const ext = imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
            const storagePath = `previews/${bestDoc.slug}.${ext}`;

            const { error: uploadErr } = await supabase.storage
              .from('logos')
              .upload(storagePath, imgBuffer, {
                contentType: ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
                upsert: true,
              });

            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
              updateData.preview_url = urlData.publicUrl;
              result.imageUploaded = true;
              imagesUploaded++;
            } else {
              console.log(`\n    ⚠ Image upload failed for ${bestDoc.title}: ${uploadErr.message}`);
            }
          } catch (imgErr: any) {
            console.log(`\n    ⚠ Image download failed: ${imgErr.message}`);
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateErr } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', bestDoc.id);

          if (!updateErr) {
            result.updated = true;
            updated++;
          } else {
            console.log(`\n    ✗ Update failed for ${bestDoc.title}: ${updateErr.message}`);
          }
        }
      } else {
        noMatch++;
      }

      results.push(result);

      // Rate limiting
      await sleep(300);

    } catch (err: any) {
      errors++;
      console.log(`\n    ✗ Error on ${urlSlug}: ${err.message}`);
    }
  }

  // Save results
  const outputPath = 'scripts/sync-results-v2.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n\n=== Results ===`);
  console.log(`  Matched: ${matched}`);
  console.log(`  No match: ${noMatch}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Updated (desc): ${updated}`);
  console.log(`  Images uploaded: ${imagesUploaded}`);
  console.log(`  Results saved to ${outputPath}`);

  // Show unmatched for review
  const unmatched = results.filter(r => !r.enDoc);
  if (unmatched.length > 0) {
    console.log(`\n  --- Unmatched FR products (${unmatched.length}) ---`);
    unmatched.forEach(r => console.log(`    ${r.frTitle}`));
  }

  // Show matched with low scores
  const lowScore = results.filter(r => r.enDoc && r.score < 70);
  if (lowScore.length > 0) {
    console.log(`\n  --- Low confidence matches (${lowScore.length}) ---`);
    lowScore.forEach(r => console.log(`    [${r.score}] FR: ${r.frTitle} → EN: ${r.enDoc?.title} (${r.matchMethod})`));
  }

  // Check for duplicate EN doc targets
  const enIdCounts: Record<string, { count: number; frTitles: string[] }> = {};
  results.filter(r => r.enDoc).forEach(r => {
    const id = r.enDoc!.id;
    if (!enIdCounts[id]) enIdCounts[id] = { count: 0, frTitles: [] };
    enIdCounts[id].count++;
    enIdCounts[id].frTitles.push(r.frTitle);
  });
  const dupes = Object.entries(enIdCounts).filter(([_, v]) => v.count > 1);
  if (dupes.length > 0) {
    console.log(`\n  --- EN docs matched by multiple FR products (${dupes.length}) ---`);
    dupes.forEach(([id, v]) => {
      const enDoc = results.find(r => r.enDoc?.id === id);
      console.log(`    EN: ${enDoc?.enDoc?.title} (${v.count} matches)`);
      v.frTitles.forEach(t => console.log(`      ← ${t}`));
    });
  }
}

main().catch(console.error);
