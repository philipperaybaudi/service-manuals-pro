import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixYaesu() {
  // Cherche le document par slug
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', 'yaesu-yaesu-ft-757gx-manuel-gb-avec-ocr')
    .single();

  if (!doc) {
    console.log('Document not found');
    return;
  }

  console.log('Current state:');
  console.log(`Title: ${doc.title}`);
  console.log(`Title FR: ${doc.title_fr}`);
  console.log(`Description EN: ${doc.description}`);
  console.log(`Description FR: ${doc.description_fr}\n`);

  // Corrige le titre
  const title_fr = 'Yaesu FT-757GXII Manuel d\'utilisation';

  // Reconstruit la description en français propre
  const description_fr = 'Manuel d\'utilisation pour le Yaesu FT-757GXII. Documentation essentielle pour l\'entretien et l\'utilisation de cet équipement.';

  console.log('Fixing to:');
  console.log(`Title FR: ${title_fr}`);
  console.log(`Description FR: ${description_fr}\n`);

  const { error } = await supabase
    .from('documents')
    .update({
      title_fr,
      description_fr
    })
    .eq('id', doc.id);

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✓ Fixed successfully!');
  }
}

fixYaesu().catch(console.error);
