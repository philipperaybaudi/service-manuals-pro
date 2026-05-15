/**
 * Détecte les previews blanches ou quasi-blanches parmi tous les documents actifs.
 * Méthode : télécharge chaque preview et mesure la luminosité moyenne.
 * Une image est considérée "blanche" si luminosité > 250/255 sur 95% des pixels.
 * Résultat sauvegardé dans scripts/blank-previews-report.json
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const canvas  = require('canvas');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mesure le % de pixels "contenu" (luminosité < 200/255).
// < 2% → image visuellement vide (page blanche, quasi-blanche, presque rien).
// Un schéma technique même épuré dépasse largement 2%.
const CONTENT_THRESHOLD = 0.02; // 2%
const BATCH_SIZE = 20;
const REPORT_PATH = 'scripts/blank-previews-report.json';

async function fetchBuffer(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function contentRatio(jpgBuffer) {
  const img = await canvas.loadImage(jpgBuffer);
  const c   = canvas.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data  = ctx.getImageData(0, 0, img.width, img.height).data;
  const total = img.width * img.height;
  let content = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    if (gray < 200) content++;
  }
  return content / total;
}

// Récupérer TOUS les documents actifs avec preview_url (pagination 1000 par page)
const docs = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await supabase
    .from('documents')
    .select('slug, title, preview_url')
    .eq('active', true)
    .not('preview_url', 'is', null)
    .order('slug')
    .range(from, from + PAGE - 1);
  if (error) { console.error(error.message); process.exit(1); }
  docs.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
console.log(`Documents à analyser : ${docs.length}\n`);

const blank   = [];
const noPreview = [];
let processed = 0;

// Traitement par lots
for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  const batch = docs.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(async doc => {
    try {
      const buf   = await fetchBuffer(doc.preview_url);
      const ratio = await contentRatio(buf);
      if (ratio < CONTENT_THRESHOLD) {
        blank.push({ slug: doc.slug, title: doc.title, content_ratio: (ratio * 100).toFixed(2) + '%', url: doc.preview_url });
      }
    } catch(e) {
      noPreview.push({ slug: doc.slug, title: doc.title, error: e.message });
    }
    processed++;
    process.stdout.write(`\r  ${processed}/${docs.length} analysés — ${blank.length} blanches trouvées`);
  }));
}
process.stdout.write('\n');

const report = {
  generated_at: new Date().toISOString(),
  total_analysed: docs.length,
  blank_count: blank.length,
  error_count: noPreview.length,
  blank_previews: blank.sort((a,b) => parseFloat(a.content_ratio) - parseFloat(b.content_ratio)),
  errors: noPreview,
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n═══════════════════════════════════`);
console.log(`Analysés   : ${docs.length}`);
console.log(`Blanches   : ${blank.length}`);
console.log(`Erreurs    : ${noPreview.length}`);
console.log(`Rapport    : ${REPORT_PATH}`);

if (blank.length > 0) {
  console.log('\nPreviews non représentatives (contenu < 2%) :');
  blank.forEach(b => console.log(`  - ${b.slug} (${b.content_ratio} contenu)`));
}
