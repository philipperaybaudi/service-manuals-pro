/**
 * Met à jour un document déjà en base à partir de son entrée dans le rapport.
 * Usage : node scripts/update-doc-from-report.mjs <Subfolder> <filename.pdf>
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUBFOLDER   = process.argv[2];
const TARGET_FILE = process.argv[3];
const OLD_SLUG    = process.argv[4]; // optionnel : ancien slug en base si différent du nouveau
if (!SUBFOLDER || !TARGET_FILE) {
  console.error('Usage : node scripts/update-doc-from-report.mjs <Subfolder> <filename.pdf> [old-slug]');
  process.exit(1);
}

const REPORT_FILE = path.join('scripts', `docs-a-classer-report-${SUBFOLDER.toLowerCase()}.json`);
const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
const entry  = report.docs.find(d => d.original_filename === TARGET_FILE && d.status === 'done');

if (!entry) {
  console.error(`Aucune entrée status=done trouvée pour : ${TARGET_FILE}`);
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const searchSlug = OLD_SLUG || entry.slug;
console.log(`Recherche en base : slug = "${searchSlug}"`);

const { data, error } = await supabase
  .from('documents')
  .update({
    slug:           entry.slug,
    title:          entry.title_en,
    title_fr:       entry.title_fr,
    description:    entry.description_en,
    description_fr: entry.description_fr,
  })
  .eq('slug', searchSlug)
  .select('id, slug, title, title_fr');

if (error) {
  console.error('Erreur Supabase :', error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.error(`Aucun document trouvé en base avec slug = "${entry.slug}"`);
  process.exit(1);
}

console.log(`✓ Mis à jour : ${data[0].slug}`);
console.log(`  title    : ${data[0].title}`);
console.log(`  title_fr : ${data[0].title_fr}`);
