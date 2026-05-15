/**
 * Réécriture des descriptions des docs Yamaha (catégorie Automobile)
 * par lecture directe des PDF depuis DOCS EN LIGNE.
 *
 * 6 documents traités :
 *  - yamaha-ds7-rd250-r5c-rd350-manual-complete
 *  - yamaha-rmt-at1-at2-125-dt-175
 *  - yamaha-rta-125dtmx-bd
 *  - yamaha-virago-535-manual-gb
 *  - yamaha-yamaha-1000-fazer-manual
 *  - yamaha-yamaha-16-al-alc-atl-atlc-road-star
 *
 * Usage : node scripts/rewrite-yamaha-automobile.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const DRY_RUN  = process.argv.includes('--dry-run');
const MAX_PAGES = 12;
const DELAY_MS  = 8000;

const BASE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\YAMAHA\\';

const DOCS = [
  {
    slug:  'yamaha-ds7-rd250-r5c-rd350-manual-complete',
    title: 'Yamaha DS7 RD250 R5C RD350 Service Manual',
    pdf:   BASE + 'YAMAHA DS7 RD250 R5C RD350\\Yamaha_DS7_1972_RD_250_1973_R5C_1972_RD_350_1973_Manual HD.pdf',
  },
  {
    slug:  'yamaha-rmt-at1-at2-125-dt-175',
    title: 'Yamaha AT1 AT2 125 DT 175 Workshop Manual (Revue Moto Technique)',
    pdf:   BASE + 'YAMAHA 125 DTMX\\RMT AT1-AT2 125-DT 175.pdf',
  },
  {
    slug:  'yamaha-virago-535-manual-gb',
    title: 'Yamaha Virago XV535 Service Manual',
    pdf:   BASE + 'YAMAHA VIRAGO 535\\VIRAGO 535 Manual GB avec OCR.pdf',
  },
  {
    slug:  'yamaha-yamaha-1000-fazer-manual',
    title: 'Yamaha FZR1000E Complete Parts Catalog',
    pdf:   BASE + 'YAMAHA 1000 FZR\\Yamaha_1000_Fazer-Manual.pdf',
  },
  {
    slug:  'yamaha-yamaha-16-al-alc-atl-atlc-road-star',
    title: 'Yamaha XV16AL XV16ALC XV16ATL XV16ATLC Road Star Service Manual',
    pdf:   BASE + 'YAMAHA XV16AL-XV16ALCXV16ATL-XV16ATLC\\Yamaha_16_al_alc_atl_atlc_road_star HD.pdf',
  },
];

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase   = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function truncatePdf(buf, maxPages) {
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();
  if (total <= maxPages) return { buf, total };
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(src, Array.from({ length: maxPages }, (_, i) => i));
  pages.forEach(p => dst.addPage(p));
  return { buf: Buffer.from(await dst.save()), total };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PROMPT = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique (manuels de service, revues moto, catalogues de pièces).

Lis attentivement les pages du PDF et rédige 3 éléments :

1. **title_fr** : Titre adapté en français. Les noms de marque, modèles et références NE SE TRADUISENT PAS (ex: Yamaha DS7, Virago XV535). Traduis le type de document : "Service Manual" → "Manuel de service", "Parts Catalog" → "Catalogue des pièces", "Workshop Manual" → "Manuel d'atelier", "Revue Moto Technique" → reste tel quel.

2. **description_fr** : Description en français (150-250 mots) basée UNIQUEMENT sur ce que tu vois réellement dans le PDF. Mentionne les modèles concernés, les années si visibles, les systèmes et chapitres traités. Pour une RMT/RTA : précise les motos couvertes, les chapitres techniques, les schémas disponibles.

3. **description_en** : Même description en anglais, rédaction originale (pas traduction mot-à-mot).

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document
- UNIQUEMENT ce que tu vois dans le PDF — jamais ce qu'un tel manuel "devrait" contenir
- Pas de HTML ni markdown
- Ne commence pas par "Ce document..." ou "This document..."
- Si le PDF est en partie illisible, décris ce qui est visible

Réponds UNIQUEMENT en JSON :
{"title_fr": "...", "description_fr": "...", "description_en": "..."}`;

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n=== Réécriture Yamaha Automobile (${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}) ===`);
console.log(`${DOCS.length} documents à traiter\n`);

let ok = 0, fail = 0;

for (let i = 0; i < DOCS.length; i++) {
  const { slug, title, pdf } = DOCS[i];
  console.log(`\n[${i + 1}/${DOCS.length}] ${slug}`);

  // Vérifier le fichier
  if (!fs.existsSync(pdf)) {
    console.error(`  ❌ PDF introuvable : ${pdf}`);
    fail++;
    continue;
  }

  const rawBuf = fs.readFileSync(pdf);
  console.log(`  PDF : ${(rawBuf.length / 1024 / 1024).toFixed(1)} MB`);

  let truncBuf, totalPages;
  try {
    ({ buf: truncBuf, total: totalPages } = await truncatePdf(rawBuf, MAX_PAGES));
    console.log(`  Pages : ${totalPages} (envoi des ${Math.min(MAX_PAGES, totalPages)} premières)`);
  } catch (err) {
    console.error(`  ❌ Erreur pdf-lib : ${err.message}`);
    fail++;
    continue;
  }

  // Appel Claude
  let result;
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: truncBuf.toString('base64') },
          },
          {
            type: 'text',
            text: `Titre original (EN) : ${title}\nPages totales : ${totalPages}\n\n${PROMPT}`,
          },
        ],
      }],
    });

    const text = resp.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Réponse non parseable : ' + text.slice(0, 200));
    result = JSON.parse(match[0]);
  } catch (err) {
    console.error(`  ❌ Erreur Claude : ${err.message}`);
    fail++;
    if (i < DOCS.length - 1) await sleep(DELAY_MS);
    continue;
  }

  console.log(`  title_fr   : ${result.title_fr}`);
  console.log(`  desc FR    : ${result.description_fr.slice(0, 80)}...`);

  if (!DRY_RUN) {
    const update = {
      title_fr:       result.title_fr,
      description:    result.description_en,
      description_fr: result.description_fr,
      page_count:     totalPages,
    };
    // Pour yamaha-rta-125dtmx-bd : corriger aussi le titre EN (était "Coccinelle RTA Volkswagen")
    if (slug === 'yamaha-rta-125dtmx-bd') {
      update.title = title;
    }

    const { error } = await supabase
      .from('documents')
      .update(update)
      .eq('slug', slug);

    if (error) {
      console.error(`  ❌ Supabase : ${error.message}`);
      fail++;
    } else {
      console.log(`  ✅ Mis à jour (page_count: ${totalPages})`);
      ok++;
    }
  } else {
    console.log(`  [DRY-RUN] Pas de mise à jour`);
    ok++;
  }

  if (i < DOCS.length - 1) {
    process.stdout.write(`  Pause ${DELAY_MS / 1000}s...`);
    await sleep(DELAY_MS);
    process.stdout.write(' ok\n');
  }
}

console.log(`\n=== Terminé : ${ok} OK, ${fail} erreurs ===`);
