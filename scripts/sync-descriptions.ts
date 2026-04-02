/**
 * Script to sync product descriptions and images from the French site
 * to the English service-manuals-pro Supabase database.
 *
 * Strategy:
 * 1. Get all product URLs from the FR sitemap
 * 2. For each FR product, extract: short description, full description (before "Liste des documentations"), product image
 * 3. Match to EN documents by title/filename similarity
 * 4. Update Supabase with translated description + image URL
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FR_SITEMAP = 'https://la-documentation-technique.eu/product-sitemap.xml';

// ── Helpers ──

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 15000
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
    }).on('error', reject);
  });
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function htmlDecode(str: string): string {
  return str
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractShortDescription(html: string): string {
  const match = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/);
  if (!match) return '';
  let desc = match[1];
  // Remove the "En téléchargement immédiat..." line
  desc = desc.replace(/<p><span[^>]*>En.*?téléchargement.*?<\/span><\/p>/gi, '');
  desc = desc.replace(/<p><span[^>]*>En.*?t.l.chargement.*?<\/span><\/p>/gi, '');
  return htmlDecode(desc);
}

function extractFullDescription(html: string): string {
  // Get content from description tab
  const tabMatch = html.match(/id="tab-description"[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|<div[^>]*id="tab-title-)/);
  if (!tabMatch) return '';

  let desc = tabMatch[1];
  // Remove the <h2>Description</h2> header
  desc = desc.replace(/<h2>Description<\/h2>/i, '');
  // Remove sharing buttons
  desc = desc.replace(/<div class="a2a_kit[\s\S]*?<\/div>/gi, '');
  // Remove gtranslate
  desc = desc.replace(/<div class="gtranslate[\s\S]*?<\/div>/gi, '');
  // Remove script tags
  desc = desc.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Cut before "Liste des documentations disponibles"
  const listIdx = desc.search(/Liste des documentations disponibles/i);
  if (listIdx > 0) {
    desc = desc.substring(0, listIdx);
    // Clean up: remove the last incomplete tag
    const lastPClose = desc.lastIndexOf('</p>');
    const lastH = desc.lastIndexOf('</h');
    const cutPoint = Math.max(lastPClose + 4, lastH > 0 ? desc.indexOf('>', lastH) + 1 : 0);
    if (cutPoint > 0) desc = desc.substring(0, cutPoint);
  }

  return htmlDecode(desc);
}

function extractProductImage(html: string): string | null {
  // Try to find OG image
  const ogMatch = html.match(/<meta property="og:image"\s+content="([^"]+)"/);
  if (ogMatch) return ogMatch[1];

  // Try JSON-LD image
  const jsonMatch = html.match(/"image"\s*:\s*"(https:\/\/la-documentation-technique\.eu\/wp-content\/uploads\/[^"]+)"/);
  if (jsonMatch) return jsonMatch[1];

  // Try product image
  const imgMatch = html.match(/class="woocommerce-product-gallery__image"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];

  return null;
}

function extractProductTitle(html: string): string {
  const match = html.match(/<h1[^>]*class="product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  if (match) return htmlDecode(match[1]);
  return '';
}

// Simple French to English translation of common terms in descriptions
function translateDescription(fr: string): string {
  let en = fr;

  // Common patterns
  const translations: [RegExp, string][] = [
    // Document types
    [/Documentation technique/gi, 'Technical documentation'],
    [/Documentation complète/gi, 'Complete documentation'],
    [/Documentation pour/gi, 'Documentation for'],
    [/documentation/gi, 'documentation'],
    [/Manuel de réparation/gi, 'Repair manual'],
    [/Manuel de dépannage/gi, 'Service manual'],
    [/Manuel de service/gi, 'Service manual'],
    [/Manuel d'entretien/gi, 'Maintenance manual'],
    [/Manuel d'utilisation/gi, 'User manual'],
    [/Manuel utilisateur/gi, 'User manual'],
    [/Manuel complet/gi, 'Complete manual'],
    [/Manuel technique/gi, 'Technical manual'],
    [/Mode d'emploi/gi, 'User manual'],
    [/Notice d'utilisation/gi, 'User guide'],
    [/Notice technique/gi, 'Technical notice'],
    [/Notice/gi, 'User guide'],
    [/Schémas électroniques/gi, 'Electronic schematics'],
    [/Schémas électriques/gi, 'Wiring diagrams'],
    [/Schémas/gi, 'Schematics'],
    [/Éclatés mécaniques/gi, 'Mechanical exploded views'],
    [/Éclaté mécanique/gi, 'Mechanical exploded view'],
    [/Nomenclature de pièces/gi, 'Parts list'],
    [/Procédures d'étalonnage/gi, 'Calibration procedures'],
    [/Guide de réparation/gi, 'Repair guide'],
    [/Guide de dépannage/gi, 'Troubleshooting guide'],

    // Equipment
    [/magnétophone[s]? à bandes?/gi, 'reel-to-reel tape recorder'],
    [/magnétophone[s]?/gi, 'tape recorder'],
    [/magnétoscope[s]?/gi, 'VCR'],
    [/appareil[s]? photo/gi, 'camera'],
    [/objectif[s]?/gi, 'lens'],
    [/tronçonneuse[s]?/gi, 'chainsaw'],
    [/tondeuse[s]?/gi, 'lawn mower'],
    [/débroussailleuse[s]?/gi, 'brush cutter'],
    [/aspirateur[s]?/gi, 'vacuum cleaner'],
    [/lave-vaisselle/gi, 'dishwasher'],
    [/four/gi, 'oven'],
    [/chaudière/gi, 'boiler'],
    [/radiateur/gi, 'heater'],
    [/moteur/gi, 'engine'],
    [/projecteur/gi, 'projector'],
    [/ampli(?:ficateur)?/gi, 'amplifier'],
    [/platine/gi, 'turntable'],
    [/oscilloscope/gi, 'oscilloscope'],
    [/multimètre/gi, 'multimeter'],
    [/imprimante/gi, 'printer'],
    [/ordinateur/gi, 'computer'],
    [/téléviseur/gi, 'television'],
    [/télévision/gi, 'television'],
    [/caméra/gi, 'camera'],
    [/drone/gi, 'drone'],
    [/moto(?:cyclette)?/gi, 'motorcycle'],
    [/voiture/gi, 'car'],

    // Actions
    [/dépannage/gi, 'troubleshooting'],
    [/réparation/gi, 'repair'],
    [/entretien/gi, 'maintenance'],
    [/étalonnage/gi, 'calibration'],
    [/démontage/gi, 'disassembly'],
    [/remontage/gi, 'reassembly'],
    [/réglage[s]?/gi, 'adjustment'],
    [/montage/gi, 'assembly'],
    [/nettoyage/gi, 'cleaning'],
    [/remplacement/gi, 'replacement'],
    [/mise à jour/gi, 'update'],

    // Other
    [/pages?/gi, 'page(s)'],
    [/avec/gi, 'with'],
    [/pour/gi, 'for'],
    [/et/gi, 'and'],
    [/ou/gi, 'or'],
    [/du/gi, 'of the'],
    [/de la/gi, 'of the'],
    [/des/gi, 'of the'],
    [/de/gi, 'of'],
    [/le/gi, 'the'],
    [/la/gi, 'the'],
    [/les/gi, 'the'],
    [/un/gi, 'a'],
    [/une/gi, 'a'],
    [/en/gi, 'in'],
    [/ce/gi, 'this'],
    [/cette/gi, 'this'],
    [/ces/gi, 'these'],
  ];

  // Don't do word-by-word translation - it's too error-prone
  // Instead, just use the Yoast meta description which is already a good summary
  return en;
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta name="description" content="([^"]+)"/);
  if (match) return htmlDecode(match[1]);
  return '';
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

function matchScore(frTitle: string, enTitle: string): number {
  const frNorm = normalize(frTitle);
  const enNorm = normalize(enTitle);

  // Exact match
  if (frNorm === enNorm) return 100;

  // Check if one contains the other
  if (frNorm.includes(enNorm) || enNorm.includes(frNorm)) return 80;

  // Word overlap
  const frWords = new Set(frNorm.split(' ').filter(w => w.length > 2));
  const enWords = new Set(enNorm.split(' ').filter(w => w.length > 2));

  let overlap = 0;
  frWords.forEach(w => { if (enWords.has(w)) overlap++; });

  const maxWords = Math.max(frWords.size, enWords.size);
  if (maxWords === 0) return 0;

  return Math.round((overlap / maxWords) * 100);
}

// ── Main ──

async function main() {
  console.log('=== Sync Descriptions from FR to EN ===\n');

  // 1. Get all EN documents
  console.log('Fetching EN documents from Supabase...');
  const { data: enDocs, error } = await supabase
    .from('documents')
    .select('id, title, slug, description, preview_url, file_path, category:categories(name), brand:brands(name)')
    .eq('active', true)
    .order('title');

  if (error || !enDocs) {
    console.error('Error:', error);
    return;
  }
  console.log(`  Found ${enDocs.length} EN documents\n`);

  // 2. Get FR product URLs
  console.log('Fetching FR product sitemap...');
  const sitemapXml = await fetchUrl(FR_SITEMAP);
  const frUrls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = locRegex.exec(sitemapXml)) !== null) {
    frUrls.push(m[1]);
  }
  console.log(`  Found ${frUrls.length} FR products\n`);

  // 3. Process each FR product
  let updated = 0;
  let matched = 0;
  let noMatch = 0;
  let errors = 0;

  const results: { frUrl: string; frTitle: string; enId?: string; enTitle?: string; score: number; description: string; imageUrl?: string }[] = [];

  for (let i = 0; i < frUrls.length; i++) {
    const frUrl = frUrls[i];
    const urlSlug = frUrl.split('/').filter(Boolean).pop() || '';

    try {
      process.stdout.write(`\r  [${i + 1}/${frUrls.length}] Processing: ${urlSlug.substring(0, 50)}...`);

      const html = await fetchUrl(frUrl);

      const frTitle = extractProductTitle(html);
      const shortDesc = extractShortDescription(html);
      const metaDesc = extractMetaDescription(html);
      const imageUrl = extractProductImage(html);

      // Use meta description as it's a clean summary
      const description = metaDesc || shortDesc;

      if (!description && !imageUrl) {
        noMatch++;
        continue;
      }

      // Find best matching EN document
      let bestMatch: typeof enDocs[0] | null = null;
      let bestScore = 0;

      for (const enDoc of enDocs) {
        // Try matching by title
        const score = matchScore(frTitle, enDoc.title);

        // Also try matching URL slug to storage key
        const enStorageNorm = normalize(enDoc.file_path || '');
        const frUrlNorm = normalize(urlSlug);
        const keyScore = matchScore(frUrlNorm, enStorageNorm);

        const finalScore = Math.max(score, keyScore);

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestMatch = enDoc;
        }
      }

      if (bestMatch && bestScore >= 40) {
        matched++;
        results.push({
          frUrl,
          frTitle,
          enId: bestMatch.id,
          enTitle: bestMatch.title,
          score: bestScore,
          description,
          imageUrl: imageUrl || undefined,
        });
      } else {
        noMatch++;
        results.push({
          frUrl,
          frTitle,
          score: bestScore,
          description,
          imageUrl: imageUrl || undefined,
        });
      }

      // Rate limiting
      await sleep(200);

    } catch (err: any) {
      errors++;
      process.stdout.write(`\n    ✗ Error: ${err.message}\n`);
    }
  }

  console.log(`\n\n=== Matching Results ===`);
  console.log(`  Matched: ${matched}`);
  console.log(`  No match: ${noMatch}`);
  console.log(`  Errors: ${errors}`);

  // Save results to file for review
  const outputPath = 'scripts/sync-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results saved to ${outputPath}`);

  // 4. Apply updates for high-confidence matches
  console.log('\n=== Applying Updates (score >= 50) ===\n');

  const highConfidence = results.filter(r => r.enId && r.score >= 50);

  for (const result of highConfidence) {
    try {
      const updateData: any = {};

      if (result.description) {
        updateData.description = result.description;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('documents')
          .update(updateData)
          .eq('id', result.enId);

        if (updateError) {
          console.log(`  ✗ ${result.enTitle}: ${updateError.message}`);
        } else {
          console.log(`  ✓ ${result.enTitle} (score: ${result.score})`);
          updated++;
        }
      }
    } catch (err: any) {
      console.log(`  ✗ ${result.enTitle}: ${err.message}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Total matched: ${matched}`);
}

main().catch(console.error);
