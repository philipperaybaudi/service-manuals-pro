import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "TOYOTA LAND CRUISER PRADO Schema.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\TOYOTA\\TOYOTA LAND CRUISER PRADO Schema.pdf",
  "file_size": 1121927,
  "page_count": 45,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "TOYOTA",
  "category_fr": "Automobile",
  "filename_clean": "Toyota Land Cruiser Prado Schémas électriques 1KD-FTV 3RZ-FE Supplement 2000",
  "title_en": "Toyota Land Cruiser / Land Cruiser Prado — Electrical Wiring Diagram Supplement 1KD-FTV and 3RZ-FE 2000",
  "title_fr": "Toyota Land Cruiser / Land Cruiser Prado — Supplément schémas électriques 1KD-FTV et 3RZ-FE 2000",
  "description_en": "Toyota Service Bulletin BE-0025 (July 2000) providing supplemental electrical wiring diagrams for the Toyota Land Cruiser and Land Cruiser Prado (models RZJ95, KDJ90, KDJ95), covering two additions to the existing documentation: the 1KD-FTV 4-cylinder common-rail diesel engine (D-4D) and the engine immobiliser system for the 3RZ-FE petrol engine. Applicable to LHD and RHD configurations, this 45-page supplement updates publications EWD269F, EWD340F and EWD376F (Land Cruiser / Land Cruiser Prado Electrical Wiring Diagram). Production effective from August 2000. Includes complete wiring diagrams for: Engine Control (3RZ-FE with transponder key immobiliser), Engine Control (1KD-FTV with Electronic Driver Unit EDU, 4 common-rail injectors, suction control valves, turbo pressure sensor, fuel pressure sensor, fuel temperature sensor, water temperature sensor, intake air temperature sensor, air flow meter, camshaft position sensor, crankshaft position sensor, accelerator position sensor, VSV EGR cut and pressure charge valves), Glow Plug system (1KD-FTV with 80A glow relay and Sub GLW relay), Fuel Heater (1KD-FTV), Engine Immobiliser System (1KD-FTV with transponder key coil, transponder key amplifier and transponder key computer), Starting (1KD-FTV with ST relay and neutral start switch), Charging (1KD-FTV with 100A ALT fuse and 7.5A ALT-S fuse), Cruise Control (1KD-FTV), ECT and Automatic Transmission Indicator (1KD-FTV), Combination Meter (1KD-FTV), Illumination (1KD-FTV), VSC Vehicle Stability Control (1KD-FTV with ABS and TRC ECU), Center Differential Lock (1KD-FTV with VSC), Viscous Heater (1KD-FTV), SRS airbag (1KD-FTV), Automatic Air Conditioner (1KD-FTV), and Condenser Fan for automatic air conditioner (1KD-FTV).",
  "description_fr": "Bulletin technique Toyota BE-0025 (juillet 2000) fournissant des schémas électriques complémentaires pour les Toyota Land Cruiser et Land Cruiser Prado (modèles RZJ95, KDJ90, KDJ95), couvrant deux ajouts à la documentation existante : le moteur diesel 4 cylindres common-rail 1KD-FTV (D-4D) et le système antidémarrage à transpondeur pour le moteur essence 3RZ-FE. Applicable aux configurations conduite à gauche (LHD) et conduite à droite (RHD), ce supplément de 45 pages met à jour les publications EWD269F, EWD340F et EWD376F (Land Cruiser / Land Cruiser Prado Electrical Wiring Diagram). Application en production à partir d'août 2000. Comprend les schémas électriques complets des systèmes suivants : gestion moteur 3RZ-FE avec antidémarrage à clé transpondeur, gestion moteur 1KD-FTV (unité de pilotage électronique EDU, 4 injecteurs common-rail, électrovannes de régulation de débit, capteur de pression turbo, capteur de pression carburant, capteur de température carburant, sonde de température eau, capteur de température d'air d'admission, débitmètre d'air, capteur de position d'arbre à cames, capteur de position de vilebrequin, capteur de position d'accélérateur, électrovannes VSV coupure EGR et régulation pression de suralimentation), bougies de préchauffage 1KD-FTV (relais glow 80A et relais Sub GLW), réchauffeur de carburant 1KD-FTV, système antidémarrage 1KD-FTV (bobine de clé transpondeur, amplificateur de clé transpondeur et calculateur de clé transpondeur), démarrage 1KD-FTV (relais ST et contacteur de démarrage en position neutre), charge 1KD-FTV (fusible ALT 100A et fusible ALT-S 7,5A), régulateur de vitesse 1KD-FTV, indicateur de boîte automatique ECT 1KD-FTV, combiné instruments 1KD-FTV, éclairage 1KD-FTV, contrôle de stabilité VSC 1KD-FTV (avec calculateur ABS et TRC), blocage de différentiel central 1KD-FTV avec VSC, réchauffeur visqueux 1KD-FTV, airbag SRS 1KD-FTV, climatisation automatique 1KD-FTV et motoventilateur de condenseur pour climatisation automatique 1KD-FTV.",
  "language": "en",
  "slug": "toyota-land-cruiser-prado-electrical-wiring-diagram-supplement-2000"
};

const existing = report.docs.find(d => d.slug === entry.slug || (d.original_filename === entry.original_filename && d.brand === entry.brand));
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ TOYOTA LAND CRUISER PRADO Schema ajouté au rapport — total : ${report.total} entrées`);
