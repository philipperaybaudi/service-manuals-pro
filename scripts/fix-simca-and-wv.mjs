/**
 * 1. Supprime la marque "WV" de la catégorie Automobile
 * 2. Corrige le titre FR de la SIMCA F594WML
 * 3. Lit le PDF SIMCA via Claude API et génère une description réelle
 *
 * Usage : node scripts/fix-simca-and-wv.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WV_BRAND_ID = '0664e1f4-8761-4317-abf8-ca872493b18c';
const SIMCA_SLUG  = 'simca-f594wml-f569wml-service-manual';
const SIMCA_PDF   = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\SIMCA\\SIMCA Simca F594WML.pdf';
const MAX_PAGES   = 15;

// ─── 1. Supprimer la marque WV ────────────────────────────────────────────────
console.log('\n1. Suppression de la marque WV...');
const { error: delErr } = await supabase
  .from('brands')
  .delete()
  .eq('id', WV_BRAND_ID);

if (delErr) console.error(`   ❌ ${delErr.message}`);
else console.log('   ✅ Marque WV supprimée');

// ─── 2. Corriger le titre FR SIMCA ───────────────────────────────────────────
console.log('\n2. Correction titre FR SIMCA...');
const { error: titleErr } = await supabase
  .from('documents')
  .update({ title_fr: 'Camions SIMCA F594WML F569WML - Manuel de service' })
  .eq('slug', SIMCA_SLUG);

if (titleErr) console.error(`   ❌ ${titleErr.message}`);
else console.log('   ✅ title_fr → "Camions SIMCA F594WML F569WML - Manuel de service"');

// ─── 3. Lire le PDF SIMCA et générer un vrai descriptif ──────────────────────
console.log('\n3. Lecture du PDF SIMCA...');

if (!fs.existsSync(SIMCA_PDF)) {
  console.error(`   ❌ PDF introuvable : ${SIMCA_PDF}`);
  process.exit(1);
}

const rawBuf = fs.readFileSync(SIMCA_PDF);
console.log(`   PDF : ${(rawBuf.length / 1024 / 1024).toFixed(1)} MB`);

// Compter les pages et tronquer
const srcDoc = await PDFDocument.load(rawBuf);
const totalPages = srcDoc.getPageCount();
console.log(`   Pages totales : ${totalPages}`);

let pdfBuf = rawBuf;
if (totalPages > MAX_PAGES) {
  const dst = await PDFDocument.create();
  const pages = await dst.copyPages(srcDoc, Array.from({ length: MAX_PAGES }, (_, i) => i));
  pages.forEach(p => dst.addPage(p));
  pdfBuf = Buffer.from(await dst.save());
  console.log(`   Tronqué à ${MAX_PAGES} pages pour Claude`);
}

const prompt = `Tu es un rédacteur technique professionnel pour un site de vente de documentation technique.

Ce document est le manuel de service des camions SIMCA F594WML et F569WML (${totalPages} pages au total).

Lis attentivement les pages fournies et rédige :

1. **description_fr** : Description en français (150-250 mots) basée UNIQUEMENT sur ce que tu vois réellement dans le PDF. Décris les systèmes couverts, les chapitres visibles, le contenu technique réel. Mentionne les modèles concernés.

2. **description_en** : Même description en anglais, rédaction originale (pas traduction mot-à-mot).

RÈGLES ABSOLUES :
- Ne mentionne JAMAIS la langue du document
- Décris UNIQUEMENT ce que tu vois dans le PDF — jamais ce qu'un tel document "devrait" contenir
- Pas de HTML ni markdown dans les descriptions
- Ne commence pas par "Ce document..." ou "This document..."
- Si certaines pages ne sont pas lisibles, décris ce qui l'est

Réponds UNIQUEMENT en JSON sans texte avant/après :
{"description_fr": "...", "description_en": "..."}`;

console.log('   Envoi à Claude API...');
const resp = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1500,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBuf.toString('base64') },
      },
      {
        type: 'text',
        text: `Titre du document : Trucks SIMCA F594WML F569WML - Service Manual\n\n${prompt}`,
      },
    ],
  }],
});

const text = resp.content[0].text.trim();
const match = text.match(/\{[\s\S]*\}/);
if (!match) {
  console.error('   ❌ Réponse Claude non parseable :', text.slice(0, 200));
  process.exit(1);
}

const result = JSON.parse(match[0]);
console.log(`\n   desc FR : ${result.description_fr.slice(0, 120)}...`);
console.log(`   desc EN : ${result.description_en.slice(0, 120)}...`);

// Mise à jour en base
const { error: descErr } = await supabase
  .from('documents')
  .update({
    description:    result.description_en,
    description_fr: result.description_fr,
    page_count:     totalPages,
  })
  .eq('slug', SIMCA_SLUG);

if (descErr) console.error(`   ❌ Erreur mise à jour Supabase : ${descErr.message}`);
else console.log(`\n   ✅ Descriptions + page_count (${totalPages}) mis à jour`);

console.log('\n=== Terminé ===');
