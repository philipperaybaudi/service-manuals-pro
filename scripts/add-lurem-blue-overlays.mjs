// Add blue overlays for LUREM documents without previews
// Usage: node scripts/add-lurem-blue-overlays.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const canvas = require('canvas');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc'; // LUREM

function generateBlueOverlay(title) {
  const W = 800, H = 1100;
  const cvs = canvas.createCanvas(W, H);
  const ctx = cvs.getContext('2d');

  // Light gray background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  // Blue overlay band
  ctx.fillStyle = 'rgba(30,58,138,0.88)';
  ctx.fillRect(0, H * 0.35, W, H * 0.30);

  // White text
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px Arial';

  // Split title into lines if too long
  const words = title.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length > 30) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw title lines
  const lH = 45;
  const sY = H * 0.5 - ((lines.length - 1) * lH) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, sY + i * lH);
  });

  // LUREM branding at top
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('LUREM', W / 2, H * 0.18);

  return cvs.toBuffer('image/jpeg', { quality: 0.88 });
}

(async () => {
  console.log('Adding blue overlays to LUREM documents...\n');

  // Get 28 most recent LUREM documents
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, slug, preview_url')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(28);

  console.log(`Found ${docs.length} recent LUREM documents\n`);

  let added = 0;
  let errors = 0;

  for (const doc of docs) {
    console.log(`Processing: ${doc.title}`);

    try {
      // Generate blue overlay
      const overlayBuf = generateBlueOverlay(doc.title);
      const previewPath = `previews/${doc.slug}.jpg`;

      // Upload to R2
      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: previewPath,
        Body: overlayBuf,
        ContentType: 'image/jpeg'
      }));

      // Update database if preview_url is missing or null
      if (!doc.preview_url) {
        await supabase
          .from('documents')
          .update({ preview_url: previewPath })
          .eq('id', doc.id);
      }

      console.log(`  ✅ Blue overlay added`);
      added++;
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
      errors++;
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log(`\nResults:`);
  console.log(`  Added: ${added}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${docs.length}\n`);
})();
