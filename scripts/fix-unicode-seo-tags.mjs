/**
 * fix-unicode-seo-tags.mjs
 * Scanne tous les documents dont le titre (title ou title_fr) contient des
 * symboles Unicode non recherchables (★, ©, ®, °, №, Mk, etc.) et ajoute
 * automatiquement les équivalents texte dans seo_tags.
 *
 * Usage : node scripts/fix-unicode-seo-tags.mjs [--dry-run]
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// ── Table de correspondance symboles → équivalents texte ──────────────────────
// Chaque entrée : [regex de détection, fonction(match, title) → string[]]
const SYMBOL_RULES = [
  // Étoiles ★ : 1★=1 étoile, ★★=2 étoiles, etc.
  {
    detect: /★+/g,
    expand: (match, title) => {
      const n = match.length;
      const fr = [`${n} étoile${n > 1 ? 's' : ''}`, `${n} star${n > 1 ? 's' : ''}`,
                  `${n === 1 ? 'une' : 'deux'} étoile${n > 1 ? 's' : ''}`,
                  `${n === 2 ? 'double' : n + ' fois'} étoile`];
      // Extraire la marque depuis le titre pour construire des seo_tags complets
      const brand = title.split(/[\s\-–]/)[0];
      return [
        ...fr,
        ...fr.map(v => `${brand} ${v}`),
      ];
    }
  },
  // Marque déposée ® → registered, marque
  {
    detect: /®/g,
    expand: (match, title) => ['registered', 'marque déposée', 'trademark']
  },
  // Copyright ©
  {
    detect: /©/g,
    expand: () => ['copyright']
  },
  // Degré ° → degré, degree
  {
    detect: /°/g,
    expand: () => ['degré', 'degree', 'degrees']
  },
  // Numéro № ou N° → numéro, number, no.
  {
    detect: /[№]/g,
    expand: () => ['numéro', 'number', 'no.', 'num']
  },
  // Mark / Mk → Mk I, Mk II, Mk III (roman numerals)
  {
    detect: /\bMk\s*(I{1,3}|IV|V|VI{0,3}|IX|X)\b/gi,
    expand: (match) => {
      const roman = match.replace(/Mk\s*/i, '').trim();
      const arabicMap = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
      const arabic = arabicMap[roman.toUpperCase()];
      return arabic
        ? [`Mark ${roman}`, `Mark ${arabic}`, `Mk${arabic}`, `MkII`.replace('II', roman)]
        : [`Mark ${roman}`];
    }
  },
  // Numéros romains seuls dans le titre (II, III, IV…) → arabes
  {
    detect: /\b(II|III|IV|VI|VII|VIII|IX)\b/g,
    expand: (match) => {
      const map = { II:2, III:3, IV:4, VI:6, VII:7, VIII:8, IX:9 };
      const arabic = map[match];
      return arabic ? [String(arabic), `${arabic}`] : [];
    }
  },
  // & → and, et
  {
    detect: /\s&\s/g,
    expand: () => ['and', 'et']
  },
  // Plus/moins ± → plus moins, plus or minus
  {
    detect: /±/g,
    expand: () => ['plus moins', 'plus or minus']
  },
  // Micro µ → micro, micron
  {
    detect: /µ/g,
    expand: () => ['micro', 'micron']
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function expandTitle(title) {
  if (!title) return [];
  const extras = new Set();
  for (const rule of SYMBOL_RULES) {
    let m;
    rule.detect.lastIndex = 0;
    while ((m = rule.detect.exec(title)) !== null) {
      const results = rule.expand(m[0], title);
      results.forEach(r => r && r.trim() && extras.add(r.trim()));
    }
  }
  return [...extras];
}

function hasSymbols(title) {
  if (!title) return false;
  return SYMBOL_RULES.some(rule => {
    rule.detect.lastIndex = 0;
    return rule.detect.test(title);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

console.log(`\n🔍 fix-unicode-seo-tags.mjs ${DRY_RUN ? '[DRY-RUN]' : '[PRODUCTION]'}\n`);

// Récupérer tous les documents actifs par batch de 1000
let page = 0;
const PAGE_SIZE = 1000;
let totalUpdated = 0;
let totalSkipped = 0;

while (true) {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, slug, title, title_fr, seo_tags')
    .eq('active', true)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order('id');

  if (error) { console.error('Erreur fetch:', error.message); break; }
  if (!docs || docs.length === 0) break;

  for (const doc of docs) {
    // Détecter les symboles dans title et/ou title_fr
    if (!hasSymbols(doc.title) && !hasSymbols(doc.title_fr)) {
      totalSkipped++;
      continue;
    }

    // Générer les nouveaux tags à partir des deux champs
    const newTags = new Set([
      ...expandTitle(doc.title),
      ...expandTitle(doc.title_fr),
    ]);

    // Ne pas dupliquer ce qui existe déjà
    const existing = new Set((doc.seo_tags || []).map(t => t.toLowerCase()));
    const toAdd = [...newTags].filter(t => !existing.has(t.toLowerCase()));

    if (toAdd.length === 0) {
      console.log(`  ⏭ ${doc.slug} — tags déjà couverts`);
      totalSkipped++;
      continue;
    }

    const merged = [...(doc.seo_tags || []), ...toAdd];

    console.log(`  ${DRY_RUN ? '[DRY]' : '✓'} ${doc.slug}`);
    console.log(`      title    : ${doc.title}`);
    console.log(`      title_fr : ${doc.title_fr}`);
    console.log(`      nouveaux : ${toAdd.join(', ')}`);

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('documents')
        .update({ seo_tags: merged })
        .eq('id', doc.id);
      if (upErr) {
        console.error(`      ✗ Erreur: ${upErr.message}`);
      }
    }

    totalUpdated++;
  }

  if (docs.length < PAGE_SIZE) break;
  page++;
}

console.log(`\n✅ Terminé — ${totalUpdated} documents mis à jour, ${totalSkipped} ignorés.\n`);
