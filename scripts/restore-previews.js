/**
 * Restore preview images by re-downloading from FR site.
 * Uses FR_TO_EN mapping (reversed) to find the correct FR product image for each EN doc.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));
const frBySlug = {};
frProducts.forEach(p => { frBySlug[p.slug] = p; });

// Extract the FR_TO_EN map from fix-descriptions-v2.js by reading it as text and eval
const fixDescCode = fs.readFileSync(path.join(__dirname, 'fix-descriptions-v2.js'), 'utf-8');
const mapMatch = fixDescCode.match(/const FR_TO_EN = \{([\s\S]*?)\n\};/);
let FR_TO_EN = {};
if (mapMatch) {
  try {
    FR_TO_EN = eval('({' + mapMatch[1] + '})');
  } catch (e) {
    console.error('Failed to parse FR_TO_EN from fix-descriptions-v2.js:', e.message);
  }
}

// Build reverse: EN slug → FR slug
const enToFr = {};
for (const [frSlug, enSlug] of Object.entries(FR_TO_EN)) {
  if (enSlug && !enToFr[enSlug]) {
    enToFr[enSlug] = frSlug;
  }
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('=== RESTORE PREVIEW IMAGES ===\n');
  console.log(`FR_TO_EN entries: ${Object.keys(FR_TO_EN).length}`);
  console.log(`EN→FR reverse entries: ${Object.keys(enToFr).length}\n`);

  const { data: docs } = await sb.from('documents')
    .select('id, slug, title, preview_url')
    .eq('active', true)
    .order('slug');

  console.log(`Active docs: ${docs.length}`);

  // Token matching for docs not in manual map
  const STOP = new Set(['de','du','la','le','les','des','un','une','et','en','a','au','pour','par','sur','dans','notice','manuel','manual','mode','emploi','service','hd','bd','fr','gb','copie','tome']);
  function tok(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w));
  }

  // Build full EN→FR image URL mapping
  const enToImage = {};

  for (const doc of docs) {
    // 1. Check manual map
    const frSlug = enToFr[doc.slug];
    if (frSlug && frBySlug[frSlug] && frBySlug[frSlug].image) {
      enToImage[doc.slug] = frBySlug[frSlug].image;
      continue;
    }

    // 2. Token matching fallback
    const enTokens = tok(doc.slug + ' ' + doc.title);
    let bestFr = null;
    let bestScore = 0;

    for (const fr of frProducts) {
      if (!fr.image) continue;
      const frTokens = tok(fr.slug + ' ' + fr.title);
      const setA = new Set(enTokens);
      const overlap = frTokens.filter(t => setA.has(t)).length;
      const score = (2 * overlap) / (setA.size + frTokens.length);
      if (score > bestScore) {
        bestScore = score;
        bestFr = fr;
      }
    }

    if (bestScore >= 0.20 && bestFr) {
      enToImage[doc.slug] = bestFr.image;
    }
  }

  const matched = Object.keys(enToImage).length;
  console.log(`Matched to FR images: ${matched}`);

  const unmatched = docs.filter(d => !enToImage[d.slug]);
  if (unmatched.length > 0) {
    console.log(`Unmatched: ${unmatched.length}`);
    for (const d of unmatched) console.log(`  - ${d.slug}`);
  }

  // Restore images
  let restored = 0, failed = 0;

  for (const doc of docs) {
    const frImageUrl = enToImage[doc.slug];
    if (!frImageUrl) { failed++; continue; }

    // Extract filename from preview_url
    const urlParts = doc.preview_url.split('/');
    const filename = urlParts[urlParts.length - 1];

    try {
      const imageData = await downloadImage(frImageUrl);
      const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

      const { error } = await sb.storage.from('logos').upload(
        'previews/' + filename,
        imageData,
        { contentType, upsert: true }
      );

      if (error) {
        console.log(`  ERROR ${doc.slug}: ${error.message}`);
        failed++;
      } else {
        restored++;
        if (restored % 20 === 0) console.log(`  ... ${restored} restored`);
      }
    } catch (e) {
      console.log(`  DOWNLOAD ERROR ${doc.slug}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nRestored: ${restored}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
