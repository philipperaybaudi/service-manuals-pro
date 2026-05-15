import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT775A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\TOYOTA\\EAVT775A.pdf",
  "file_size": 10835023,
  "page_count": 25,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "TOYOTA",
  "category_fr": "Automobile",
  "filename_clean": "Toyota Yaris 1.0 depuis avril 1999 Schéma-Fiche 2001",
  "title_en": "Toyota Yaris 1.0 from April 1999 — Electrical and Mechanical Schema 2001",
  "title_fr": "Toyota Yaris 1.0 depuis avril 1999 — Schéma-Fiche électrique et mécanique 2001",
  "description_en": "Auto-Volt schema card N°775 (February 2001) covering the Toyota Yaris (3 and 5-door, trim levels: base, Linea Terra, Linea Luna, Linea Sol) with the 1SZ-FE petrol engine (4 cylinders in line, 998 cm³, 69×66.7 mm, 50 kW/68 hp at 6000 rpm), marketed in France from April 1999 and elected Car of the Year 2000. Includes full mechanical documentation (engine characteristics, VVT-i electro-hydraulic variable valve timing acting on a 60° range of the intake camshaft, cooling system with electric fan, thermostat at 78–82°C), complete Toyota engine management documentation (64-pin ECU under the glove box, sequential multipoint injection, mass airflow sensor with integrated temperature sensor, throttle position sensor, camshaft and crankshaft position sensors, knock sensor, canister solenoid valve, dual lambda sensors, static direct ignition with 4 pencil coils), full ECU pin assignment for connectors A/B/D with 64 terminals, complete electrical documentation (70A or 80A alternator, 700W or 1000W starter, H4 headlights, lighting, signalling, instrument cluster, ABS optional with 4-channel Bosch electrohydraulic unit, central locking with optional remote control, electric windows, front and rear wipers, heated rear window, electric mirrors, air conditioning optional), complete wiring diagrams for engine management, ABS, central locking, electric windows, lighting, signalling, wipers, fuse and relay tables for three fuse boxes (cabin, engine compartment near battery, engine compartment near ABS unit).",
  "description_fr": "Schéma-Fiche Auto-Volt N°775 (février 2001) consacré à la Toyota Yaris (3 et 5 portes, finitions base, Linea Terra, Linea Luna, Linea Sol) à moteur essence 1SZ-FE (4 cylindres en ligne, 998 cm³, 69×66,7 mm, 50 kW/68 ch à 6000 tr/min), commercialisée en France depuis avril 1999 et élue Voiture de l'Année 2000. Comprend la documentation mécanique complète (caractéristiques moteur, distribution variable VVT-i électro-hydraulique sur une plage de 60° de l'arbre à cames d'admission, refroidissement par liquide avec motoventilateur électrique, thermostat à 78–82°C), la documentation complète de la gestion moteur Toyota (calculateur 64 bornes sous la boîte à gants, injection multipoint séquentielle phasée, débitmètre d'air à fil chaud avec capteur de température d'air intégré, capteur de position papillon, capteurs de position d'arbre à cames et de vilebrequin, détecteur de cliquetis, électrovanne de canister, deux sondes lambda, allumage statique direct avec quatre bobines crayon), l'affectation complète des bornes des connecteurs A/B/D du calculateur (64 bornes), la documentation électrique complète (alternateur 70A ou 80A, démarreur 700W ou 1000W, projecteurs H4, éclairage, signalisation, instrumentation, ABS en option avec bloc électrohydraulique 4 canaux, verrouillage centralisé avec télécommande en option, lève-vitres électriques, essuie-glace avant et arrière, lunette arrière dégivrante, rétroviseurs électriques, climatisation en option), les schémas électriques complets de la gestion moteur, de l'ABS, du verrouillage centralisé, des lève-vitres, de l'éclairage, de la signalisation, des essuie-glaces, les tableaux de fusibles et relais des trois boîtiers (habitacle, compartiment moteur près de la batterie, compartiment moteur près du bloc ABS).",
  "language": "fr",
  "slug": "toyota-yaris-1-0-schema-fiche-2001"
};

const existing = report.docs.find(d => d.slug === entry.slug || d.original_filename === entry.original_filename);
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT775A ajouté au rapport — total : ${report.total} entrées`);
