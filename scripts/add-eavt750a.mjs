import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT750A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\VOLKSWAGEN\\EAVT750A.pdf",
  "file_size": 10019540,
  "page_count": 29,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "VOLKSWAGEN",
  "category_fr": "Automobile",
  "filename_clean": "Volkswagen Polo 1.9 SDi Diesel injection directe depuis 1995 Schéma-Fiche 1998",
  "title_en": "Volkswagen Polo 1.9 SDi Direct Injection Diesel from 1995 — Electrical and Mechanical Schema 1998",
  "title_fr": "Volkswagen Polo 1.9 SDi Diesel à injection directe depuis 1995 — Schéma-Fiche électrique et mécanique 1998",
  "description_en": "Auto-Volt schema card N°750 (November 1998) covering the Volkswagen Polo (3, 4, 5-door and estate) with direct injection diesel engines AGD and AEY (4 cylinders in line, 1896 cm³, 79.5×95.5 mm, 47 kW/64 hp at 4200 rpm, 12.4 daN.m torque from 2200 to 2800 rpm), with electronic management Bosch MSA 15.5 (AGD) or MSA 12 (AEY), fuel injection pump Bosch VE 4/10 E 2250 R 640, Bosch DSLA 150 P 442 injectors (190–200 bar), no throttle cable. Includes full mechanical documentation (lubrication, cooling with two-speed thermocontact at 92–97°C and 99–105°C, toothed belt distribution, 45-litre diesel tank), complete engine management documentation (Bosch ECU 68 or 80 terminals, inlet throttle solenoid valve, EGR solenoid valve, fuel quantity regulator, injection timing solenoid valve, coolant heating relay, accelerator pedal position sensor, injection start sensor on cylinder 3, crankshaft and coolant/fuel/air temperature sensors), wiring diagrams for AGD and AEY management with 68 and 80-pin ECU, complete ABS documentation (ITT Teves Mark 04 then Mark 20 GI, 4 channels, 8 solenoid valves, EBV brake pressure distribution function), complete electrical documentation (Bosch DBL 12V 1.8kW starter, 70A or 90A Bosch alternator, 12V 61Ah battery, H4 headlights, pencil-type glow plugs at 0.8 Ω, transponder immobiliser), wiring diagrams for engine management, ABS, central locking, lighting, signalling, wipers, air conditioning, electric windows, fuse and relay tables for two fuse boxes (cabin and engine compartment), electrical consumption measurements, and a Volkswagen Polo 1.9 SDi repair time schedule.",
  "description_fr": "Schéma-Fiche Auto-Volt N°750 (novembre 1998) consacré à la Volkswagen Polo (3, 4, 5 portes et break) à moteurs diesel à injection directe AGD et AEY (4 cylindres en ligne, 1896 cm³, 79,5×95,5 mm, 47 kW/64 ch à 4200 tr/min, couple 12,4 daN.m de 2200 à 2800 tr/min), à gestion électronique Bosch MSA 15.5 (AGD) ou MSA 12 (AEY), pompe d'injection Bosch VE 4/10 E 2250 R 640, injecteurs Bosch DSLA 150 P 442 (190–200 bars), sans câble d'accélérateur. Comprend la documentation mécanique complète (lubrification, refroidissement avec thermocontact à deux vitesses à 92–97°C et 99–105°C, distribution par courroie crantée, réservoir diesel 45 litres), la documentation complète de la gestion moteur (calculateur Bosch 68 ou 80 voies, électrovanne de papillon d'admission, électrovanne EGR, régulateur de débit, électrovanne de début d'injection, relais de réchauffage du liquide de refroidissement, capteur de position de pédale d'accélérateur, capteur de début d'injection sur cylindre 3, capteurs de régime vilebrequin et de température liquide/carburant/air), les schémas électriques de gestion moteur AGD et AEY avec calculateur 68 et 80 voies, la documentation complète ABS (ITT Teves Mark 04 puis Mark 20 GI, 4 canaux, 8 électrovannes, fonction EBV répartition de pression de freinage), la documentation électrique complète (démarreur Bosch DBL 12V 1,8kW, alternateur Bosch 70A ou 90A, batterie 12V 61Ah, projecteurs H4, bougies de préchauffage crayon à 0,8 Ω, antidémarrage à transpondeur), les schémas électriques de gestion moteur, ABS, verrouillage centralisé, éclairage, signalisation, essuie-glaces, climatisation, lève-vitres électriques, les tableaux de fusibles et relais des deux boîtiers (habitacle et compartiment moteur), les mesures de consommation sur fusibles, et le barème de temps de réparation Volkswagen Polo 1,9 SDi.",
  "language": "fr",
  "slug": "volkswagen-polo-1-9-sdi-diesel-schema-fiche-1998"
};

const existing = report.docs.find(d => d.slug === entry.slug || d.original_filename === entry.original_filename);
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT750A ajouté au rapport — total : ${report.total} entrées`);
