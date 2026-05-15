import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addSonyDSCP92() {
  // Get Photography category ID
  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', '%photography%')
    .limit(1);

  if (!categories || categories.length === 0) {
    console.log('❌ Photography category not found');
    return;
  }

  const categoryId = categories[0].id;

  // Get Sony brand ID
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .ilike('name', '%sony%')
    .limit(1);

  if (!brands || brands.length === 0) {
    console.log('❌ Sony brand not found');
    return;
  }

  const brandId = brands[0].id;

  // Insert document
  const { error } = await supabase
    .from('documents')
    .insert({
      title: 'Sony DSC-P92 Service Manual',
      title_fr: 'Sony DSC-P92 Manuel de Service',
      description: 'Complete service manual for the Sony DSC-P92, a 5 megapixel compact digital camera. Contains detailed technical specifications, self-diagnosis procedures, circuit diagrams, and repair instructions for all regional models. Covers the 3x zoom lens, 1/1.8" CCD sensor, 1.5" TFT LCD screen, and control circuits.',
      description_fr: 'Manuel de service complet pour le Sony DSC-P92, appareil photo numérique compact 5 mégapixels. Contient les spécifications techniques détaillées, les procédures de diagnostic automatique, les schémas de circuit et les instructions de réparation pour tous les modèles régionaux. Couvre l\'objectif zoom 3x, le capteur CCD 1/1.8", l\'écran LCD 1.5" TFT, et les circuits de commande.',
      slug: 'sony-dsc-p92-service-manual',
      category_id: categoryId,
      brand_id: brandId,
      price: 1000,
      preview_url: '/previews/Sony DSC-P92.jpg',
      active: true
    });

  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`✓ Sony DSC-P92 published`);
  }
}

addSonyDSCP92().catch(console.error);
