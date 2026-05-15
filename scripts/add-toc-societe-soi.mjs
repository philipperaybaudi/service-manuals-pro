/**
 * Ajoute la table des matières à tous les docs de la marque
 * "OUVRAGES DE RÉFÉRENCE" dans la catégorie "Society & Culture" (Société & Soi)
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
const PDF_FOLDER = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Société & Soi\\Ouvrages de référence';
const BRAND_ID   = 'ede2109f-4a4b-40f0-8568-673bb122df43';
const MAX_PAGES  = 20;

const supabase  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// Correspondances manuelles (titre EN → nom de fichier exact)
const MANUAL_MAP = {
  'French Normalization - Nosometric System of Units':                          'Afnor Pifométrie.pdf',
  'Gender Theory: Decryption Guide for Young People':                           'manuel-gender-fondation-lejeune.pdf',
  'Rudiments of Critical Sociology: Dominations and Freedom':                   'Domonations et Liberté.pdf',
  'Vietnam: A History of Cultural Transfers':                                   'Le Vietnam.pdf',
  'Earth: Understanding Our Planet':                                            'la-terre-comprendre-notre-planete-fr.pdf',
  "French Legal System's Resistance to Potential Authoritarian Shock":          'la résistance du système juridique français à un potentiel choc autoritaire.pdf',
  'Sex Education in Schools: Prevention to Early Sexualization':                'education-a-la-sexualite-danger-ou-prevention-final-light.pdf',
  'The Human Body: Understanding Our Organism and Its Functioning':             'le-corps-humain-comprendre-notre-organisme-et-son-fonctionnement.pdf',
};

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function findPdf(title, titleEn, slug, pdfFiles) {
  // 0. Table manuelle (priorité absolue, clé = titre EN)
  if (MANUAL_MAP[titleEn]) {
    const target     = MANUAL_MAP[titleEn];
    const targetNorm = normalize(target.replace(/\.pdf$/i, ''));
    // a) égalité exacte normalisée
    let found = pdfFiles.find(f => normalize(f.replace(/\.pdf$/i, '')) === targetNorm);
    // b) fallback : tous les mots distinctifs du target présents dans le nom de fichier
    if (!found) {
      const keywords = targetNorm.split(' ').filter(w => w.length > 5);
      found = pdfFiles.find(f => {
        const fn = normalize(f);
        return keywords.length > 0 && keywords.every(w => fn.includes(w));
      });
    }
    return found ? path.join(PDF_FOLDER, found) : null;
  }
  // 1. Slug sans préfixe "ouvrages-de-reference-"
  const slugCore = slug.replace(/^ouvrages-de-reference-/, '').replace(/-/g, ' ');
  // 2. Essai exact sur nom normalisé
  for (const f of pdfFiles) {
    const fNorm = normalize(f.replace(/\.pdf$/i, '').replace(/\$\d+/, ''));
    if (fNorm === normalize(title) || fNorm.includes(slugCore) || slugCore.includes(fNorm.slice(0, 10))) {
      return path.join(PDF_FOLDER, f);
    }
  }
  // 3. Essai par mots du titre
  const titleWords = normalize(title).split(' ').filter(w => w.length > 4);
  for (const f of pdfFiles) {
    const fNorm = normalize(f);
    const matches = titleWords.filter(w => fNorm.includes(w));
    if (matches.length >= Math.min(2, titleWords.length)) return path.join(PDF_FOLDER, f);
  }
  return null;
}

async function pdfToCompressedBuffer(pdfBuffer, maxPages) {
  const data     = new Uint8Array(pdfBuffer);
  const pdfjsDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const total    = pdfjsDoc.numPages;
  const pages    = Math.min(total, maxPages);
  const newPdf   = await PDFDocument.create();

  for (let i = 1; i <= pages; i++) {
    try {
      const page  = await pdfjsDoc.getPage(i);
      const vp0   = page.getViewport({ scale: 1 });
      const scale = Math.min(800 / vp0.width, 1.5);
      const vp    = page.getViewport({ scale });
      const f  = new NodeCanvasFactory();
      const cc = f.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
      const jpg = cc.canvas.toBuffer('image/jpeg', { quality: 0.70 });
      const img = await newPdf.embedJpg(jpg);
      const p   = newPdf.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    } catch (e) { /* page ignorée */ }
  }
  return Buffer.from(await newPdf.save());
}

async function extractTOC(pdfBuffer, title) {
  const compressed = await pdfToCompressedBuffer(pdfBuffer, MAX_PAGES);
  const response   = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: compressed.toString('base64') } },
        { type: 'text', text: `This is "${title}".
Find the table of contents page(s) in this PDF and extract ALL entries.

Return ONLY a JSON object with exactly two keys:
- "toc_en": the table of contents translated to English, plain text list (one entry per line, format: "- Section title .... page N")
- "toc_fr": the table of contents in French (original or translated), same format

If no table of contents is visible in these pages, return: {"toc_en": "", "toc_fr": ""}

Rules:
- Plain text only, no markdown, no HTML
- Preserve chapter numbers and page numbers exactly as shown
- One entry per line prefixed with "- "
- Keep proper nouns unchanged
- Return ONLY valid JSON, no other text` }
      ]
    }]
  });

  const raw = response.content[0].text.trim();
  let jsonStr = null;
  const fence = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fence) jsonStr = fence[1];
  else { const m = raw.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }
  if (!jsonStr) throw new Error(`Réponse non parseable: ${raw.slice(0, 200)}`);
  return JSON.parse(jsonStr);
}

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('MODE DRY-RUN — aucune modification en base\n');

// ── Main ──
// 1. Récupérer tous les docs de la marque
const { data: docs, error: dbErr } = await supabase
  .from('documents')
  .select('slug, title, title_fr, description, description_fr')
  .eq('brand_id', BRAND_ID)
  .order('title');
if (dbErr) { console.error(dbErr.message); process.exit(1); }

// 2. Lister les PDFs disponibles
const pdfFiles = fs.readdirSync(PDF_FOLDER).filter(f => f.toLowerCase().endsWith('.pdf'));
console.log(`Documents en base : ${docs.length} | PDFs dans le dossier : ${pdfFiles.length}\n`);

// 3. Traiter chaque doc
let ok = 0, skipped = 0, errors = 0, notFound = 0;

for (const doc of docs) {
  process.stdout.write(`\n── ${doc.title}\n`);

  // Déjà une TdM ?
  if (doc.description?.includes('Table of Contents:') || doc.description_fr?.includes('Table des matières')) {
    console.log('  ⏭ TdM déjà présente — ignoré');
    skipped++;
    continue;
  }

  // Trouver le PDF
  const pdfPath = findPdf(doc.title_fr || doc.title, doc.title, doc.slug, pdfFiles);
  if (!pdfPath) {
    console.log(`  ✗ PDF introuvable pour "${doc.title_fr || doc.title}"`);
    notFound++;
    continue;
  }
  console.log(`  📄 ${path.basename(pdfPath)}`);
  if (DRY_RUN) continue;

  const pdfBuffer = fs.readFileSync(pdfPath);
  let toc;
  try {
    toc = await extractTOC(pdfBuffer, doc.title);
  } catch (e) {
    console.log(`  ✗ Erreur Claude : ${e.message}`);
    errors++;
    continue;
  }

  if (!toc.toc_en) {
    console.log('  ⚠ Pas de TdM trouvée');
    skipped++;
    continue;
  }

  const cutEN  = doc.description?.indexOf('\n\nTable of Contents:') ?? -1;
  const cutFR  = doc.description_fr?.indexOf('\n\nTable des matières') ?? -1;
  const baseEN = cutEN > -1 ? doc.description.slice(0, cutEN) : (doc.description || '');
  const baseFR = cutFR > -1 ? doc.description_fr.slice(0, cutFR) : (doc.description_fr || '');

  const { error: updateErr } = await supabase.from('documents').update({
    description:    `${baseEN}\n\nTable of Contents:\n${toc.toc_en}`,
    description_fr: `${baseFR}\n\nTable des matières :\n${toc.toc_fr}`
  }).eq('slug', doc.slug);

  if (updateErr) { console.log(`  ✗ Erreur update : ${updateErr.message}`); errors++; }
  else { console.log(`  ✓ TdM ajoutée (${toc.toc_en.split('\n').length} entrées)`); ok++; }
}

console.log(`\n═══════════════════════════
✓ Réussi    : ${ok}
⏭ Ignorés   : ${skipped}
✗ PDF abs.  : ${notFound}
✗ Erreurs   : ${errors}
Total       : ${docs.length}`);
