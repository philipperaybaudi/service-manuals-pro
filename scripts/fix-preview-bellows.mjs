/**
 * Génère la preview de Bellows-Replacement-Dan-Mitchell depuis la page 11
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

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const STORAGE_BUCKET = 'logos';
const SLUG    = 'repair-troubleshooting-bellows-replacement-dan-mitchell';
const PDF     = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Photographie\\Réparation & Dépannage\\Bellows-Replacement-Dan-Mitchell.pdf';
const PAGE    = 11;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc)   { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const data     = new Uint8Array(fs.readFileSync(PDF));
const pdfjsDoc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;

console.log(`PDF ouvert — ${pdfjsDoc.numPages} pages`);

const page  = await pdfjsDoc.getPage(PAGE);
const vp1   = page.getViewport({ scale: 1 });
const scale = 800 / vp1.width;
const vp    = page.getViewport({ scale });
const f     = new NodeCanvasFactory();
const cc    = f.create(vp.width, vp.height);
await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: f }).promise;
const jpg = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });

console.log(`Page ${PAGE} rendue (${(jpg.length/1024).toFixed(0)} Ko)`);

const { error } = await supabase.storage
  .from(STORAGE_BUCKET)
  .upload(`previews/${SLUG}.jpg`, jpg, { contentType: 'image/jpeg', upsert: true });

if (error) { console.error('Erreur upload :', error.message); process.exit(1); }
console.log('✓ Preview mise à jour');
