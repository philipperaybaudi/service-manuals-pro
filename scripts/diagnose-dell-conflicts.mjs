/**
 * diagnose-dell-conflicts.mjs
 * Affiche les infos DB des 6 paires de slugs en conflit DELL
 * pour décider quelle action prendre.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CONFLICTS = [
  {
    old_slug: 'dell-alienware-17-r4-service-manual-ko',
    new_slug: 'dell-alienware-17-r4-service-manual-de-2',
    detected_lang: 'de',
  },
  {
    old_slug: 'dell-dell-g5-se-service-manual-it',
    new_slug: 'dell-dell-g5-se-service-manual-it-2',
    detected_lang: 'it',
  },
  {
    old_slug: 'dell-dell-g7-15-service-manual-ko-2',
    new_slug: 'dell-dell-g7-15-service-manual-no-2',
    detected_lang: 'no',
  },
  {
    old_slug: 'dell-dell-g7-7790-service-manual-es',
    new_slug: 'dell-dell-g7-7790-service-manual-it',
    detected_lang: 'it',
  },
  {
    old_slug: 'dell-dell-inspiron-15-5567-service-manual-et',
    new_slug: 'dell-dell-inspiron-15-5567-service-manual-vi',
    detected_lang: 'vi',
  },
  {
    old_slug: 'dell-dell-inspiron-15-5576-gaming-service-manual-vi-2',
    new_slug: null,  // à trouver
    detected_lang: '?',
  },
];

async function fetchDoc(slug) {
  const { data } = await supabase
    .from('documents')
    .select('slug, title, page_count, file_path, language, description')
    .eq('slug', slug)
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

// Pour le cas #6 : trouver le new_slug dans corrections-dell.json
import { readFileSync } from 'fs';
import { join } from 'path';

const correctionsPath = join('scripts', 'corrections-dell.json');
let corrections = [];
try {
  corrections = JSON.parse(readFileSync(correctionsPath, 'utf8'));
} catch(e) {
  console.error('Impossible de lire corrections-dell.json:', e.message);
}

// Compléter le new_slug manquant pour #6
for (const conflict of CONFLICTS) {
  if (conflict.new_slug === null) {
    const entry = corrections.find(c => c.old_slug === conflict.old_slug);
    if (entry) {
      conflict.new_slug = entry.new_slug;
      conflict.detected_lang = entry.lang_code;
    }
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  DIAGNOSTIC — 6 CONFLITS DE SLUG DELL');
console.log('══════════════════════════════════════════════════════════════\n');

for (let i = 0; i < CONFLICTS.length; i++) {
  const { old_slug, new_slug, detected_lang } = CONFLICTS[i];
  console.log(`\n┌── Conflit #${i+1} ─────────────────────────────────────────────`);
  console.log(`│  Langue détectée : ${detected_lang}`);
  console.log(`│`);

  const oldDoc = await fetchDoc(old_slug);
  console.log(`│  DOC SOURCE (old_slug):`);
  if (oldDoc) {
    console.log(`│    slug       : ${oldDoc.slug}`);
    console.log(`│    title      : ${oldDoc.title}`);
    console.log(`│    pages      : ${oldDoc.page_count}`);
    console.log(`│    file_path  : ${oldDoc.file_path}`);
    console.log(`│    language   : ${oldDoc.language ?? 'null'}`);
    console.log(`│    desc début : ${(oldDoc.description || '').substring(0, 80)}...`);
  } else {
    console.log(`│    ⚠ NON TROUVÉ en base`);
  }

  console.log(`│`);
  const newDoc = new_slug ? await fetchDoc(new_slug) : null;
  console.log(`│  DOC CIBLE (new_slug = ${new_slug ?? '???'}):`);
  if (newDoc) {
    console.log(`│    slug       : ${newDoc.slug}`);
    console.log(`│    title      : ${newDoc.title}`);
    console.log(`│    pages      : ${newDoc.page_count}`);
    console.log(`│    file_path  : ${newDoc.file_path}`);
    console.log(`│    language   : ${newDoc.language ?? 'null'}`);
    console.log(`│    desc début : ${(newDoc.description || '').substring(0, 80)}...`);
  } else {
    console.log(`│    ✓ LIBRE — aucun doc à ce slug`);
  }

  console.log(`└───────────────────────────────────────────────────────────`);
}

console.log('\n══════════════════════════════════════════════════════════════\n');
