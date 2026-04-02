/**
 * Manual sync round 2: fix remaining duplicated preview images.
 * Maps FR product URLs to EN document slugs for correct per-product images.
 */

import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 25000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchUrl(res.headers.location!).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 25000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function extractImage(html: string): string | null {
  const m = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/);
  if (m) return m[1].replace(/-\d+x\d+\./, '.');
  return null;
}

// FR product slug → EN document slug(s) mapping + description
const mappings: [string, string[], string][] = [
  // === NIKON (12 remaining with generic nikon-D1.jpg) ===
  ['manuels-de-reparation-nikon-f3', ['nikon-service-manual-nikon-f3'], 'Complete service manual for the Nikon F3 professional SLR camera.'],
  ['manuel-de-depannage-du-nikon-d70', ['nikon-nikon-d70-repair-manual', 'nikon-d70-fiches', 'nikon-nikon-d70-guide-de-demarrage-rapide'], 'Repair manual and technical documentation for the Nikon D70 digital SLR camera.'],
  ['mode-demploi-des-nikon-f4-et-f4s', ['nikon-nikon-f4s-manuel', 'nikon-nikon-f4s-notice'], "User manual for the Nikon F4 and F4S professional SLR cameras."],
  ['manuel-de-reparation-des-nikon-f4-f4s', ['nikon-nikon-f4-assembly-adjustment', 'nikon-nikon-f4-parts-list', 'nikon-f4-extrait'], 'Service manual with assembly, adjustment and parts list for the Nikon F4/F4S.'],
  ['tutoriel-de-demontage-complet-nikon-f4-en-francais', ['nikon-tutoriel-de-demontage-complet-du-nikon-f4'], 'Complete disassembly tutorial for the Nikon F4 camera. Illustrated step-by-step guide in French.'],
  ['manuel-de-reparation-flash-nikon-sb24', ['nikon-nikon-sb-24-repair-manual'], 'Repair manual for the Nikon SB-24 Speedlight electronic flash unit.'],
  ['mode-demploi-nikon-f2', ['nikon-nikon-f2-notice-hd'], 'User manual for the Nikon F2 professional SLR camera (high-definition scan).'],

  // === FOCA (36 docs - map to specific FR products) ===
  // 280/285 are "Universel R" → manuel-de-reparation-du-foca-universel-rc
  ['manuel-de-reparation-du-foca-universel-rc', [
    'foca-280-instructions-1', 'foca-280-instructions-2', 'foca-280-instructions-3', 'foca-280-instructions-4', 'foca-280-instructions-5',
    'foca-285-univ-r-pl1', 'foca-285-univ-r-pl2', 'foca-285-univ-r-pl3', 'foca-285-univ-r-pl4', 'foca-285-univ-r-pl5', 'foca-285-univ-r-pl6',
    'foca-290-univ-rc-pl1', 'foca-290-univ-rc-pl3', 'foca-290-univ-rc-pl5', 'foca-290-univ-rc-pl6', 'foca-290-univ-rc-pl7',
    'foca-310-jeu-rid', 'foca-311-meme-jeu', 'foca-312-diff-rid', 'foca-313-vue-ant', 'foca-314-vue-post',
    'foca-315-meca-ant', 'foca-316-meca-post', 'foca-316a-obt1', 'foca-316b-obt2', 'foca-316c-obt3', 'foca-316d-obt4',
    'foca-317-reg-bar', 'foca-318-vis-rid', 'foca-319-plat-sup-rc', 'foca-320-mec-vit-lentes', 'foca-321-mec-dec-dif', 'foca-322-ressort',
    'foca-640-telemetre', 'foca-manuel-foca-universel'
  ], 'Technical diagram from the Foca Universel RC repair manual. Part of the complete service documentation.'],
  // PF2B notice → already has its own FR mapping, keep PF2B image for foca-pf2b-notice
  ['notice-du-foca-fp2b-pf3', ['foca-pf2b-notice'], 'User manual for the FOCA PF2B and PF3 rangefinder cameras.'],

  // === YAMAHA (8 docs with virago image) ===
  ['manuel-datelier-yamaha-virago-xv535', ['yamaha-virago-535-notice-gb', 'yamaha-virago-535-manual-gb', 'yamaha-virago-535-manual-gb-avec-ocr'], 'Workshop manual for the Yamaha Virago XV535 motorcycle.'],
  ['dt-125-mx-yamaha-revue-moto-technique', ['yamaha-125-1980', 'yamaha-rta-125dtmx-bd'], 'Technical review (Revue Moto Technique) for the Yamaha DT 125 MX motorcycle.'],
  ['ds7-rd250-r5c-rd350-yamaha-manuel-de-service', ['yamaha-yamaha-ds7-1972-rd-250-1973-r5c-1972-rd-350-1973-manual-2'], 'Service manual for Yamaha DS7/RD250/R5C/RD350 motorcycles (1972-1973).'],

  // === AKAI (6 docs with 4000.jpg) ===
  ['article-magnetophones-akai-4000-ds-db', ['akai-4000ds-4000db-notice'], 'User guide and article on the Akai 4000DS and 4000DB reel-to-reel tape recorders.'],
  ['manuel-de-depannage-akai-4000-ds-mk2', ['akai-akai-4000ds-mkii-manuel'], 'Troubleshooting and repair manual for the Akai 4000DS MK-II tape recorder.'],
  ['4000-db-manuel-de-depannage-akai-copie', ['akai-manuel-akai-4000db'], 'Repair manual for the Akai 4000DB tape recorder.'],
  ['gx-4000-d-db-manuel-de-depannage-akai', ['akai-akai-gx-4000-d-schematic', 'akai-akai-gx-4000-d-schematic-2', 'akai-akai-gx-4000-d-schematic-3'], 'Schematics and repair documentation for the Akai GX-4000D/DB tape recorder.'],

  // === LUREM / MENUISERIE (5 docs with FORMER 260s image) ===
  // These are exploded parts diagrams for different LUREM machines
  // No individual FR pages - they're all sub-parts. Skip for now.
];

async function main() {
  console.log('=== Manual Sync Round 2 ===\n');

  const { data: docs } = await supabase.from('documents').select('id, slug').eq('active', true);
  const slugMap: Record<string, string> = {};
  docs?.forEach(d => { slugMap[d.slug] = d.id; });

  let processed = 0, imgUploaded = 0, descUpdated = 0, notFound = 0;

  for (const [frSlug, enSlugs, engDesc] of mappings) {
    const frUrl = `https://la-documentation-technique.eu/produit/${frSlug}`;

    const enIds: { id: string; slug: string }[] = [];
    for (const es of enSlugs) {
      if (slugMap[es]) enIds.push({ id: slugMap[es], slug: es });
      else console.log(`  ⚠ EN slug not found: ${es}`);
    }

    if (enIds.length === 0 && enSlugs.length > 0) {
      notFound++;
      continue;
    }

    // Fetch FR page for image
    let imageUrl: string | null = null;
    try {
      const html = await fetchUrl(frUrl);
      imageUrl = extractImage(html);
      if (imageUrl) console.log(`  📷 ${frSlug} → ${imageUrl.split('/').pop()}`);
    } catch (err: any) {
      console.log(`  ⚠ Could not fetch ${frSlug}: ${err.message}`);
    }

    for (const en of enIds) {
      const updateData: any = {};
      if (engDesc) updateData.description = engDesc;

      if (imageUrl) {
        try {
          const imgBuffer = await fetchBuffer(imageUrl);
          const ext = imageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] || 'jpg';
          const storagePath = `previews/${en.slug}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from('logos')
            .upload(storagePath, imgBuffer, {
              contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
              upsert: true,
            });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
            updateData.preview_url = urlData.publicUrl;
            imgUploaded++;
          } else {
            console.log(`  ✗ upload ${en.slug}: ${uploadErr.message}`);
          }
        } catch (imgErr: any) {
          console.log(`  ✗ img fetch for ${en.slug}: ${imgErr.message}`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('documents').update(updateData).eq('id', en.id);
        if (!error) {
          descUpdated++;
          console.log(`  ✓ ${en.slug}`);
        } else {
          console.log(`  ✗ ${en.slug}: ${error.message}`);
        }
      }
    }

    processed++;
    await sleep(300);
  }

  console.log(`\nProcessed: ${processed}, Descriptions: ${descUpdated}, Images: ${imgUploaded}, Not found: ${notFound}`);
}

main().catch(console.error);
