import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "EAVT747A.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\CITROEN\\EAVT747A.pdf",
  "file_size": 4363835,
  "page_count": 29,
  "price": 1200,
  "status": "done",
  "preview_file": null,
  "brand": "PEUGEOT",
  "category_fr": "Automobile",
  "filename_clean": "Peugeot Partner Citroën Berlingo Essence 1.1 et 1.4 Schéma-Fiche 1998",
  "title_en": "Peugeot Partner / Citroën Berlingo Petrol 1.1 and 1.4 — Electrical and Mechanical Schema 1998",
  "title_fr": "Peugeot Partner / Citroën Berlingo Essence 1.1 et 1.4 — Schéma-Fiche électrique et mécanique 1998",
  "description_en": "Auto-Volt schema card N°747 (July/August 1998) covering the Peugeot Partner and Citroën Berlingo with petrol engines 1.1 (TU1M+/W2, 1124 cm³, Bosch MA 3.1 single-point injection) and 1.4 (TU3JP/L3, 1360 cm³, Magneti Marelli 1 AP40 multi-point injection). Includes full mechanical documentation (engine characteristics, lubrication, cooling with temperature management unit, fuel system with Bosch and Marwal pumps, air intake, canister), complete electrical documentation (ECU wiring diagrams for both injection systems with full pin assignments, ignition, ABS Bosch 5.0 with 4 sensors and 4 channels, battery, starter, alternator, lighting, signalling, central locking, air conditioning), detailed fuse and relay tables for both cabin and engine compartment, removal and refitting procedures, and a Peugeot Partner repair time schedule.",
  "description_fr": "Schéma-Fiche Auto-Volt N°747 (juillet/août 1998) consacré aux Peugeot Partner et Citroën Berlingo à moteurs essence 1.1 (TU1M+/W2, 1124 cm³, injection monopoint Bosch MA 3.1) et 1.4 (TU3JP/L3, 1360 cm³, injection multipoint Magneti Marelli 1 AP40). Comprend la documentation mécanique complète (caractéristiques moteur, lubrification, refroidissement avec boîtier de gestion de température, alimentation avec pompes Bosch et Marwal, admission d'air, canister), la documentation électrique complète (schémas de gestion moteur des deux systèmes d'injection avec affectation complète des bornes calculateur, allumage, ABS Bosch 5.0 à 4 capteurs et 4 canaux, batterie, démarreur, alternateur, éclairage, signalisation, verrouillage centralisé, climatisation), les tableaux détaillés de fusibles et relais habitacle et compartiment moteur, les procédures de dépose-repose des équipements, et le barème de temps de réparation Peugeot Partner.",
  "language": "fr",
  "slug": "peugeot-partner-citroen-berlingo-essence-schema-fiche-1998"
};

const existing = report.docs.find(d => d.slug === entry.slug || (d.original_filename === entry.original_filename && d.brand === entry.brand));
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ EAVT747A (PEUGEOT) ajouté au rapport — total : ${report.total} entrées`);
