/**
 * Phase 2 — Import depuis le rapport de classification
 * Usage : node scripts/import-from-report.mjs <Subfolder> [--dry-run]
 * Exemple : node scripts/import-from-report.mjs Motoculture
 *
 * Lit docs-a-classer-report-{Subfolder}.json
 * Pour chaque entrée status:"done" → upload R2 + preview Supabase + insert DB
 * Marque chaque entrée "imported" et sauvegarde le JSON au fur et à mesure (reprise possible)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const SOURCE_ROOT        = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories';
const DOCS_EN_LIGNE_ROOT = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE';

const require = createRequire(import.meta.url);
const pdfjs  = require('pdfjs-dist');
const canvas = require('canvas');
const STANDARD_FONTS = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/node_modules/pdfjs-dist/standard_fonts/';

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const SUBFOLDER = args.find(a => !a.startsWith('--'));
if (!SUBFOLDER) {
  console.error('Usage : node scripts/import-from-report.mjs <Subfolder> [--dry-run]');
  process.exit(1);
}

const REPORT_PATH = path.join('scripts', `docs-a-classer-report-${SUBFOLDER.toLowerCase()}.json`);
if (!fs.existsSync(REPORT_PATH)) {
  console.error(`Rapport introuvable : ${REPORT_PATH}`);
  process.exit(1);
}

const STORAGE_BUCKET = 'logos';

// ─── Mapping catégorie FR → Supabase ────────────────────────────────────────
const CATEGORY_MAP = {
  'Animaux & Soins':        { id: '9a064eb7-1b7f-447d-8736-0ee4d0ea8eaa', slug: 'pet-care' },
  'Audio & HiFi':           { id: 'fac320cd-12a4-4022-b011-aa39931c3062', slug: 'audio-hifi' },
  'Automobile':             { id: 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd', slug: 'automotive' },
  'Biomédical':             { id: '0cc59f0f-1636-40af-90e1-82eb60126a05', slug: 'biomedical' },
  'Bricolage & DIY':        { id: '33040eb3-b9d9-4c15-bda6-1afb5fb9c226', slug: 'diy-home-improvement' },
  'Camping & Caravaning':   { id: '4dbd7c09-3be2-4beb-9134-bcbef838299c', slug: 'camping-rv' },
  'Cinéma & Vidéo':         { id: 'a663b7bd-7943-425f-9224-ff22e6b1e151', slug: 'cinema-video' },
  'Drones':                 { id: '834579fc-2641-47f3-bea1-84cd187dcaae', slug: 'drones' },
  'Électroménager':         { id: '277e6e9d-384a-4f04-9946-f262db187bbe', slug: 'home-appliances' },
  'Électronique':           { id: '74ab5d99-2f9c-4b98-b320-70013f876e99', slug: 'electronics' },
  'Équipements Sportifs':   { id: '4b9310a5-024d-4987-880c-aac3f26a242e', slug: 'sports-equipment' },
  'Informatique':           { id: 'b675e893-db94-4cde-b926-224575d3459f', slug: 'computers-it' },
  'Machines-Outils':        { id: '19a46ff6-9ad4-4273-9c8f-83f249904ec9', slug: 'machine-tools' },
  'Marine':                 { id: '6c2ea1cf-6e27-40e8-9042-405220f6b9cb', slug: 'marine' },
  'Motoculture':            { id: '834942f3-b150-484e-a6b8-8468d19a4e60', slug: 'outdoor-power' },
  'Photographie':           { id: '79ea117d-8952-4b9e-aab9-4b10fc2dec7a', slug: 'photography' },
  'Radio & Communications': { id: '98979c8e-d572-461c-bee9-7ada0f605318', slug: 'radio-communications' },
  'Téléphonie & Télécom':   { id: 'd7011240-f85b-4129-bd99-6cb7b6ee4936', slug: 'phones-telecom' },
  'Télévision':             { id: '982bd7fe-fbf9-4c94-999f-652daaebcaf2', slug: 'television' },
  'Usinage':                { id: '851ae9d7-4c3a-4eef-9e89-d42425cd5a31', slug: 'machining' },
  'Autonomie':              { id: null, slug: 'autonomy',        name: 'Autonomy & Self-Sufficiency' },
  'Société & Soi':          { id: null, slug: 'society-culture', name: 'Society & Culture' },
  'Chauffage & Clim':       { id: null, slug: 'heating-cooling',  name: 'Heating & Air Conditioning' },
  'Alarme & Surveillance':  { id: null, slug: 'alarm-security',   name: 'Alarm & Security' },
  'Nature':                 { id: null, slug: 'nature',           name: 'Nature' },
  'Horlogerie':             { id: '8fb8cf6f-cdfe-4471-80f5-6abc92cfb1d2', slug: 'watchmaking' },
};

// ─── Clients ────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

async function renderFirstPage(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: STANDARD_FONTS,
    useSystemFonts: true,
  }).promise;
  const page = await doc.getPage(1);
  const scale = 800 / page.getViewport({ scale: 1 }).width;
  const vp = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const cc = factory.create(vp.width, vp.height);
  await page.render({ canvasContext: cc.context, viewport: vp, canvasFactory: factory }).promise;
  return cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
}

async function uploadPreview(slug, jpgBuffer) {
  const storagePath = `previews/${slug}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, jpgBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Preview upload error: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

async function getOrCreateBrand(brandName, categoryId, categorySlug) {
  // Chercher marque existante dans cette catégorie
  const { data: existing } = await supabase
    .from('brands')
    .select('id, name, slug')
    .eq('category_id', categoryId)
    .ilike('name', brandName)
    .maybeSingle();
  if (existing) return existing;

  if (DRY_RUN) return { id: 'DRY-BRAND', name: brandName, slug: slugify(brandName) };

  // Créer avec slug simple, puis avec suffixe catégorie si conflit de slug global
  const baseSlug = slugify(brandName);
  const slugCandidates = [baseSlug, `${baseSlug}-${categorySlug.split('-')[0]}`, `${baseSlug}-${categorySlug}`];
  for (const slug of slugCandidates) {
    const { data: created, error } = await supabase
      .from('brands')
      .insert({ name: brandName, slug, category_id: categoryId, logo_url: null })
      .select('id, name, slug')
      .single();
    if (!error) return created;
    if (error.code !== '23505') {
      console.error(`  Erreur création marque "${brandName}":`, error.message);
      return null;
    }
  }
  console.error(`  Impossible de créer la marque "${brandName}" (conflits de slug)`);
  return null;
}

function saveReport(report) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`Import depuis rapport : ${REPORT_PATH}`);
console.log(`Mode : ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
console.log(`${'═'.repeat(60)}\n`);

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const docs = report.docs;

const todo    = docs.filter(d => d.status === 'done');
const already = docs.filter(d => d.status === 'imported').length;

console.log(`Total entrées   : ${docs.length}`);
console.log(`Déjà importées  : ${already}`);
console.log(`À traiter       : ${todo.length}\n`);

let imported = 0;
let skipped  = 0;
let errors   = 0;

for (const doc of todo) {
  const { slug, brand, category_fr, original_path, file_size, page_count, price,
          title_en, title_fr, description_en, description_fr, language, preview_file } = doc;

  console.log(`\n📄 ${doc.original_filename}`);
  console.log(`   slug     : ${slug}`);
  console.log(`   marque   : ${brand} | catégorie : ${category_fr}`);

  // ── Catégorie ──────────────────────────────────────────────────────────────
  let cat = CATEGORY_MAP[category_fr];
  if (!cat) {
    console.error(`   ✗ Catégorie inconnue : "${category_fr}"`);
    errors++;
    continue;
  }
  // Créer la catégorie en DB si elle n'a pas encore d'id (nouvelles catégories)
  if (!cat.id) {
    const { data: existing } = await supabase.from('categories').select('id').eq('slug', cat.slug).maybeSingle();
    if (existing) {
      cat.id = existing.id;
    } else {
      const { data: created, error: catErr } = await supabase.from('categories')
        .insert({ name: cat.name, slug: cat.slug })
        .select('id').single();
      if (catErr) {
        console.error(`   ✗ Impossible de créer la catégorie "${category_fr}" : ${catErr.message}`);
        errors++;
        continue;
      }
      cat.id = created.id;
      CATEGORY_MAP[category_fr].id = created.id;
      console.log(`   ✓ Catégorie créée : ${cat.name} (${cat.id})`);
    }
  }

  // ── Vérification doublon en base ───────────────────────────────────────────
  const { data: existing } = await supabase
    .from('documents').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    console.log('   ⏭ Déjà en base — ignoré');
    doc.status = 'imported';
    saveReport(report);
    skipped++;
    continue;
  }

  // ── Lecture PDF ────────────────────────────────────────────────────────────
  if (!fs.existsSync(original_path)) {
    console.error(`   ✗ Fichier introuvable : ${original_path}`);
    errors++;
    continue;
  }
  const pdfBuffer = fs.readFileSync(original_path);

  if (DRY_RUN) {
    console.log(`   [DRY-RUN] title_en : ${title_en}`);
    console.log(`   [DRY-RUN] title_fr : ${title_fr}`);
    console.log(`   [DRY-RUN] prix     : ${price / 100}€ | pages : ${page_count}`);
    console.log('   [DRY-RUN] Uploaderait R2 + preview + DB');
    console.log(`   [DRY-RUN] Déplacerait → DOCS EN LIGNE\\${category_fr}\\${brand}\\${doc.original_filename}`);
    imported++;
    continue;
  }

  // ── Marque ─────────────────────────────────────────────────────────────────
  const brandObj = await getOrCreateBrand(brand, cat.id, cat.slug);
  if (!brandObj) { errors++; continue; }
  console.log(`   brand_id : ${brandObj.id} (${brandObj.slug})`);

  // ── Preview ────────────────────────────────────────────────────────────────
  let previewUrl = null;
  try {
    let jpgBuffer;
    // Réutiliser la preview déjà générée lors de la Phase 1 si elle existe
    const absPreview = path.resolve(preview_file || '');
    if (preview_file && fs.existsSync(absPreview)) {
      jpgBuffer = fs.readFileSync(absPreview);
      console.log(`   ✓ Preview (cache Phase 1) : ${(jpgBuffer.length / 1024).toFixed(0)} KB`);
    } else {
      jpgBuffer = await renderFirstPage(pdfBuffer);
      console.log(`   ✓ Preview (rendu PDF)     : ${(jpgBuffer.length / 1024).toFixed(0)} KB`);
    }
    previewUrl = await uploadPreview(slug, jpgBuffer);
  } catch (err) {
    console.log(`   ⚠ Preview non générée : ${err.message}`);
  }

  // ── Upload PDF → R2 ────────────────────────────────────────────────────────
  const r2Key = `documents/${slug}.pdf`;
  try {
    await r2.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME,
      Key:         r2Key,
      Body:        pdfBuffer,
      ContentType: 'application/pdf',
    }));
    console.log(`   ✓ R2 : ${r2Key}`);
  } catch (err) {
    console.error(`   ✗ Erreur R2 : ${err.message}`);
    errors++;
    continue;
  }

  // ── Insert Supabase ────────────────────────────────────────────────────────
  const record = {
    title:          title_en,
    title_fr:       title_fr,
    slug:           slug,
    description:    description_en,
    description_fr: description_fr,
    category_id:    cat.id,
    brand_id:       brandObj.id,
    price:          price,
    file_path:      r2Key,
    file_size:      file_size,
    page_count:     page_count,
    preview_url:    previewUrl,
    language:       language,
    active:         true,
    featured:       false,
    download_count: 0,
  };

  const { error: insertErr } = await supabase.from('documents').insert(record);
  if (insertErr) {
    console.error(`   ✗ Erreur Supabase : ${insertErr.message}`);
    errors++;
  } else {
    console.log(`   ✓ Inséré en base`);
    doc.status = 'imported';
    saveReport(report);
    imported++;

    // ── Déplacement vers DOCS EN LIGNE ───────────────────────────────────
    try {
      const destDir = path.join(DOCS_EN_LIGNE_ROOT, category_fr, brand);
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, doc.original_filename);
      try {
        fs.renameSync(original_path, destPath);
      } catch {
        fs.copyFileSync(original_path, destPath);
        fs.unlinkSync(original_path);
      }
      console.log(`   ✓ Déplacé → DOCS EN LIGNE\\${category_fr}\\${brand}\\${doc.original_filename}`);
    } catch (mvErr) {
      console.log(`   ⚠ Déplacement échoué : ${mvErr.message}`);
    }
  }
}

// ─── Résumé ───────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`\n✓ Import terminé`);
console.log(`  Importés  : ${imported}`);
console.log(`  Ignorés   : ${skipped}`);
console.log(`  Erreurs   : ${errors}`);
if (DRY_RUN) console.log('\n→ Relance sans --dry-run pour appliquer réellement.');
else if (errors === 0) console.log('\n→ Tous les documents ont été importés avec succès.');
else console.log(`\n→ ${errors} erreur(s) — les entrées en erreur restent à status:"done" pour relance.`);
