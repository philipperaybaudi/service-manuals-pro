import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const DUP = 'volkswagen-polo-95-1-3-1-6-schema-fiche-auto-volt-718';
const KEEP = 'volkswagen-volkswagen-polo-1995-1-3-1-6-monopoint-injection-technical-manual';

// 1. Supprimer le doublon
const { error: dbErr } = await supabase.from('documents').delete().eq('slug', DUP);
if (dbErr) { console.error('✗ DB :', dbErr.message); process.exit(1); }
console.log(`✓ Supprimé en base : ${DUP}`);

await r2.send(new DeleteObjectCommand({ Bucket: 'service-manuals-documents', Key: `documents/${DUP}.pdf` }));
console.log(`✓ Supprimé R2 : documents/${DUP}.pdf`);

await supabase.storage.from('logos').remove([`previews/${DUP}.jpg`]);
console.log(`✓ Preview supprimée`);

// 2. Mettre à jour le titre/description de l'original
const { error: upErr } = await supabase.from('documents').update({
  title:          'Volkswagen Polo 95 1.3 and 1.6 Single-Point Injection — Technical Data Sheet AUTO-VOLT N°718',
  title_fr:       'Volkswagen Polo 95 1.3 et 1.6 Injection Monopoint — Schéma-Fiche AUTO-VOLT N°718',
  description:    `Technical data sheet AUTO-VOLT N°718 (December 1995) dedicated to the Volkswagen Polo (presented at the 1994 motor show) with 1.3 and 1.6 single-point injection petrol engines. Covers the 1.3L (type ADX, 1,296 cc, 54 hp DIN at 5,200 rpm, torque 10.2 m.kg) and 1.6L (type AEA, 1,598 cc, 75 hp DIN at 5,200 rpm, torque 13 m.kg). 4-cylinder inline transverse, cast iron block, aluminium head, 5-bearing crankshaft. Lubrication: gear pump with pressure relief valve; dual oil pressure sensors: brown (0.3 bar idle) and grey (0.9 bar) or black (1.4 bar) at 2,000 rpm; oil pressure (hot 80°C): 0.3 bar idle / 2 bar at 2,000 rpm; 3.5 L SAE 5W50–20W50 API SF/SG. Cooling: belt-driven centrifugal pump; thermostat opens at 84°C, full open at 98°C, stroke 7 mm minimum; bi-speed fan: low speed on 92–97°C off 84–91°C, high speed on 99–105°C off 91–98°C. Fuel system: VAG single-point injection (shared architecture with SEAT Ibiza 1.6); injection unit on intake manifold integrating injector, throttle position potentiometer, idle regulator, fuel pressure regulator, air temperature sensor; canister purge solenoid valve. Includes component location diagrams, injection system exploded view, diagnostic connector identification, and full wiring diagrams.`,
  description_fr: `Schéma-Fiche AUTO-VOLT N°718 (décembre 1995) consacrée à la Volkswagen Polo (présentée au Salon 1994) à moteurs essence 1,3 et 1,6 injection monopoint. Couvre le 1,3 litre (type ADX, 1 296 cm³, 54 ch DIN à 5 200 tr/mn, couple 10,2 m.kg) et le 1,6 litre (type AEA, 1 598 cm³, 75 ch DIN à 5 200 tr/mn, couple 13 m.kg). Moteur 4 cylindres en ligne transversal, bloc fonte, culasse alliage aluminium, vilebrequin à 5 paliers. Lubrification : pompe à engrenage avec clapet limiteur ; deux manocontacts : brun (0,3 bar au ralenti) et gris (0,9 bar) ou noir (1,4 bar) à 2 000 tr/mn ; pression à chaud (80°C) : 0,3 bar au ralenti / 2 bars à 2 000 tr/mn ; 3,5 L SAE 5W50 à 20W50 API SF/SG. Refroidissement : pompe centrifuge entraînée par courroie de distribution ; thermostat début ouverture 84°C, ouverture complète 98°C, course 7 mm mini ; motoventilateur bi-vitesse : petite vitesse enclenchement 92 à 97°C arrêt 84 à 91°C, grande vitesse enclenchement 99 à 105°C arrêt 91 à 98°C. Alimentation : injection monopoint VAG ; corps d'injection sur collecteur d'admission intégrant injecteur, potentiomètre papillon, régulateur de ralenti, régulateur de pression, sonde de température d'air ; électrovanne de purge de canister. Schémas d'implantation des composants, éclaté du corps d'injection, identification de la prise de diagnostic et schémas électriques complets.`,
}).eq('slug', KEEP);
if (upErr) { console.error('✗ Update :', upErr.message); process.exit(1); }
console.log(`✓ Titre/description mis à jour : ${KEEP}`);
