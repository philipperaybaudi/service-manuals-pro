import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT736A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\TOYOTA\\EAVT736A.pdf",
  "file_size": 10664141,
  "page_count": 25,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "TOYOTA",
  "category_fr": "Automobile",
  "filename_clean": "Toyota RAV 4 Essence 3S-FE 1988 cm³ Schéma-Fiche 1997",
  "title_en": "Toyota RAV 4 Petrol 3S-FE 1988 cm³ — Electrical and Mechanical Schema 1997",
  "title_fr": "Toyota RAV 4 Essence 3S-FE 1988 cm³ — Schéma-Fiche électrique et mécanique 1997",
  "description_en": "Auto-Volt schema card N°736 (July/August 1997) covering the Toyota RAV 4 (3 and 5-door monocoque body) with the 3S-FE petrol engine (4 cylinders in line, 1988 cm³, 86×86 mm, 129 hp/95 kW at 5600 rpm). Covers two ignition system variants: mechanical distributor (vehicles produced until December 1996) and static dual-output coils (vehicles produced from January 1997). Includes full mechanical documentation (engine characteristics, lubrication, cooling, fuel system with returnless fuel rail from January 1997, Toyota TCCS engine management with NipponDenso ECU, sequential multipoint injection, MAP sensor, knock sensor, EGR system, lambda sensor), complete electrical documentation (NipponDenso starter and alternator at 70A or 80A, battery, H4/H1 headlights, signalling, instrument cluster, central locking, electric windows, driver airbag standard on VX trim, ABS optional on VX), full wiring diagrams for TCCS with distributor, TCCS with static coils, automatic transmission, ABS, central locking, electric windows, fuse and relay tables for cabin and engine compartment, and a Toyota RAV 4 repair time schedule.",
  "description_fr": "Schéma-Fiche Auto-Volt N°736 (juillet/août 1997) consacré au Toyota RAV 4 (carrosserie monocoque 3 et 5 portes) à moteur essence 3S-FE (4 cylindres en ligne, 1988 cm³, 86×86 mm, 129 ch/95 kW à 5600 tr/min). Couvre deux variantes du système d'allumage : distributeur mécanique (véhicules fabriqués jusqu'en décembre 1996) et bobines statiques double sortie (véhicules fabriqués à partir de janvier 1997). Comprend la documentation mécanique complète (caractéristiques moteur, lubrification, refroidissement, alimentation avec rampe d'injection sans retour à partir de janvier 1997, gestion moteur Toyota TCCS avec calculateur NipponDenso, injection multipoint séquentielle, capteur MAP, capteur de cliquetis, système EGR, sonde lambda), la documentation électrique complète (démarreur et alternateur NipponDenso 70A ou 80A, batterie, optiques H4/H1, signalisation, instrumentation, verrouillage centralisé, lève-vitres électriques, airbag conducteur de série sur finition VX, ABS en option sur VX), les schémas électriques complets du TCCS avec distributeur, du TCCS avec bobines statiques, de la boîte automatique, de l'ABS, du verrouillage centralisé, des lève-vitres électriques, les tableaux de fusibles et relais habitacle et compartiment moteur, et le barème de temps de réparation Toyota RAV 4.",
  "language": "fr",
  "slug": "toyota-rav-4-essence-3s-fe-schema-fiche-1997"
};

// Vérifier qu'il n'y a pas de doublon
const existing = report.docs.find(d => d.slug === entry.slug || d.original_filename === entry.original_filename);
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT736A ajouté au rapport — total : ${report.total} entrées`);
