import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOGOS = [
  { file: 'C:\\Users\\adm\\Desktop\\LOGOS\\logo_alfa-romeo.jpg', slug: 'alfa-romeo', ext: 'jpg', mime: 'image/jpeg' },
  { file: 'C:\\Users\\adm\\Desktop\\LOGOS\\logo_rover.jpg',       slug: 'rover',      ext: 'jpg', mime: 'image/jpeg' },
  { file: 'C:\\Users\\adm\\Desktop\\LOGOS\\logo_rowenta.png',    slug: 'rowenta',    ext: 'png', mime: 'image/png'  },
  { file: 'C:\\Users\\adm\\Desktop\\LOGOS\\logo_toyota.png',     slug: 'toyota',     ext: 'png', mime: 'image/png'  },
  { file: 'C:\\Users\\adm\\Desktop\\LOGOS\\logo_zenit.png',      slug: 'zenit',      ext: 'png', mime: 'image/png'  },
];

for (const logo of LOGOS) {
  process.stdout.write(`${logo.slug} ... `);

  // 1. Lire le fichier
  if (!fs.existsSync(logo.file)) { console.log(`✗ Fichier introuvable : ${logo.file}`); continue; }
  const buffer = fs.readFileSync(logo.file);
  const storagePath = `brands/${logo.slug}.${logo.ext}`;

  // 2. Upload dans Supabase Storage (bucket "logos"), écrase si existant
  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(storagePath, buffer, {
      contentType: logo.mime,
      upsert: true,
    });

  if (uploadErr) { console.log(`✗ Upload : ${uploadErr.message}`); continue; }

  // 3. Construire l'URL publique
  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(storagePath);

  // 4. Mettre à jour brands.logo_url
  const { error: updateErr } = await supabase
    .from('brands')
    .update({ logo_url: publicUrl })
    .eq('slug', logo.slug);

  if (updateErr) { console.log(`✗ Supabase update : ${updateErr.message}`); continue; }

  console.log(`✓  ${publicUrl}`);
}

console.log('\nTerminé.');
