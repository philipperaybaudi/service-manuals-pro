/**
 * Nettoyage des doublons physiques dans DOCS A CLASSER
 *
 * Actions :
 *  1. Dossiers miroirs ATV / Quad ATV    → garder ATV, déplacer les uniques de Quad ATV → ATV, supprimer Quad ATV
 *  2. MEDICAL/MEDICAL vs BIOMEDICAL      → supprimer dans MEDICAL/MEDICAL les fichiers déjà dans BIOMEDICAL
 *  3. BIOMEDICAL/DENTAIRE vs MEDICAL/DENTAIRE → supprimer dans BIOMEDICAL/DENTAIRE ceux déjà dans MEDICAL/DENTAIRE
 *  4. SON/GRUNDING (faute)               → fusionner dans SON/GRUNDIG, supprimer SON/GRUNDING
 *  5. SON/TECKNICS (faute)               → fusionner dans SON/TECHNICS, supprimer SON/TECKNICS
 *  6. Nikon dans SON/DOCS à compléter    → déplacer vers PHOTOGRAPHIE/NIKON (créer si besoin)
 *  7. ENERGIE/Lincoln SA200              → supprimer (doublon AUTO MOTO/Lincoln SA200)
 *  8. AUTO MOTO/RTA/Collection/Help      → supprimer
 *  9. AUTO MOTO/RTA/Collection/Resource  → supprimer
 * 10. AUTO MOTO/NAVIGATION/GPS           → supprimer (doublon AUTO MOTO/GPS/PIONEER)
 *
 * Usage :
 *   node scripts/cleanup-physical-duplicates.mjs --dry-run   ← simuler (obligatoire en premier)
 *   node scripts/cleanup-physical-duplicates.mjs             ← exécuter pour de vrai
 */

import fs   from 'fs';
import path from 'path';

const DRY_RUN = !process.argv.includes('--execute');
const ROOT    = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS A CLASSER';

if (DRY_RUN) {
  console.log('\n⚠️  MODE DRY-RUN — aucune modification sur le disque');
  console.log('   Relancer avec --execute pour appliquer les changements.\n');
} else {
  console.log('\n🚨 MODE EXÉCUTION — modifications réelles sur le disque\n');
}

// ─── Compteurs ───────────────────────────────────────────────────────────────
let totalDeleted = 0;
let totalMoved   = 0;
let totalSizeMb  = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sizeMb(filePath) {
  try { return fs.statSync(filePath).size / 1024 / 1024; } catch { return 0; }
}

function deleteFile(filePath, reason) {
  const mb = sizeMb(filePath);
  console.log(`  🗑  SUPPR  ${path.relative(ROOT, filePath)}  (${mb.toFixed(2)} MB)  — ${reason}`);
  totalDeleted++;
  totalSizeMb += mb;
  if (!DRY_RUN) {
    try { fs.unlinkSync(filePath); }
    catch (e) { console.error(`    ❌ Erreur suppression : ${e.message}`); }
  }
}

function moveFile(src, dst, reason) {
  const mb = sizeMb(src);
  console.log(`  📦 DÉPLACE ${path.relative(ROOT, src)}`);
  console.log(`          → ${path.relative(ROOT, dst)}  — ${reason}`);
  totalMoved++;
  if (!DRY_RUN) {
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
    } catch (e) {
      console.error(`    ❌ Erreur déplacement : ${e.message}`);
    }
  }
}

function deleteEmptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  // Vérifier récursivement si le dossier est vide (même après nettoyage dry-run)
  if (!DRY_RUN) {
    try {
      const items = fs.readdirSync(dirPath, { recursive: true });
      const files = items.filter(i => {
        const fp = path.join(dirPath, i);
        try { return fs.statSync(fp).isFile(); } catch { return false; }
      });
      if (files.length === 0) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`  🗂  DOSSIER supprimé : ${path.relative(ROOT, dirPath)}`);
      } else {
        console.log(`  ⚠  Dossier non vide après nettoyage : ${path.relative(ROOT, dirPath)} (${files.length} fichiers restants)`);
      }
    } catch (e) {
      console.error(`  ❌ Erreur suppression dossier : ${e.message}`);
    }
  } else {
    console.log(`  🗂  DOSSIER serait supprimé (si vide) : ${path.relative(ROOT, dirPath)}`);
  }
}

function walkDir(dir) {
  const entries = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return entries; }
  for (const item of items) {
    const fp = path.join(dir, item.name);
    if (item.isDirectory()) entries.push(...walkDir(fp));
    else if (item.name.toLowerCase().endsWith('.pdf')) entries.push(fp);
  }
  return entries;
}

// ─── 1. ATV / Quad ATV ───────────────────────────────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('1. ATV vs Quad ATV — fusion (garder ATV)');
  console.log('══════════════════════════════════════════════════════\n');

  const dirATV  = path.join(ROOT, 'AUTO MOTO', 'ATV - All Terrain Vehicle');
  const dirQuad = path.join(ROOT, 'AUTO MOTO', 'Quad ATV - All Terrain Vehicle');

  if (!fs.existsSync(dirATV) || !fs.existsSync(dirQuad)) {
    console.log('  ⚠ Un des deux dossiers est absent, section ignorée.\n');
  } else {
    const pdfsATV  = walkDir(dirATV);
    const pdfsQuad = walkDir(dirQuad);

    // Index ATV par nom+taille
    const atvIndex = new Map();
    for (const f of pdfsATV) {
      const mb = sizeMb(f);
      atvIndex.set(`${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`, f);
    }

    for (const qFile of pdfsQuad) {
      const bname = path.basename(qFile).toLowerCase();
      const mb    = sizeMb(qFile);
      const key   = `${bname}|${Math.round(mb * 1024)}`;

      if (atvIndex.has(key)) {
        // Doublon exact → supprimer dans Quad ATV
        deleteFile(qFile, 'doublon exact dans ATV');
      } else {
        // Unique → déplacer dans ATV en reconstruisant le sous-chemin
        const relFromQuad = path.relative(dirQuad, qFile);
        const dst = path.join(dirATV, relFromQuad);
        moveFile(qFile, dst, 'fichier unique déplacé vers ATV');
      }
    }

    deleteEmptyDir(dirQuad);
    console.log();
  }
}

// ─── 2. MEDICAL/MEDICAL vs BIOMEDICAL ────────────────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('2. MEDICAL/MEDICAL vs BIOMEDICAL — supprimer doublons dans MEDICAL/MEDICAL');
  console.log('══════════════════════════════════════════════════════\n');

  const dirBio = path.join(ROOT, 'BIOMEDICAL');
  const dirMed = path.join(ROOT, 'MEDICAL', 'MEDICAL');

  if (!fs.existsSync(dirBio) || !fs.existsSync(dirMed)) {
    console.log('  ⚠ Un des deux dossiers est absent, section ignorée.\n');
  } else {
    const bioFiles = walkDir(dirBio);
    const bioIndex = new Map();
    for (const f of bioFiles) {
      const mb = sizeMb(f);
      bioIndex.set(`${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`, true);
    }

    const medFiles = walkDir(dirMed);
    for (const f of medFiles) {
      const mb  = sizeMb(f);
      const key = `${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`;
      if (bioIndex.has(key)) {
        deleteFile(f, 'doublon — déjà dans BIOMEDICAL');
      }
    }
    console.log();
  }
}

// ─── 3. BIOMEDICAL/DENTAIRE vs MEDICAL/DENTAIRE ───────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('3. BIOMEDICAL/DENTAIRE vs MEDICAL/DENTAIRE — supprimer doublons dans BIOMEDICAL/DENTAIRE');
  console.log('══════════════════════════════════════════════════════\n');

  const dirBioDent = path.join(ROOT, 'BIOMEDICAL', 'DENTAIRE');
  const dirMedDent = path.join(ROOT, 'MEDICAL', 'DENTAIRE');

  if (!fs.existsSync(dirBioDent) || !fs.existsSync(dirMedDent)) {
    console.log('  ⚠ Un des deux dossiers est absent, section ignorée.\n');
  } else {
    const medFiles = walkDir(dirMedDent);
    const medIndex = new Map();
    for (const f of medFiles) {
      const mb = sizeMb(f);
      medIndex.set(`${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`, true);
    }

    const bioFiles = walkDir(dirBioDent);
    for (const f of bioFiles) {
      const mb  = sizeMb(f);
      const key = `${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`;
      if (medIndex.has(key)) {
        deleteFile(f, 'doublon — déjà dans MEDICAL/DENTAIRE');
      }
    }
    console.log();
  }
}

// ─── 4. SON/GRUNDING → SON/GRUNDIG ───────────────────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('4. SON/GRUNDING (faute) → fusionner dans SON/GRUNDIG');
  console.log('══════════════════════════════════════════════════════\n');

  const dirWrong   = path.join(ROOT, 'SON', 'GRUNDING');
  const dirCorrect = path.join(ROOT, 'SON', 'GRUNDIG');

  if (!fs.existsSync(dirWrong)) {
    console.log('  ⚠ Dossier SON/GRUNDING absent, section ignorée.\n');
  } else {
    const correctFiles = fs.existsSync(dirCorrect) ? walkDir(dirCorrect) : [];
    const correctIndex = new Map();
    for (const f of correctFiles) {
      const mb = sizeMb(f);
      correctIndex.set(`${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`, true);
    }

    const wrongFiles = walkDir(dirWrong);
    for (const f of wrongFiles) {
      const mb  = sizeMb(f);
      const key = `${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`;
      if (correctIndex.has(key)) {
        deleteFile(f, 'doublon — déjà dans SON/GRUNDIG');
      } else {
        const relFromWrong = path.relative(dirWrong, f);
        const dst = path.join(dirCorrect, relFromWrong);
        moveFile(f, dst, 'fichier unique → SON/GRUNDIG');
      }
    }
    deleteEmptyDir(dirWrong);
    console.log();
  }
}

// ─── 5. SON/TECKNICS → SON/TECHNICS ──────────────────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('5. SON/TECKNICS (faute) → fusionner dans SON/TECHNICS');
  console.log('══════════════════════════════════════════════════════\n');

  const dirWrong   = path.join(ROOT, 'SON', 'TECKNICS');
  const dirCorrect = path.join(ROOT, 'SON', 'TECHNICS');

  if (!fs.existsSync(dirWrong)) {
    console.log('  ⚠ Dossier SON/TECKNICS absent, section ignorée.\n');
  } else {
    const correctFiles = fs.existsSync(dirCorrect) ? walkDir(dirCorrect) : [];
    const correctIndex = new Map();
    for (const f of correctFiles) {
      const mb = sizeMb(f);
      correctIndex.set(`${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`, true);
    }

    const wrongFiles = walkDir(dirWrong);
    for (const f of wrongFiles) {
      const mb  = sizeMb(f);
      const key = `${path.basename(f).toLowerCase()}|${Math.round(mb * 1024)}`;
      if (correctIndex.has(key)) {
        deleteFile(f, 'doublon — déjà dans SON/TECHNICS');
      } else {
        const relFromWrong = path.relative(dirWrong, f);
        const dst = path.join(dirCorrect, relFromWrong);
        moveFile(f, dst, 'fichier unique → SON/TECHNICS');
      }
    }
    deleteEmptyDir(dirWrong);
    console.log();
  }
}

// ─── 6. Nikon dans SON/DOCS à compléter → PHOTOGRAPHIE/NIKON ─────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('6. Nikon dans SON/DOCS à compléter → PHOTOGRAPHIE/NIKON');
  console.log('══════════════════════════════════════════════════════\n');

  const srcDir = path.join(ROOT, 'SON', 'DOCS à compléter');
  const dstDir = path.join(ROOT, 'PHOTOGRAPHIE', 'NIKON');

  if (!fs.existsSync(srcDir)) {
    console.log('  ⚠ Dossier SON/DOCS à compléter absent, section ignorée.\n');
  } else {
    const files = walkDir(srcDir);
    const nikonFiles = files.filter(f => path.basename(f).toLowerCase().includes('nikon'));
    if (nikonFiles.length === 0) {
      console.log('  Aucun fichier Nikon trouvé.\n');
    } else {
      for (const f of nikonFiles) {
        const dst = path.join(dstDir, path.basename(f));
        moveFile(f, dst, 'fichier NIKON mal rangé dans SON/');
      }
      console.log();
    }
  }
}

// ─── 7. ENERGIE/Lincoln SA200 → supprimer (doublon AUTO MOTO) ─────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('7. ENERGIE/Lincoln SA200 → supprimer (doublon AUTO MOTO/Lincoln SA200)');
  console.log('══════════════════════════════════════════════════════\n');

  const dir = path.join(ROOT, 'ENERGIE', 'Lincoln SA200');
  if (!fs.existsSync(dir)) {
    console.log('  ⚠ Dossier absent, section ignorée.\n');
  } else {
    const files = walkDir(dir);
    for (const f of files) {
      deleteFile(f, 'doublon de AUTO MOTO/Lincoln SA200');
    }
    deleteEmptyDir(dir);
    console.log();
  }
}

// ─── 8. AUTO MOTO/RTA/Collection/Help → supprimer ────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('8. AUTO MOTO/RTA/Collection/Help → supprimer');
  console.log('══════════════════════════════════════════════════════\n');

  const dir = path.join(ROOT, 'AUTO MOTO', 'RTA', 'Collection', 'Help');
  if (!fs.existsSync(dir)) {
    console.log('  ⚠ Dossier absent, section ignorée.\n');
  } else {
    const files = walkDir(dir);
    for (const f of files) {
      deleteFile(f, 'fichiers Help RTA non pertinents');
    }
    deleteEmptyDir(dir);
    console.log();
  }
}

// ─── 9. AUTO MOTO/RTA/Collection/Resource → supprimer ────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('9. AUTO MOTO/RTA/Collection/Resource → supprimer');
  console.log('══════════════════════════════════════════════════════\n');

  const dir = path.join(ROOT, 'AUTO MOTO', 'RTA', 'Collection', 'Resource');
  if (!fs.existsSync(dir)) {
    console.log('  ⚠ Dossier absent, section ignorée.\n');
  } else {
    const files = walkDir(dir);
    for (const f of files) {
      deleteFile(f, 'ressources RTA Collection non pertinentes');
    }
    deleteEmptyDir(dir);
    console.log();
  }
}

// ─── 10. AUTO MOTO/NAVIGATION/GPS → supprimer ────────────────────────────────
{
  console.log('══════════════════════════════════════════════════════');
  console.log('10. AUTO MOTO/NAVIGATION/GPS → supprimer (doublon GPS/PIONEER)');
  console.log('══════════════════════════════════════════════════════\n');

  const dir = path.join(ROOT, 'AUTO MOTO', 'NAVIGATION', 'GPS');
  if (!fs.existsSync(dir)) {
    console.log('  ⚠ Dossier absent, section ignorée.\n');
  } else {
    const files = walkDir(dir);
    for (const f of files) {
      deleteFile(f, 'doublon de AUTO MOTO/GPS/PIONEER');
    }
    deleteEmptyDir(dir);
    console.log();
  }
}

// ─── Résumé ───────────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════');
console.log(`RÉSUMÉ ${DRY_RUN ? '(DRY-RUN)' : '(EXÉCUTÉ)'}`);
console.log('══════════════════════════════════════════════════════');
console.log(`  Fichiers supprimés : ${totalDeleted}  (~${totalSizeMb.toFixed(0)} MB)`);
console.log(`  Fichiers déplacés  : ${totalMoved}`);
if (DRY_RUN) {
  console.log('\n  ⚠️  Aucune modification réelle — relancer avec --execute pour appliquer.');
} else {
  console.log('\n  ✅ Nettoyage terminé.');
}
