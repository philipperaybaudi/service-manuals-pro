/**
 * Phase 2-4: Full sync of FR products → EN documents.
 * - Matches FR products to EN docs
 * - Translates descriptions FR→EN
 * - Updates prices, images, titles, descriptions
 * - Bundles multi-part docs
 * - Deactivates orphan EN docs
 * - Updates brand counts
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 25000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// Translation engine: FR → EN
// ============================================================

function translateHtml(frHtml) {
  if (!frHtml) return '';
  let text = frHtml;

  // ---- Common phrases ----
  const replacements = [
    // Document types
    [/Manuel d['']entretien et de réparation/gi, 'Maintenance and repair manual'],
    [/Manuel de réparation/gi, 'Repair manual'],
    [/Manuel d['']atelier/gi, 'Workshop manual'],
    [/Manuel de dépannage/gi, 'Troubleshooting manual'],
    [/Manuel de service/gi, 'Service manual'],
    [/Manuel d['']utilisation/gi, 'User manual'],
    [/Manuel utilisateur/gi, 'User manual'],
    [/Mode d['']emploi/gi, 'User manual'],
    [/Notice d['']utilisation/gi, 'User manual'],
    [/Notice Mode d['']emploi/gi, 'User manual'],
    [/Tutoriel de démontage/gi, 'Disassembly tutorial'],
    [/Tutoriel de dépannage/gi, 'Troubleshooting tutorial'],
    [/Tutoriel de réparation/gi, 'Repair tutorial'],
    [/Guide de démarrage rapide/gi, 'Quick start guide'],
    [/Revue [Mm]oto [Tt]echnique/gi, 'Technical Review (Revue Moto Technique)'],
    [/Revue technique/gi, 'Technical review'],
    [/Catalogue des pièces détachées/gi, 'Spare parts catalog'],
    [/Catalogue complet des pièces détachées/gi, 'Complete spare parts catalog'],
    [/Livret de maintenance/gi, 'Maintenance booklet'],

    // Description patterns
    [/Documentation (?:technique )?de (\d+) pages?/gi, '$1-page technical documentation'],
    [/Documentation de (\d+) pages?/gi, '$1-page documentation'],
    [/Notice de (\d+) pages?/gi, '$1-page manual'],
    [/Mode d['']emploi de (\d+) pages?/gi, '$1-page user manual'],
    [/Manuel de (\d+) pages?/gi, '$1-page manual'],
    [/Dossier (?:pratique )?de (\d+) pages?/gi, '$1-page practical guide'],

    // Languages
    [/\(en français et en anglais\)/gi, '(in French and English)'],
    [/\(en français\)/gi, '(in French)'],
    [/\(en anglais\)/gi, '(in English)'],
    [/en français et italien/gi, 'in French and Italian'],
    [/en français/gi, 'in French'],
    [/en anglais/gi, 'in English'],

    // Equipment types
    [/appareil[s]? photograph(?:ique|iques)/gi, 'camera'],
    [/boîtier[s]? photograph(?:ique|iques)/gi, 'camera body'],
    [/boîtiers?/gi, 'camera body'],
    [/objectif[s]? interchangeable[s]?/gi, 'interchangeable lens'],
    [/objectif[s]?/gi, 'lens'],
    [/caméra semi-professionnelle/gi, 'semi-professional camcorder'],
    [/poste radiophonique/gi, 'radio receiver'],
    [/magnétophone[s]? à bande[s]?/gi, 'reel-to-reel tape recorder'],
    [/magnétophone[s]?/gi, 'tape recorder'],
    [/enregistreur[s]? portable[s]?/gi, 'portable recorder'],
    [/combiné[s]? bois/gi, 'woodworking combination machine'],
    [/tour[s]? à métaux/gi, 'metalworking lathe'],
    [/tronçonneuse[s]?/gi, 'chainsaw'],
    [/débroussailleuse[s]?/gi, 'brushcutter'],
    [/tondeuse[s]?/gi, 'lawn mower'],
    [/télévision[s]?|téléviseur[s]?/gi, 'television'],
    [/écran[s]? plat[s]?/gi, 'flat-screen'],
    [/alimentation[s]? à découpage/gi, 'switching power supply'],
    [/machine[s]? à coudre/gi, 'sewing machine'],
    [/véhicule[s]? tout[- ]terrain/gi, 'off-road vehicle'],
    [/quad[s]?/gi, 'ATV'],
    [/motocyclette[s]?/gi, 'motorcycle'],
    [/cyclomoteur[s]?/gi, 'moped'],

    // Common words/phrases
    [/Sujets traités\s*:?/gi, 'Topics covered:'],
    [/Table des matières\s*:?/gi, 'Table of contents:'],
    [/Sommaire\s*:?/gi, 'Contents:'],
    [/Dossier pratique/gi, 'Practical guide'],
    [/avec de nombreuses photos/gi, 'with numerous photos'],
    [/avec photos/gi, 'with photos'],
    [/éclaté[s]? mécanique[s]?/gi, 'mechanical exploded views'],
    [/éclaté[s]? des pièces détachées/gi, 'spare parts exploded views'],
    [/planches? d['']éclatés/gi, 'exploded view plates'],
    [/pièces détachées/gi, 'spare parts'],
    [/procédures? de démontage/gi, 'disassembly procedures'],
    [/schémas? électronique[s]?/gi, 'electronic schematics'],
    [/schémas? électrique[s]?/gi, 'electrical schematics'],
    [/schémas?/gi, 'schematics'],
    [/photographies? couleurs?/gi, 'color photographs'],
    [/photographies?/gi, 'photographs'],
    [/liste des pièces/gi, 'parts list'],
    [/recherche de pannes?/gi, 'troubleshooting'],
    [/entretien et réparation/gi, 'maintenance and repair'],
    [/entretien/gi, 'maintenance'],
    [/réparation/gi, 'repair'],
    [/démontage/gi, 'disassembly'],
    [/remontage/gi, 'reassembly'],
    [/restauration/gi, 'restoration'],
    [/dépannage/gi, 'troubleshooting'],
    [/nettoyage/gi, 'cleaning'],
    [/réglage[s]?/gi, 'adjustment'],
    [/étalonnage/gi, 'calibration'],
    [/changement/gi, 'replacement'],
    [/remplacement/gi, 'replacement'],

    // Technical terms in list items
    [/Démontage du capot supérieur/gi, 'Top cover removal'],
    [/Démontage du capot de protection/gi, 'Protective cover removal'],
    [/Démontage de la platine avant/gi, 'Front plate removal'],
    [/Intervention sur le groupe reflex/gi, 'Reflex group servicing'],
    [/Démontage de l['']obturateur/gi, 'Shutter removal'],
    [/Démontage de la roue à picots/gi, 'Sprocket wheel removal'],
    [/Nettoyage de l['']obturateur/gi, 'Shutter cleaning'],
    [/Nettoyage de la lentille collectrice/gi, 'Collector lens cleaning'],
    [/Instructions de démontage/gi, 'Disassembly instructions'],
    [/Mécanisme obturateur/gi, 'Shutter mechanism'],
    [/Description de l['']appareil/gi, 'Camera description'],
    [/Chargement et déchargement de la pellicule/gi, 'Loading and unloading film'],
    [/Tenue et déclenchement/gi, 'Holding and triggering'],
    [/Réglage de l['']objectif/gi, 'Lens adjustment'],
    [/Opérations pour la prise de vue/gi, 'Shooting operations'],
    [/Recommandations très importantes/gi, 'Very important recommendations'],
    [/Généralités?/gi, 'General information'],
    [/Caractéristiques techniques/gi, 'Technical specifications'],
    [/Données techniques/gi, 'Technical data'],

    // Connecting words
    [/\bpour\b/gi, 'for'],
    [/\bavec\b/gi, 'with'],
    [/\bet\b/gi, 'and'],
    [/\bou\b/gi, 'or'],
    [/\bdes\b/gi, 'of the'],
    [/\bdu\b/gi, 'of the'],
    [/\bde la\b/gi, 'of the'],
    [/\bde l['']?/gi, 'of the '],
    [/\bd['']un/gi, 'of a'],
    [/\bd['']une/gi, 'of a'],
    [/\bce\b/gi, 'this'],
    [/\bcet\b/gi, 'this'],
    [/\bcette\b/gi, 'this'],
    [/\bces\b/gi, 'these'],
    [/\bsur\b/gi, 'on'],
    [/\bdans\b/gi, 'in'],
    [/\bpar\b/gi, 'by'],
    [/\bà\b/gi, 'to'],
    [/\bIndispensable\b/gi, 'Essential'],
    [/\bne pas risquer d['']abimer/gi, 'avoid damaging'],
    [/\bbeaux\b/gi, 'beautiful'],
    [/\bcertaines fixations sont avec un pas à gauche/gi, 'some fasteners have left-hand threads'],
    [/\bpermettan[t]?\b/gi, 'allowing'],
    [/\btoutes les fonctionnalités/gi, 'all the features'],
    [/\bdécouvrir\b/gi, 'discover'],
    [/\bnombreux\b/gi, 'numerous'],
    [/\bnombreuses\b/gi, 'numerous'],
    [/\bplus de\b/gi, 'more than'],
    [/\bpratique\b/gi, 'practical'],
    [/\bcomplet\b/gi, 'complete'],
    [/\bcomplète\b/gi, 'complete'],
    [/\bavertis\b/gi, 'knowledgeable'],
    [/\bamateurs?\b/gi, 'enthusiasts'],
    [/\bcollectionneurs?\b/gi, 'collectors'],
    [/\bincontournable\b/gi, 'essential'],
    [/\bouvrage\b/gi, 'book'],
    [/\bpages?\b/gi, 'pages'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

// ============================================================
// Matching engine
// ============================================================

const STOP_WORDS = new Set([
  'de', 'du', 'la', 'le', 'les', 'des', 'un', 'une', 'et', 'en', 'à', 'au',
  'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'ce', 'cette', 'ces',
  'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'of', 'to', 'with',
  'is', 'are', 'was', 'not', 'be', 'has', 'have', 'had',
  'manuel', 'manual', 'notice', 'mode', 'emploi', 'service',
  'reparation', 'repair', 'depannage', 'troubleshooting',
  'atelier', 'workshop', 'technique', 'technical',
  'produit', 'product', 'documentation', 'tutoriel', 'tutorial',
  'guide', 'user', 'owner', 'complete', 'complet',
  'hd', 'bd', 'fr', 'gb', 'pdf',
]);

function tokenize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function matchScore(frTokens, enTokens) {
  if (frTokens.length === 0 || enTokens.length === 0) return 0;
  const enSet = new Set(enTokens);
  const overlap = frTokens.filter(t => enSet.has(t)).length;
  return overlap / Math.max(frTokens.length, enTokens.length);
}

// Brand name mappings (FR slug patterns → EN brand names)
const BRAND_MAP = {
  'foca': 'FOCA',
  'nikon': 'NIKON',
  'nagra': 'NAGRA',
  'bronica': ['BRONICA', 'ZENZA BRONICA'],
  'hasselblad': 'HASSELBALD',
  'canon': 'CANON',
  'minolta': 'MINOLTA',
  'pentax': 'PENTAX',
  'leica': 'LEICA',
  'rollei': 'ROLLEI',
  'contax': 'CONTAX',
  'kodak': 'KODAK',
  'mamiya': 'MAMIYA',
  'fuji': 'FUJICA',
  'zorki': ['ZORKI', 'KMZ'],
  'akai': 'AKAI',
  'grundig': 'GRUNDIG',
  'yamaha': 'YAMAHA',
  'suzuki': 'SUZUKI',
  'renault': 'RENAULT',
  'toyota': 'TOYOTA',
  'vespa': 'VESPA',
  'polaris': 'POLARIS',
  'bombardier': 'BOMBARDIER',
  'lurem': 'MENUISERIE',
  'stihl': 'STIHL',
  'husqvarna': 'HUSQVARNA',
  'singer': 'SINGER',
  'uher': 'UHER',
  'studer': 'STUDER REVOX',
  'revox': 'STUDER REVOX',
  'sony': 'SONY',
  'mini-cooper': 'Mini-Cooper Rover',
  'vestel': 'VESTEL',
  'simca': 'SIMCA',
  'mckeown': 'COLLECTION',
};

function extractBrandFromSlug(slug) {
  for (const [pattern, brand] of Object.entries(BRAND_MAP)) {
    if (slug.includes(pattern)) return Array.isArray(brand) ? brand : [brand];
  }
  return null;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('=== Full Sync: FR → EN ===\n');

  // Load FR data
  const frProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'fr-products.json'), 'utf-8'));
  console.log(`Loaded ${frProducts.length} FR products`);

  // Load EN docs
  const { data: enDocs } = await supabase
    .from('documents')
    .select('id, slug, title, description, price, preview_url, brand_id, category_id, file_path, file_size, page_count, seo_tags, active, brands(name)')
    .order('slug');

  console.log(`Loaded ${enDocs.length} EN documents (${enDocs.filter(d => d.active).length} active)\n`);

  // Build maps
  const enBySlug = {};
  enDocs.forEach(d => { enBySlug[d.slug] = d; });

  const enByBrand = {};
  enDocs.forEach(d => {
    const brand = d.brands?.name || '?';
    if (!enByBrand[brand]) enByBrand[brand] = [];
    enByBrand[brand].push(d);
  });

  // Track which EN docs get matched
  const matchedEnIds = new Set();
  // Already processed FOCA — skip it
  const skipBrands = new Set(['FOCA']);

  // Results
  const updates = []; // {enSlug, title, description, price, imageUrl, frSlug}
  const bundlesToCreate = []; // {frProduct, enDocs[]}
  let skippedFoca = 0;

  // ---- Phase 2: Match and prepare updates ----
  console.log('--- Phase 2: Matching FR→EN ---\n');

  for (const frProd of frProducts) {
    const frTokens = tokenize(frProd.title || frProd.slug);
    const frBrands = extractBrandFromSlug(frProd.slug);

    // Get candidate EN docs (same brand if possible)
    let candidates = enDocs;
    if (frBrands) {
      const brandDocs = [];
      for (const b of frBrands) {
        if (enByBrand[b]) brandDocs.push(...enByBrand[b]);
      }
      if (brandDocs.length > 0) candidates = brandDocs;

      // Skip FOCA (already done)
      if (frBrands.some(b => skipBrands.has(b))) {
        skippedFoca++;
        // Still mark matched EN docs for FOCA so they don't get deactivated
        for (const c of brandDocs) {
          if (c.active) matchedEnIds.add(c.id);
        }
        continue;
      }
    }

    // Score all candidates
    const scored = candidates
      .filter(c => c.active || matchedEnIds.has(c.id) === false)
      .map(c => {
        const enTokens = tokenize(c.title + ' ' + c.slug);
        const score = matchScore(frTokens, enTokens);
        return { doc: c, score };
      })
      .filter(s => s.score > 0.15)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // No match found — try slug-based matching
      continue;
    }

    // Find ALL EN docs that match this FR product (multi-part detection)
    const bestScore = scored[0].score;
    const matches = scored.filter(s => s.score >= bestScore * 0.7 && s.score > 0.2);

    // Translate description
    const translatedDesc = translateHtml(frProd.longDesc);
    const priceInCents = Math.round(frProd.price * 100);

    if (matches.length === 1) {
      // Single match
      const en = matches[0].doc;
      matchedEnIds.add(en.id);
      updates.push({
        enId: en.id,
        enSlug: en.slug,
        title: en.title, // Keep existing title for now
        description: translatedDesc,
        price: priceInCents,
        imageUrl: frProd.image,
        frSlug: frProd.slug,
      });
    } else {
      // Multiple matches → these are parts of the same FR product
      // Mark all as matched
      matches.forEach(m => matchedEnIds.add(m.doc.id));
      bundlesToCreate.push({
        frProduct: frProd,
        enDocs: matches.map(m => m.doc),
        translatedDesc,
        priceInCents,
      });
    }
  }

  console.log(`Matched: ${updates.length} single, ${bundlesToCreate.length} bundles`);
  console.log(`Skipped (FOCA): ${skippedFoca}`);
  console.log(`Unmatched EN docs: ${enDocs.filter(d => d.active && !matchedEnIds.has(d.id)).length}`);

  // ---- Phase 3: Apply updates ----
  console.log('\n--- Phase 3: Applying updates ---\n');

  let updatedCount = 0, imgCount = 0;

  for (const u of updates) {
    const updateData = {};
    if (u.description) updateData.description = u.description;
    if (u.price > 0) updateData.price = u.price;

    // Upload image
    if (u.imageUrl) {
      try {
        const imgBuf = await fetchBuffer(u.imageUrl);
        const ext = u.imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
        const storagePath = `previews/${u.enSlug}.${ext}`;
        const { error: upErr } = await supabase.storage.from('logos').upload(storagePath, imgBuf, {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
          upsert: true,
        });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
          updateData.preview_url = urlData.publicUrl;
          imgCount++;
        }
      } catch (e) { /* skip image error */ }
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase.from('documents').update(updateData).eq('id', u.enId);
      if (!error) updatedCount++;
      else console.log(`  ✗ ${u.enSlug}: ${error.message}`);
    }

    if (updatedCount % 20 === 0 && updatedCount > 0) console.log(`  ${updatedCount}/${updates.length} updated...`);
    await sleep(100);
  }

  console.log(`\nUpdated: ${updatedCount} docs, ${imgCount} images`);

  // ---- Phase 3b: Create bundles ----
  console.log('\n--- Phase 3b: Creating bundles ---\n');

  let bundlesCreated = 0;

  for (const b of bundlesToCreate) {
    // Check if a bundle already exists for these docs
    const bundleFiles = b.enDocs.map(d => 'file:' + d.file_path);
    const totalSize = b.enDocs.reduce((a, d) => a + (d.file_size || 0), 0);
    const firstDoc = b.enDocs[0];

    const bundleSlug = firstDoc.slug.replace(/-\d+$/, '').replace(/-\d{3}-\d{3}$/, '') + '-complete';

    // Check if already exists
    const { data: existing } = await supabase.from('documents').select('id').eq('slug', bundleSlug);
    if (existing && existing.length > 0) {
      // Update existing bundle
      await supabase.from('documents').update({
        description: b.translatedDesc,
        price: b.priceInCents,
        seo_tags: ['bundle', ...bundleFiles],
      }).eq('id', existing[0].id);
      matchedEnIds.add(existing[0].id);
    } else {
      // Create new bundle
      const bundleData = {
        title: b.frProduct.title + ' (Complete)',
        slug: bundleSlug,
        description: b.translatedDesc,
        brand_id: firstDoc.brand_id,
        category_id: firstDoc.category_id,
        price: b.priceInCents,
        file_path: firstDoc.file_path,
        file_size: totalSize,
        preview_url: firstDoc.preview_url,
        language: 'en',
        active: true,
        seo_tags: ['bundle', ...bundleFiles],
      };

      const { data: inserted, error } = await supabase.from('documents').insert(bundleData).select('id');
      if (!error && inserted?.[0]) {
        matchedEnIds.add(inserted[0].id);
        bundlesCreated++;
        console.log(`  ✓ Bundle: ${bundleSlug} (${b.enDocs.length} parts)`);
      }
    }

    // Deactivate individual parts
    for (const d of b.enDocs) {
      await supabase.from('documents').update({ active: false }).eq('id', d.id);
    }

    await sleep(100);
  }

  console.log(`\nBundles created: ${bundlesCreated}`);

  // ---- Phase 4: Deactivate orphan EN docs ----
  console.log('\n--- Phase 4: Deactivating orphans ---\n');

  const orphans = enDocs.filter(d => d.active && !matchedEnIds.has(d.id));
  console.log(`Found ${orphans.length} orphan EN docs to deactivate:`);

  for (const o of orphans) {
    console.log(`  ❌ ${o.brands?.name || '?'} / ${o.slug} | ${o.title}`);
    await supabase.from('documents').update({ active: false }).eq('id', o.id);
  }

  // ---- Phase 5: Update brand counts ----
  console.log('\n--- Phase 5: Updating brand counts ---\n');

  const { data: brands } = await supabase.from('brands').select('id, name, document_count');
  let brandsUpdated = 0;

  for (const brand of brands) {
    const { count } = await supabase.from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .eq('active', true);
    if (count !== brand.document_count) {
      await supabase.from('brands').update({ document_count: count }).eq('id', brand.id);
      console.log(`  ${brand.name}: ${brand.document_count} → ${count}`);
      brandsUpdated++;
    }
  }

  // Final stats
  const { count: finalCount } = await supabase.from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);

  console.log(`\n========================================`);
  console.log(`FINAL RESULTS:`);
  console.log(`  FR products: ${frProducts.length}`);
  console.log(`  EN docs updated: ${updatedCount}`);
  console.log(`  Images uploaded: ${imgCount}`);
  console.log(`  Bundles created: ${bundlesCreated}`);
  console.log(`  Orphans deactivated: ${orphans.length}`);
  console.log(`  Brands updated: ${brandsUpdated}`);
  console.log(`  Total active EN docs: ${finalCount}`);
  console.log(`========================================`);
}

main().catch(console.error);
