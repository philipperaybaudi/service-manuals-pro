import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT725A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\NISSAN\\EAVT725A.pdf",
  "file_size": 5300361,
  "page_count": 28,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "FORD",
  "category_fr": "Automobile",
  "filename_clean": "Ford Maverick et Nissan Terrano II Diesel jusqu'au modèle 1997 Schéma-Fiche 1996",
  "title_en": "Ford Maverick and Nissan Terrano II Diesel up to Model 1997 — Electrical and Mechanical Schema 1996",
  "title_fr": "Ford Maverick et Nissan Terrano II Diesel jusqu'au modèle 1997 — Schéma-Fiche électrique et mécanique 1996",
  "description_en": "Auto-Volt schema card N°725 (July/August 1996) covering the Ford Maverick and Nissan Terrano II (3 and 5-door, 4 trim levels each) with the TD27T turbocharged diesel engine (4 cylinders, 2663 cm³, 100 hp at 4000 rpm, 22.1 daN.m torque), designed by Nissan I.D.E.A. in Turin and manufactured in Barcelona. Includes full mechanical documentation (lubrication, cooling, fuel system with Bosch NP-VE 4/10 F injection pump, Garrett turbocharger at 0.6 bar, EGR system with Zexel 56726 module, injectors Bosch DN12SD12T), complete electrical documentation (glow plug preheating Nagares UDT/12-12, Beru glow plugs 0.65 Ω, starters Hitachi S13-106B and Bosch 900033-1201, alternator Bosch 60A, H4/H1 headlights, lighting, signalling, instrument cluster with digital clock, central locking, air conditioning, driver airbag standard on Ford Maverick, electric windows, electric mirrors), full wiring diagrams for Ford Maverick and Nissan Terrano II millesime 1995/1996, fuse and relay tables for both cabin and engine compartment, electrical consumption measurements, and a Ford Maverick Turbo Diesel repair time schedule.",
  "description_fr": "Schéma-Fiche Auto-Volt N°725 (juillet/août 1996) consacré aux Ford Maverick et Nissan Terrano II (3 et 5 portes, 4 niveaux de finition chacun) équipés du moteur diesel suralimenté TD27T (4 cylindres, 2663 cm³, 100 ch à 4000 tr/mn, couple 22,1 daN.m), conçu par le bureau de style Nissan I.D.E.A. à Turin et fabriqué à Barcelone. Comprend la documentation mécanique complète (lubrification, refroidissement, alimentation avec pompe d'injection Bosch NP-VE 4/10 F, turbocompresseur Garrett à 0,6 bar, système EGR avec module Zexel 56726, injecteurs Bosch DN12SD12T), la documentation électrique complète (préchauffage Nagares UDT/12-12, bougies Beru 0,65 Ω, démarreurs Hitachi S13-106B et Bosch 900033-1201, alternateur Bosch 60 A, projecteurs H4/H1, éclairage, signalisation, tableau de bord avec montre digitale, verrouillage centralisé, climatisation, airbag conducteur de série sur Ford Maverick, lève-vitres et rétroviseurs électriques), les schémas électriques complets Ford Maverick et Nissan Terrano II millésime 1995/1996, les tableaux de fusibles et relais habitacle et moteur, la silhouette de l'installation par les chiffres, et le barème de temps de réparation Ford Maverick Turbo Diesel.",
  "language": "fr",
  "slug": "ford-maverick-nissan-terrano-ii-diesel-schema-fiche-1996"
};

const existing = report.docs.find(d => d.slug === entry.slug || (d.original_filename === entry.original_filename && d.brand === entry.brand));
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT725A (FORD) ajouté au rapport — total : ${report.total} entrées`);
