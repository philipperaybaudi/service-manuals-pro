/**
 * Download and upload preview images for documents that don't have one.
 * Uses the FR site product images matched by brand + model keywords.
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Known image URLs from the v2 sync results for unmatched docs
// We'll try to find these by searching the FR site
const manualImageMappings: Record<string, string> = {
  // Grundig - use the same Satellit image for all Grundig docs
  '1': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '2': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '3': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '4': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '5': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '6': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '7': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  '8': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  'Satellit 1400 SL': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
  'GRUNDIG 1400 SL PRO schema': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/SATELLIT-1400_WEB.jpg',
};

async function main() {
  console.log('=== Fix Missing Preview Images ===\n');

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, preview_url, brand:brands(name)')
    .eq('active', true)
    .is('preview_url', null);

  if (error || !docs) { console.error(error); return; }

  console.log(`Documents without preview: ${docs.length}\n`);

  // Load v2 sync results to find image URLs for matched docs
  const fs = require('fs');
  let syncResults: any[] = [];
  try {
    syncResults = JSON.parse(fs.readFileSync('scripts/sync-results-v2.json', 'utf8'));
  } catch (e) {
    console.log('Could not load sync-results-v2.json');
  }

  // Build map from EN doc IDs to FR image URLs
  const imageMap: Record<string, string> = {};
  syncResults.forEach((r: any) => {
    if (r.enDoc && r.imageUrl) {
      imageMap[r.enDoc.id] = r.imageUrl;
    }
  });

  let uploaded = 0;

  for (const doc of docs) {
    let imageUrl = imageMap[doc.id] || manualImageMappings[doc.title];

    if (!imageUrl) {
      // Try to find image by searching FR site for the brand/model
      const title = doc.title.toLowerCase();
      const brand = doc.brand?.name || '';

      // Try known FR upload paths based on brand
      const brandImagePaths: Record<string, string> = {
        'POLARIS': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Polaris.jpg',
        'SUZUKI': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Suzuki_Samourai.jpg',
        'ROWENTA': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/RH8771.jpg',
        'VESTEL': 'https://la-documentation-technique.eu/wp-content/uploads/2019/02/Vestel_17PW25-4.jpg',
        'CITROEN': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/citroen_xsara_picasso.jpg',
        'CONTAX': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Contax_139_quartz.jpg',
        'MINOX': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/minox.jpg',
        'ZORKI': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Zorki_4.jpg',
        'MINOLTA': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Minolta_TC1.jpg',
        'FLASH': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Flash_SunPak.jpg',
        'CANON': 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/Canonet_28.jpg',
      };

      imageUrl = brandImagePaths[brand];
    }

    if (!imageUrl) {
      console.log(`  ⚠ No image found for: ${doc.title} (${doc.brand?.name || 'no brand'})`);
      continue;
    }

    try {
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
        } else {
          console.log(`  ✗ DB update failed for ${doc.title}: ${updateErr.message}`);
        }
      } else {
        console.log(`  ✗ Upload failed for ${doc.title}: ${uploadErr.message}`);
      }

      await sleep(200);
    } catch (err: any) {
      console.log(`  ✗ Download failed for ${doc.title}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${uploaded} preview images uploaded`);
}

main().catch(console.error);
