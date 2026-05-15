/**
 * Audit des descriptions à risque d'hallucination :
 * - Documents avec "schema", "scheme", "schematic" dans le slug
 * - Documents avec ≤ 5 pages
 * Vérifie si la description contient des mots-clés typiques d'hallucination
 * (tubes, procédures inventées, etc.)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mots-clés suspects dans les descriptions de documents schémas
const HALLUCINATION_KEYWORDS = [
  'vacuum tube', 'tube amplif', 'tubes électroniques', 'amplification à tubes',
  'step-by-step', 'étape par étape', 'procédure', 'procedure',
  'troubleshooting guide', 'guide de dépannage',
  'comprehensive', 'exhaustive', 'detailed instructions',
  'manuel complet', 'guide complet', 'reference manual',
];

let page = 0;
const pageSize = 1000;
let allDocs = [];

while (true) {
  const { data } = await supabase
    .from('documents')
    .select('slug,title,title_fr,page_count,description,description_fr')
    .eq('active', true)
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (!data || data.length === 0) break;
  allDocs = allDocs.concat(data);
  if (data.length < pageSize) break;
  page++;
}

console.log(`Total documents analysés : ${allDocs.length}\n`);

const suspects = [];

for (const doc of allDocs) {
  const isSchema = /schema|scheme|schematic/i.test(doc.slug);
  const isShort = doc.page_count <= 5;
  if (!isSchema && !isShort) continue;

  const desc = (doc.description || '') + ' ' + (doc.description_fr || '');
  const found = HALLUCINATION_KEYWORDS.filter(k => desc.toLowerCase().includes(k.toLowerCase()));

  if (found.length > 0) {
    suspects.push({ slug: doc.slug, page_count: doc.page_count, keywords: found });
  }
}

console.log(`Documents suspects : ${suspects.length}`);
suspects.forEach(d => {
  console.log(`\n❌ ${d.slug} (${d.page_count}p)`);
  console.log(`   Mots-clés : ${d.keywords.join(', ')}`);
});

fs.writeFileSync('scripts/audit-suspects.json', JSON.stringify(suspects, null, 2), 'utf8');
console.log('\nRapport sauvegardé : scripts/audit-suspects.json');
