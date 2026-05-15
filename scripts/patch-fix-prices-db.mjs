// Supprime les prix ($10, $12, etc.) des titres et descriptions
// dans inventory-photography.json ET dans Supabase (docs déjà importés)
// Usage: node scripts/patch-fix-prices-db.mjs

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAT_ID = '79ea117d-8952-4b9e-aab9-4b10fc2dec7a';
const priceRegex = /\s*\$\d+(\.\d+)?\s*/g;

function clean(str) {
  if (!str) return str;
  return str.replace(priceRegex, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ── 1. Patch JSON ────────────────────────────────────────────────────────────
const JSON_PATH = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.json';
const inventory = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
let jsonFixed = 0;
for (const e of inventory) {
  const before = (e.title || '') + (e.description || '');
  e.title = clean(e.title);
  e.description = clean(e.description);
  if ((e.title || '') + (e.description || '') !== before) jsonFixed++;
}
writeFileSync(JSON_PATH, JSON.stringify(inventory, null, 2));
console.log(`JSON : ${jsonFixed} entrees corrigees`);

// ── 2. Patch Supabase ────────────────────────────────────────────────────────
console.log('\nChargement des docs Photography depuis Supabase...');
let all = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, description, title_fr, description_fr')
    .eq('category_id', CAT_ID)
    .range(from, from + 999);
  if (error) { console.error(error.message); break; }
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`${all.length} docs charges`);

let dbFixed = 0, dbErrors = 0;
for (const doc of all) {
  const newTitle      = clean(doc.title);
  const newDesc       = clean(doc.description);
  const newTitleFr    = clean(doc.title_fr);
  const newDescFr     = clean(doc.description_fr);

  const changed =
    newTitle !== doc.title ||
    newDesc  !== doc.description ||
    newTitleFr !== doc.title_fr ||
    newDescFr  !== doc.description_fr;

  if (!changed) continue;

  const { error } = await supabase
    .from('documents')
    .update({
      title: newTitle,
      description: newDesc,
      title_fr: newTitleFr,
      description_fr: newDescFr,
    })
    .eq('id', doc.id);

  if (error) {
    console.log(`  ERR ${doc.id}: ${error.message}`);
    dbErrors++;
  } else {
    dbFixed++;
    if (dbFixed <= 10) console.log(`  OK: ${newTitle}`);
  }
}
if (dbFixed > 10) console.log(`  ... et ${dbFixed - 10} autres`);

console.log(`\nSupabase : ${dbFixed} docs corriges, ${dbErrors} erreurs`);
console.log('Termine.');
