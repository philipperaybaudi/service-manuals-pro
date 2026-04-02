/**
 * AI Metadata Pipeline
 *
 * Uses Claude API to generate better titles, descriptions, and SEO metadata
 * for documents that have been imported.
 *
 * Usage: npx tsx scripts/process-ai-metadata.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== AI Metadata Pipeline ===\n');

  // Get all documents without AI-processed metadata
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, slug, description, category:categories(name), brand:brands(name)')
    .eq('active', true)
    .order('created_at');

  if (error || !docs) {
    console.error('Failed to fetch documents:', error?.message);
    return;
  }

  console.log(`Found ${docs.length} documents to process\n`);
  let processed = 0;

  for (const doc of docs) {
    const brandName = (doc as any).brand?.name || '';
    const categoryName = (doc as any).category?.name || '';

    const prompt = `You are an SEO expert for a technical documentation marketplace. Generate optimized metadata for this service manual.

Current title: ${doc.title}
Brand: ${brandName}
Category: ${categoryName}
Current description: ${doc.description || 'N/A'}

Return ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "title": "Clear, descriptive title (max 80 chars, include brand and model)",
  "description": "Compelling product description for buyers (150-200 chars, mention what's included: schematics, repair procedures, parts lists, etc.)",
  "seo_title": "SEO-optimized page title (max 60 chars, include key terms)",
  "seo_description": "Meta description for Google (max 155 chars, include a call to action)",
  "seo_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "price_suggestion": 990
}

The price_suggestion should be in cents. Use 590 for simple docs, 990 for standard manuals, 1490 for comprehensive manuals, 1990 for rare/valuable docs.`;

    try {
      const response = await callClaude(prompt);
      const metadata = JSON.parse(response);

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          title: metadata.title || doc.title,
          description: metadata.description || doc.description,
          seo_title: metadata.seo_title,
          seo_description: metadata.seo_description,
          seo_tags: metadata.seo_tags,
          price: metadata.price_suggestion || 990,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      if (updateError) {
        console.error(`  ✗ ${doc.title}: ${updateError.message}`);
      } else {
        console.log(`  ✓ ${metadata.title || doc.title}`);
        processed++;
      }
    } catch (err: any) {
      console.error(`  ✗ ${doc.title}: ${err.message}`);
    }

    await sleep(RATE_LIMIT_DELAY);
  }

  console.log(`\n=== Done === ${processed}/${docs.length} documents processed`);
}

main().catch(console.error);
