import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DOC_SLUG = 'citroen-dacia-duster-starting-charging-system-opr-10192';
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\DACIA';
const PDF_FILENAME = 'citroen-dacia-duster-starting-charging-system-opr-10192.pdf';

// R2 public URL (based on Cloudflare R2 naming convention)
const R2_PUBLIC_DOMAIN = 'https://r2.service-manuals-pro.fr'; // or check .env for exact domain
const PDF_URL = `${R2_PUBLIC_DOMAIN}/documents/${PDF_FILENAME}`;

const targetPath = path.join(DOCS_EN_LIGNE, PDF_FILENAME);

console.log(`Downloading from: ${PDF_URL}`);
console.log(`Saving to: ${targetPath}`);

try {
  // Use curl to download
  const { stdout, stderr } = await execAsync(
    `curl -o "${targetPath}" "${PDF_URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  );

  if (fs.existsSync(targetPath)) {
    const size = fs.statSync(targetPath).size;
    console.log(`✓ PDF downloaded (${(size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error('✗ Download failed - file not created');
  }
} catch (error) {
  console.error('✗ Download error:', error.message);
  console.log('\nFallback: You can manually download from the R2 bucket');
}
