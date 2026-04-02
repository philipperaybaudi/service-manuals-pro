/**
 * Import script for DOCS EN LIGNE (v2 - fixes special chars + recursive scan)
 *
 * Usage: npx tsx scripts/import-docs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOURCE_DIR = 'D:/SAVE Panasonic 2026-01-15/SHEMATHEQUE/DOCS EN LIGNE';
const EXCLUDED_FOLDERS = ['ARMES'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Supabase free tier limit

const CATEGORY_MAP: Record<string, { name: string; slug: string; description: string; order: number }> = {
  'ANIMAUX': { name: 'Pet Care', slug: 'pet-care', description: 'Service manuals for pet care equipment and accessories', order: 1 },
  'AUTO MOTO': { name: 'Automotive', slug: 'automotive', description: 'Workshop manuals, repair guides and schematics for cars, motorcycles and vehicles', order: 2 },
  'BIOMEDICAL': { name: 'Biomedical', slug: 'biomedical', description: 'Technical manuals for biomedical and dental equipment', order: 3 },
  'BRICOLAGE': { name: 'Workshop & DIY', slug: 'workshop-diy', description: 'Service manuals for power tools, woodworking machines and sewing equipment', order: 4 },
  'CAMPING CARAVANING': { name: 'Camping & RV', slug: 'camping-rv', description: 'Technical documentation for caravans, motorhomes and camping equipment', order: 5 },
  'CINEMA & VIDEO': { name: 'Cinema & Video', slug: 'cinema-video', description: 'Service manuals for film projectors, video cameras and cinema equipment', order: 6 },
  'DRONES': { name: 'Drones', slug: 'drones', description: 'Technical manuals and repair guides for consumer and professional drones', order: 7 },
  'ELECTROMENAGER': { name: 'Home Appliances', slug: 'home-appliances', description: 'Service manuals for household appliances, heaters and domestic equipment', order: 8 },
  'ELECTRONIQUE': { name: 'Electronics', slug: 'electronics', description: 'Technical manuals for test equipment, oscilloscopes and electronic instruments', order: 9 },
  'INFORMATIQUE': { name: 'Computers & IT', slug: 'computers-it', description: 'Service manuals and technical guides for computers and IT equipment', order: 10 },
  'MOTOCULTURE': { name: 'Outdoor Power', slug: 'outdoor-power', description: 'Service manuals for chainsaws, lawn mowers and outdoor power equipment', order: 11 },
  'NAUTISME': { name: 'Marine', slug: 'marine', description: 'Technical manuals for marine engines, boat systems and nautical equipment', order: 12 },
  'PHOTOGRAPHIE': { name: 'Photography', slug: 'photography', description: 'Service manuals for cameras, lenses, flashes and photographic equipment', order: 13 },
  'RADIO COM': { name: 'Radio & Communications', slug: 'radio-communications', description: 'Service manuals for radios, transceivers, CB and amateur radio equipment', order: 14 },
  'SON': { name: 'Audio & HiFi', slug: 'audio-hifi', description: 'Service manuals for amplifiers, tape recorders, turntables and audio equipment', order: 15 },
  'SPORTS': { name: 'Sports Equipment', slug: 'sports-equipment', description: 'Technical manuals for sports training equipment and machines', order: 16 },
  'TELEPHONE': { name: 'Phones & Telecom', slug: 'phones-telecom', description: 'Service manuals for smartphones, mobile phones and telecom equipment', order: 17 },
  'TELEVISION': { name: 'Television', slug: 'television', description: 'Service manuals for TVs, monitors, power supplies and display equipment', order: 18 },
  'USINAGE': { name: 'Machining', slug: 'machining', description: 'Technical guides for lathes, milling machines and metalworking equipment', order: 19 },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Clean filename for Supabase storage key (no special chars, no accents, no apostrophes) */
function cleanStorageKey(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[''`]/g, '')           // remove apostrophes
    .replace(/[^a-zA-Z0-9._-]/g, '_') // replace special chars with underscore
    .replace(/_+/g, '_')              // collapse multiple underscores
    .replace(/^_|_$/g, '');           // trim underscores
}

function isLogo(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes('logo') || lower.includes('brand');
}

function isImage(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(filename);
}

function isPDF(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

function generateDocTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Recursively find all PDFs in a directory */
function findPDFs(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findPDFs(fullPath));
    } else if (isPDF(entry) && !isLogo(entry)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log('=== Service Manuals Pro - Document Import v2 ===\n');
  console.log('Fixes: special characters in filenames, recursive scanning\n');

  const categoryIds: Record<string, string> = {};
  let totalDocs = 0;
  let totalLogos = 0;
  let skippedSize = 0;
  let errors = 0;

  // 1. Create categories (skip if already exist)
  console.log('Creating/updating categories...');
  for (const [folder, config] of Object.entries(CATEGORY_MAP)) {
    const { data, error } = await supabase
      .from('categories')
      .upsert({
        name: config.name,
        slug: config.slug,
        description: config.description,
        display_order: config.order,
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (data) {
      categoryIds[folder] = data.id;
      console.log(`  ✓ ${config.name}`);
    } else {
      console.error(`  ✗ ${config.name}: ${error?.message}`);
    }
  }

  // 2. Scan folders
  console.log('\nScanning documents...');

  const categoryFolders = fs.readdirSync(SOURCE_DIR);

  for (const catFolder of categoryFolders) {
    if (EXCLUDED_FOLDERS.includes(catFolder)) continue;
    if (!CATEGORY_MAP[catFolder]) continue;

    const catPath = path.join(SOURCE_DIR, catFolder);
    if (!fs.statSync(catPath).isDirectory()) continue;

    const categoryId = categoryIds[catFolder];
    if (!categoryId) continue;

    const catConfig = CATEGORY_MAP[catFolder];
    console.log(`\n[${catConfig.name}]`);

    const entries = fs.readdirSync(catPath);

    // Find category-level logo
    const catLogo = entries.find(e => isLogo(e) && isImage(e) && !fs.statSync(path.join(catPath, e)).isDirectory());
    if (catLogo) {
      const logoPath = path.join(catPath, catLogo);
      const logoBuffer = fs.readFileSync(logoPath);
      const ext = path.extname(catLogo).toLowerCase();
      const storagePath = `logos/categories/${catConfig.slug}${ext}`;

      const { error: logoErr } = await supabase.storage.from('logos').upload(storagePath, logoBuffer, {
        contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
        upsert: true,
      });

      if (!logoErr) {
        const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(storagePath);
        await supabase.from('categories').update({ icon_url: publicUrl.publicUrl }).eq('id', categoryId);
        totalLogos++;
      }
    }

    // Process subfolders (brands) and direct PDFs
    for (const entry of entries) {
      const entryPath = path.join(catPath, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        // This is a brand folder
        const brandSlug = slugify(entry);
        const brandName = entry;

        // Find all PDFs recursively (handles sub-sub-folders like model folders)
        const allPDFs = findPDFs(entryPath);

        if (allPDFs.length === 0 && !isLogo(entry)) {
          console.log(`  → ${brandName}: no PDFs found, skipping`);
          continue;
        }

        // Create brand
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .upsert({
            name: brandName,
            slug: brandSlug,
            category_id: categoryId,
            document_count: allPDFs.length,
          }, { onConflict: 'slug' })
          .select()
          .single();

        if (!brand) {
          console.error(`  ✗ Brand ${brandName}: ${brandError?.message}`);
          continue;
        }

        const brandId = brand.id;

        // Upload brand logo
        const brandFiles = fs.readdirSync(entryPath);
        const brandLogo = brandFiles.find(f => isLogo(f) && isImage(f));
        if (brandLogo) {
          const logoPath = path.join(entryPath, brandLogo);
          const logoBuffer = fs.readFileSync(logoPath);
          const ext = path.extname(brandLogo).toLowerCase();
          const storagePath = `logos/brands/${brandSlug}${ext}`;

          const { error: logoErr } = await supabase.storage.from('logos').upload(storagePath, logoBuffer, {
            contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
            upsert: true,
          });

          if (!logoErr) {
            const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(storagePath);
            await supabase.from('brands').update({ logo_url: publicUrl.publicUrl }).eq('id', brandId);
            totalLogos++;
          }
        }

        // Upload PDFs
        for (const pdfPath of allPDFs) {
          const pdfFile = path.basename(pdfPath);
          const title = generateDocTitle(pdfFile);
          const docSlug = slugify(`${brandName}-${title}`);
          const fileSize = fs.statSync(pdfPath).size;

          // Skip files > 50MB
          if (fileSize > MAX_FILE_SIZE) {
            console.log(`    ⊘ ${pdfFile}: too large (${(fileSize / 1024 / 1024).toFixed(1)} MB), skipped`);
            skippedSize++;
            continue;
          }

          const cleanedFilename = cleanStorageKey(pdfFile);
          const storagePath = `${catConfig.slug}/${brandSlug}/${cleanedFilename}`;

          try {
            const fileBuffer = fs.readFileSync(pdfPath);

            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true,
              });

            if (uploadError) {
              console.error(`    ✗ Upload ${pdfFile}: ${uploadError.message}`);
              errors++;
              continue;
            }

            const { error: docError } = await supabase.from('documents').upsert({
              title,
              slug: docSlug,
              description: `${title} - Professional service manual and technical documentation for ${brandName}.`,
              category_id: categoryId,
              brand_id: brandId,
              price: 990,
              file_path: storagePath,
              file_size: fileSize,
              seo_title: `${title} Service Manual | ${brandName} Repair Guide PDF`,
              seo_description: `Download ${title} service manual for ${brandName}. Professional repair guide with schematics and technical documentation in PDF format.`,
              seo_tags: [brandName.toLowerCase(), catConfig.name.toLowerCase(), 'service manual', 'repair guide', 'pdf'],
              active: true,
              featured: false,
            }, { onConflict: 'slug' });

            if (docError) {
              console.error(`    ✗ Doc ${title}: ${docError.message}`);
              errors++;
            } else {
              console.log(`    ✓ ${title}`);
              totalDocs++;
            }
          } catch (err: any) {
            console.error(`    ✗ ${pdfFile}: ${err.message}`);
            errors++;
          }
        }
      } else if (isPDF(entry)) {
        // Direct PDF in category (no brand)
        const title = generateDocTitle(entry);
        const docSlug = slugify(`${catConfig.slug}-${title}`);
        const fileSize = stat.size;

        if (fileSize > MAX_FILE_SIZE) {
          console.log(`  ⊘ ${entry}: too large (${(fileSize / 1024 / 1024).toFixed(1)} MB), skipped`);
          skippedSize++;
          continue;
        }

        const cleanedFilename = cleanStorageKey(entry);
        const storagePath = `${catConfig.slug}/${cleanedFilename}`;

        try {
          const fileBuffer = fs.readFileSync(entryPath);

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileBuffer, {
              contentType: 'application/pdf',
              upsert: true,
            });

          if (uploadError) {
            console.error(`  ✗ Upload ${entry}: ${uploadError.message}`);
            errors++;
            continue;
          }

          const { error: docError } = await supabase.from('documents').upsert({
            title,
            slug: docSlug,
            description: `${title} - Professional technical documentation.`,
            category_id: categoryId,
            price: 990,
            file_path: storagePath,
            file_size: fileSize,
            seo_title: `${title} | Technical Documentation PDF`,
            seo_description: `Download ${title}. Professional technical documentation in PDF format.`,
            seo_tags: [catConfig.name.toLowerCase(), 'service manual', 'technical documentation', 'pdf'],
            active: true,
            featured: false,
          }, { onConflict: 'slug' });

          if (docError) {
            console.error(`  ✗ Doc ${title}: ${docError.message}`);
            errors++;
          } else {
            console.log(`  ✓ ${title}`);
            totalDocs++;
          }
        } catch (err: any) {
          console.error(`  ✗ ${entry}: ${err.message}`);
          errors++;
        }
      }
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Documents imported: ${totalDocs}`);
  console.log(`Logos uploaded: ${totalLogos}`);
  console.log(`Skipped (too large): ${skippedSize}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
