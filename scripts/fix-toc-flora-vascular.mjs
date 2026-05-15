/**
 * Extraction TdM pour : Flora Vascular de Andalucía Oriental.pdf
 * slug : ouvrages-de-reference-flora-vascular-de-andalucia-oriental-2a-edicion
 */
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

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
const PDF_PATH = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Nature\\Ouvrages de référence\\Flora Vascular de Andalucía Oriental.pdf';
const SLUG     = 'ouvrages-de-reference-flora-vascular-de-andalucia-oriental-2a-edicion';
const MAX_PAGES = 20;

const supabase  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function pdfToCompressedBuffer(pdfBuffer, maxPages) {
  const data     = new Uint8Array(pdfBuffer);
  const pdfjsDoc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;

  const total  = pdfjsDoc.numPages;
  const pages  = Math.min(total, maxPages);
  const newPdf = await PDFDocument.create();

  console.log(`  PDF total : ${total} pages, traitement des ${pages} premières`);

  for (let i = 1; i <= pages; i++) {
    try {
      const page = await pdfjsDoc.getPage(i);
      const vp0  = page.getViewport({ scale: 1 });
      const scale = Math.min(800 / vp0.width, 1.5);
      const vp   = page.getViewport({ scale });
      const f  = new NodeCanvasFactory();
      const cc = f.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
      const jpg = cc.canvas.toBuffer('image/jpeg', { quality: 0.70 });
      const img = await newPdf.embedJpg(jpg);
      const p   = newPdf.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      process.stdout.write(`\r  Page ${i}/${pages} rendue`);
    } catch (err) {
      console.log(`\n  ⚠ Page ${i} ignorée : ${err.message}`);
    }
  }
  console.log('');
  return Buffer.from(await newPdf.save());
}

async function extractTOC(pdfBuffer, title) {
  const compressed = await pdfToCompressedBuffer(pdfBuffer, MAX_PAGES);
  console.log(`  Taille PDF compressé : ${(compressed.length / 1024).toFixed(0)} Ko`);

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: compressed.toString('base64') }
        },
        {
          type: 'text',
          text: `This is "${title}", a Spanish botanical reference work.
Find the table of contents page(s) in this PDF and extract ALL entries.

Return ONLY a JSON object with exactly two keys:
- "toc_en": the table of contents translated to English, as a plain text list (one entry per line, format: "- Chapter/section title .... page N")
- "toc_fr": the same table of contents translated to French, same format

If no table of contents is visible in these pages, return: {"toc_en": "", "toc_fr": ""}

Rules:
- Plain text only, no markdown, no HTML
- Preserve chapter numbers and page numbers exactly as shown
- One entry per line prefixed with "- "
- Keep proper nouns (species names, place names) unchanged
- Return ONLY valid JSON, no other text`
        }
      ]
    }]
  });

  const raw = response.content[0].text.trim();
  console.log('\n  === Réponse brute Claude (300 premiers chars) ===');
  console.log(raw.slice(0, 300));
  console.log('  ===');

  let jsonStr = null;
  const fenceMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1];
  } else {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];
  }

  if (!jsonStr) {
    console.log('  RÉPONSE COMPLÈTE :');
    console.log(raw);
    throw new Error('Réponse non parseable');
  }

  return JSON.parse(jsonStr);
}

// ── Main ──
if (!fs.existsSync(PDF_PATH)) {
  console.error(`Fichier introuvable : ${PDF_PATH}`);
  process.exit(1);
}

const { data: row, error: fetchErr } = await supabase
  .from('documents').select('title, description, description_fr').eq('slug', SLUG).single();
if (fetchErr) { console.error(`Erreur DB : ${fetchErr.message}`); process.exit(1); }

console.log(`Titre : ${row.title}`);
console.log('Lecture PDF...');
const pdfBuffer = fs.readFileSync(PDF_PATH);

console.log('Extraction TdM via Claude...');
let toc;
try {
  toc = await extractTOC(pdfBuffer, row.title);
} catch (e) {
  console.error(`\nErreur : ${e.message}`);
  process.exit(1);
}

if (!toc.toc_en) {
  console.log('⚠ Pas de TdM trouvée dans ces pages');
  process.exit(0);
}

console.log(`\nTdM EN (${toc.toc_en.split('\n').length} entrées) :`);
console.log(toc.toc_en.slice(0, 400));
console.log('...');

const cutEN = row.description.indexOf('\n\nTable of Contents:');
const cutFR = row.description_fr.indexOf('\n\nTable des matières');
const baseEN = cutEN > -1 ? row.description.slice(0, cutEN) : row.description;
const baseFR = cutFR > -1 ? row.description_fr.slice(0, cutFR) : row.description_fr;

const new_desc_en = `${baseEN}\n\nTable of Contents:\n${toc.toc_en}`;
const new_desc_fr = `${baseFR}\n\nTable des matières :\n${toc.toc_fr}`;

const { error } = await supabase.from('documents')
  .update({ description: new_desc_en, description_fr: new_desc_fr }).eq('slug', SLUG);

if (error) { console.error(`Erreur update : ${error.message}`); process.exit(1); }
console.log(`\n✓ TdM ajoutée avec succès`);
