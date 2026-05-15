import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUGS = [
  'airelec-manuel-depannage-thermostat-airelec',
  'acova-manuel-depannage-thermostat-acova',
  'noirot-manuel-depannage-thermostat-noirot',
];

const description_fr = `Guide pratique de dépannage pour les thermostats des marques NOIROT, AIRELEC et ACOVA, rédigé par Philippe Raybaudi (dont l'atelier est mondialement connu : <a href="https://mondepanneur.fr/" target="_blank" rel="noopener noreferrer">https://mondepanneur.fr/</a>).
Ce document traite des pannes les plus fréquentes affectant ces appareils, par exemple lorsque l'afficheur et les voyants clignotent ; ou ne s'allument plus du tout !
Il couvre deux générations de cartes électroniques distinctes : les anciennes cartes sans transformateur avec condensateur et résistance associés en abaisseur de tension et les cartes plus récentes équipées d'un transformateur.
Le guide détaille les symptômes typiques tels que le clignotement ou l'extinction de l'afficheur et des voyants. Il fournit les spécifications techniques précises des composants de remplacement, explique les différences entre les types de condensateurs polarisés et non polarisés, et inclut des conseils pratiques d'installation.
Le document propose également une vérification des tensions attendues et souligne quelques points importants pour la longévité de la carte électronique et de ses composants.`;

const description = `Practical troubleshooting guide for NOIROT, AIRELEC and ACOVA brand thermostats, written by Philippe Raybaudi (whose workshop is internationally renowned: <a href="https://mondepanneur.fr/" target="_blank" rel="noopener noreferrer">https://mondepanneur.fr/</a>).
This document covers the most common failures affecting these devices, for example when the display and indicator lights flash or stop working entirely.
It covers two distinct generations of electronic boards: older boards without a transformer using a capacitor and resistor as a voltage dropper, and more recent boards equipped with a transformer.
The guide details typical symptoms such as flashing or failing displays and indicator lights. It provides precise technical specifications for replacement components, explains the differences between polarized and non-polarized capacitor types, and includes practical installation advice.
The document also covers expected voltage checks and highlights important points for extending the lifespan of the electronic board and its components.`;

for (const slug of SLUGS) {
  const { error } = await supabase
    .from('documents')
    .update({ description, description_fr })
    .eq('slug', slug);

  if (error) console.error(`❌ ${slug} : ${error.message}`);
  else console.log(`✅ ${slug}`);
}
