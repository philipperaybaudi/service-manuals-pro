/**
 * Ajoute la TdM à tous les docs de la catégorie "Autonomie"
 * PDFs lus depuis DOCS EN LIGNE (lecture seule — archive)
 */
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdfjs   = require('pdfjs-dist');
const canvas  = require('canvas');

if (typeof Path2D === 'undefined' || typeof Path2D !== 'function') {
  global.Path2D = class Path2D {
    constructor(p) { this._path = p || null; }
    addPath(){} closePath(){} moveTo(){} lineTo(){}
    bezierCurveTo(){} quadraticCurveTo(){} arc(){}
    arcTo(){} ellipse(){} rect(){}
  };
}
if (typeof DOMMatrix === 'undefined') global.DOMMatrix = canvas.DOMMatrix;

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const BASE_FOLDER    = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Autonomie';
const MAX_PAGES      = 20;
const DRY_RUN        = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('MODE DRY-RUN — aucune modification en base\n');

const supabase  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// Correspondances manuelles (titre EN → chemin relatif depuis BASE_FOLDER)
const MANUAL_MAP = {
  'CD V-715 Model 1A Radiological Survey Meter Manual':                              'DÉFENCE CIVILE\\CD_V715 Notice.pdf',
  'Rural House of the 19th Century: Practical Agriculture Encyclopedia Vol. 1':      'Ouvrages de référence\\Maison_rustique_du_XIXe_siècle tome 1.pdf',
  'Rural House of the 19th Century - Volume 2: Industrial Crops and Domestic Animals': 'Ouvrages de référence\\Maison_rustique_du_XIXe_siècle tome 2.pdf',
  'Rural Household of the 19th Century - Volume 3 Agricultural Arts':                'Ouvrages de référence\\Maison_rustique_du_XIXe_siècle tome 3.pdf',
  'Rustic Household of the 19th Century - Volume 4: Forestry and Rural Legislation': 'Ouvrages de référence\\Maison_rustique_du_XIXe_siècle tome 4.pdf',
  'Rural House of the 19th Century - Horticulture Volume 5':                         'Ouvrages de référence\\Maison_rustique_du_XIXe_siècle tome 5.pdf',
};

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function findPdf(titleFr, titleEn, brandFolder, allFolders) {
  // 0. Table manuelle (priorité absolue)
  if (MANUAL_MAP[titleEn]) {
    const rel      = MANUAL_MAP[titleEn];
    const fullPath = path.join(BASE_FOLDER, rel);
    const dir      = path.dirname(fullPath);
    const base     = path.basename(fullPath);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      // Pass 1 : égalité normalisée exacte
      let found = files.find(f => normalize(f) === normalize(base));
      // Pass 2 : fallback — mots longs + numéro de tome (gère variantes d'encodage)
      if (!found) {
        const baseNorm = normalize(base.replace(/\.pdf$/i, ''));
        const baseWords = baseNorm.split(' ').filter(w => w.length > 4);
        const baseNums  = baseNorm.split(' ').filter(w => /^\d+$/.test(w));
        found = files.find(f => {
          const fn = normalize(f);
          const wordsOk = baseWords.filter(w => fn.includes(w)).length >= Math.min(2, baseWords.length);
          const numsOk  = baseNums.length === 0 || baseNums.some(n => fn.includes(` ${n} `) || fn.endsWith(` ${n}`) || fn.includes(` ${n}.`));
          return wordsOk && numsOk;
        });
      }
      if (found) return path.join(dir, found);
    }
    return null;
  }

  const searchFolders = brandFolder
    ? [brandFolder, ...allFolders.filter(f => f !== brandFolder)]
    : allFolders;

  for (const searchTitle of [titleFr, titleEn].filter(Boolean)) {
    const titleWords = normalize(searchTitle).split(' ').filter(w => w.length > 4);
    const threshold  = Math.max(1, Math.min(2, titleWords.length));

    for (const folder of searchFolders) {
      if (!fs.existsSync(folder)) continue;
      const files = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.pdf'));

      // 1. Correspondance exacte normalisée
      for (const f of files) {
        if (normalize(f.replace(/\.pdf$/i, '').replace(/\$\d+/, '')) === normalize(searchTitle)) {
          return path.join(folder, f);
        }
      }
      // 2. Mots-clés
      for (const f of files) {
        const fn = normalize(f);
        if (titleWords.filter(w => fn.includes(w)).length >= threshold) {
          return path.join(folder, f);
        }
      }
    }
  }
  return null;
}

async function pdfToCompressedBuffer(pdfPath, maxPages) {
  const data     = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfjsDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const total    = pdfjsDoc.numPages;
  const pages    = Math.min(total, maxPages);
  const newPdf   = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    try {
      const page = await pdfjsDoc.getPage(i);
      const vp0  = page.getViewport({ scale: 1 });
      const vp   = page.getViewport({ scale: Math.min(800 / vp0.width, 1.5) });
      const f    = new NodeCanvasFactory();
      const cc   = f.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
      const jpg = cc.canvas.toBuffer('image/jpeg', { quality: 0.70 });
      const img = await newPdf.embedJpg(jpg);
      const p   = newPdf.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      process.stdout.write(`\r    Pages ${i}/${pages}`);
    } catch(e) { /* page ignorée */ }
  }
  process.stdout.write('\n');
  return { buf: Buffer.from(await newPdf.save()), total };
}

async function extractTOC(pdfPath, title) {
  const { buf, total } = await pdfToCompressedBuffer(pdfPath, MAX_PAGES);
  console.log(`    Taille compressé : ${(buf.length / 1024).toFixed(0)} Ko (${total} pages au total)`);
  const b64 = buf.toString('base64');

  // Appel 1 : extraction EN
  const respEN = await anthropic.messages.create({
    model: 'claude-opus-4-5', max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
      { type: 'text', text: `This is "${title}". Find the table of contents in this PDF and extract ALL entries in English.
Return ONLY a plain text list, one entry per line: "- Title .... page N"
If no table of contents is visible, return exactly: NO_TOC
No JSON, no markdown, no explanation.` }
    ]}]
  });
  const toc_en = respEN.content[0].text.trim();
  if (toc_en === 'NO_TOC' || !toc_en.includes('-')) return null;

  // Appel 2 : traduction FR
  const respFR = await anthropic.messages.create({
    model: 'claude-opus-4-5', max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: `Translate this table of contents to French. Keep exact format ("- titre .... page N"), one entry per line. Return ONLY the translated list:\n\n${toc_en}` }
    ]}]
  });
  const toc_fr = respFR.content[0].text.trim();

  return { toc_en, toc_fr };
}

// Autonomy & Self-Sufficiency
const CATEGORY_ID = 'b5a1bb76-7af0-4714-8cc8-5b266e73a3dc';

const { data: brands, error: brandErr } = await supabase
  .from('brands').select('id, name, slug').eq('category_id', CATEGORY_ID);
if (brandErr) { console.error(brandErr.message); process.exit(1); }

const { data: docs, error: docErr } = await supabase
  .from('documents').select('slug, title, title_fr, description, description_fr, brand_id')
  .eq('category_id', CATEGORY_ID).eq('active', true).order('title');
if (docErr) { console.error(docErr.message); process.exit(1); }

const brandById = Object.fromEntries(brands.map(b => [b.id, b]));

const allFolders = fs.readdirSync(BASE_FOLDER)
  .map(f => path.join(BASE_FOLDER, f))
  .filter(f => fs.statSync(f).isDirectory());

console.log(`Documents en base : ${docs.length} | Marques : ${brands.length} | Dossiers : ${allFolders.length}\n`);

let ok = 0, skipped = 0, noToc = 0, notFound = 0, errors = 0;

for (const doc of docs) {
  process.stdout.write(`\n── ${doc.title}\n`);

  if (doc.description?.includes('Table of Contents:')) {
    console.log('  ⏭ TdM déjà présente');
    skipped++;
    continue;
  }

  const brand       = brandById[doc.brand_id];
  const brandName   = brand?.name || '';
  const brandFolder = allFolders.find(f => normalize(path.basename(f)) === normalize(brandName)) || null;
  if (brandFolder) console.log(`  📁 ${path.basename(brandFolder)}`);

  const pdfPath = findPdf(doc.title_fr, doc.title, brandFolder, allFolders);
  if (!pdfPath) {
    console.log(`  ✗ PDF introuvable`);
    notFound++;
    continue;
  }
  console.log(`  📄 ${path.relative(BASE_FOLDER, pdfPath)}`);
  if (DRY_RUN) continue;

  let toc;
  try { toc = await extractTOC(pdfPath, doc.title); }
  catch(e) { console.log(`  ✗ Erreur Claude : ${e.message}`); errors++; continue; }

  if (!toc) { console.log('  ⚠ Pas de TdM'); noToc++; continue; }

  const cutEN  = doc.description?.indexOf('\n\nTable of Contents:') ?? -1;
  const baseEN = cutEN > -1 ? doc.description.slice(0, cutEN) : (doc.description || '');
  const cutFR  = doc.description_fr?.indexOf('\n\nTable des matières') ?? -1;
  const baseFR = cutFR > -1 ? doc.description_fr.slice(0, cutFR) : (doc.description_fr || '');

  const { error: upErr } = await supabase.from('documents').update({
    description:    `${baseEN}\n\nTable of Contents:\n${toc.toc_en}`,
    description_fr: `${baseFR}\n\nTable des matières :\n${toc.toc_fr}`
  }).eq('slug', doc.slug);

  if (upErr) { console.log(`  ✗ Update : ${upErr.message}`); errors++; }
  else { console.log(`  ✓ TdM ajoutée (${toc.toc_en.split('\n').length} entrées)`); ok++; }
}

console.log(`
═══════════════════════════
✓ Réussi    : ${ok}
⏭ Ignorés   : ${skipped}
⚠ Sans TdM  : ${noToc}
✗ PDF abs.  : ${notFound}
✗ Erreurs   : ${errors}
Total       : ${docs.length}`);
