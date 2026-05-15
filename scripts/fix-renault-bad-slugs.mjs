/**
 * fix-renault-bad-slugs.mjs
 *
 * Corrige 4 documents Renault avec mauvais slugs/titres/descriptions :
 *   1. renault-eavt756a       → Safrane 2,2L Turbo Diesel (AUTO-VOLT N°756, mai 1999)
 *   2. renault-eavt780a       → Laguna Diesel 1.9 Phase 2 (AUTO-VOLT N°780, juil.-août 2001)
 *   3. renault-eberspacher-airtronic-d2-schema-electronique → Clio Essence Energy (AUTO-VOLT N°724, juin 1996)
 *   4. renault-eberspacher-eavt759a-technical-documentation  → Clio II Essence 1.4/1.6 (AUTO-VOLT N°759, sept. 1999)
 *
 * Pour chaque doc : copie PDF R2 sous nouveau slug, copie preview, update Supabase, supprime anciens fichiers R2.
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
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'service-manuals-documents';

async function downloadR2(key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function uploadR2(key, body, ct) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: ct }));
}
async function deleteR2(key) {
  try { await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); } catch {}
}

const FIXES = [
  {
    oldSlug: 'renault-eavt756a',
    newSlug: 'renault-safrane-2-2l-turbo-diesel-schema-fiche-1999',
    title:      'Renault Safrane 2.2L Turbo Diesel — Technical Data Sheet 1999',
    title_fr:   'Renault Safrane 2,2L Turbo Diesel — Schéma-Fiche 1999',
    description: `Technical data sheet AUTO-VOLT N°756 (May 1999) covering the Renault Safrane II 2.2L Turbo Diesel (G8T 740, from mod. 97). Engine: 2,200 cc, 115 hp (82.8 kW) at 5,500 rpm, 234 N.m (24.2 m.kg) torque at 2,000 rpm, turbocharged by a Garrett T17 with air-to-air intercooler. Single overhead camshaft with hydraulic tappets, automatic toothed belt tensioner (replacement every 120,000 km / 5 years). Lubrication: chain-driven oil pump, pressure 1.6 bar at 1,000 rpm / 4 bar at 3,000 rpm, capacity 7.7 L SAE 10W40/15W40 (every 15,000 km). Cooling: dual electric fan motor (on at 92°C), thermostat 83°C/95°C, expansion tank rated at 1.2 bar, 9 L Glacéol RX type D capacity (every 120,000 km / 4 years). Fuel injection pump with KSB cold-start advance solenoid and ALFB load-dependent advance solenoid. Injectors: Bosch DNOSD 313, opening pressure 150 +8/−5 bar. Turbocharger boost pressure: 750 ± 50 mbar at 2,000 rpm / 865 ± 25 mbar at 4,300 rpm. Engine management: Sagem TPP-EGR unit controlling EGR recirculation, KSB and ALFB actuators, dual glow plug circuits (cylinders 1/3 and 2/4). Crankshaft position sensor: 220–250 Ω. ABS: Bosch 2.E or 5.3 (electronic brake-force limiter). Includes ECU wiring details, component location diagrams, and commercial variant identification table.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°756 (mai 1999) consacré à la Renault Safrane II 2,2L Turbo Diesel (G8T 740, depuis mod. 97). Moteur : 2 200 cm³, 115 ch (82,8 kW) à 5 500 tr/min, couple 234 N.m (24,2 m.kg) à 2 000 tr/min, turbocompresseur Garrett T17 avec échangeur air/air. Distribution par simple arbre à cames en tête via poussoirs hydrauliques, courroie crantée à tension automatique (remplacement 120 000 km ou 5 ans). Lubrification : pompe à huile entraînée par chaîne, pression 1,6 bar à 1 000 tr/min / 4 bars à 3 000 tr/min, capacité 7,7 L SAE 10W40/15W40 (tous les 15 000 km). Refroidissement : double motoventilateurs électriques (enclenchement 92°C/arrêt 82°C), thermostat 83°C/95°C, vase d'expansion tarage 1,2 bar, capacité 9 L Glacéol RX type D (remplacement 120 000 km ou 4 ans). Pompe d'injection avec surcaleur KSB et dépendance de charge ALFB. Injecteurs Bosch DNOSD 313, pression de tarage 150 +8/−5 bars. Pressions de suralimentation : 750 ± 50 mbar à 2 000 tr/min / 865 ± 25 mbar à 4 300 tr/min. Gestion moteur Sagem TPP-EGR : pilote EGR, solénoïdes KSB et ALFB, bougies préchauffage Béru 5 mm en deux groupes (cylindres 1/3 et 2/4). Capteur de régime vilebrequin : 220 à 250 Ω. ABS Bosch 2.E ou 5.3 (limiteur de freinage électronique). Comprend les détails de câblage du calculateur, les schémas d'implantation des composants et le tableau d'identification des variantes commerciales.`,
  },
  {
    oldSlug: 'renault-eavt780a',
    newSlug: 'renault-laguna-diesel-1-9-phase2-schema-fiche-2001',
    title:      'Renault Laguna Diesel 1.9 Phase 2 — Technical Data Sheet 2001',
    title_fr:   'Renault Laguna Diesel 1.9 Phase 2 — Schéma-Fiche 2001',
    description: `Technical data sheet AUTO-VOLT N°780 (July–August 2001) covering the Renault Laguna Phase 2 (from April 1998) with 1.9-litre Diesel engines. Covers four engine variants on the F9Q base (1,870 cc): F9Q 716 (72 kW/100 hp), F9Q 710 (same output), F9Q 717 with automatic gearbox DPO, and F9Q 718 common-rail (79 kW/110 hp, 250 N.m at 1,750 rpm). Turbo-diesel direct injection, single overhead camshaft, toothed belt drive. Cooling management: F9Q 716 uses a thermoswitch; F9Q 710/717/718 use the GCTE centralised water temperature management with a dual CTN sensor (resistance from 5,290–6,490 Ω at 0°C to 300–450 Ω at 80°C) — this eliminates the conventional thermoswitch. Fan motor: low speed on at 99°C/off at 96°C; high speed on at 102°C/off at 99°C; alert above 105°C. Fan relay command circuit: 62 Ω. Gearboxes: JC5 (dTi), PK1 (dCi), automatic DPO (2.0L and dTi). Commercial variant identification table covering all Berline and Nevada versions from April 1998 to April 2000+. Includes sensor data, component location diagrams, and full ECU wiring information.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°780 (juillet–août 2001) consacré à la Renault Laguna Phase 2 (depuis avril 1998) à moteurs Diesel 1,9 litre. Couvre quatre variantes sur base F9Q (1 870 cm³) : F9Q 716 (72 kW/100 ch), F9Q 710 (même puissance), F9Q 717 avec boîte automatique DPO, et F9Q 718 injection common rail (79 kW/110 ch, couple 250 N.m à 1 750 tr/min). Moteurs turbo Diesel à injection directe, simple arbre à cames en tête, entraînement par courroie crantée. Gestion de refroidissement : le F9Q 716 utilise un thermocontact classique ; les F9Q 710/717/718 adoptent le système GCTE (Gestion Centralisée de la Température d'Eau) avec sonde CTN double (résistance de 5 290–6 490 Ω à 0°C à 300–450 Ω à 80°C), rendant le thermocontact inutile. Motoventilateur : petite vitesse enclenchement 99°C/arrêt 96°C ; grande vitesse enclenchement 102°C/arrêt 99°C ; voyant d'alerte au-dessus de 105°C. Résistance de commande du relais de motoventilateur : 62 Ω. Boîtes de vitesses : JC5 (dTi), PK1 (dCi), automatique DPO (2,0L et dTi). Tableau d'identification des variantes commerciales Berline et Nevada d'avril 1998 à 2000 et au-delà. Comprend les données capteurs, les schémas d'implantation et les informations de câblage du calculateur.`,
  },
  {
    oldSlug: 'renault-eberspacher-airtronic-d2-schema-electronique',
    newSlug: 'renault-clio-essence-energy-schema-fiche-1996',
    title:      'Renault Clio Petrol Energy — Technical Data Sheet 1996',
    title_fr:   'Renault Clio Essence Energy — Schéma-Fiche 1996',
    description: `Technical data sheet AUTO-VOLT N°724 (June 1996) covering the Renault Clio with Energy petrol engines from the third-generation launch (March 1996). Engines covered: 1.2 D7F (60 hp) and 1.4 (80 hp, single-point injection). Four-stroke, 4-cylinder in-line, transverse front engine; cast-iron block with wet liners, aluminium cylinder head. Lubrication: gear pump driven by chain from crankshaft, minimum pressure 1 bar at idle / 3 bar at 4,000 rpm; Purflux LS602 filter, capacity approx. 4 L SAE 5W30 to 15W50 (CCMC-G4/G5, every 10,000 km). Cooling: sealed pressurised circuit; thermostat opens at 86°C / full open at 96°C; fan thermoswitch on at ~92°C / off at 82°C; expansion tank rated at 1.2 bar; coolant capacity 5.2 L Glacéol 35% (protection to −23°C). Third-generation features: new front design (bonnet, headlights, air intake), composite front wings, 50-litre airbag, optional Easy clutch actuator, improved braking, new 1.2D engine. Nine trim levels (RL, Chipie, Be Bop, RN, Alizé, RT, Baccara, S, RSi) plus electric version. Includes fuel system schematic for 1.4 single-point injection, component diagrams, and identification plates.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°724 (juin 1996) consacré à la Renault Clio à moteurs essence Energy depuis le lancement de la troisième génération (mars 1996). Motorisations couvertes : 1,2 D7F (60 ch) et 1,4 (80 ch, injection monopoint). Moteurs 4 temps, 4 cylindres en ligne transversaux à l'avant ; bloc en fonte avec chemises humides, culasse en alliage d'aluminium. Lubrification : pompe à engrenage entraînée par chaîne depuis le vilebrequin, pression mini 1 bar au ralenti / 3 bars à 4 000 tr/min ; filtre Purflux LS602, capacité environ 4 litres SAE 5W30 à 15W50 (CCMC-G4/G5, tous les 10 000 km). Refroidissement : circuit hermétique sous pression ; thermostat 86°C/96°C ; thermocontact motoventilateur enclenchement ≈ 92°C/arrêt 82°C ; vase d'expansion tarage 1,2 bar ; capacité 5,2 litres Glacéol 35% (protection jusqu'à − 23°C). Évolutions 3ème génération : nouveau design avant (capot, phares, prise d'air), ailes avant en composite, airbag 50 litres, commande d'embrayage Easy en option, freinage amélioré, nouveau moteur 1,2D. Neuf niveaux d'équipement (RL, Chipie, Be Bop, RN, Alizé, RT, Baccara, S, RSi) plus version électrique. Comprend le schéma de principe de l'injection monopoint 1,4, les schémas d'implantation des composants et les plaques d'identification.`,
  },
  {
    oldSlug: 'renault-eberspacher-eavt759a-technical-documentation',
    newSlug: 'renault-clio-ii-essence-1-4-1-6-schema-fiche-1999',
    title:      'Renault Clio II Petrol 1.4 and 1.6 8-Valve — Technical Data Sheet 1999',
    title_fr:   'Renault Clio II Essence 1.4 et 1.6 8 Soupapes — Schéma-Fiche 1999',
    description: `Technical data sheet AUTO-VOLT N°759 (September 1999) covering the Renault Clio II (from March 1998) with 1.4 and 1.6 8-valve petrol engines. Engines: E7J 1.4 (1,390 cc, 75 hp/55 kW at 5,500 rpm) and K7M 1.6 8V (1,598 cc, 90 hp/66 kW at 5,250 rpm). 4-cylinder in-line, transverse front engine; cast-iron block (E7J) or cast-iron cylinder block (K7M), aluminium cylinder head with bi-hemispherical combustion chamber. Single overhead camshaft with rockers, toothed belt (tension 30 units on Seem C.Tronic 105.6, replacement every 120,000 km / 5 years). Valve clearances (E7J): inlet 0.10 mm, exhaust 0.25 mm; (K7M): inlet 0.10–0.15 mm, exhaust 0.25–0.30 mm. Lubrication: chain-driven gear pump; pressure min. 1 bar at idle; 3 bar at 3,000 rpm (K7M) / 4 bar at 4,000 rpm (E7J). Cooling: thermostat 89°C/101°C; single-speed fan controlled by injection ECU (on at 99°C/off at 96°C, 6 blades); capacity 5.7 L (E7J) / 5.5 L (K7M) Glacéol RX type D (−25°C, replacement every 120,000 km / 4 years). Fuel system: 50-litre tank, Walbro submerged pump (min. 80 L/h at 3 bar), replaceable filter (60,000 km), fuel pressure regulator 3 ± 0.2 bar / 2.5 ± 0.2 bar at 500 mbar vacuum. Injectors: Siemens, 14.5 ± 1 Ω, 12 V. ABS Bosch 5.3 (standard from February 1999, 4 sensors + EBV electronic brake distributor). Optional DPO automatic gearbox (1.6 8V). Transponder immobiliser standard.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°759 (septembre 1999) consacré à la Renault Clio II (depuis mars 1998) à moteurs essence 1,4 et 1,6 8 soupapes. Moteurs : E7J 1,4 (1 390 cm³, 75 ch/55 kW à 5 500 tr/min) et K7M 1,6 8V (1 598 cm³, 90 ch/66 kW à 5 250 tr/min). Moteurs 4 temps, 4 cylindres en ligne transversaux ; carter-cylindres en fonte (E7J) ou bloc-cylindres en fonte (K7M), culasse en alliage d'aluminium à chambre de combustion bi-hémisphérique. Distribution par simple arbre à cames en tête et culbuteurs, courroie crantée (tension 30 unités Seem C.Tronic 105.6, remplacement 120 000 km ou 5 ans). Jeux soupapes (E7J) : admission 0,10 mm, échappement 0,25 mm ; (K7M) : admission 0,10 à 0,15 mm, échappement 0,25 à 0,30 mm. Lubrification : pompe à engrenage entraînée par chaîne ; pression mini 1 bar au ralenti, 3 bars à 3 000 tr/min (K7M) / 4 bars à 4 000 tr/min (E7J). Refroidissement : thermostat 89°C/101°C ; motoventilateur piloté par le calculateur (enclenchement 99°C/arrêt 96°C, 6 pales) ; capacité 5,7 L (E7J) / 5,5 L (K7M) Glacéol RX type D (−25°C, remplacement 120 000 km ou 4 ans). Alimentation : réservoir 50 litres, pompe Walbro immergée (débit mini 80 L/h sous 3 bars), filtre (60 000 km), régulateur de pression 3 ± 0,2 bars / 2,5 ± 0,2 bars sous dépression 500 mbar. Injecteurs Siemens : résistance 14,5 ± 1 Ω, 12 V. ABS Bosch 5.3 (de série depuis fév. 1999, 4 capteurs + répartiteur EBV). Boîte automatique DPO en option (1,6 8V). Antidémarrage transpondeur de série.`,
  },
];

// ── Traitement ────────────────────────────────────────────────────────────────
for (const fix of FIXES) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${fix.oldSlug} → ${fix.newSlug}`);

  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('id, slug, file_path, preview_url')
    .eq('slug', fix.oldSlug)
    .single();

  if (fetchErr || !doc) { console.error(`✗ Non trouvé`); continue; }

  const { data: existing } = await supabase.from('documents').select('id').eq('slug', fix.newSlug).single();
  if (existing) { console.error(`✗ Nouveau slug déjà existant`); continue; }

  // Copier PDF
  const oldPdfKey = `documents/${fix.oldSlug}.pdf`;
  const newPdfKey = `documents/${fix.newSlug}.pdf`;
  const pdfBytes = await downloadR2(oldPdfKey);
  await uploadR2(newPdfKey, pdfBytes, 'application/pdf');
  console.log(`✓ PDF copié (${(pdfBytes.length / 1024).toFixed(0)} KB)`);

  // Copier preview
  let newPreviewUrl = null;
  const oldPreviewKey = `logos/previews/${fix.oldSlug}.jpg`;
  const newPreviewKey = `logos/previews/${fix.newSlug}.jpg`;
  try {
    const previewBytes = await downloadR2(oldPreviewKey);
    await uploadR2(newPreviewKey, previewBytes, 'image/jpeg');
    console.log(`✓ Preview copiée`);
    if (doc.preview_url) newPreviewUrl = doc.preview_url.replace(fix.oldSlug, fix.newSlug);
  } catch (e) { console.warn(`⚠ Preview : ${e.message}`); }

  // Update Supabase
  const payload = {
    slug: fix.newSlug,
    title: fix.title,
    title_fr: fix.title_fr,
    description: fix.description,
    description_fr: fix.description_fr,
    file_path: newPdfKey,
  };
  if (newPreviewUrl) payload.preview_url = newPreviewUrl;

  const { error: updErr } = await supabase.from('documents').update(payload).eq('id', doc.id);
  if (updErr) { console.error(`✗ Supabase : ${updErr.message}`); continue; }
  console.log(`✓ Supabase mis à jour`);

  await deleteR2(oldPdfKey);
  await deleteR2(oldPreviewKey);
  console.log(`✓ Anciens fichiers R2 supprimés`);
  console.log(`→ /docs/${fix.newSlug}`);
}
