import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadImage() {
  try {
    // Lire l'image
    const imagePath = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégorie/Photographie/Sony/Sony DSC-P92.jpg';
    const imageBuffer = fs.readFileSync(imagePath);

    // Uploader vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload('previews/sony-dsc-p92.jpg', imageBuffer, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (error) {
      console.log(`❌ Upload error: ${error.message}`);
      return;
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl('previews/sony-dsc-p92.jpg');

    console.log(`✓ Image uploaded: ${publicUrl}`);

    // Mettre à jour la base de données
    const { error: updateError } = await supabase
      .from('documents')
      .update({ preview_url: publicUrl })
      .eq('slug', 'sony-dsc-p92-service-manual');

    if (updateError) {
      console.log(`❌ Update error: ${updateError.message}`);
    } else {
      console.log(`✓ Preview URL updated`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

uploadImage();
