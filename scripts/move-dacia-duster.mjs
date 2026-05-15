import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DOC_SLUG = 'citroen-dacia-duster-starting-charging-system-opr-10192';
const AUTOMOTIVE_CAT_ID = 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd';
const DOCS_EN_LIGNE = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile';

// Step 1: Check if DACIA brand exists in Automotive
const { data: existing } = await supabase.from('brands')
  .select('id, slug')
  .eq('slug', 'dacia');

let daciaId;
if (existing && existing.length > 0) {
  daciaId = existing[0].id;
  console.log(`✓ Brand DACIA exists (id: ${daciaId})`);
} else {
  // Create DACIA brand
  const { data: brand, error } = await supabase.from('brands')
    .insert({ slug: 'dacia', name: 'DACIA' })
    .select()
    .single();
  if (error) { console.error('✗ Create DACIA:', error.message); process.exit(1); }
  daciaId = brand.id;
  console.log(`✓ Brand DACIA created (id: ${daciaId})`);
}

// Step 2: Get document info
const { data: doc } = await supabase.from('documents')
  .select('id, file_path, title, title_fr')
  .eq('slug', DOC_SLUG)
  .single();

if (!doc) { console.error('✗ Document not found'); process.exit(1); }

// Step 3: Update document to DACIA brand
const { error: upErr } = await supabase.from('documents')
  .update({ brand_id: daciaId })
  .eq('id', doc.id);

if (upErr) { console.error('✗ Update doc:', upErr.message); process.exit(1); }
console.log(`✓ Document moved to DACIA brand`);

// Step 4: Create DACIA folder if needed
const daciaFolder = path.join(DOCS_EN_LIGNE, 'DACIA');
if (!fs.existsSync(daciaFolder)) {
  fs.mkdirSync(daciaFolder, { recursive: true });
  console.log(`✓ Folder created: ${daciaFolder}`);
}

// Step 5: Download PDF from R2 and save to DOCS EN LIGNE
const targetPath = path.join(daciaFolder, path.basename(doc.file_path));

// Use Supabase Storage API to get the file
const { data: pdfData, error: dlErr } = await supabase.storage
  .from('service-manuals-documents')
  .download(doc.file_path);

if (dlErr) {
  console.error('✗ Download from storage:', dlErr.message);
  console.log('ℹ Manual download from R2 may be needed');
} else {
  const buffer = await pdfData.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(buffer));
  console.log(`✓ PDF saved: ${targetPath}`);
}

console.log(`\nDone! Doc: ${doc.title_fr || doc.title}`);
