/**
 * fix-dell-6-conflicts.mjs
 * Corrige les 6 docs DELL dont le slug est resté incorrect après le run principal.
 * Gère dynamiquement les conflits de slug en testant -2, -3, etc. jusqu'à trouver un slot libre.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'service-manuals-documents';

const SUPABASE_PREVIEW_BUCKET = 'logos';

// ── Corrections à appliquer ────────────────────────────────────────────────────
// lang_code corrigé pour les cas 3 et 6 (mauvaise détection langdetect)
const FIXES = [
  {
    // Cas 1 : slug -ko → German → -de-3
    old_slug:    'dell-alienware-17-r4-service-manual-ko',
    base_slug:   'dell-alienware-17-r4-service-manual',
    lang_code:   'de',
    keep_slug:   false,
    desc_en: 'Alienware 17 R4 Service Manual, 131 pages in German. Service manual for Alienware 17 R4 (model P31E, regulatory type P31E001). Comprehensive maintenance guide covering disassembly and reassembly procedures for internal components including base cover, hard drive, wireless card, SSD, memory modules, I/O cover, system board, heatsink assembly, power adapter port, power button board, display assembly, battery, touchpad, keyboard, wrist rest, display bezel, Tobii eye tracker module, logo board, display panel, camera, display hinges, and antenna assembly. Includes BIOS overview with setup options, forgotten password deletion, CMOS clearing, BIOS flashing, boot menu configuration, and diagnostics.',
    desc_fr: 'Manuel de service Alienware 17 R4, de 131 pages en Allemand. Manuel de service pour Alienware 17 R4 (modèle P31E, type réglementaire P31E001). Guide complet de maintenance couvrant les procédures de démontage et remontage des composants internes incluant le capot de base, le disque dur, la carte sans fil, le disque SSD, les modules mémoire, le capot E/S, la carte système, le dissipateur thermique, le port d\'adaptateur secteur, la carte de bouton d\'alimentation, l\'ensemble d\'affichage, la batterie, le pavé tactile, le clavier, le repose-poignets, la lunette d\'affichage, le module de suivi oculaire Tobii, la carte logo, le panneau d\'affichage, la caméra, les charnières d\'affichage et l\'ensemble d\'antenne. Comprend un aperçu du BIOS avec options de configuration, suppression de mot de passe oublié, effacement du CMOS, flashage du BIOS, configuration du menu de démarrage et diagnostics.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\alienware-17-r4_938925.pdf',
  },
  {
    // Cas 2 : slug -it est DÉJÀ CORRECT → mise à jour description seule
    old_slug:    'dell-dell-g5-se-service-manual-it',
    base_slug:   null,
    lang_code:   'it',
    keep_slug:   true,
    desc_en: 'Dell G5 SE Service Manual, 69 pages in Italian. Service manual for Dell G5 SE covering internal component removal and installation procedures. Includes instructions for base cover, memory modules, SSD units, batteries, wireless card, I/O and system boards, display assembly, fans, heat sink, touchpad, and power adapter. Contains preliminary operations, safety instructions, ESD protection guidelines, and post-service procedures.',
    desc_fr: 'Manuel de service Dell G5 SE, de 69 pages en Italien. Manuel de service pour Dell G5 SE couvrant les procédures de dépose et installation des composants internes. Inclut les instructions pour le capot de base, les modules de mémoire, les unités SSD, les batteries, la carte réseau sans fil, les cartes d\'entrée/sortie et système, l\'ensemble d\'affichage, les ventilateurs, le dissipateur thermique et l\'adaptateur d\'alimentation. Contient les opérations préliminaires, les consignes de sécurité, les directives de protection ESD et les procédures post-service.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\g5-se-5505_1571214.pdf',
  },
  {
    // Cas 3 : slug -ko-2 → VRAI CHINOIS (la description disait "Chinese language manual") → -zh-X
    old_slug:    'dell-dell-g7-15-service-manual-ko-2',
    base_slug:   'dell-dell-g7-15-service-manual',
    lang_code:   'zh',
    keep_slug:   false,
    desc_en: 'Dell G7 15 Service Manual, 112 pages in Chinese. Service manual for Dell G7 15 (model 7588). Contains detailed procedures for disassembly and reassembly of internal components including battery, keyboard, trackpad, storage drives, display, heatsinks, cooling fans, motherboard, and other internal hardware. Includes screw lists, safety information, and BIOS settings.',
    desc_fr: 'Manuel de service Dell G7 15, de 112 pages en Chinois. Manuel de service pour Dell G7 15 (modèle 7588). Contient les procédures détaillées de démontage et remontage des composants internes dont batterie, clavier, pavé tactile, lecteurs de stockage, écran, dissipateurs thermiques, ventilateurs de refroidissement et carte mère. Inclut listes de vis, consignes de sécurité et paramètres BIOS.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\g7-15-7588_1571625.pdf',
  },
  {
    // Cas 4 : slug -es → Italian → -it (cible maintenant libre)
    old_slug:    'dell-dell-g7-7790-service-manual-es',
    base_slug:   'dell-dell-g7-7790-service-manual',
    lang_code:   'it',
    keep_slug:   false,
    desc_en: 'Dell G7 7790 Service Manual, 111 pages in Italian. Service manual for Dell G7 7790. Contains detailed procedures for internal component removal and installation, including base cover, battery, memory modules, hard drive, solid state drive, motherboard, thermal solutions, processors, graphics card fan, power adapter port, I/O board, display assembly, base plate, power button, and heatsinks. Includes safety instructions and ESD protection guidelines.',
    desc_fr: 'Manuel de service Dell G7 7790, de 111 pages en Italien. Manuel de service pour le Dell G7 7790. Contient les procédures détaillées pour le retrait et l\'installation des composants internes, dont le capot de base, la batterie, les modules mémoire, le disque dur, le disque SSD, la carte mère, les solutions thermiques, les processeurs, le ventilateur de la carte graphique, le port d\'adaptateur d\'alimentation, la carte E/S, l\'ensemble d\'affichage, la plaque de base et le bouton d\'alimentation. Comprend les instructions de sécurité et les directives de protection ESD.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\g7-17-7790_1571811.pdf',
  },
  {
    // Cas 5 : slug -et → Vietnamese → -vi (cible maintenant libre)
    old_slug:    'dell-dell-inspiron-15-5567-service-manual-et',
    base_slug:   'dell-dell-inspiron-15-5567-service-manual',
    lang_code:   'vi',
    keep_slug:   false,
    desc_en: 'Dell Inspiron 15 5000 (15-5567) Service Manual, 105 pages in Vietnamese. Service manual for Dell Inspiron 15-5567 (regulatory model P66F). Contains procedures for disassembly and assembly of optical drive, base cover, and memory modules. Includes safety guidelines, tools recommendations, and screw identification. Document dated August 2016.',
    desc_fr: 'Manuel de service Dell Inspiron 15 5000 (15-5567), de 105 pages en Vietnamien. Manuel de service pour Dell Inspiron 15-5567 (modèle réglementaire P66F). Contient les procédures de démontage et remontage du lecteur optique, du panneau inférieur et des modules mémoire. Inclut les directives de sécurité, les outils recommandés et l\'identification des vis. Document datant d\'août 2016.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\inspiron-15-5567_943968.pdf',
  },
  {
    // Cas 6 : slug -vi-2 → VRAI CORÉEN (description disait "Korean language documentation") → -ko-X
    old_slug:    'dell-dell-inspiron-15-5576-gaming-service-manual-vi-2',
    base_slug:   'dell-dell-inspiron-15-5576-gaming-service-manual',
    lang_code:   'ko',
    keep_slug:   false,
    desc_en: 'Dell Inspiron 15-5576 Gaming Service Manual, 107 pages in Korean. Service manual for Dell Inspiron 15-5576 Gaming (regulatory model P57F). Covers internal maintenance procedures including base cover removal and installation, battery removal and installation, and memory module removal. Includes safety guidelines, recommended tools, and screw list.',
    desc_fr: 'Manuel de service Dell Inspiron 15-5576 Gaming, de 107 pages en Coréen. Manuel de service pour Dell Inspiron 15-5576 Gaming (modèle réglementaire P57F). Couvre les procédures de maintenance interne incluant le démontage et remontage du capot inférieur, le retrait et l\'installation de la batterie, et le retrait des modules mémoire. Inclut les directives de sécurité, les outils recommandés et la liste des vis.',
    local_pdf: 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Informatique\\DELL\\inspiron-15-5576-gaming_944235.pdf',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function slugExists(slug) {
  const { data } = await supabase.from('documents').select('slug').eq('slug', slug).limit(1);
  return data && data.length > 0;
}

async function findFreeSlug(baseSlug, langCode) {
  const candidates = [
    `${baseSlug}-${langCode}`,
    `${baseSlug}-${langCode}-2`,
    `${baseSlug}-${langCode}-3`,
    `${baseSlug}-${langCode}-4`,
    `${baseSlug}-${langCode}-5`,
  ];
  for (const slug of candidates) {
    if (!(await slugExists(slug))) return slug;
  }
  throw new Error(`Impossible de trouver un slug libre pour ${baseSlug}-${langCode} (-5 inclus)`);
}

async function renameR2(oldKey, newKey, localPdf) {
  try {
    await r2.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      CopySource: `${R2_BUCKET}/${oldKey}`,
      Key: newKey,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
    console.log(`    ✓ R2 : ${oldKey} → ${newKey}`);
    return true;
  } catch (e) {
    if (e.Code === 'NoSuchKey' && localPdf && existsSync(localPdf)) {
      console.log(`    ⚠ R2 source absente — upload depuis local...`);
      const buf = readFileSync(localPdf);
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: newKey,
        Body: buf,
        ContentType: 'application/pdf',
      }));
      console.log(`    ✓ R2 uploadé : ${newKey}`);
      return true;
    }
    console.log(`    ✗ R2 erreur : ${e.message}`);
    return false;
  }
}

async function renamePreview(oldSlug, newSlug) {
  const oldPath = `previews/${oldSlug}.jpg`;
  const newPath = `previews/${newSlug}.jpg`;
  try {
    const { data: dl, error: dlErr } = await supabase.storage
      .from(SUPABASE_PREVIEW_BUCKET).download(oldPath);
    if (dlErr) throw dlErr;
    const buf = Buffer.from(await dl.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(SUPABASE_PREVIEW_BUCKET).upload(newPath, buf, {
        contentType: 'image/jpeg', upsert: true,
      });
    if (upErr) throw upErr;
    await supabase.storage.from(SUPABASE_PREVIEW_BUCKET).remove([oldPath]);
    console.log(`    ✓ Preview : ${oldPath} → ${newPath}`);
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SUPABASE_PREVIEW_BUCKET}/${newPath}`;
  } catch (e) {
    console.log(`    ⚠ Preview non renommée : ${e.message}`);
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`  CORRECTION 6 CONFLITS DELL — Mode : ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
console.log(`══════════════════════════════════════════════════════════════\n`);

let ok = 0, errors = 0;

for (const fix of FIXES) {
  console.log(`\n📄 ${fix.old_slug}`);

  // Vérifier que le doc source existe
  const { data: srcDocs } = await supabase.from('documents')
    .select('slug, file_path, preview_url')
    .eq('slug', fix.old_slug).limit(1);

  if (!srcDocs || srcDocs.length === 0) {
    console.log(`  ⚠ Doc source non trouvé en base — skip`);
    continue;
  }
  const src = srcDocs[0];

  if (fix.keep_slug) {
    // Cas 2 : slug correct, mise à jour description seule
    console.log(`  → Slug déjà correct (${fix.old_slug}) — mise à jour description`);
    if (!DRY_RUN) {
      const { error } = await supabase.from('documents').update({
        description:    fix.desc_en,
        description_fr: fix.desc_fr,
      }).eq('slug', fix.old_slug);
      if (error) {
        console.log(`  ✗ Erreur DB : ${error.message}`);
        errors++;
      } else {
        console.log(`  ✓ Description mise à jour`);
        ok++;
      }
    } else {
      console.log(`  [DRY-RUN] Mettrait à jour la description`);
      ok++;
    }
    continue;
  }

  // Trouver un slug libre
  let newSlug;
  try {
    newSlug = await findFreeSlug(fix.base_slug, fix.lang_code);
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    errors++;
    continue;
  }

  console.log(`  → ${fix.old_slug} → ${newSlug}`);

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Renommerait slug + R2 + preview + description`);
    ok++;
    continue;
  }

  const oldR2Key = src.file_path || `documents/${fix.old_slug}.pdf`;
  const newR2Key = `documents/${newSlug}.pdf`;

  // Renommer R2
  await renameR2(oldR2Key, newR2Key, fix.local_pdf);

  // Renommer preview
  const newPreviewUrl = await renamePreview(fix.old_slug, newSlug);

  // Mettre à jour DB
  const update = {
    slug:           newSlug,
    file_path:      newR2Key,
    description:    fix.desc_en,
    description_fr: fix.desc_fr,
  };
  if (newPreviewUrl) update.preview_url = newPreviewUrl;

  const { error: dbErr } = await supabase.from('documents').update(update).eq('slug', fix.old_slug);
  if (dbErr) {
    console.log(`  ✗ DB erreur : ${dbErr.message}`);
    errors++;
  } else {
    console.log(`  ✓ DB mis à jour`);
    ok++;
  }
}

console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`  Terminé — ${ok} OK | ${errors} erreurs`);
console.log(`══════════════════════════════════════════════════════════════\n`);
