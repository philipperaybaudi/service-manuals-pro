// Batch translate document titles and descriptions to French using Claude Haiku
// Run with: node scripts/translate-docs-batch.mjs
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateDocs() {
  console.log('Starting batch translation to French...\n');

  // 1. Check if title_fr column exists, if not create it
  const { error: columnCheckError } = await supabase
    .from('documents')
    .select('title_fr')
    .limit(1);

  if (columnCheckError?.code === 'PGRST204' || columnCheckError?.message?.includes('title_fr')) {
    console.log('Creating title_fr column...');
    // We can't create columns via API, user must do it manually
    console.warn('⚠️  Please create the title_fr column manually with: ALTER TABLE documents ADD COLUMN title_fr TEXT;');
    return;
  }

  // 2. Fetch all docs that need translation (title_fr is NULL)
  const { data: docs, error: fetchError } = await supabase
    .from('documents')
    .select('id, title, description')
    .is('title_fr', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching documents:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${docs.length} documents to translate\n`);

  // 3. Process in batches
  let translated = 0;
  let errors = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)}`);

    // Prepare batch for translation
    const batchText = batch
      .map((doc, idx) => `[DOC ${idx + 1}]\nTitle: ${doc.title}\nDescription: ${doc.description || '(no description)'}`)
      .join('\n\n---\n\n');

    try {
      // Call Claude Sonnet for translation
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: `Translate the following document titles and descriptions to French. Follow these rules carefully:

RULES:
1. Keep all brand names, product models, and proper nouns UNCHANGED
2. Translate generic terms: "Service Manual" → "Manuel de Service", "User Guide" → "Guide Utilisateur", "Workshop Manual" → "Manuel d'Atelier", "Repair Guide" → "Guide de Réparation", "Price Guide" → "Guide de Tarification"
3. For reference books with English titles (like "Foundations of Mechanical Accuracy by Wayne R Moore"), keep the title unchanged but translate connecting words (e.g., "by" → "par")
4. For hybrid titles like "Classic Cameras by Colin Harding", keep "Classic Cameras" unchanged but translate "by" → "par"
5. Keep descriptions concise and professional

Return ONLY the translations in this exact format (no explanations):
[DOC 1]
Title: [French title]
Description: [French description]

[DOC 2]
Title: [French title]
Description: [French description]

etc.

Documents to translate:
${batchText}`,
          },
        ],
      });

      // Parse response
      const response = message.content[0].type === 'text' ? message.content[0].text : '';
      const docMatches = response.match(/\[DOC \d+\]\nTitle: (.*?)\nDescription: ([\s\S]*?)(?=\[DOC|\Z)/g);

      if (!docMatches || docMatches.length !== batch.length) {
        console.warn(`⚠️  Mismatch: expected ${batch.length} docs, got ${docMatches?.length || 0}`);
        errors += batch.length;
        await sleep(DELAY_BETWEEN_BATCHES);
        continue;
      }

      // Update in database
      for (let j = 0; j < docMatches.length; j++) {
        const match = docMatches[j].match(/Title: (.*?)\nDescription: ([\s\S]*?)$/);
        if (!match) continue;

        const [, titleFr, descriptionFr] = match;
        const doc = batch[j];

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            title_fr: titleFr.trim(),
            description_fr: descriptionFr.trim(),
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`❌ Doc ${doc.id}: ${updateError.message}`);
          errors++;
        } else {
          translated++;
          console.log(`✓ ${doc.title}`);
        }
      }
    } catch (error) {
      console.error(`Error processing batch: ${error.message}`);
      errors += batch.length;
    }

    // Wait before next batch
    if (i + BATCH_SIZE < docs.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\n\nDone!`);
  console.log(`✓ Translated: ${translated}`);
  console.log(`✗ Errors: ${errors}`);
  console.log(`Total: ${docs.length}`);
}

translateDocs().catch(console.error);
