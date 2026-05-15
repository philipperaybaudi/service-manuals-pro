/**
 * Phase 3 — Application des classifications
 * Lit scripts/classification-report.json et déplace chaque PDF vers :
 *   DOSSIER SOURCE\Catégories\{catégorie}\{marque}\{fichier}
 *
 * Règles :
 *  - Catégories inconnues (MEDICAL, DIVERS…) → dossier À_VERIFIER/ pour révision manuelle
 *  - Confiance LOW → déplacé mais listé séparément pour vérification
 *  - Erreur API (classification absente) → dossier À_VERIFIER/
 *  - Fichier déjà présent à la destination → SKIP (pas d'écrasement)
 *  - Fichier source introuvable → SKIP (déjà traité ou supprimé)
 *
 * Usage :
 *   node scripts/apply-classification.mjs --dry-run    ← simuler
 *   node scripts/apply-classification.mjs --execute    ← appliquer
 */

import fs   from 'fs';
import path from 'path';

const DRY_RUN     = !process.argv.includes('--execute');
const REPORT_PATH = 'scripts/classification-report.json';
const DOSSIER_SRC = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégories';
const A_VERIFIER  = path.join(DOSSIER_SRC, 'À_VERIFIER');

if (DRY_RUN) {
  console.log('\n⚠️  MODE DRY-RUN — aucune modification sur le disque');
  console.log('   Relancer avec --execute pour appliquer.\n');
} else {
  console.log('\n🚨 MODE EXÉCUTION — déplacement réel des fichiers\n');
}

// ─── Catégories valides (noms exacts des dossiers dans DOSSIER SOURCE\Catégories)
const VALID_CATEGORIES = new Set([
  'Alarme & Surveillance', 'Animaux & Soins', 'Audio & HiFi', 'Automobile',
  'Autonomie', 'Biomédical', 'Bricolage & DIY', 'Camping & Caravaning',
  'Chauffage & Clim', 'Cinéma & Vidéo', 'Drones', 'Informatique',
  'Machines-Outils', 'Marine', 'Motoculture', 'Photographie',
  'Radio & Communications', 'Société & Soi', 'Téléphonie & Télécom',
  'Télévision', 'Usinage', 'Électroménager', 'Électronique', 'Équipements Sportifs',
]);

// ─── Overrides manuels par nom de fichier ────────────────────────────────────
// Utilisé quand la classification automatique est incorrecte pour un fichier spécifique
const FILE_OVERRIDES = {
  'grafmatic.pdf': { category: 'Photographie', brand: 'Grafmatic' },
};

// ─── Corrections de catégories mal retournées par Claude ─────────────────────
const CATEGORY_FIXES = {
  'MEDICAL':    'Biomédical',
  'Medical':    'Biomédical',
  'Biomedical': 'Biomédical',
  'BIOMEDICAL': 'Biomédical',
  'SON':        'Audio & HiFi',
  'Son':        'Audio & HiFi',
  'AUTO MOTO':  'Automobile',
  'PHOTO':      'Photographie',
  'RADIO COM':  'Radio & Communications',
  'OUTILLAGE':  'Machines-Outils',
  'ELECTROMENAGER': 'Électroménager',
  'ELECTRONIQUE':   'Électronique',
  'INFORMATIQUE':   'Informatique',
  'NAUTIQUE':       'Marine',
  'CHAUFFAGE':      'Chauffage & Clim',
};

function resolveCategory(raw) {
  if (!raw) return null;
  if (VALID_CATEGORIES.has(raw)) return raw;
  if (CATEGORY_FIXES[raw]) return CATEGORY_FIXES[raw];
  return null; // inconnu → À_VERIFIER
}

// ─── Charger le rapport ───────────────────────────────────────────────────────
if (!fs.existsSync(REPORT_PATH)) {
  console.error(`❌ Rapport introuvable : ${REPORT_PATH}`);
  console.error('   Lancez d\'abord : node scripts/classify-docs-a-classer.mjs');
  process.exit(1);
}

const report  = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const entries = Object.values(report.results);
console.log(`Rapport chargé : ${entries.length} entrées\n`);

// ─── Compteurs ────────────────────────────────────────────────────────────────
let moved     = 0;
let skipped   = 0;
let toVerify  = 0;
let conflicts = 0;
let missing   = 0;
let totalMb   = 0;

const lowConfList  = [];
const toVerifyList = [];
const errorList    = [];

// ─── Traiter chaque entrée ────────────────────────────────────────────────────
for (const entry of entries) {
  const src      = entry.original_path;
  const filename = entry.filename;
  const cls      = entry.classification || {};

  // Source introuvable
  if (!fs.existsSync(src)) {
    missing++;
    continue;
  }

  const sizeMb = fs.statSync(src).size / 1024 / 1024;

  // Override manuel par nom de fichier (priorité maximale, avant tout filtre)
  const override = FILE_OVERRIDES[filename];
  if (override) {
    const dst = path.join(DOSSIER_SRC, override.category, override.brand, filename);
    doMove(src, dst, sizeMb, `${override.category} / ${override.brand} (override manuel)`);
    continue;
  }

  // Confiance LOW → SKIP (laisser en place pour révision manuelle)
  if (cls.confidence === 'LOW') {
    lowConfList.push({ src, classification: cls });
    skipped++;
    continue;
  }

  // Erreur API → À_VERIFIER
  if (cls.error && !cls.category) {
    const dst = path.join(A_VERIFIER, 'ERREUR_API', filename);
    toVerifyList.push({ src, dst, reason: `Erreur API : ${cls.error}` });
    toVerify++;
    doMove(src, dst, sizeMb, `erreur API`);
    continue;
  }

  // Résoudre la catégorie
  const category = resolveCategory(cls.category);

  if (!category) {
    // Catégorie inconnue → À_VERIFIER
    const dst = path.join(A_VERIFIER, cls.category || 'INCONNU', cls.brand || 'INCONNU', filename);
    toVerifyList.push({ src, dst, reason: `Catégorie inconnue : "${cls.category}"` });
    toVerify++;
    doMove(src, dst, sizeMb, `catégorie inconnue "${cls.category}"`);
    continue;
  }

  // Marque : nettoyer les caractères interdits dans les noms de dossiers Windows
  const brand = sanitizeFolderName(cls.brand || 'SANS_MARQUE');

  const dst = path.join(DOSSIER_SRC, category, brand, filename);

  // Confiance LOW → noter mais déplacer quand même
  if (cls.confidence === 'LOW') {
    lowConfList.push({ src, dst, classification: cls });
  }

  doMove(src, dst, sizeMb, `${category} / ${brand}`);
}

// ─── Fonction de déplacement ──────────────────────────────────────────────────
function doMove(src, dst, sizeMb, label) {
  // Conflit
  if (fs.existsSync(dst)) {
    console.log(`  ⚠ CONFLIT  ${path.basename(src)}  → déjà présent dans ${label}`);
    conflicts++;
    skipped++;
    return;
  }

  console.log(`  ${DRY_RUN ? '→' : '✅'} ${path.basename(src).padEnd(50).slice(0, 50)} → ${label}`);
  moved++;
  totalMb += sizeMb;

  if (!DRY_RUN) {
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
    } catch (e) {
      console.error(`    ❌ Erreur : ${e.message}`);
      errorList.push({ src, dst, error: e.message });
      moved--;
    }
  }
}

// ─── Sanitize nom de dossier Windows ─────────────────────────────────────────
function sanitizeFolderName(name) {
  // Remplacer les caractères interdits sous Windows : \ / : * ? " < > |
  return name.replace(/[\\/:*?"<>|]/g, '-').trim().replace(/\.+$/, '');
}

// ─── Résumé ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log(`RÉSUMÉ ${DRY_RUN ? '(DRY-RUN)' : '(EXÉCUTÉ)'}`);
console.log('══════════════════════════════════════════════════════');
console.log(`  Fichiers déplacés       : ${moved}  (~${totalMb.toFixed(0)} MB)`);
console.log(`  Conflits (déjà présent) : ${conflicts}`);
console.log(`  Source introuvable      : ${missing}`);
console.log(`  Vers À_VERIFIER         : ${toVerify}`);
console.log(`  Ignorés (LOW confidence): ${lowConfList.length}  ← restent dans DOCS A CLASSER`);

if (lowConfList.length > 0) {
  console.log(`\n── Confiance LOW — NON DÉPLACÉS (${lowConfList.length} fichiers) ──`);
  for (const { src, classification: c } of lowConfList) {
    console.log(`  🔒 ${path.basename(src)}`);
    console.log(`     Suggestion : ${c.category} / ${c.brand} (${c.model || '?'})`);
  }
}

if (toVerifyList.length > 0) {
  console.log(`\n── À_VERIFIER (${toVerifyList.length} fichiers) ──`);
  for (const { src, reason } of toVerifyList) {
    console.log(`  📂 ${path.basename(src)}  — ${reason}`);
  }
}

if (errorList.length > 0) {
  console.log(`\n── Erreurs de déplacement (${errorList.length}) ──`);
  for (const { src, error } of errorList) {
    console.log(`  ❌ ${path.basename(src)} : ${error}`);
  }
}

if (DRY_RUN) {
  console.log('\n  ⚠️  Aucune modification réelle — relancer avec --execute pour appliquer.');
}
