import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.join('scripts', 'docs-a-classer-report-automobile.json');
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const entry = {
  "original_filename": "Renault_Carminat Notice.pdf",
  "original_path": "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Automobile\\RENAULT\\Renault_Carminat Notice.pdf",
  "file_size": 4877107,
  "page_count": 91,
  "price": 900,
  "status": "done",
  "preview_file": null,
  "brand": "RENAULT",
  "category_fr": "Automobile",
  "filename_clean": "Renault Carminat Bluetooth CD Notice d'utilisation 2007",
  "title_en": "Renault Carminat Bluetooth CD — User Manual 2007",
  "title_fr": "Renault Carminat Bluetooth CD — Notice d'utilisation 2007",
  "description_en": "User manual (ref. NX 805-1, 82 00 800 568, March 2007) for the Renault Carminat Bluetooth CD and Carminat Bluetooth CD Auditorium navigation and multimedia systems. This 85-page manual covers the complete operation of the integrated GPS navigation, radio/CD and hands-free telephone system. Includes: safety precautions and usage guidelines, illustrated quick start guide with detailed control descriptions (front panel buttons, rotary selector, steering wheel controls), general system description, radio and CD/MP3 operation (FM/AM tuning, station memory on 6 presets, MP3 CD playback, bass/treble/balance/fader audio settings), GPS navigation (satellite reception, route calculation, address and point-of-interest search, destination management, waypoint and itinerary management, real-time traffic information TMC, map scale adjustment), Bluetooth telephony (pairing and unpairing up to multiple handsets, connecting/disconnecting, phone book transfer and management, vehicle address book with up to 100 contacts, outgoing and incoming calls, in-call options — hold, conference, transfer —, ringtone and volume settings), voice recognition commands (navigation and telephone functions), system settings (language, date/time, screen brightness, system reset), troubleshooting guide for common malfunctions, and alphabetical index.",
  "description_fr": "Notice d'utilisation (réf. NX 805-1, 82 00 800 568, mars 2007) des systèmes de navigation et multimédia intégrés Renault Carminat Bluetooth CD et Carminat Bluetooth CD Auditorium. Ce manuel de 85 pages couvre le fonctionnement complet du système combinant navigation GPS, radio/CD et téléphonie mains libres. Comprend : précautions d'utilisation et consignes de sécurité, guide de prise en mains rapide illustré avec description détaillée des commandes (façade, sélecteur rotatif, commandes au volant), description générale du système, utilisation radio et CD/MP3 (accord FM/AM, mémorisation de stations sur 6 présélections, lecture de CD MP3, réglages audio basses/aigus/balance/fader), navigation GPS (réception satellitaire, calcul d'itinéraire, saisie d'adresse et recherche de destinations particulières, gestion de destinations, gestion d'étapes et d'itinéraires, informations trafic temps réel TMC, modification d'échelle de carte), téléphonie Bluetooth (appairage et désappairage de plusieurs appareils, connexion/déconnexion, transfert et gestion du répertoire téléphone, carnet d'adresses véhicule jusqu'à 100 contacts, émission et réception d'appels, options en communication — mise en attente, conférence, transfert —, réglages sonnerie et volume), reconnaissance vocale pour la navigation et la téléphonie, réglages système (langue, date/heure, luminosité écran, réinitialisation), guide de diagnostic des anomalies de fonctionnement, et index alphabétique.",
  "language": "fr",
  "slug": "renault-carminat-bluetooth-cd-notice-utilisation-2007"
};

const existing = report.docs.find(d => d.slug === entry.slug || (d.original_filename === entry.original_filename && d.brand === entry.brand));
if (existing) {
  console.log(`⚠ Entrée existante trouvée (slug: ${existing.slug}, status: ${existing.status}) — abandon`);
  process.exit(1);
}

report.docs.push(entry);
report.total = report.docs.length;
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ Renault Carminat Notice ajouté au rapport — total : ${report.total} entrées`);
