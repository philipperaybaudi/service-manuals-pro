// Update descriptions + fix overlay titles for Alligator Vollmer + Axminster
// Usage: node scripts/update-av-ax-descriptions.mjs

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';

const BASE_AV = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/ALLIGATOR VOLLMER';
const BASE_AX = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/BRICOLAGE/AXMINSTER';

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function generatePreview(pdfPath, overlayTitle) {
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data, canvasFactory: new NodeCanvasFactory(), standardFontDataUrl: STANDARD_FONTS, useSystemFonts: true }).promise;

    for (let pageNum = 1; pageNum <= Math.min(5, doc.numPages); pageNum++) {
      const page = await doc.getPage(pageNum);
      const scale = 800 / page.getViewport({ scale: 1 }).width;
      const vp = page.getViewport({ scale });
      const factory = new NodeCanvasFactory();
      const cc = factory.create(vp.width, vp.height);
      await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
      const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
      factory.destroy(cc);
      if (buffer.length > 30000) {
        if (pageNum > 1) console.log(`   (page ${pageNum} utilisée)`);
        return buffer;
      }
    }

    // Fallback: page 1 + blue band with correct document type label
    const page = await doc.getPage(1);
    const scale = 800 / page.getViewport({ scale: 1 }).width;
    const vp = page.getViewport({ scale });
    const factory = new NodeCanvasFactory();
    const cc = factory.create(vp.width, vp.height);
    await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
    const ctx = cc.context;
    const W = vp.width, H = vp.height;
    ctx.fillStyle = 'rgba(30, 58, 138, 0.88)';
    ctx.fillRect(0, H * 0.35, W, H * 0.30);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px Arial';
    const words = overlayTitle.split(' ');
    let lines = [], line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > W * 0.85) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
    const lineH = 44;
    const startY = H * 0.5 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));
    const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
    factory.destroy(cc);
    console.log(`   (overlay: "${overlayTitle}")`);
    return buffer;
  } catch (e) {
    console.warn('   ⚠ Preview error:', e.message);
    return null;
  }
}

// ── Document data ─────────────────────────────────────────────────────────────
// overlayTitle = text shown in blue band (only used when PDF pages are blank)
// fixPreview = true for docs with non-embedded Type1 fonts (blank pages)
const docs = [

  // ── ALLIGATOR JED series ──────────────────────────────────────────────────
  // Cover: "Notice de Réglage et Nomenclature des Pièces Détachées de l'Affuteuse Alligator"
  {
    slug: 'alligator-jed-63-manual',
    newTitle: 'Alligator JED 63 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator JED 63 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 63 chain saw chain sharpening machine. Covers setting and adjustment procedures for the sharpening wheel and chain guidance system, and includes complete numbered parts list with reference codes. Document in French.',
    pdfPath: BASE_AV + '/Alligator JED 63.pdf',
    fixPreview: true,
  },
  {
    slug: 'alligator-jed-65-manual',
    newTitle: 'Alligator JED 65 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator JED 65 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 65 chain saw chain sharpener, equipped with a carousel for blades up to 200 mm wide. Covers setting and adjustment procedures and includes complete numbered parts list. Document in French.',
    pdfPath: BASE_AV + '/Alligator JED 65.pdf',
    fixPreview: true,
  },
  {
    slug: 'alligator-jed-73-manual',
    newTitle: 'Alligator JED 73 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator JED 73 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 73 chain saw chain sharpener, equipped with a carousel for blades up to 180 mm wide. Covers setting and adjustment procedures and includes complete numbered parts list. Document in French.',
    pdfPath: BASE_AV + '/Alligator JED 73.pdf',
    fixPreview: true,
  },
  {
    slug: 'alligator-jed-75-manual',
    newTitle: 'Alligator JED 75 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator JED 75 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator JED 75 professional chain saw chain sharpener. Covers setting and adjustment procedures for sharpening parameters and chain guidance, and includes complete numbered parts list with reference codes. Document in French.',
    pdfPath: BASE_AV + '/Alligator JED 75.pdf',
    fixPreview: true,
  },

  // ── ALLIGATOR NM series (Appareil à Écraser) ──────────────────────────────
  // Cover: "Notice de Réglage et Nomenclature des Pièces Détachées de l'Appareil à Écraser type NM"
  {
    slug: 'alligator-nm-1-2-manual',
    newTitle: 'Alligator NM 1 & 2 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator NM 1 & 2 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 1 and NM 2 saw tooth setting machines (appareils à écraser). Covers setting and adjustment procedures and includes complete numbered parts list with reference codes. Document in French.',
    pdfPath: BASE_AV + '/Alligator NM 1 & 2 $10.pdf',
    fixPreview: true,
  },
  {
    slug: 'alligator-nm3-manual',
    newTitle: 'Alligator NM 3 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator NM 3 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 3 saw tooth setting machine (appareil à écraser). Covers setting and adjustment procedures and includes complete numbered parts list with reference codes. Document in French.',
    pdfPath: BASE_AV + '/Alligator NM3 $10.pdf',
    fixPreview: true,
  },
  {
    slug: 'alligator-nm4-manual',
    newTitle: 'Alligator NM 4 Adjustment Guide & Parts List',
    overlayTitle: 'Alligator NM 4 — Adjustment Guide & Parts List',
    description: 'Adjustment guide and illustrated parts catalogue for the Alligator NM 4 saw tooth setting machine (appareil à écraser). Covers setting and adjustment procedures and includes complete numbered parts list with reference codes. Document in French.',
    pdfPath: BASE_AV + '/Alligator NM4 $10.pdf',
    fixPreview: true,
  },

  // ── ALLIGATOR SM series ───────────────────────────────────────────────────
  // SM80: Cover says "NOTICE D'UTILISATION SM 80D" — Vollmer System Alligator
  {
    slug: 'alligator-sm80-manual',
    newTitle: 'Alligator SM 80D User Manual',
    overlayTitle: 'Alligator SM 80D — User Manual',
    description: 'User manual for the Vollmer System Alligator SM 80D automatic sharpening machine (machine à affûter). Covers safety requirements, machine description and technical specifications, commissioning, operating procedures, adjustment parameters, maintenance schedule, and troubleshooting. Document in French.',
    pdfPath: BASE_AV + '/Alligator SM80.pdf',
    fixPreview: true,
  },
  // SM1000: Page 1 = exploded diagram, Page 2 = "NOMENCLATURE DES PIÈCES DÉTACHÉES"
  {
    slug: 'alligator-sm1000-manual',
    newTitle: 'Alligator SM 1000 Parts List',
    overlayTitle: 'Alligator SM 1000 — Parts List',
    description: 'Illustrated parts catalogue for the Alligator SM 1000 automatic sharpening machine (affûteuse). Includes detailed exploded view diagram of the machine with all components identified, and complete numbered parts list with reference codes and part descriptions. Document in French.',
    pdfPath: BASE_AV + '/Alligator SM1000.pdf',
    fixPreview: true,
  },

  // ── VOLLMER (French text — readable pages, no overlay fix needed) ─────────
  // All covers say "NOTICE D'UTILISATION"
  {
    slug: 'vollmer-depomatic-manual',
    newTitle: 'Vollmer DEPOMATIC User Manual',
    description: 'User manual for the Vollmer DEPOMATIC machine for applying hard alloy (stellite) to the teeth of saw blades. Covers safety requirements, machine description and components, commissioning, operating and adjustment procedures, maintenance schedule, and spare parts list. Document in French.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'vollmer-map-200-400-manual',
    newTitle: 'Vollmer MAP 200 & 400 User Manual',
    description: 'User manual for the Vollmer MAP 200 and MAP 400 automatic band saw blade leveling and straightening machines. Covers safety requirements, machine description and technical specifications, commissioning, operating procedures, blade leveling adjustment, maintenance, and spare parts list. Document in French.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'vollmer-sia-350-manual',
    newTitle: 'Vollmer SIA 350 User Manual',
    description: 'User manual for the Vollmer SIA 350 wet grinding machine for band saw, frame saw, and circular saw blades. Covers safety requirements, machine description, commissioning, operating and sharpening adjustment procedures for various blade types, cooling system management, maintenance, and spare parts. Document in French.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'vollmer-t-230-330-420-manual',
    newTitle: 'Vollmer T 230 / T 330 / T 420 User Manual',
    description: 'User manual for the Vollmer T 230, T 330, and T 420 band saw blade tensioning and straightening machines. Covers safety requirements, machine description and specifications, commissioning, operating procedures for blade tensioning and leveling, adjustment parameters, maintenance schedule, and spare parts list. Document in French.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'vollmer-t-330-420-cas-manual',
    newTitle: 'Vollmer T 330 & T 420 CAS User Manual',
    description: 'User manual for the Vollmer T 330 CAS and T 420 CAS circular saw blade tensioning and straightening machines. Covers safety requirements, machine description, commissioning, operating procedures for circular blade tensioning and leveling, adjustment parameters, maintenance requirements, and spare parts list. Document in French.',
    pdfPath: null,
    fixPreview: false,
  },

  // ── AXMINSTER — APTC (blank pages → overlay fix needed) ──────────────────
  // Cover: "APTC M900/M950 Woodturning Lathe — INSTRUCTION MANUAL"
  {
    slug: 'axminster-aptc-m-900-manual',
    newTitle: 'Axminster APTC M900 Instruction Manual',
    overlayTitle: 'Axminster APTC M900 — Instruction Manual',
    description: 'Instruction manual for the Axminster APTC M900 woodturning lathe. Covers safety precautions, machine specifications and components, assembly and installation, operating controls, speed settings, woodturning techniques, maintenance procedures, and spare parts list.',
    pdfPath: BASE_AX + '/Axminster APTC M 900.pdf',
    fixPreview: true,
  },
  {
    slug: 'axminster-aptc-m-950-manual',
    newTitle: 'Axminster APTC M950 Instruction Manual',
    overlayTitle: 'Axminster APTC M950 — Instruction Manual',
    description: 'Instruction manual for the Axminster APTC M950 woodturning lathe. Covers safety precautions, machine specifications and components, assembly and installation, operating controls, speed settings, woodturning techniques, maintenance procedures, and spare parts list.',
    pdfPath: BASE_AX + '/Axminster APTC M 950.pdf',
    fixPreview: true,
  },

  // ── AXMINSTER — readable pages, no overlay fix needed ────────────────────
  // All covers explicitly say "User Manual"
  {
    slug: 'axminster-awbl1200-manual',
    newTitle: 'Axminster AWBL1200 User Manual',
    description: 'User manual for the Axminster AWBL1200 woodturning lathe. Covers safety requirements and operating precautions, machine specifications, assembly and installation, operating controls and speed settings, woodturning tool usage, maintenance procedures, and spare parts list.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'axminster-awsl-manual',
    newTitle: 'Axminster AWSL User Manual',
    description: 'User manual for the Axminster AWSL woodturning lathe. Includes safety instructions, machine specifications, initial assembly, parts description and identification with component diagrams, speed change procedure, illustrated parts breakdown, and complete parts list.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'axminster-awvsl-900-1000-manual',
    newTitle: 'Axminster AWVSL 900 & 1000 User Manual',
    description: 'User manual for the Axminster AWVSL 900 and AWVSL 1000 variable speed woodturning lathes. Covers specifications, general and machine-specific safety rules, electrical information, machine identification, unpacking and assembly, adjustments, and full operating procedures.',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'axminster-ccl-manual',
    newTitle: 'Axminster CCL User Manual',
    description: 'User manual for the Axminster CCL woodturning lathe. Covers safety instructions, machine specifications, assembly and setup, headstock maintenance, operating procedures, and includes EC Certificate of Conformity (TÜV Rheinland certified, CE Machinery Directive 89/392/EEC).',
    pdfPath: null,
    fixPreview: false,
  },
  {
    slug: 'axminster-cl-1500-copy-lathe-manual',
    newTitle: 'Axminster CL-1500 Copy Lathe User Manual',
    description: 'User manual for the Axminster CL-1500 copying woodturning lathe. Covers machine description, technical characteristics, circuit diagram, parts list, working place requirements, transport and mounting, operating procedures, starting and emergency stop, adjustment and control, safety measures, failure diagnosis, and maintenance with inspection and repair guidance.',
    pdfPath: null,
    fixPreview: false,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('=== Update Alligator Vollmer + Axminster — descriptions & overlays ===\n');
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  let updated = 0, previewFixed = 0, errors = 0;

  for (const doc of docs) {
    console.log(`\n[${doc.slug}]`);

    const payload = {
      title: doc.newTitle,
      description: doc.description,
      seo_title: `${doc.newTitle} | Service Manuals Pro`,
      seo_description: `Download the ${doc.newTitle}. Technical documentation with specifications and instructions.`,
    };

    // Regenerate preview with correct document type in overlay
    if (doc.fixPreview && doc.pdfPath) {
      console.log('   Generating preview...');
      const previewJpeg = await generatePreview(doc.pdfPath, doc.overlayTitle);
      if (previewJpeg) {
        const previewPath = `previews/${doc.slug}.jpg`;
        const { error: prevErr } = await supabase.storage
          .from('logos')
          .upload(previewPath, previewJpeg, { contentType: 'image/jpeg', upsert: true });
        if (prevErr) {
          console.warn('   ⚠ Preview upload:', prevErr.message);
        } else {
          const { data: previewUrlData } = supabase.storage.from('logos').getPublicUrl(previewPath);
          payload.preview_url = previewUrlData.publicUrl;
          console.log('   ✓ Preview updated');
          previewFixed++;
        }
      } else {
        console.warn('   ⚠ Preview generation failed');
      }
    }

    const { error: dbErr } = await supabase
      .from('documents')
      .update(payload)
      .eq('slug', doc.slug);

    if (dbErr) {
      console.error('   ✗ DB error:', dbErr.message);
      errors++;
    } else {
      console.log(`   ✓ Updated: "${doc.newTitle}"`);
      updated++;
    }
  }

  console.log(`\n${'='.repeat(55)}`);
  console.log(`Documents mis à jour : ${updated}/${docs.length}`);
  console.log(`Previews régénérées  : ${previewFixed}`);
  console.log(`Erreurs              : ${errors}`);
  console.log('\n✅ Terminé!');
}

run().catch(console.error);
