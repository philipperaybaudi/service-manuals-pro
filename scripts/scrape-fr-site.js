/**
 * Phase 1: Scrape ALL product data from the French site.
 * Saves results to scripts/fr-products.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 25000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchUrl(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); res.on('error', reject);
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function htmlDecode(str) {
  return str
    .replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '...').replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&').replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/&#215;/g, '×')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à').replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô').replace(/&ucirc;/g, 'û')
    .replace(/&icirc;/g, 'î').replace(/&ecirc;/g, 'ê')
    .replace(/&acirc;/g, 'â').replace(/&uuml;/g, 'ü')
    .replace(/&#8364;/g, '€');
}

function extractImage(html) {
  const m = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/);
  return m ? m[1].replace(/-\d+x\d+\./, '.') : null;
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*class="product_title[^"]*"[^>]*>([^<]+)<\/h1>/);
  return m ? htmlDecode(m[1].trim()) : null;
}

function extractPrice(html) {
  // Check for sale price first
  const sale = html.match(/<ins>[\s\S]*?woocommerce-Price-amount[^>]*>[\s\S]*?(\d+[,\.]\d+)/);
  if (sale) return parseFloat(sale[1].replace(',', '.'));
  // Single price
  const single = html.match(/<p class="price">[\s\S]*?woocommerce-Price-amount[^>]*>[\s\S]*?(\d+[,\.]\d+)/);
  if (single) return parseFloat(single[1].replace(',', '.'));
  // Any price
  const any = html.match(/woocommerce-Price-amount[^>]*>[\s\S]*?(\d+[,\.]\d+)/);
  if (any) return parseFloat(any[1].replace(',', '.'));
  return 0;
}

function extractLongDescription(html) {
  const tab = html.match(/<div[^>]*id="tab-description"[^>]*>([\s\S]*?)<\/div>/);
  if (!tab) return null;
  let content = tab[1];
  // Remove <h2>Description</h2>
  content = content.replace(/<h2>Description<\/h2>/i, '');
  // Cut at first <figure> (secondary photos)
  content = content.replace(/<figure[\s\S]*/i, '');
  // Cut at first standalone <img (not in figure)
  content = content.replace(/<a[^>]*><img[\s\S]*/i, '');
  // Decode HTML entities
  content = htmlDecode(content);
  // Clean up bold/italic tags but keep structure (p, h3, ul, li)
  content = content.replace(/<strong>/g, '').replace(/<\/strong>/g, '');
  content = content.replace(/<em>/g, '').replace(/<\/em>/g, '');
  // Remove "En téléchargement..." lines
  content = content.replace(/<p>[^<]*[Ee]n téléchargement[^<]*<\/p>/g, '');
  content = content.replace(/<p><span[^>]*>[^<]*téléchargement[^<]*<\/span><\/p>/g, '');
  content = content.replace(/<p><span[\s\S]*?téléchargement[\s\S]*?<\/p>/g, '');
  return content.trim();
}

function extractShortDescription(html) {
  const m = html.match(/<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/);
  if (!m) return '';
  let desc = m[1];
  desc = desc.replace(/<[^>]*>[^<]*téléchargement[^<]*<\/[^>]*>/gi, '');
  desc = desc.replace(/<p><span[\s\S]*?téléchargement[\s\S]*?<\/p>/g, '');
  desc = htmlDecode(desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  desc = desc.replace(/\s*En téléchargement.*/i, '').trim();
  return desc;
}

async function main() {
  console.log('=== Phase 1: Scraping FR Site ===\n');

  // 1. Get sitemap
  console.log('Fetching product sitemap...');
  const sitemap = await fetchUrl('https://la-documentation-technique.eu/product-sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`Found ${urls.length} product URLs\n`);

  const products = [];
  let processed = 0, errors = 0;

  for (const url of urls) {
    const slug = url.split('/produit/')[1]?.replace(/\/$/, '') || url;
    try {
      const html = await fetchUrl(url);
      const title = extractTitle(html);
      const price = extractPrice(html);
      const image = extractImage(html);
      const longDesc = extractLongDescription(html);
      const shortDesc = extractShortDescription(html);

      products.push({
        slug,
        url,
        title,
        price,
        image,
        longDesc,
        shortDesc,
      });

      processed++;
      if (processed % 20 === 0) console.log(`  ${processed}/${urls.length} scraped...`);
    } catch (err) {
      console.log(`  ✗ ${slug}: ${err.message}`);
      errors++;
    }
    await sleep(200); // Be polite
  }

  // Save to JSON
  const outPath = path.join(__dirname, 'fr-products.json');
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2), 'utf-8');

  console.log(`\nDone! ${processed} products scraped, ${errors} errors.`);
  console.log(`Saved to ${outPath}`);

  // Quick stats
  const withDesc = products.filter(p => p.longDesc && p.longDesc.length > 20).length;
  const withPrice = products.filter(p => p.price > 0).length;
  const withImage = products.filter(p => p.image).length;
  console.log(`\nStats: ${withDesc} with long description, ${withPrice} with price, ${withImage} with image`);
}

main().catch(console.error);
