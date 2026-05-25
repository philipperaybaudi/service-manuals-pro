/**
 * dell-phase3-desc-fix.mjs
 * Corrige les 15 descriptions restantes après Phase 3
 * (slugs renommés -vi → -hr/-ko dont la description n'a pas pu être mise à jour
 *  car l'Étape 4 cherchait l'ancien slug déjà supprimé)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// Mapping new_slug → {lang_fr_wrong, lang_fr_right, lang_en_wrong, lang_en_right}
const FIXES = [
  // All Croatian fixes (renamed from -vi)
  { slug: 'dell-dell-inspiron-15-3551-service-manual-hr-2',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-5576-gaming-setup-and-specifications-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-5576-gaming-service-manual-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-11-3000-series-3158-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-14-3458-service-manual-hr-2',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-3531-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-3558-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-3552-service-manual-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-3558-service-manual-vietnamese-hr-2',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-14-5000-series-5455-service-manual-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-14-5458-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-13-7348-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-7547-service-manual-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  { slug: 'dell-dell-inspiron-15-3555-service-manual-vietnamese-hr',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Croate', lang_en_wrong: 'Vietnamese', lang_en_right: 'Croatian' },
  // Korean fix
  { slug: 'dell-dell-inspiron-11-3162-setup-and-specifications-guide-ko',
    lang_fr_wrong: 'Vietnamien', lang_fr_right: 'Coréen', lang_en_wrong: 'Vietnamese', lang_en_right: 'Korean' },
];

console.log(`\n${'═'.repeat(64)}`);
console.log(`  DELL PHASE 3 — CORRECTION DESCRIPTIONS RESTANTES${DRY_RUN ? ' [DRY-RUN]' : ''}`);
console.log(`${'═'.repeat(64)}\n`);

let ok = 0, errs = 0;

for (const fix of FIXES) {
  const { slug, lang_fr_wrong, lang_fr_right, lang_en_wrong, lang_en_right } = fix;

  const { data } = await supabase.from('documents')
    .select('description, description_fr').eq('slug', slug).maybeSingle();

  if (!data) {
    console.log(`  ✗ Slug introuvable: ${slug}`);
    errs++;
    continue;
  }

  const newDescFr = (data.description_fr || '')
    .replace(new RegExp(`en ${lang_fr_wrong}`, 'gi'), `en ${lang_fr_right}`)
    .replace(new RegExp(`En ${lang_fr_wrong}`, 'gi'), `En ${lang_fr_right}`);

  const newDescEn = (data.description || '')
    .replace(new RegExp(`in ${lang_en_wrong}`, 'gi'), `in ${lang_en_right}`)
    .replace(new RegExp(`In ${lang_en_wrong}`, 'gi'), `In ${lang_en_right}`);

  console.log(`  ${slug}`);
  console.log(`    FR: "en ${lang_fr_wrong}" → "en ${lang_fr_right}"`);

  if (DRY_RUN) {
    console.log(`    [DRY] OK`);
    ok++;
    continue;
  }

  const { error } = await supabase.from('documents')
    .update({ description_fr: newDescFr, description: newDescEn })
    .eq('slug', slug);

  if (error) {
    console.log(`    ✗ ${error.message}`);
    errs++;
  } else {
    console.log(`    ✓ Description mise à jour`);
    ok++;
  }
}

console.log(`\n${'═'.repeat(64)}`);
console.log(`  RÉSULTAT : ${ok} OK | ${errs} erreurs`);
console.log(`${'═'.repeat(64)}\n`);
