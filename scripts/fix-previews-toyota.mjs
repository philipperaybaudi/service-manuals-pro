/**
 * Trouve la meilleure illustration pour 2 docs Toyota et met à jour les previews
 * PDF source dans DOCS EN LIGNE (lecture seule)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');

if (typeof Path2D === 'undefined' || typeof Path2D !== 'function') {
  global.Path2D = class Path2D {
    constructor(p) { this._path = p || null; }
    addPath(){} closePath(){} moveTo(){} lineTo(){}
    bezierCurveTo(){} quadraticCurveTo(){} arc(){}
    arcTo(){} ellipse(){} rect(){}
  };
}
if (typeof DOMMatrix === 'undefined') global.DOMMatrix = canvas.DOMMatrix;

const STANDARD_FONTS  = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const STORAGE_BUCKET  = 'logos';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const DOCS = [
  {
    slug:    'toyota-toyota-22re-3vze-engine-manual',
    pdfPath: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\TOYOTA\\manuel_moteur_22RE_3VZE.pdf',
  },
  {
    slug:    'toyota-toyota-hilux-1993-chassis-service-manual',
    pdfPath: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\TOYOTA\\manuel_chassis_hlilux_93.pdf',
  },
];

async function renderPage(pdfjsDoc, pageNum, scale) {
  const page = await pdfjsDoc.getPage(pageNum);
  const vp   = page.getViewport({ scale });
  const f    = new NodeCanvasFactory();
  const cc   = f.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

// Calcule la complexité visuelle d'un JPEG : plus le buffer est lourd à qualité fixe,
// plus la page contient de détails (dessins, schémas) → bon indicateur sans IA
async function pageComplexity(pdfjsDoc, pageNum) {
  try {
    const jpg = await renderPage(pdfjsDoc, pageNum, 0.3);
    return jpg.length; // taille JPEG ≈ richesse visuelle
  } catch(e) { return 0; }
}

async function findBestPage(pdfPath) {
  const data     = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfjsDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;
  const total    = pdfjsDoc.numPages;
  const scanPages = Math.min(total, 60);

  console.log(`  Scan de ${scanPages} pages (sur ${total})...`);
  let bestPage = 1, bestScore = 0;
  for (let i = 1; i <= scanPages; i++) {
    const score = await pageComplexity(pdfjsDoc, i);
    if (score > bestScore) { bestScore = score; bestPage = i; }
    process.stdout.write(`\r  Page ${i}/${scanPages} — meilleure : p.${bestPage} (${(bestScore/1024).toFixed(0)} Ko)`);
  }
  process.stdout.write('\n');
  console.log(`  → Page retenue : ${bestPage}`);

  // Rendu haute résolution de la page choisie
  const hq = await renderPage(pdfjsDoc, bestPage, 800 / (await pdfjsDoc.getPage(bestPage)).getViewport({ scale: 1 }).width);
  return hq;
}

async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

for (const doc of DOCS) {
  console.log(`\n── ${doc.slug}`);
  if (!fs.existsSync(doc.pdfPath)) { console.log('  ✗ PDF introuvable'); continue; }

  let jpg;
  try { jpg = await findBestPage(doc.pdfPath); }
  catch(e) { console.log(`  ✗ Erreur scan : ${e.message}`); continue; }

  try {
    const url = await uploadPreview(doc.slug, jpg);
    console.log(`  ✓ Preview mise à jour : ${url}`);
  } catch(e) { console.log(`  ✗ Erreur upload : ${e.message}`); }
}

console.log('\nTerminé.');
