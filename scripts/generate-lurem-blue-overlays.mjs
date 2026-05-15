// Generate proper blue overlays for all LUREM documents
// Usage: node scripts/generate-lurem-blue-overlays.mjs

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

const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc';

function createLuremOverlay(title) {
  const W = 1000, H = 1400;
  const cvs = canvas.createCanvas(W, H);
  const ctx = cvs.getContext('2d');

  // Deep blue background
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(0, 0, W, H);

  // Large LUREM branding at top
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 120px Arial, sans-serif';
  ctx.fillText('LUREM', W / 2, H * 0.15);

  // Light blue separator line
  ctx.strokeStyle = '#64B5F6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.25);
  ctx.lineTo(W * 0.8, H * 0.25);
  ctx.stroke();

  // Document title - larger font, word wrapped
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillStyle = '#FFF';

  const words = title.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > W * 0.8) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = 70;
  const startY = H * 0.35;
  const totalHeight = lines.length * lineHeight;
  const centerY = startY + (totalHeight / 2);

  lines.forEach((line, i) => {
    const y = centerY - (totalHeight / 2) + i * lineHeight + lineHeight / 2;
    ctx.fillText(line, W / 2, y);
  });

  // Bottom section with document info
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, H * 0.65, W, H * 0.35);

  ctx.fillStyle = '#FFF';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('Technical Documentation', W / 2, H * 0.8);

  ctx.font = '24px Arial, sans-serif';
  ctx.fillStyle = '#B3E5FC';
  ctx.fillText('Service Manuals Pro', W / 2, H * 0.95);

  return cvs.toBuffer('image/jpeg', { quality: 0.92 });
}

(async () => {
  console.log('Generating proper blue overlays for all LUREM documents...\n');

  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, slug, preview_url')
    .eq('brand_id', BRAND_ID)
    .order('created_at', { ascending: false })
    .limit(28);

  console.log(`Found ${docs.length} LUREM documents\n`);

  let updated = 0;
  let errors = 0;

  for (const doc of docs) {
    console.log(`${doc.title}`);

    try {
      const overlay = createLuremOverlay(doc.title);
      const previewPath = `previews/${doc.slug}.jpg`;

      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: previewPath,
        Body: overlay,
        ContentType: 'image/jpeg'
      }));

      if (!doc.preview_url || doc.preview_url !== previewPath) {
        await supabase
          .from('documents')
          .update({ preview_url: previewPath })
          .eq('id', doc.id);
      }

      console.log(`  ✅ Overlay created (${(overlay.length / 1024).toFixed(0)} KB)\n`);
      updated++;
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}\n`);
      errors++;
    }
  }

  console.log('='.repeat(100));
  console.log(`\nResults:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${docs.length}\n`);
})();
