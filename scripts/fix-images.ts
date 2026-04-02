/**
 * Fix script: Upload all brand logos + product preview images
 *
 * - Searches recursively for logo files in brand folders
 * - Finds product images and associates them with documents
 * - Uploads everything to Supabase Storage
 *
 * Usage: npx tsx scripts/fix-images.ts
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanStorageKey(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function isImage(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(filename);
}

function isLogo(filename: string): boolean {
  return filename.toLowerCase().includes('logo');
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.bmp': return 'image/bmp';
    case '.svg': return 'image/svg+xml';
    default: return 'image/jpeg';
  }
}

/** Recursively find first logo file in a directory */
function findLogo(dir: string): string | null {
  try {
    const entries = fs.readdirSync(dir);
    // First check current directory
    for (const entry of entries) {
      if (isLogo(entry) && isImage(entry)) {
        return path.join(dir, entry);
      }
    }
    // Then check subdirectories
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findLogo(fullPath);
        if (found) return found;
      }
    }
  } catch (e) {}
  return null;
}

/** Find all product images in a directory (non-logo images) */
function findProductImages(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findProductImages(fullPath));
      } else if (isImage(entry) && !isLogo(entry) && !entry.startsWith('desktop')) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

async function main() {
  console.log('=== Fix Images: Upload Logos & Product Previews ===\n');

  let logosUpdated = 0;
  let previewsUpdated = 0;
  let errors = 0;

  // 1. Get all brands from database
  const { data: brands } = await supabase.from('brands').select('id, name, slug, category_id, logo_url');
  const { data: categories } = await supabase.from('categories').select('id, name, slug, icon_url');
  const { data: documents } = await supabase.from('documents').select('id, title, slug, brand_id, category_id, preview_url, file_path');

  if (!brands || !categories || !documents) {
    console.error('Failed to fetch data from database');
    return;
  }

  // Category slug -> folder name mapping (reverse)
  const CATEGORY_FOLDERS: Record<string, string> = {
    'pet-care': 'ANIMAUX',
    'automotive': 'AUTO MOTO',
    'biomedical': 'BIOMEDICAL',
    'workshop-diy': 'BRICOLAGE',
    'camping-rv': 'CAMPING CARAVANING',
    'cinema-video': 'CINEMA & VIDEO',
    'drones': 'DRONES',
    'home-appliances': 'ELECTROMENAGER',
    'electronics': 'ELECTRONIQUE',
    'computers-it': 'INFORMATIQUE',
    'outdoor-power': 'MOTOCULTURE',
    'marine': 'NAUTISME',
    'photography': 'PHOTOGRAPHIE',
    'radio-communications': 'RADIO COM',
    'audio-hifi': 'SON',
    'sports-equipment': 'SPORTS',
    'phones-telecom': 'TELEPHONE',
    'television': 'TELEVISION',
    'machining': 'USINAGE',
  };

  // 2. Fix category logos
  console.log('--- Fixing Category Logos ---\n');
  for (const cat of categories) {
    const folderName = CATEGORY_FOLDERS[cat.slug];
    if (!folderName) continue;

    const catPath = path.join(SOURCE_DIR, folderName);
    if (!fs.existsSync(catPath)) continue;

    // Search for logo in category folder (first level only for categories)
    const entries = fs.readdirSync(catPath);
    const logoFile = entries.find(e => isLogo(e) && isImage(e));

    if (logoFile) {
      const logoPath = path.join(catPath, logoFile);
      const ext = path.extname(logoFile).toLowerCase();
      const storagePath = `categories/${cat.slug}${ext}`;

      const logoBuffer = fs.readFileSync(logoPath);
      const { error } = await supabase.storage.from('logos').upload(storagePath, logoBuffer, {
        contentType: getContentType(logoFile),
        upsert: true,
      });

      if (!error) {
        const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(storagePath);
        await supabase.from('categories').update({ icon_url: publicUrl.publicUrl }).eq('id', cat.id);
        console.log(`  ✓ Category logo: ${cat.name} → ${logoFile}`);
        logosUpdated++;
      } else {
        console.error(`  ✗ Category logo ${cat.name}: ${error.message}`);
        errors++;
      }
    }
  }

  // 3. Fix brand logos (search recursively)
  console.log('\n--- Fixing Brand Logos ---\n');
  for (const brand of brands) {
    const cat = categories.find(c => c.id === brand.category_id);
    if (!cat) continue;

    const folderName = CATEGORY_FOLDERS[cat.slug];
    if (!folderName) continue;

    const catPath = path.join(SOURCE_DIR, folderName);
    if (!fs.existsSync(catPath)) continue;

    // Try to find the brand folder - search all subdirectories
    const findBrandFolder = (dir: string, brandName: string): string | null => {
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          if (fs.statSync(fullPath).isDirectory()) {
            if (entry.toUpperCase() === brandName.toUpperCase() ||
                slugify(entry) === slugify(brandName)) {
              return fullPath;
            }
            // Check one level deeper
            const subEntries = fs.readdirSync(fullPath);
            for (const sub of subEntries) {
              const subPath = path.join(fullPath, sub);
              if (fs.statSync(subPath).isDirectory() &&
                  (sub.toUpperCase() === brandName.toUpperCase() || slugify(sub) === slugify(brandName))) {
                return subPath;
              }
            }
          }
        }
      } catch (e) {}
      return null;
    };

    // Find the brand folder in the category
    let brandPath: string | null = null;
    const entries = fs.readdirSync(catPath);
    for (const entry of entries) {
      const fullPath = path.join(catPath, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        if (slugify(entry) === brand.slug) {
          brandPath = fullPath;
          break;
        }
        // Check subfolders too
        const subEntries = fs.readdirSync(fullPath);
        for (const sub of subEntries) {
          const subPath = path.join(fullPath, sub);
          if (fs.statSync(subPath).isDirectory() && slugify(sub) === brand.slug) {
            brandPath = subPath;
            break;
          }
        }
        if (brandPath) break;
      }
    }

    if (!brandPath) continue;

    // Find logo recursively
    const logoPath = findLogo(brandPath);
    if (logoPath) {
      const ext = path.extname(logoPath).toLowerCase();
      const storagePath = `brands/${brand.slug}${ext}`;

      const logoBuffer = fs.readFileSync(logoPath);
      const { error } = await supabase.storage.from('logos').upload(storagePath, logoBuffer, {
        contentType: getContentType(logoPath),
        upsert: true,
      });

      if (!error) {
        const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(storagePath);
        await supabase.from('brands').update({ logo_url: publicUrl.publicUrl }).eq('id', brand.id);
        console.log(`  ✓ Brand logo: ${brand.name} → ${path.basename(logoPath)}`);
        logosUpdated++;
      } else {
        console.error(`  ✗ Brand logo ${brand.name}: ${error.message}`);
        errors++;
      }
    }
  }

  // 4. Fix product preview images
  console.log('\n--- Fixing Product Preview Images ---\n');

  // Build a map of documents by brand for matching
  for (const doc of documents) {
    if (doc.preview_url) continue; // Already has preview

    const brand = brands.find(b => b.id === doc.brand_id);
    const cat = categories.find(c => c.id === doc.category_id);
    if (!cat) continue;

    const folderName = CATEGORY_FOLDERS[cat.slug];
    if (!folderName) continue;

    const catPath = path.join(SOURCE_DIR, folderName);
    if (!fs.existsSync(catPath)) continue;

    // Try to find a matching image near the PDF
    // The file_path tells us the storage structure
    const filePath = doc.file_path;
    if (!filePath) continue;

    // Find the PDF's source directory by searching recursively
    const pdfName = path.basename(filePath).replace(/\.pdf$/i, '');

    // Search for images in the same folder as the PDF or nearby
    const searchForPreview = (dir: string, depth: number = 0): string | null => {
      if (depth > 3) return null;
      try {
        const entries = fs.readdirSync(dir);

        // Look for images in this directory
        const images = entries.filter(e => isImage(e) && !isLogo(e) && !e.startsWith('desktop'));

        if (images.length > 0) {
          // Try to find an image matching the document name
          const matching = images.find(img => {
            const imgName = img.toLowerCase().replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '');
            const docTitle = doc.title.toLowerCase();
            return imgName.includes(docTitle.substring(0, 10)) || docTitle.includes(imgName.substring(0, 10));
          });

          if (matching) return path.join(dir, matching);
          // If only one image, use it as fallback
          if (images.length === 1) return path.join(dir, images[0]);
        }

        // Search subdirectories
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          if (fs.statSync(fullPath).isDirectory()) {
            const found = searchForPreview(fullPath, depth + 1);
            if (found) return found;
          }
        }
      } catch (e) {}
      return null;
    };

    // For branded documents, search in the brand's folder
    if (brand) {
      const entries = fs.readdirSync(catPath);
      for (const entry of entries) {
        const fullPath = path.join(catPath, entry);
        if (fs.statSync(fullPath).isDirectory() && slugify(entry) === brand.slug) {
          const previewPath = searchForPreview(fullPath);
          if (previewPath) {
            const cleanName = cleanStorageKey(path.basename(previewPath));
            const storagePath = `${cat.slug}/${brand.slug}/${cleanName}`;

            const imgBuffer = fs.readFileSync(previewPath);
            const { error } = await supabase.storage.from('previews').upload(storagePath, imgBuffer, {
              contentType: getContentType(previewPath),
              upsert: true,
            });

            if (!error) {
              const { data: publicUrl } = supabase.storage.from('previews').getPublicUrl(storagePath);
              await supabase.from('documents').update({ preview_url: publicUrl.publicUrl }).eq('id', doc.id);
              console.log(`  ✓ Preview: ${doc.title} → ${path.basename(previewPath)}`);
              previewsUpdated++;
            } else {
              // Don't log duplicate errors
              if (!error.message.includes('already exists')) {
                errors++;
              }
            }
            break;
          }
          break;
        }
        // Check one level deeper for brand matching
        if (fs.statSync(fullPath).isDirectory()) {
          const subEntries = fs.readdirSync(fullPath);
          for (const sub of subEntries) {
            const subPath = path.join(fullPath, sub);
            if (fs.statSync(subPath).isDirectory() && slugify(sub) === brand.slug) {
              const previewPath = searchForPreview(subPath);
              if (previewPath) {
                const cleanName = cleanStorageKey(path.basename(previewPath));
                const storagePath = `${cat.slug}/${brand.slug}/${cleanName}`;

                const imgBuffer = fs.readFileSync(previewPath);
                const { error } = await supabase.storage.from('previews').upload(storagePath, imgBuffer, {
                  contentType: getContentType(previewPath),
                  upsert: true,
                });

                if (!error) {
                  const { data: publicUrl } = supabase.storage.from('previews').getPublicUrl(storagePath);
                  await supabase.from('documents').update({ preview_url: publicUrl.publicUrl }).eq('id', doc.id);
                  console.log(`  ✓ Preview: ${doc.title} → ${path.basename(previewPath)}`);
                  previewsUpdated++;
                }
              }
              break;
            }
          }
        }
      }
    }
  }

  console.log('\n=== Fix Images Complete ===');
  console.log(`Logos updated: ${logosUpdated}`);
  console.log(`Previews updated: ${previewsUpdated}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
