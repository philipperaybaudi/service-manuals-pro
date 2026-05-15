// Vérifie quels docs de l'inventory n'ont pas été importés
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');

const supabase = createClient('https://ylsbqehotapcprfinsnu.supabase.co', 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X');
const inventory = JSON.parse(readFileSync('C:/Users/adm/Claude Doc GB test/service-manuals-pro/inventory-machines.json', 'utf-8'));

const slugs = inventory.map(e => e.slug);
const { data } = await supabase.from('documents').select('slug').in('slug', slugs);
const imported = new Set(data.map(d => d.slug));
const missing = inventory.filter(e => !imported.has(e.slug));

console.log(`Manquants : ${missing.length}\n`);
missing.forEach(e => console.log(`  ${e.brand.padEnd(15)} | ${String(e.pages ?? 'null').padStart(4)}p | ${e.slug}`));
