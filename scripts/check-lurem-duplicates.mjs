// Check for duplicate LUREM PDFs by name and file hash
// Usage: node scripts/check-lurem-duplicates.mjs

import { readFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const LUREM_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Machines/LUREM';

function getFileHash(filePath) {
  const data = readFileSync(filePath);
  return createHash('md5').update(data).digest('hex');
}

(async () => {
  console.log('Checking LUREM documents for duplicates...\n');

  try {
    const files = readdirSync(LUREM_PATH)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort();

    console.log(`Found ${files.length} PDF files\n`);

    // Check by name
    const nameMap = {};
    const filesBySize = {};

    files.forEach(file => {
      const filePath = join(LUREM_PATH, file);
      const stats = statSync(filePath);
      const size = stats.size;

      // Track by name
      if (!nameMap[file]) {
        nameMap[file] = [];
      }
      nameMap[file].push({ file, size });

      // Track by size (similar files likely have same size)
      if (!filesBySize[size]) {
        filesBySize[size] = [];
      }
      filesBySize[size].push(file);
    });

    let duplicatesByName = 0;
    let potentialDuplicatesBySize = 0;

    // Check name duplicates
    const nameDuplicates = Object.entries(nameMap).filter(([name, entries]) => entries.length > 1);
    if (nameDuplicates.length > 0) {
      console.log('='.repeat(100));
      console.log('DUPLICATES BY NAME:\n');
      nameDuplicates.forEach(([name, entries]) => {
        duplicatesByName += entries.length - 1;
        console.log(`${name}`);
        entries.forEach(e => console.log(`  Size: ${(e.size / 1024 / 1024).toFixed(2)} MB`));
      });
      console.log();
    }

    // Check size duplicates (files with same size - likely duplicates)
    const sizeDuplicates = Object.entries(filesBySize).filter(([size, files]) => files.length > 1);
    if (sizeDuplicates.length > 0) {
      console.log('='.repeat(100));
      console.log('POTENTIAL DUPLICATES BY IDENTICAL SIZE:\n');

      for (const [size, fileList] of sizeDuplicates) {
        console.log(`Size: ${(parseInt(size) / 1024 / 1024).toFixed(2)} MB (${fileList.length} files):`);

        // Get hashes for files with same size
        const hashes = {};
        fileList.forEach(file => {
          const filePath = join(LUREM_PATH, file);
          const hash = getFileHash(filePath);
          if (!hashes[hash]) {
            hashes[hash] = [];
          }
          hashes[hash].push(file);
        });

        // Show files with identical hash
        Object.entries(hashes).forEach(([hash, hashFiles]) => {
          if (hashFiles.length > 1) {
            potentialDuplicatesBySize += hashFiles.length - 1;
            console.log(`  [IDENTICAL CONTENT] ${hashFiles.length} files:`);
            hashFiles.forEach(f => console.log(`    - ${f}`));
          } else {
            console.log(`  [UNIQUE] ${hashFiles[0]}`);
          }
        });
        console.log();
      }
    }

    console.log('='.repeat(100));
    console.log(`\nSummary:`);
    console.log(`Total files: ${files.length}`);
    console.log(`Exact name duplicates: ${duplicatesByName}`);
    console.log(`Identical content duplicates: ${potentialDuplicatesBySize}`);

    if (duplicatesByName === 0 && potentialDuplicatesBySize === 0) {
      console.log('\n✅ No duplicates found');
    } else {
      console.log('\n⚠️  Check duplicates above');
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
