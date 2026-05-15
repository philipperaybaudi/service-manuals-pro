import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT744A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\DAEWOO\\EAVT744A.pdf",
  "file_size": 5264384,
  "page_count": 25,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "DAEWOO",
  "category_fr": "Automobile",
  "filename_clean": "Daewoo Nexia Essence Schéma-Fiche 1998",
  "title_en": "Daewoo Nexia Petrol — Electrical and Mechanical Schema 1998",
  "title_fr": "Daewoo Nexia Essence — Schéma-Fiche électrique et mécanique 1998",
  "description_en": "Auto-Volt schema card N°744 (April 1998) covering the Daewoo Nexia (introduced in France in March 1995), available in 3, 4 and 5-door versions with GL, GTX and GLX trim levels, sharing the platform of the Opel Kadett E. Powered by 1.5-litre petrol engines: 8-valve G15MF (75 hp, single overhead camshaft SOHC driven by toothed belt) for GL trim, and 16-valve A15MF (90 hp, dual overhead camshaft DOHC) for GTX and GLX — both derived from the Opel 1.6-litre engine (same stroke 81.5 mm, bore reduced to 76.5 mm). Includes full mechanical documentation (cast-iron cylinder block, aluminium cylinder head, pressure lubrication with gear pump, cooling with thermostat and single or dual electric fan managed by engine ECU at 90°C and 105°C thresholds, 80-litre/hour fuel pump, 55-litre tank), complete MPFI IEFI-6 engine management documentation (sequential multipoint injection pressure/speed type, shared injection and ignition ECU with mechanical centrifugal advance below 400 rpm and mapped electronic ignition above 400 rpm, throttle body heated by coolant, stepper motor idle regulator 20–100 Ω, Hall-effect crankshaft speed sensor integrated in distributor 500–1500 Ω, MAP sensor 1.2 kΩ, coolant and air temperature NTC sensors, lambda sensor 100–1000 mV, 4 injectors 15 Ω at 30°C, fuel pressure regulator 2.85–3.25 bar, EGR valve vacuum-controlled, canister valve), complete ABS documentation (Delco Moraine VI 4-wheel system, hydraulic unit front-left near master cylinder, 2 front solenoid valves NO 1.6 A, electric motor 2000 Ω, wheel speed sensors 970–1200 Ω, ABS control module, Daewoo Scanner-11 diagnostic tool), complete electrical documentation (1.4 kW 5MT-1998525 starter with solenoid 13–19 A holding winding / 23–30 A pull-in winding, 3-phase alternator with 6 rectifier diodes rotor resistance 1.7–2.3 Ω, 55 Ah/270 A battery, AC Delco R45 XLS spark plugs 0.7–0.8 mm for 8-valve or 1–1.1 mm for 16-valve, dry ignition coil primary 0.3–0.5 Ω / secondary 8.3 kΩ, optional air conditioning with compressor relay managed by ECU), and complete wiring diagrams for IEFI-6 engine management, ABS, charging and starting circuits.",
  "description_fr": "Schéma-Fiche Auto-Volt N°744 (avril 1998) consacré à la Daewoo Nexia (présentée en France en mars 1995), disponible en versions 3, 4 et 5 portes avec niveaux d'équipement GL, GTX et GLX, sur plateforme Opel Kadett E. Motorisée par des moteurs essence 1,5 litre : 8 soupapes G15MF (75 ch, simple arbre à cames en tête SOHC entraîné par courroie crantée) pour le niveau GL, et 16 soupapes A15MF (90 ch, double arbre à cames DOHC) pour les GTX et GLX — tous deux dérivés du moteur Opel 1,6 litre (même course 81,5 mm, alésage réduit à 76,5 mm). Comprend la documentation mécanique complète (bloc-cylindres en fonte, culasse en alliage d'aluminium, lubrification sous pression par pompe à engrenage, refroidissement avec thermostat et motoventilateur simple ou double piloté par le calculateur à 90°C et 105°C, pompe à carburant 80 litres/heure, réservoir 55 litres), la documentation complète de la gestion moteur MPFI IEFI-6 (injection multipoint séquentielle type pression/vitesse, calculateur commun injection et allumage avec avance centrifuge mécanique en dessous de 400 tr/min et cartographie électronique au-delà, boîtier papillon réchauffé par liquide de refroidissement, régulateur de ralenti par moteur pas à pas 20–100 Ω, capteur de régime à effet Hall intégré à l'allumeur 500–1 500 Ω, capteur de pression d'admission 1,2 kΩ, sondes CTN de température liquide et d'air, sonde lambda 100–1 000 mV, 4 injecteurs 15 Ω à 30°C, régulateur de pression carburant 2,85–3,25 bars, vanne EGR à dépression, vanne canister), la documentation complète ABS (système Delco Moraine VI 4 roues, groupe hydraulique placé à l'avant gauche près du maître-cylindre, 2 électrovannes avant NO 1,6 A, moteur électrique 2 000 Ω, capteurs de vitesse de roue 970–1 200 Ω, module de commande du voyant ABS, outil de diagnostic Daewoo Scanner-11), la documentation électrique complète (démarreur 1,4 kW type 5MT-1998525 avec solénoïde enroulement de maintien 13–19 A / appel 23–30 A, alternateur triphasé 6 diodes résistance rotor 1,7–2,3 Ω, batterie 55 Ah/270 A, bougies AC Delco R45 XLS à 0,7–0,8 mm sur moteur 8 soupapes ou 1–1,1 mm sur 16 soupapes, bobine d'allumage sèche primaire 0,3–0,5 Ω / secondaire 8,3 kΩ, climatisation en option avec relais compresseur piloté par calculateur), et les schémas électriques complets de la gestion moteur IEFI-6, de l'ABS, des circuits de charge et de démarrage.",
  "language": "fr",
  "slug": "daewoo-nexia-essence-schema-fiche-1998"
};

const existing = report.docs.find(d => d.slug === entry.slug || (d.original_filename === entry.original_filename && d.brand === entry.brand));
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT744A (DAEWOO) ajouté au rapport — total : ${report.total} entrées`);
