/**
 * Correction ciblée du Nikon F3 Repair Manual.
 * Les 30 premières pages couvrent l'accessoire AF Finder DX-1, pas le F3.
 * Ce script lit les pages 25-50 pour obtenir le contenu principal.
 *
 * Usage : node scripts/fix-nikon-f3.mjs [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';

const DRY_RUN = process.argv.includes('--dry-run');
const SLUG    = 'nikon-service-manual-nikon-f3';
const START_PAGE = 24; // index 0-based → page 25
const END_PAGE   = 50; // index 0-based → page 51

const supabase  = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2        = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractPageRange(buf, startIdx, endIdx) {
  const src   = await PDFDocument.load(buf);
  const total = src.getPageCount();
  const end   = Math.min(endIdx, total);
  const dst   = await PDFDocument.create();
  const pages = await dst.copyPages(src, Array.from({ length: end - startIdx }, (_, i) => startIdx + i));
  pages.forEach(p => dst.addPage(p));
  return { buf: Buffer.from(await dst.save()), total };
}

const { data: doc } = await supabase
  .from('documents')
  .select('slug, title, title_fr, file_path, page_count')
  .eq('slug', SLUG)
  .single();

if (!doc) { console.error(`❌ Slug non trouvé : ${SLUG}`); process.exit(1); }

console.log(`\n→ ${doc.slug}`);
console.log(`  Titre EN (intouchable) : ${doc.title}`);
console.log(`  title_fr actuel        : ${doc.title_fr}`);

const raw = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: doc.file_path }))
  .then(async res => { const c = []; for await (const ch of res.Body) c.push(ch); return Buffer.concat(c); });

const { buf: pdfBuf, total: pageCount } = await extractPageRange(raw, START_PAGE, END_PAGE);
console.log(`  PDF total : ${pageCount} pages — envoi des pages ${START_PAGE + 1} à ${Math.min(END_PAGE, pageCount)}`);

const resp = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1500,
  messages: [{
    role: 'user',
    content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuf.toString('base64') } },
      { type: 'text', text: `Titre original du document complet (391 pages) : ${doc.title}
Catégorie : Photography — Repair Manual

Ces pages sont extraites d'un manuel de réparation officiel Nikon F3 de 391 pages.

Rédige :
1. description_fr (150-250 mots) : basée sur ce que tu vois dans ces pages du PDF
2. description_en : même description en anglais, rédaction originale

RÈGLES :
- Ne mentionne JAMAIS la langue du document
- Décris UNIQUEMENT ce que tu vois — pas ce qu'un tel document "devrait" contenir
- Pas de HTML, pas de markdown
- Ne commence pas par "Ce document..." ou "This document..."

Réponds UNIQUEMENT en JSON :
{"description_fr": "...", "description_en": "..."}` },
    ],
  }],
});

const match = resp.content[0].text.trim().match(/\{[\s\S]*\}/);
if (!match) { console.error('Réponse Claude non parseable'); process.exit(1); }
const result = JSON.parse(match[0]);

console.log(`  desc FR → ${result.description_fr.slice(0, 100)}...`);

if (!DRY_RUN) {
  const { error } = await supabase.from('documents').update({
    description:    result.description_en,
    description_fr: result.description_fr,
    page_count:     pageCount,
  }).eq('slug', SLUG);

  if (error) { console.error(`❌ ${error.message}`); process.exit(1); }
  console.log(`  ✅ Mis à jour`);
} else {
  console.log(`  [DRY-RUN] Aucune modification`);
}
