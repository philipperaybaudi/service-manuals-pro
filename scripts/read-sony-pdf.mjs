/**
 * Lecture diagnostique des PDFs Sony pour vérifier le modèle exact
 * et extraire le sommaire (pages 6-8 de la version FR-IT)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PDF_DIR = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégorie\\Photographie\\Sony';

async function readPdf(filename, maxPages = 10) {
  const filePath = path.join(PDF_DIR, filename);
  const buffer = fs.readFileSync(filePath);

  // Tronquer si nécessaire
  const srcDoc = await PDFDocument.load(buffer);
  const total = srcDoc.getPageCount();
  console.log(`  Total pages: ${total}`);

  let pdfBuffer = buffer;
  if (total > maxPages) {
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(srcDoc, Array.from({ length: maxPages }, (_, i) => i));
    pages.forEach(p => newDoc.addPage(p));
    pdfBuffer = Buffer.from(await newDoc.save());
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
        },
        {
          type: 'text',
          text: 'Quel est le modèle exact de l\'appareil photo/caméra couvert par ce document ? Donne-moi aussi le sommaire complet (table des matières) si tu le vois dans ce PDF.',
        },
      ],
    }],
  });

  return response.content[0].text;
}

console.log('\n=== PDF FR-IT ===');
const resultFrIt = await readPdf('sony_hdrfx7-notice_fr-it.pdf', 10);
console.log(resultFrIt);

console.log('\n=== PDF GB (EN) ===');
const resultGb = await readPdf('sony_hdrfx7-notice_gb.pdf', 5);
console.log(resultGb);
