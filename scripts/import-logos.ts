import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Logos from the French site for brands missing logos
const LOGOS_TO_IMPORT: { brandName: string; logoUrl: string; ext: string }[] = [
  { brandName: 'BOMBARDIER', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/logo-bombardier.png', ext: 'png' },
  { brandName: 'CANON', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/01/logo-canon.png', ext: 'png' },
  { brandName: 'CITROEN', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/logo-citroen-300x300.jpg', ext: 'jpg' },
  { brandName: 'CONTI', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/logo-conti-300x140.jpg', ext: 'jpg' },
  { brandName: 'DE DIETRICH', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/de-dietrich.jpg', ext: 'jpg' },
  { brandName: 'FLASH', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2021/12/flash-300x300.jpg', ext: 'jpg' },
  { brandName: 'FOCA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/foca.jpg', ext: 'jpg' },
  { brandName: 'FUJICA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/fujica.jpg', ext: 'jpg' },
  { brandName: 'GRUNDIG', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/grundig.gif', ext: 'gif' },
  { brandName: 'HAMEG', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/logo-hameg-300x300.jpg', ext: 'jpg' },
  { brandName: 'HASSELBALD', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/hasselblad.png', ext: 'png' },
  { brandName: 'HEURTIER', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/heurtier-300x300.jpg', ext: 'jpg' },
  { brandName: 'iPHONE', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/03/logo-iphone.png', ext: 'png' },
  { brandName: 'KAVO', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/logo-kavo.gif', ext: 'gif' },
  { brandName: 'KODAK', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/02/raw-300x300.jpeg', ext: 'jpeg' },
  { brandName: 'LEICA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/leica.png', ext: 'png' },
  { brandName: 'MIDLAND', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/02/Midland-Radio-300x300.png', ext: 'png' },
  { brandName: 'MINOX', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2025/12/Minox_Logo.jpg', ext: 'jpg' },
  { brandName: 'NAGRA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/nagra-300x300.jpg', ext: 'jpg' },
  { brandName: 'NIKON', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/nikon.png', ext: 'png' },
  { brandName: 'PENTAX', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/pentax-300x300.jpg', ext: 'jpg' },
  { brandName: 'PIONEER', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/pioneer.png', ext: 'png' },
  { brandName: 'RENAULT', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/renault-logo.jpg', ext: 'jpg' },
  { brandName: 'ROLLEI', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/01/Logo-Rollei-300x300.png', ext: 'png' },
  { brandName: 'SIMCA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/simca-300x300.png', ext: 'png' },
  { brandName: 'SONY', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/sony-300x300.jpg', ext: 'jpg' },
  { brandName: 'Sony KDL-55X4500', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/sony-logo-tv-300x300.jpg', ext: 'jpg' },
  { brandName: 'STUDER REVOX', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/08/revox.jpg', ext: 'jpg' },
  { brandName: 'SUZUKI', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/logo-suzuki-300x300.png', ext: 'png' },
  { brandName: 'TOYOTA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2018/07/logo-Toyota-300x300.png', ext: 'png' },
  { brandName: 'VESTEL', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2019/09/logo-vestel.png', ext: 'png' },
  { brandName: 'YAMAHA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/11/Logo_Yamaha-300x300.jpg', ext: 'jpg' },
  { brandName: 'YAESU', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2017/09/yaesu.png', ext: 'png' },
  { brandName: 'ZENZA BRONICA', logoUrl: 'https://la-documentation-technique.eu/wp-content/uploads/2023/03/logo-bronica-300x300.jpg', ext: 'jpg' },
];

function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('=== Import Brand Logos from French Site ===\n');

  // Get all brands from DB
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, slug, logo_url');

  if (error) {
    console.error('Error fetching brands:', error);
    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const logo of LOGOS_TO_IMPORT) {
    const brand = brands?.find(b => b.name === logo.brandName);
    if (!brand) {
      console.log(`  ⚠ Brand "${logo.brandName}" not found in DB — skipping`);
      skipped++;
      continue;
    }

    if (brand.logo_url) {
      console.log(`  ⏭ ${brand.name} already has logo — skipping`);
      skipped++;
      continue;
    }

    try {
      console.log(`  ⬇ Downloading logo for ${brand.name}...`);
      const buffer = await downloadFile(logo.logoUrl);

      const storagePath = `brands/${brand.slug}.${logo.ext}`;
      const contentType = logo.ext === 'png' ? 'image/png'
        : logo.ext === 'gif' ? 'image/gif'
        : 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`  ✗ Upload failed for ${brand.name}:`, uploadError.message);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(storagePath);

      const { error: updateError } = await supabase
        .from('brands')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', brand.id);

      if (updateError) {
        console.error(`  ✗ DB update failed for ${brand.name}:`, updateError.message);
        failed++;
        continue;
      }

      console.log(`  ✓ ${brand.name} — logo imported`);
      imported++;

    } catch (err: any) {
      console.error(`  ✗ Failed for ${brand.name}:`, err.message);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
