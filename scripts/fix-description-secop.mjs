import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const description_fr = `Guide complet de réparation pour systèmes de réfrigération hermétiques couvrant les procédures de localisation des pannes, l'ouverture du système et le brasage sous gaz inerte, le remplacement du filtre sécheur, les techniques d'évacuation, la manipulation et la charge du réfrigérant, le remplacement du compresseur, les conversions de réfrigérant (R12, R134a, R502, R404a), la remédiation de la contamination par l'humidité, le diagnostic du moteur du compresseur brûlé, et la détection des pannes électriques pour les compresseurs PL/DL/TL/NL/FR. Inclut des sections détaillées sur le soudage, les connexions LokRing, le fonctionnement de la pompe à vide, et les procédures de sécurité pour les réfrigérants inflammables R600a et R290.`;

const { error } = await supabase
  .from('documents')
  .update({ description_fr })
  .eq('slug', 'secop-hermetic-refrigeration-systems-repair-guideline');

if (error) console.error('❌', error.message);
else console.log('✅ Description corrigée');
