import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

try {
  const r = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'test' }],
  });
  console.log('✓ API OK:', r.content[0].text);
} catch (e) {
  console.log('✗ Erreur:', e.message);
}
