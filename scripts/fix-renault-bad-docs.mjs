/**
 * fix-renault-bad-docs.mjs
 *
 * Corrige 4 documents Renault mal décrits (slugs absurdes, descriptions hallucinées).
 * Pour chaque document :
 *   1. Copie le PDF R2 sous le nouveau slug
 *   2. Copie la preview R2 sous le nouveau slug
 *   3. Met à jour Supabase (slug, title, title_fr, description, description_fr, file_path, preview_url)
 *   4. Supprime les anciens fichiers R2
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'service-manuals-documents';

async function downloadR2(key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
async function uploadR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}
async function deleteR2(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ─── Données corrigées ────────────────────────────────────────────────────────

const FIXES = [
  {
    oldSlug: 'renault-document-technique-pages-blanches',
    newSlug: 'renault-megane-diesel-schema-fiche-1996',
    title:      'Renault Mégane Diesel — Technical Data Sheet 1996',
    title_fr:   'Renault Mégane Diesel — Schéma-Fiche 1996',
    description: `Technical data sheet AUTO-VOLT N°726 (September 1996) covering the Renault Mégane with Diesel engines from launch. Covers the naturally aspirated F8Q Diesel engine (1,870 cc, 65 hp at 4,500 rpm, 12.3 m.kg torque at 2,250 rpm) and the turbocharged version (95 hp at 4,250 rpm, 18.3 m.kg torque at 2,000 rpm), paired with JB1 and JC5 gearboxes. Single overhead camshaft with 8 valves, toothed belt (Pirelli Isoran 153 Rh 254); valve clearances: inlet 0.20 mm, exhaust 0.40 mm. Bosch VE 4/8 F 2300 rotary injection pumps in multiple variants (air conditioning, coded stop solenoid). Diesel engine management system with ECU controlling injection timing, pre/post-glow phases and EGR recirculation. Cooling circuit: thermostat 89°C/101°C, expansion tank rated at 1.2 bar, Gate fan motor 340 W. Fuel system: 60-litre plastic tank, Purflux filter with 150 W electric heater. Includes mechanical specifications, component data, engine management wiring layout and ECU terminal assignment table.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°726 (septembre 1996) consacré aux Renault Mégane à moteurs Diesel depuis le lancement. Couvre les motorisations Diesel atmosphérique F8Q (1 870 cm³, 65 ch à 4 500 tr/min, couple 12,3 m.kg à 2 250 tr/min) et turbocompressée (95 ch à 4 250 tr/min, couple 18,3 m.kg à 2 000 tr/min), associées aux boîtes de vitesses JB1 et JC5. Distribution par simple arbre à cames en tête à 8 soupapes, courroie crantée Pirelli Isoran 153 Rh 254 ; jeux soupapes : admission 0,20 mm, échappement 0,40 mm. Pompes d'injection Bosch VE 4/8 F 2300 en plusieurs variantes (climatisation, électrovanne de stop codée). Système de gestion moteur Diesel avec calculateur gérant l'avance à l'injection, les phases de pré/postchauffage et la recirculation des gaz (EGR). Circuit de refroidissement : thermostat 89°C/101°C, vase d'expansion tarage 1,2 bar, motoventilateur Gate 340 W. Alimentation : réservoir plastique 60 litres, filtre Purflux avec réchauffeur électrique 150 W. Présente les caractéristiques mécaniques, les spécifications des composants, les schémas d'implantation du système de gestion moteur et le tableau d'affectation des bornes du calculateur.`,
  },
  {
    oldSlug: 'renault-document-technique-incomplet',
    newSlug: 'renault-safrane-2l-essence-schema-fiche-1999',
    title:      'Renault Safrane 2L Petrol — Technical Data Sheet 1999',
    title_fr:   'Renault Safrane 2L Essence — Schéma-Fiche 1999',
    description: `Technical data sheet AUTO-VOLT N°758 (July–August 1999) covering the Renault Safrane II 2.0L petrol engine (mod. 97 onwards). Engine F4P 760: 1,783 cc, 120 hp (88 kW) at 5,750 rpm, 16.5 daN.m torque at 3,500 rpm; twin overhead camshafts, 16 valves operated by hydraulic tappets, toothed belt with automatic tensioner (tension check 36–46 units on Seem C.Tronic 105.6, replacement every 120,000 km / 5 years). Lubrication: rotor oil pump, minimum pressure 0.8 bar at idle / 3.2 bar at 3,000 rpm, capacity 6.2 L with filter. Engine management system Siemens Fenix 5: sequential multipoint indirect injection, simultaneous ignition management, 55-terminal ECU. Key sensor data: fuel pump relay resistance 68.5 Ω; air pressure sensor 2.1 V/0.4 bar to 4.7 V/0.78 bar; throttle position sensor resistance 1,160 Ω (A–B); crankshaft position sensor 244 Ω, 58-tooth trigger wheel. Post-start air injection into exhaust (active for 2 min if coolant temperature 15–30°C). Heated Lambda sensor delivering 0.1–0.7 V. Includes ECU terminal table, component location diagrams, and maintenance intervals.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°758 (juillet–août 1999) consacré à la Renault Safrane II à moteur 2 litres essence (depuis mod. 97). Moteur F4P 760 : 1 783 cm³, 120 ch (88 kW) à 5 750 tr/min, couple 16,5 daN.m à 3 500 tr/min ; distribution par double arbre à cames en tête actionnant 16 soupapes via poussoirs hydrauliques, courroie crantée à tension automatique (contrôle 36 à 46 unités sur Seem C.Tronic 105.6, remplacement tous les 120 000 km ou 5 ans). Lubrification : pompe à rotors, pression mini 0,8 bar au ralenti / 3,2 bars à 3 000 tr/min, capacité 6,2 litres avec filtre. Système de gestion moteur Siemens Fenix 5 : injection multipoint indirecte séquentielle, gestion simultanée de l'allumage, calculateur 55 bornes. Données capteurs : relais pompe carburant 68,5 Ω ; capteur de pression 2,1 V/0,4 bar à 4,7 V/0,78 bar ; capteur position papillon 1 160 Ω (bornes A–B) ; capteur régime/position vilebrequin 244 Ω, cible 58 dents. Injection d'air à l'échappement en sortie démarrage (2 min si T° eau 15–30°C). Sonde Lambda chauffée délivrant 0,1 à 0,7 V. Comprend le tableau d'affectation des bornes du calculateur, les schémas d'implantation des composants et les périodicités d'entretien.`,
  },
  {
    oldSlug: 'renault-document-technique-eavt773a',
    newSlug: 'renault-laguna-phase2-essence-schema-fiche-2000',
    title:      'Renault Laguna Phase 2 Petrol 1.8 and 2.0 16V — Technical Data Sheet 2000',
    title_fr:   'Renault Laguna Phase 2 Essence 1.8 et 2.0 16V — Schéma-Fiche 2000',
    description: `Technical data sheet AUTO-VOLT N°773 (December 2000) covering the Renault Laguna Phase 2 (from April 1998) with 1.8 and 2.0 16-valve petrol engines. Engine F4P 760: 1,783 cc, 120 hp (88 kW) at 5,750 rpm, 16.5 daN.m torque at 3,500 rpm, JC5 gearbox. Engine F4R 780: 1,998 cc, 140 hp (102 kW) at 5,500 rpm, 18.8 daN.m torque at 3,750 rpm, variable inlet camshaft timing, JC5 gearbox. Also covers 1.6 16V K4M (110 hp, JB3 gearbox). Engine management: Siemens Sirius 32, sequential multipoint injection with simultaneous ignition control; 4 independent ignition coils controlled directly by the 90-terminal ECU. Cooling: centrifugal water pump driven by accessory belt, aluminium radiator, thermostat 89°C/101°C (7.5 mm stroke), dual-speed fan motor (low speed on at 99°C/off at 96°C; high speed on at 102°C/off at 98°C), coolant capacity 7 L (Glacéol RX, replacement every 120,000 km / 4 years). Air intake filter replacement every 40,000 km / 4 years. Key sensor data: air pressure sensor 4,000 Ω; throttle position sensor 1,212 Ω (terminals 75–74); crankshaft position sensor 200–270 Ω, 58-tooth trigger wheel; Lambda sensor 0–0.8 V (second downstream sensor on F4P 760). Includes full 90-terminal ECU assignment table, component location diagrams, and commercial variant identification table.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°773 (décembre 2000) consacré à la Renault Laguna Phase 2 (depuis avril 1998) à moteurs essence 1.8 et 2.0 16 soupapes. Moteur F4P 760 : 1 783 cm³, 120 ch (88 kW) à 5 750 tr/min, couple 16,5 daN.m à 3 500 tr/min, boîte JC5. Moteur F4R 780 : 1 998 cm³, 140 ch (102 kW) à 5 500 tr/min, couple 18,8 daN.m à 3 750 tr/min, distribution variable avec décaleur d'arbre à cames d'admission, boîte JC5. Couvre également le 1.6 16V K4M (110 ch, boîte JB3). Gestion moteur Siemens Sirius 32 : injection multipoint séquentielle avec gestion simultanée de l'allumage cartographique à distribution statique ; 4 bobines indépendantes pilotées directement par le calculateur 90 bornes. Refroidissement : pompe centrifuge entraînée par courroie accessoires, radiateur aluminium horizontal, thermostat 89°C/101°C (course 7,5 mm), motoventilateur bi-vitesse (petite vitesse enclenchement 99°C/arrêt 96°C ; grande vitesse 102°C/arrêt 98°C), capacité liquide 7 L (Glacéol RX, vidange tous les 120 000 km ou 4 ans). Remplacement filtre à air tous les 40 000 km ou 4 ans. Données capteurs : capteur pression 4 000 Ω ; capteur position papillon 1 212 Ω (bornes 75–74) ; capteur régime/position vilebrequin 200 à 270 Ω, cible 58 dents ; sonde Lambda 0 à 0,8 V (deuxième sonde aval sur F4P 760). Comprend le tableau complet d'affectation des 90 bornes du calculateur, les schémas d'implantation des composants et le tableau d'identification des variantes commerciales.`,
  },
  {
    oldSlug: 'renault-document-vide-ou-non-lisible',
    newSlug: 'renault-laguna-diesel-atmospherique-schema-fiche-1996',
    title:      'Renault Laguna Naturally Aspirated Diesel — Technical Data Sheet 1996',
    title_fr:   'Renault Laguna Diesel Atmosphérique — Schéma-Fiche 1996',
    description: `Technical data sheet AUTO-VOLT N°723 (May 1996) covering the Renault Laguna with the naturally aspirated 2.2D Diesel engine (from January 1993). Engine G8T 706 and G8T 752: 2,200 cc, 85 hp, 4-cylinder in-line transverse layout, aluminium cylinder head with pressed-in dry liners, single overhead camshaft driven by toothed belt. Valve timing diagram: inlet opens 5° ATDC, exhaust closes 5° ATDC, exhaust opens 22° BBDC, inlet closes 21° ABDC. Lubrification: gear pump in sump driven via intermediate shaft; pressure 1.6 bar at 1,000 rpm / 4 bar at 3,000 rpm; double-filtration Purflux cartridge filter. Cooling: two-speed fan (1st speed on at 88°C, 2nd speed at 92°C), 9-litre capacity Glacéol Al 50%. Fuel system: 66-litre tank, Purflux PA66C5430 fuel filter (every 15,000 km), Técafiltre LX 452 air filter. Bosch VE 4/9 F2400 rotary injection pump with KSB cold-start advance solenoid and ALFB load-dependent advance; injection pump timing: 0.8 ± 0.04 mm plunger lift at TDC cylinder 1; idle 775 ± 25 rpm, max no-load 5,400 ± 100 rpm. Injectors: Bosch KCA 17 S42, opening pressure 130 +8/−5 bar. Coolant temperature sensor CTN, resistance 3,060–4,045 Ω at 20°C. ABS Teves Mark IV (standard on V6/Baccara, optional on others): 8-channel hydraulic unit, 4 sensors, wheel sensor air gap 0.5–1.3 mm, sensor resistance 1.1 kΩ. Glow plug system: Beru plugs 0.3–0.4 Ω, 15 A at 5 s; post-glow up to 210 s.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°723 (mai 1996) consacré à la Renault Laguna à moteur Diesel atmosphérique 2,2 litres (depuis janvier 1993). Moteurs G8T 706 et G8T 752 : 2 200 cm³, 85 ch, 4 cylindres en ligne transversal, culasse alliage aluminium avec chemises sèches emmanchées à la presse, simple arbre à cames en tête entraîné par courroie crantée. Diagramme de distribution : ouverture admission 5° après PMH, fermeture échappement 5° après PMH, ouverture échappement 22° avant PMB, fermeture admission 21° après PMB. Lubrification : pompe à engrenage dans le carter d'huile entraînée via arbre intermédiaire ; pression 1,6 bar à 1 000 tr/min / 4 bars à 3 000 tr/min ; filtre à double filtration Purflux. Refroidissement : motoventilateur bi-vitesse (1re vitesse 88°C, 2e vitesse 92°C), capacité 9 litres Glacéol Al 50%. Alimentation : réservoir 66 litres, filtre Purflux PA66C5430 (remplacement 15 000 km), filtre air Técafiltre LX 452. Pompe d'injection rotative Bosch VE 4/9 F2400 avec surcaleur KSB et dépendance de charge ALFB ; calage pompe : levée piston 0,8 ± 0,04 mm ; ralenti 775 ± 25 tr/min, maxi à vide 5 400 ± 100 tr/min. Injecteurs Bosch KCA 17 S42, pression de tarage 130 +8/−5 bars. Sonde de température CTN, résistance 3 060 à 4 045 Ω à 20°C. ABS Teves Mark IV (série V6/Baccara, option sur autres versions) : centrale hydraulique 8 canaux, 4 capteurs, entrefer 0,5 à 1,3 mm, résistance capteur 1,1 kΩ. Préchauffage : bougies Beru 0,3 à 0,4 Ω, 15 A après 5 secondes ; postchauffage jusqu'à 210 secondes.`,
  },
];

// ─── Traitement ───────────────────────────────────────────────────────────────

for (const fix of FIXES) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Migration : ${fix.oldSlug}`);
  console.log(`       → : ${fix.newSlug}`);

  // 1. Récupérer le document Supabase
  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('id, slug, file_path, preview_url')
    .eq('slug', fix.oldSlug)
    .single();

  if (fetchErr || !doc) {
    console.error(`✗ Document non trouvé : ${fetchErr?.message || 'slug introuvable'}`);
    continue;
  }
  console.log(`✓ Document trouvé (id: ${doc.id})`);

  // 2. Vérifier que le nouveau slug n'existe pas déjà
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('slug', fix.newSlug)
    .single();
  if (existing) {
    console.error(`✗ Slug cible déjà existant — abandon`);
    continue;
  }

  // 3. Copier PDF R2
  const oldPdfKey = `documents/${fix.oldSlug}.pdf`;
  const newPdfKey = `documents/${fix.newSlug}.pdf`;
  console.log(`\nCopie PDF : ${oldPdfKey} → ${newPdfKey}`);
  let pdfCopied = false;
  try {
    const pdfBytes = await downloadR2(oldPdfKey);
    await uploadR2(newPdfKey, pdfBytes, 'application/pdf');
    console.log(`✓ PDF copié (${(pdfBytes.length / 1024).toFixed(0)} KB)`);
    pdfCopied = true;
  } catch (e) {
    console.error(`✗ Erreur copie PDF : ${e.message}`);
    continue;
  }

  // 4. Copier preview R2
  const oldPreviewKey = `logos/previews/${fix.oldSlug}.jpg`;
  const newPreviewKey = `logos/previews/${fix.newSlug}.jpg`;
  let newPreviewUrl = null;
  console.log(`Copie preview : ${oldPreviewKey} → ${newPreviewKey}`);
  try {
    const previewBytes = await downloadR2(oldPreviewKey);
    await uploadR2(newPreviewKey, previewBytes, 'image/jpeg');
    console.log(`✓ Preview copiée (${(previewBytes.length / 1024).toFixed(0)} KB)`);
    // Construire la nouvelle URL preview (même base que l'ancienne)
    if (doc.preview_url) {
      newPreviewUrl = doc.preview_url.replace(fix.oldSlug, fix.newSlug);
    }
  } catch (e) {
    console.warn(`⚠ Preview non trouvée : ${e.message}`);
  }

  // 5. Mettre à jour Supabase
  const updatePayload = {
    slug:           fix.newSlug,
    title:          fix.title,
    title_fr:       fix.title_fr,
    description:    fix.description,
    description_fr: fix.description_fr,
    file_path:      newPdfKey,
  };
  if (newPreviewUrl) updatePayload.preview_url = newPreviewUrl;

  const { error: updateErr } = await supabase
    .from('documents')
    .update(updatePayload)
    .eq('id', doc.id);

  if (updateErr) {
    console.error(`✗ Erreur mise à jour Supabase : ${updateErr.message}`);
    continue;
  }
  console.log(`✓ Supabase mis à jour`);

  // 6. Supprimer anciens fichiers R2
  try {
    await deleteR2(oldPdfKey);
    console.log(`✓ Ancien PDF supprimé : ${oldPdfKey}`);
  } catch (e) {
    console.warn(`⚠ Suppression ancien PDF : ${e.message}`);
  }
  try {
    await deleteR2(oldPreviewKey);
    console.log(`✓ Ancienne preview supprimée : ${oldPreviewKey}`);
  } catch (e) {
    console.warn(`⚠ Suppression ancienne preview : ${e.message}`);
  }

  console.log(`✅ Terminé → /docs/${fix.newSlug}`);
}

console.log(`\n${'═'.repeat(70)}`);
console.log(`Migration terminée pour ${FIXES.length} documents.`);
