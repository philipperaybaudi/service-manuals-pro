/**
 * Script de correction des title_fr manquants.
 * Ne lit PAS les PDFs — traduit uniquement le titre anglais → français via Claude.
 * Très rapide et économique (texte court, pas de document joint).
 *
 * Usage : node scripts/fix-title-fr.mjs [--dry-run] [--limit N]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

const BATCH_SIZE = 5;       // 5 en parallèle (titres courts, peu de tokens)
const DELAY_MS   = 3000;    // 3s entre chaque batch
const LOG_FILE   = 'scripts/fix-title-fr-log.json';

// Documents protégés
const PROTECTED_SLUGS = ['foundations-of-mechanical-accuracy-wayne-r-moore-1970'];
const PROTECTED_TITLES_PARTIAL = [
  'antique trader', 'classic cameras', 'mckeown',
  'russian & soviet cameras', 'russian and soviet cameras',
];

function isProtected(doc) {
  if (PROTECTED_SLUGS.includes(doc.slug)) return true;
  const t = doc.title.toLowerCase();
  return PROTECTED_TITLES_PARTIAL.some(p => t.includes(p));
}

function isCameraCraftsman(doc) {
  return doc.title.toLowerCase().includes('camera craftsman');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Traduction du titre ──────────────────────────────────────────────────────

async function translateTitle(doc) {
  let prompt;

  if (isCameraCraftsman(doc)) {
    prompt = `Traduis ce titre de revue photographique en français selon ces règles STRICTES :
- Conserver EXACTEMENT "Camera Craftsman" (ne pas traduire)
- Traduire la période : "Jan/Feb" → "Janvier/Février", "Mar/Apr" → "Mars/Avril", "May/Jun" → "Mai/Juin", "Jul/Aug" → "Juillet/Août", "Sep/Oct" → "Septembre/Octobre", "Nov/Dec" → "Novembre/Décembre"
- Pour les numéros spéciaux (ex: "Canon AE-1") : "Camera Craftsman - Canon AE-1 (Numéro spécial)"
- Pour les index : "Camera Craftsman - Index 1969-1978"
- Format : "Camera Craftsman - [Période traduite] [Année]"

Titre original : ${doc.title}

Réponds UNIQUEMENT avec le titre traduit, sans guillemets, sans explication.`;
  } else {
    prompt = `Traduis ce titre de document technique en français selon ces règles :
- Les noms de marques, modèles et références NE SE TRADUISENT PAS (ex: "Nikon F3", "Stihl MS 250")
- Traduire les types : "Service Manual" → "Manuel de service", "User Manual" → "Manuel d'utilisation", "User's Guide" → "Guide d'utilisation", "Owner's Manual" → "Manuel du propriétaire", "Repair Manual/Guide" → "Manuel/Guide de réparation", "Workshop Manual" → "Manuel d'atelier", "Parts List/Catalog" → "Liste/Catalogue des pièces", "Wiring Diagram" → "Schéma de câblage", "Technical Manual" → "Manuel technique", "Instruction Manual/Book" → "Manuel/Livret d'instructions", "Maintenance Manual" → "Manuel d'entretien", "Operating Instructions" → "Instructions d'utilisation", "Troubleshooting Guide" → "Guide de dépannage", "Restoration Guide" → "Guide de restauration", "Field Manual" → "Manuel de terrain", "Adjustment" → "Réglage"
- "by" → "par" (quand il signifie l'auteur)
- Si le titre est déjà en français ou contient surtout des noms propres/références, le retourner tel quel

Titre original : ${doc.title}

Réponds UNIQUEMENT avec le titre traduit, sans guillemets, sans explication.`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Correction des title_fr manquants ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log('');

  // Charger tous les docs (pagination)
  let allDocs = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, title_fr, slug, active')
      .eq('active', true)
      .order('title')
      .range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('Supabase error:', error); process.exit(1); }
    allDocs = allDocs.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`Total documents actifs : ${allDocs.length}`);

  // Filtrer : seulement ceux avec title_fr null ou identique au titre anglais
  let docs = allDocs
    .filter(d => !isProtected(d))
    .filter(d => !d.title_fr || d.title_fr === d.title);

  if (LIMIT < docs.length) docs = docs.slice(0, LIMIT);
  console.log(`Documents à corriger : ${docs.length}\n`);

  // Charger le log pour reprendre si interrompu
  let log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')) : [];
  const done = new Set(log.map(l => l.slug));

  let processed = 0, skipped = 0, failed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(batch.map(async (doc) => {
      if (done.has(doc.slug)) { skipped++; return; }

      try {
        const titleFr = await translateTitle(doc);

        if (!DRY_RUN) {
          const { error } = await supabase
            .from('documents')
            .update({ title_fr: titleFr })
            .eq('id', doc.id);
          if (error) throw new Error(error.message);
        }

        log.push({ slug: doc.slug, title: doc.title, title_fr: titleFr, status: 'ok' });
        done.add(doc.slug);
        processed++;
        console.log(`[${processed + skipped}/${docs.length}] ${doc.slug}`);
        console.log(`  EN: ${doc.title}`);
        console.log(`  FR: ${titleFr}`);
      } catch (err) {
        failed++;
        console.error(`[ERROR] ${doc.slug}: ${err.message}`);
      }
    }));

    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

    if (i + BATCH_SIZE < docs.length) await sleep(DELAY_MS);
  }

  console.log('\n=== Terminé ===');
  console.log(`Traités : ${processed} | Ignorés : ${skipped} | Erreurs : ${failed}`);
}

main().catch(err => { console.error('Erreur fatale:', err); process.exit(1); });
