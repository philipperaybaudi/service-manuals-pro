import { readFileSync, writeFileSync } from 'fs';
const file = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-photography.json';
const inventory = JSON.parse(readFileSync(file, 'utf-8'));

let fixed = 0;
const priceRegex = /\s*\$\d+(\.\d+)?\s*/g;

for (const e of inventory) {
  const before = e.title + (e.description || '');
  e.title = e.title?.replace(priceRegex, ' ').replace(/\s{2,}/g, ' ').trim();
  e.description = e.description?.replace(priceRegex, ' ').replace(/\s{2,}/g, ' ').trim();
  if (e.title + (e.description || '') !== before) fixed++;
}

writeFileSync(file, JSON.stringify(inventory, null, 2));
console.log(`✓ ${fixed} entrées corrigées (prix supprimés des titres/descriptions)`);
