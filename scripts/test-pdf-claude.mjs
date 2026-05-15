/**
 * Script de test : envoie UN SEUL PDF à Claude API pour vérifier que ça fonctionne.
 * Usage : node scripts/test-pdf-claude.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  // 1. Récupérer un document de test (petit, avec PDF)
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, title, slug, file_path, page_count')
    .eq('active', true)
    .lt('page_count', 30)
    .order('page_count', { ascending: true })
    .limit(1)
    .single();

  if (error || !doc) {
    console.error('Erreur Supabase:', error);
    process.exit(1);
  }

  console.log(`Document de test: ${doc.title}`);
  console.log(`Slug: ${doc.slug}`);
  console.log(`File path: ${doc.file_path}`);
  console.log(`Pages: ${doc.page_count}`);
  console.log('');

  // 2. Télécharger le PDF depuis R2
  console.log('--- Étape 1: Téléchargement R2 ---');
  let pdfBuffer;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: doc.file_path,
    });
    const response = await r2.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    pdfBuffer = Buffer.concat(chunks);
    console.log(`OK: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB téléchargés`);
  } catch (err) {
    console.error(`ERREUR R2: ${err.message}`);
    process.exit(1);
  }

  // 3. Convertir en base64
  console.log('');
  console.log('--- Étape 2: Conversion base64 ---');
  const pdfBase64 = pdfBuffer.toString('base64');
  console.log(`OK: ${(pdfBase64.length / 1024 / 1024).toFixed(2)} MB en base64`);

  // 4. Envoyer à Claude API AVEC le PDF
  console.log('');
  console.log('--- Étape 3: Envoi à Claude API avec PDF ---');
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: 'Décris brièvement ce que tu vois dans ce PDF en 2-3 phrases. Quels sont les sujets principaux visibles ?',
          },
        ],
      }],
    });

    console.log('OK! Réponse Claude:');
    console.log(response.content[0].text);
    console.log('');
    console.log('Usage:', JSON.stringify(response.usage));
  } catch (err) {
    console.error(`ERREUR Claude API: ${err.message}`);
    console.error('Status:', err.status);
    console.error('Type:', err.error?.type);
    console.error('Detail:', JSON.stringify(err.error, null, 2));
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
