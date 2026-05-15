/**
 * import-eavt723a-laguna.mjs
 *
 * Réimporte EAVT723A (Renault Laguna Diesel Atmosphérique, AUTO-VOLT N°723, Mai 1996)
 * supprimé par erreur lors du nettoyage des doublons.
 * Source : C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\RENAULT\EAVT723A.pdf
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const BUCKET   = 'service-manuals-documents';
const SLUG     = 'renault-laguna-diesel-atmospherique-schema-fiche-1996';
const PDF_SRC  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\RENAULT\\EAVT723A.pdf';
const PDF_KEY  = `documents/${SLUG}.pdf`;

// 1. Vérifier que le slug n'existe pas déjà
const { data: existing } = await supabase.from('documents').select('id').eq('slug', SLUG).single();
if (existing) { console.error('✗ Slug déjà existant'); process.exit(1); }

// 2. Récupérer brand_id Renault + category_id Automobile
const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'renault').single();
const { data: category } = await supabase.from('categories').select('id').eq('slug', 'automotive').single();
console.log(`✓ brand_id Renault   : ${brand.id}`);
console.log(`✓ category_id Auto   : ${category.id}`);

// 3. Lire et uploader le PDF
const pdfBuffer = fs.readFileSync(PDF_SRC);
const fileSizeBytes = pdfBuffer.length;
await r2.send(new PutObjectCommand({
  Bucket: BUCKET, Key: PDF_KEY, Body: pdfBuffer, ContentType: 'application/pdf',
}));
console.log(`✓ PDF uploadé : ${PDF_KEY} (${(fileSizeBytes / 1024).toFixed(0)} KB)`);

// 4. Insérer dans Supabase
const { data: doc, error } = await supabase.from('documents').insert({
  slug:           SLUG,
  title:          'Renault Laguna Naturally Aspirated Diesel — Technical Data Sheet 1996',
  title_fr:       'Renault Laguna Diesel Atmosphérique — Schéma-Fiche 1996',
  description:    `Technical data sheet AUTO-VOLT N°723 (May 1996) covering the Renault Laguna with the naturally aspirated 2.2D Diesel engine (from January 1993). Engine G8T 706 and G8T 752: 2,200 cc, 85 hp, 4-cylinder in-line transverse layout, aluminium cylinder head with pressed-in dry liners, single overhead camshaft driven by toothed belt. Valve timing diagram: inlet opens 5° ATDC, exhaust closes 5° ATDC, exhaust opens 22° BBDC, inlet closes 21° ABDC. Lubrification: gear pump in sump driven via intermediate shaft; pressure 1.6 bar at 1,000 rpm / 4 bar at 3,000 rpm; double-filtration Purflux cartridge filter. Cooling: two-speed fan (1st speed on at 88°C, 2nd speed at 92°C), 9-litre capacity Glacéol Al 50%. Fuel system: 66-litre tank, Purflux PA66C5430 fuel filter (every 15,000 km), Técafiltre LX 452 air filter. Bosch VE 4/9 F2400 rotary injection pump with KSB cold-start advance solenoid and ALFB load-dependent advance; injection pump timing: 0.8 ± 0.04 mm plunger lift at TDC cylinder 1; idle 775 ± 25 rpm, max no-load 5,400 ± 100 rpm. Injectors: Bosch KCA 17 S42, opening pressure 130 +8/−5 bar. Coolant temperature sensor CTN, resistance 3,060–4,045 Ω at 20°C. ABS Teves Mark IV (standard on V6/Baccara, optional on others): 8-channel hydraulic unit, 4 sensors, wheel sensor air gap 0.5–1.3 mm, sensor resistance 1.1 kΩ. Glow plug system: Beru plugs 0.3–0.4 Ω, 15 A at 5 s; post-glow up to 210 s.`,
  description_fr: `Schéma-Fiche AUTO-VOLT N°723 (mai 1996) consacré à la Renault Laguna à moteur Diesel atmosphérique 2,2 litres (depuis janvier 1993). Moteurs G8T 706 et G8T 752 : 2 200 cm³, 85 ch, 4 cylindres en ligne transversal, culasse alliage aluminium avec chemises sèches emmanchées à la presse, simple arbre à cames en tête entraîné par courroie crantée. Diagramme de distribution : ouverture admission 5° après PMH, fermeture échappement 5° après PMH, ouverture échappement 22° avant PMB, fermeture admission 21° après PMB. Lubrification : pompe à engrenage dans le carter d'huile entraînée via arbre intermédiaire ; pression 1,6 bar à 1 000 tr/min / 4 bars à 3 000 tr/min ; filtre à double filtration Purflux. Refroidissement : motoventilateur bi-vitesse (1re vitesse 88°C, 2e vitesse 92°C), capacité 9 litres Glacéol Al 50%. Alimentation : réservoir 66 litres, filtre Purflux PA66C5430 (remplacement 15 000 km), filtre air Técafiltre LX 452. Pompe d'injection rotative Bosch VE 4/9 F2400 avec surcaleur KSB et dépendance de charge ALFB ; calage pompe : levée piston 0,8 ± 0,04 mm ; ralenti 775 ± 25 tr/min, maxi à vide 5 400 ± 100 tr/min. Injecteurs Bosch KCA 17 S42, pression de tarage 130 +8/−5 bars. Sonde de température CTN, résistance 3 060 à 4 045 Ω à 20°C. ABS Teves Mark IV (série V6/Baccara, option sur autres versions) : centrale hydraulique 8 canaux, 4 capteurs, entrefer 0,5 à 1,3 mm, résistance capteur 1,1 kΩ. Préchauffage : bougies Beru 0,3 à 0,4 Ω, 15 A après 5 secondes ; postchauffage jusqu'à 210 secondes.`,
  brand_id:    brand.id,
  category_id: category.id,
  price:       1200,
  file_path:   PDF_KEY,
  file_size:   fileSizeBytes,
  page_count:  25,
  language:    'fr',
  active:      true,
  featured:    false,
  download_count: 0,
}).select().single();

if (error) { console.error('✗ Supabase insert :', error.message); process.exit(1); }
console.log(`✓ Document créé en base (id: ${doc.id})`);
console.log(`\n✅ Renault Laguna Diesel Atmosphérique réimporté → /docs/${SLUG}`);
