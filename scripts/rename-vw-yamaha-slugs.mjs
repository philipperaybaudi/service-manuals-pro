import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'service-manuals-documents';

const RENAMES = [
  {
    oldSlug: 'volkswagen-document-technique-pages-blanches',
    newSlug: 'volkswagen-polo-95-1-3-1-6-schema-fiche-auto-volt-718',
    title:          'Volkswagen Polo 95 1.3 and 1.6 Single-Point Injection — Technical Data Sheet AUTO-VOLT N°718',
    title_fr:       'Volkswagen Polo 95 1.3 et 1.6 Injection Monopoint — Schéma-Fiche AUTO-VOLT N°718',
    description:    `Technical data sheet AUTO-VOLT N°718 (December 1995) dedicated to the Volkswagen Polo (presented at the 1994 motor show) with 1.3 and 1.6 single-point injection petrol engines. Covers the 1.3L (type ADX, 1,296 cc, 54 hp DIN at 5,200 rpm, torque 10.2 m.kg) and 1.6L (type AEA, 1,598 cc, 75 hp DIN at 5,200 rpm, torque 13 m.kg). 4-cylinder inline transverse, cast iron block, aluminium head, 5-bearing crankshaft. Lubrication: gear pump with pressure relief valve; dual oil pressure sensors: brown (0.3 bar idle) and grey (0.9 bar) or black (1.4 bar) at 2,000 rpm; oil pressure (hot 80°C): 0.3 bar idle / 2 bar at 2,000 rpm; 3.5 L SAE 5W50–20W50 API SF/SG. Cooling: belt-driven centrifugal pump; thermostat opens at 84°C, full open at 98°C, stroke 7 mm minimum; bi-speed fan: low speed on 92–97°C off 84–91°C, high speed on 99–105°C off 91–98°C. Fuel system: VAG single-point injection (shared architecture with SEAT Ibiza 1.6 of the period); injection unit on intake manifold integrating injector, throttle position potentiometer, idle regulator, fuel pressure regulator, air temperature sensor; canister purge solenoid valve. Includes component location diagrams, injection system exploded view, diagnostic connector identification, and full wiring diagrams.`,
    description_fr: `Schéma-Fiche AUTO-VOLT N°718 (décembre 1995) consacrée à la Volkswagen Polo (présentée au Salon 1994) à moteurs essence 1,3 et 1,6 injection monopoint. Couvre le 1,3 litre (type ADX, 1 296 cm³, 54 ch DIN à 5 200 tr/mn, couple 10,2 m.kg) et le 1,6 litre (type AEA, 1 598 cm³, 75 ch DIN à 5 200 tr/mn, couple 13 m.kg). Moteur 4 cylindres en ligne transversal, bloc fonte, culasse alliage aluminium, vilebrequin à 5 paliers. Lubrification : pompe à engrenage avec clapet limiteur ; deux manocontacts : brun (0,3 bar au ralenti) et gris (0,9 bar) ou noir (1,4 bar) à 2 000 tr/mn ; pression à chaud (80°C) : 0,3 bar au ralenti / 2 bars à 2 000 tr/mn ; 3,5 L SAE 5W50 à 20W50 API SF/SG. Refroidissement : pompe centrifuge entraînée par courroie de distribution ; thermostat début ouverture 84°C, ouverture complète 98°C, course 7 mm mini ; motoventilateur bi-vitesse : petite vitesse enclenchement 92 à 97°C arrêt 84 à 91°C, grande vitesse enclenchement 99 à 105°C arrêt 91 à 98°C. Alimentation : injection monopoint VAG (architecture commune avec SEAT Ibiza 1,6 de la même époque) ; corps d'injection sur collecteur d'admission intégrant injecteur, potentiomètre papillon, régulateur de ralenti, régulateur de pression, sonde de température d'air ; électrovanne de purge de canister. Schémas d'implantation des composants, éclaté du corps d'injection, identification de la prise de diagnostic et schémas électriques complets.`,
  },
  {
    oldSlug: 'yamaha-43pc-2009',
    newSlug: 'yamaha-grizzly-700-fi-yfm7fgpy-parts-catalogue-2008',
    title:          'Yamaha Grizzly 700 FI 4WD YFM7FGPY — Parts Catalogue 2008',
    title_fr:       'Yamaha Grizzly 700 FI 4WD YFM7FGPY — Catalogue de pièces 2008',
    description:    `Official Yamaha parts catalogue (1st edition, June 2008) for the Yamaha Grizzly 700 FI 4WD, model YFM7FGPY. Covers three market variants: 43PB (Canada), 43PC (Europe) and 43PD (Oceania). Lists all OEM part numbers, descriptions and quantities for the complete vehicle: engine, transmission, fuel system, electrical, frame, suspension, brakes, bodywork and accessories. Parts are referenced with colour codes (Yamaha Black 0033), applicable serial number ranges, and any modifications announced via Parts News after initial publication. The asterisk (*) prefix identifies modified items from the first edition. Quantity columns are broken down by destination market. An errata notice dated 10 July 2008 (PE0-MC-080045) corrects the front wheel 2 illustration (Fig. 33). This catalogue is an essential reference for ordering replacement parts and identifying assemblies for the Grizzly 700 FI 4WD produced for the 2008–2009 model year.`,
    description_fr: `Catalogue de pièces officiel Yamaha (1re édition, juin 2008) pour le Yamaha Grizzly 700 FI 4WD, modèle YFM7FGPY. Couvre trois variantes de marché : 43PB (Canada), 43PC (Europe) et 43PD (Océanie). Référence l'ensemble des numéros de pièces OEM, désignations et quantités pour la totalité du véhicule : moteur, transmission, alimentation, électrique, cadre, suspension, freinage, carrosserie et accessoires. Les pièces sont référencées avec codes couleur (Yamaha Black 0033), plages de numéros de série applicables, et modifications annoncées via Parts News après la publication initiale. Le préfixe astérisque (*) identifie les éléments modifiés depuis la première édition. Les colonnes de quantités sont ventilées par marché de destination. Un errata daté du 10 juillet 2008 (PE0-MC-080045) corrige l'illustration de la roue avant 2 (Fig. 33). Ce catalogue constitue la référence indispensable pour commander des pièces de rechange et identifier les ensembles du Grizzly 700 FI 4WD produit pour les millésimes 2008–2009.`,
  },
];

for (const r of RENAMES) {
  console.log(`\nTraitement : ${r.oldSlug} → ${r.newSlug}`);

  // 1. Copier le PDF dans R2
  const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: `documents/${r.oldSlug}.pdf` }));
  const bytes = await obj.Body.transformToByteArray();
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: `documents/${r.newSlug}.pdf`, Body: bytes, ContentType: 'application/pdf' }));
  console.log(`  ✓ PDF copié vers documents/${r.newSlug}.pdf`);

  // 2. Mettre à jour Supabase
  const { error } = await supabase.from('documents').update({
    slug:           r.newSlug,
    file_path:      `documents/${r.newSlug}.pdf`,
    title:          r.title,
    title_fr:       r.title_fr,
    description:    r.description,
    description_fr: r.description_fr,
  }).eq('slug', r.oldSlug);
  if (error) { console.error(`  ✗ Supabase :`, error.message); continue; }
  console.log(`  ✓ Supabase mis à jour`);

  // 3. Supprimer l'ancien PDF
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `documents/${r.oldSlug}.pdf` }));
  console.log(`  ✓ Ancien PDF supprimé`);
}

console.log('\n✅ Renommages terminés');
