// FINAL CORRECT LUREM IMPORT
// Récupère PDFs source + prix site français + descriptions + illustrations
// Usage: node scripts/import-lurem-final-correct.mjs

import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pdfjs = require('pdfjs-dist');
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

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const SOURCE_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/MACHINES/LUREM';
const BRAND_ID = 'd73c0a3d-4aa3-4029-81ec-de2c77b438bc';
const CATEGORY_ID = '19a46ff6-9ad4-4273-9c8f-83f249904ec9';

// Prix du site français (€ → $)
const FRENCH_PRICES = {
  'Combiné LUREM C310 STI – Documentation technique': 12,
  'Combiné bois LUREM TB1250 – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM T180 – Éclatés avec listes des pièces': 10,
  'LUREM T30N – Manuel d\'utilisation et d\'entretien': 15,
  'LUREM SC25 – Manuel d\'utilisation et d\'entretien': 15,
  'LUREM SAR 400 – Manuel d\'utilisation et d\'entretien': 15,
  'LUREM Router 7 – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM RD41e – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM RD26F – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM OPTAL 26 – Éclatés avec listes des pièces': 10,
  'Combinés bois LUREM MF260L CB260TL – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM FORMER 310 ST – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM FORMER 310 SI – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM FORMER 310 S – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM CB410RLX – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM CB310SL – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM CB310HZ – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C2100 – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C2000 – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C266 – Manuel d\'utilisation et d\'entretien': 15,
  'Woodworker LUREM C260N – Owner and Service Manual': 15,
  'Combiné bois LUREM C36 – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C7 compact 7 – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C260J – Manuel d\'utilisation et d\'entretien': 15,
  'Combinés bois LUREM C260E C310E – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM C260N – Manuel d\'utilisation et d\'entretien': 15,
  'Combiné bois LUREM C310SI – Manuel utilisateur': 15,
  'Combinés LUREM C360N C410N C510N – Schémas et câblages électriques': 5,
  'Combiné LUREM C317 – Schémas et câblages électriques': 5,
  'Combiné LUREM C315 – Schémas et câblages électriques': 5,
  'Combiné LUREM C311 – Schémas et câblages électriques': 5,
  'Combiné LUREM C310SX – Schémas et câblages électriques': 5,
  'Combiné LUREM C310sti – Schémas et câblages électriques': 5,
  'Combiné LUREM C310si – Schémas et câblages électriques': 5,
  'Combiné LUREM C310i – Schémas et câblages électriques': 5,
  'Combiné LUREM C310e et C260e – Schémas et câblages électriques': 5,
  'Combiné LUREM C266 – Schémas et câblages électriques': 5,
  'Combiné LUREM C265 – Schémas et câblages électriques': 5,
  'Combiné LUREM C263 – Schémas du câblage électrique': 5,
  'Combiné LUREM C260N – Schémas et câblages électriques': 5,
  'Combiné bois LUREM FORMER 260 STI – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM FORMER 260 si – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM FORMER 260S – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM CB 310 RL RLX – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM CB 310 SL – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM Maxi 26 Plus – Notice technique': 15,
  'Combiné bois LUREM C2600 – Notice technique': 15,
  'Combiné bois LUREM C2100 – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM C260N – Éclatés avec listes des pièces': 10,
  'Combiné bois LUREM C260E – Notice technique': 15,
  'Combinés bois LUREM C200 210 260 – Notice technique': 15,
  'Combiné bois LUREM C20 – Notice technique': 15,
  'Combiné bois LUREM C210B – Notice technique': 15,
  'Combiné bois LUREM C410N – Notice technique': 15,
  'Combiné bois LUREM C360 – Notice technique': 15,
  'Combiné bois LUREM C260 S – S2 – Notice technique': 15,
};

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function getCoverPage(pdfPath) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
    const page = await doc.getPage(1);
    const sc = 1000 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale: sc });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const buf = cc.canvas.toBuffer('image/jpeg', { quality: 0.90 });
    if (buf.length > 50000) return buf; // Real image
    return null; // Empty/blank page
  } catch (e) {
    return null;
  }
}

function createBlueOverlay(title) {
  const W = 1000, H = 1400;
  const cvs = canvas.createCanvas(W, H);
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 120px Arial';
  ctx.fillText('LUREM', W / 2, H * 0.15);
  ctx.strokeStyle = '#64B5F6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, H * 0.25);
  ctx.lineTo(W * 0.8, H * 0.25);
  ctx.stroke();
  ctx.font = 'bold 48px Arial';
  const words = title.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (test.length > 40) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const lH = 70;
  const sY = H * 0.35 + (lines.length * lH / 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, sY + i * lH - lH / 2));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, H * 0.65, W, H * 0.35);
  ctx.fillStyle = '#FFF';
  ctx.font = '32px Arial';
  ctx.fillText('Technical Documentation', W / 2, H * 0.8);
  ctx.font = '24px Arial';
  ctx.fillStyle = '#B3E5FC';
  ctx.fillText('Service Manuals Pro', W / 2, H * 0.95);
  return cvs.toBuffer('image/jpeg', { quality: 0.92 });
}

(async () => {
  console.log('FINAL LUREM IMPORT - Correct et complet\n');

  const files = readdirSync(SOURCE_PATH).filter(f => f.toLowerCase().endsWith('.pdf')).sort();
  console.log(`Trouvé ${files.length} PDFs source\n`);

  let imported = 0;

  for (const file of files) {
    const filePath = `${SOURCE_PATH}/${file}`;
    const pdfBytes = readFileSync(filePath);
    const fileSize = pdfBytes.length;

    console.log(`${file}`);

    try {
      // Générer illustration
      let illustrationBuf = await getCoverPage(filePath);
      const useBlueOverlay = !illustrationBuf;

      if (!illustrationBuf) {
        const cleanName = file.replace(/\.pdf$/i, '').replace(/\s*\$\d+/g, '');
        illustrationBuf = createBlueOverlay(cleanName);
      }

      // Uploader sur Supabase storage (logos bucket)
      const slug = file
        .toLowerCase()
        .replace(/\.pdf$/i, '')
        .replace(/\s*\$\d+/g, '')
        .replace(/\s+/g, '-')
        .replace(/[éè]/g, 'e')
        .replace(/[àâ]/g, 'a')
        .replace(/[ûü]/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[-]+/g, '-')
        .replace(/^-|-$/g, '');

      const previewPath = `previews/${slug}.jpg`;
      const docPath = `documents/${slug}.pdf`;
      const previewUrl = `https://ylsbqehotapcprfinsnu.supabase.co/storage/v1/object/public/logos/${previewPath}`;

      await supabase.storage.from('logos').upload(previewPath, illustrationBuf, { contentType: 'image/jpeg', upsert: true });

      await r2.send(new PutObjectCommand({
        Bucket: 'service-manuals-documents',
        Key: docPath,
        Body: pdfBytes,
        ContentType: 'application/pdf'
      }));

      // Titre et prix
      const title = file.replace(/\.pdf$/i, '').replace(/\s*\$\d+$/g, '').trim();
      let price = 1500; // Default $15 = 1500 cents

      // Chercher dans les prix du site français
      for (const [frenchTitle, frenchPrice] of Object.entries(FRENCH_PRICES)) {
        if (title.toLowerCase().includes(frenchTitle.toLowerCase().split('–')[0].trim().toLowerCase())) {
          price = frenchPrice * 100; // Convertir € en cents
          break;
        }
      }

      // Description simple
      const desc = `Technical documentation for LUREM ${title}. Complete reference material with detailed specifications and operating guidelines.`;

      // Créer en base de données
      const { error } = await supabase.from('documents').insert({
        slug,
        title,
        description: desc,
        language: 'fr',
        category_id: CATEGORY_ID,
        brand_id: BRAND_ID,
        file_size: fileSize,
        file_path: docPath,
        preview_url: previewUrl,
        price
      });

      if (error) {
        console.log(`  ❌ DB Error: ${error.message}`);
      } else {
        console.log(`  ✅ (${(fileSize/1024/1024).toFixed(2)} MB, $${(price/100).toFixed(2)}, ${useBlueOverlay ? 'BLUE' : 'REAL'})`);
        imported++;
      }
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}\nImported: ${imported}/${files.length}\n`);
})();
