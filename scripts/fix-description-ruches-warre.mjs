import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const description_fr = `Manuel technique pour la construction de ruches Warré et Layens. Traite des principes de construction incluant la détermination du volume, le dimensionnement des cadres, la circulation des abeilles et l'étanchéité. Détaille le choix des bois pour les corps et toits, les techniques d'assemblage, les accessoires, l'outillage, le traitement du bois et l'étanchéité. Comprend des plans techniques détaillés.`;

const { error } = await supabase
  .from('documents')
  .update({ description_fr })
  .eq('slug', 'ouvrages-de-reference-construction-de-ruches-warre-et-layens-elements-standards');

if (error) console.error('❌', error.message);
else console.log('✅ Description corrigée');
