// Batch import script for missing documents
// Usage: node scripts/batch-import.mjs
//
// This script:
// 1. Generates JPEG preview from first page of each PDF
// 2. Uploads preview to Supabase Storage (logos/previews/)
// 3. Uploads PDF to Cloudflare R2
// 4. Creates the document record in Supabase database

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { basename } from 'path';
const require = createRequire(import.meta.url);

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const canvas = require('canvas');
const pdfjs = require('pdfjs-dist');

// ── Config ──────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co';
const SUPABASE_KEY = 'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const BASE = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE';
const TEMP_DIR = 'C:/Users/adm/Claude Doc GB test/service-manuals-pro/scripts/temp_previews';

// ── Canvas factory for pdfjs ────────────────────────────────────
class NodeCanvasFactory {
  create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// ── Brand IDs (from database) ───────────────────────────────────
const BRANDS = {
  'STUDER REVOX':  'd014d464-3a22-4a9a-ae3b-b90661674bc3',
  'BRONICA':       '5450ced1-91cf-4774-8c83-b5d419f4091f',
  'ZENZA BRONICA': 'd3e1d0da-78aa-4c9a-b829-864666b8c348',
  'LEICA':         '118052e5-56fa-4879-a4bb-0c0897f9bf99',
  'ROLLEI':        '4d9636cc-a8fd-4edf-bf84-7f1c3598b6cf',
  'MINOX':         'a96556b3-a736-4902-badc-d0c2b4ae4d29',
  'HASSELBLAD':    '64c6ddfb-a98c-49b9-aa53-88ac6caed33a',
  'LUREM':         'd73c0a3d-4aa3-4029-81ec-de2c77b438bc',
  'MACHINE TOOLS': '7261ff4a-9840-4f3c-9a2e-ab59d3209606',
  'HAMEG':         'b003f594-4528-47b7-acf7-368359d29385',
  'RENAULT':       '406e029f-862a-48e8-874e-8674ce03980c',
  'PHOT ARGUS':    '1ca00ec3-5929-493e-b222-ebac5ded6f55',
  'MINOLTA':       '9d0436e7-4a3f-4adb-a360-1554e002881f',
};

// ── Category IDs ────────────────────────────────────────────────
const CATEGORIES = {
  'audio-hifi':     'fac320cd-12a4-4022-b011-aa39931c3062',
  'photography':    '79ea117d-8952-4b9e-aab9-4b10fc2dec7a',
  'workshop-diy':   '19a46ff6-9ad4-4273-9c8f-83f249904ec9',
  'electronics':    '74ab5d99-2f9c-4b98-b320-70013f876e99',
  'automotive':     'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd',
  'television':     '982bd7fe-fbf9-4c94-999f-652daaebcaf2',
};

// ── Documents to create ─────────────────────────────────────────
const DOCUMENTS = [
  // === AUDIO & HIFI ===
  {
    title: 'Revox PR99 MKI & MKII Troubleshooting Manual',
    slug: 'revox-pr99-mki-mkii-troubleshooting-manual',
    description: 'Complete troubleshooting manual for the Studer Revox PR99 MKI and MKII professional reel-to-reel tape recorders. Includes schematics, alignment procedures, and repair instructions.',
    price: 2000,
    brand: 'STUDER REVOX',
    category: 'audio-hifi',
    pdf: `${BASE}/SON/STUDER REVOX/REVOX PR99 MKI MKII MKIII/Revox_PR99_MkI_MkII_Manuel_brut.pdf`,
    language: 'en',
    seo_title: 'Revox PR99 MKI & MKII Troubleshooting Manual | Service PDF',
    seo_description: 'Download the complete Revox PR99 MKI & MKII troubleshooting manual. Professional reel-to-reel tape recorder repair guide with schematics.',
  },
  {
    title: 'Revox B77 MKI & MKII User Manual',
    slug: 'revox-b77-mki-mkii-user-manual',
    description: 'Original user manual for the Revox B77 MKI and MKII reel-to-reel tape recorders. Includes operating instructions, specifications, and maintenance guidelines.',
    price: 1500,
    brand: 'STUDER REVOX',
    category: 'audio-hifi',
    pdf: `${BASE}/SON/STUDER REVOX/REVOX B77 MKI MKII/Revox_B77_MkII_Notice.pdf`,
    language: 'fr',
    seo_title: 'Revox B77 MKI & MKII User Manual | PDF Download',
    seo_description: 'Download the Revox B77 MKI & MKII user manual. Complete operating instructions for these classic reel-to-reel tape recorders.',
  },

  // === PHOTOGRAPHY - BRONICA ===
  {
    title: 'Bronica Zenza EC Complete Documentation',
    slug: 'bronica-zenza-ec-complete-documentation',
    description: 'Complete technical documentation for the Bronica Zenza EC medium format camera. Detailed overview of features, specifications, and operation.',
    price: 1000,
    brand: 'PHOT ARGUS',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/PHOT ARGUS/BRONICA EC/EC_HD.pdf`,
    language: 'fr',
    seo_title: 'Bronica Zenza EC Complete Documentation | PDF',
    seo_description: 'Download complete documentation for the Bronica Zenza EC medium format camera. Technical specifications and detailed overview.',
  },
  {
    title: 'Bronica Zenza S2C Repair Manual',
    slug: 'bronica-zenza-s2c-repair-manual',
    description: 'Service and repair manual for the Bronica Zenza S2-C medium format camera. Includes disassembly instructions, adjustment procedures, and technical diagrams.',
    price: 2000,
    brand: 'ZENZA BRONICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/ZENZA BRONICA/S2-C/bronica-s2_service-manual.pdf`,
    language: 'en',
    seo_title: 'Bronica Zenza S2C Repair Manual | Service PDF',
    seo_description: 'Download the Bronica Zenza S2C repair manual. Complete service guide with disassembly and adjustment procedures.',
  },
  {
    title: 'Bronica Zenza S2A User Manual',
    slug: 'bronica-zenza-s2a-user-manual',
    description: 'User manual for the Bronica Zenza S2A medium format camera. Operating instructions, lens compatibility, and technical specifications.',
    price: 1500,
    brand: 'BRONICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/BRONICA/Bronica S2A Notice Fr/Bronica S2A Notice Fr.pdf`,
    language: 'fr',
    seo_title: 'Bronica Zenza S2A User Manual | PDF Download',
    seo_description: 'Download the Bronica Zenza S2A user manual. Complete operating instructions for this classic medium format camera.',
  },
  {
    title: 'Bronica Zenzanon Lenses & Seiko Shutter Repair Manuals',
    slug: 'bronica-zenzanon-lenses-seiko-shutter-repair-manuals',
    description: 'Comprehensive repair manuals for Bronica Zenzanon lenses and Seiko shutters. Includes disassembly charts, adjustment procedures, and parts diagrams for multiple lens models.',
    price: 2500,
    brand: 'BRONICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/BRONICA/Objectif Bronica/Bronica Zenzanon lenses.pdf`,
    language: 'en',
    seo_title: 'Bronica Zenzanon Lenses & Seiko Shutter Repair Manuals | PDF',
    seo_description: 'Download repair manuals for Bronica Zenzanon lenses and Seiko shutters. Comprehensive service guides with parts diagrams.',
  },

  // === PHOTOGRAPHY - LEICA ===
  {
    title: 'Leica R3 Electronic Complete Documentation',
    slug: 'leica-r3-electronic-complete-documentation',
    description: 'Complete technical documentation for the Leica R3 Electronic SLR camera. Detailed analysis of features, electronic systems, specifications, and operation.',
    price: 1000,
    brand: 'PHOT ARGUS',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/PHOT ARGUS/LEICA R3 ELEC/R3_HD.pdf`,
    language: 'fr',
    seo_title: 'Leica R3 Electronic Complete Documentation | PDF',
    seo_description: 'Download complete documentation for the Leica R3 Electronic. Technical analysis, specifications, and operation guide.',
  },
  {
    title: 'Leica R4 Stuck Shutter - Not Triggering Fix',
    slug: 'leica-r4-stuck-shutter-not-triggering-fix',
    description: 'Troubleshooting and repair guide for the Leica R4 when the shutter is stuck or not triggering. Step-by-step instructions to diagnose and fix the most common mechanical failures.',
    price: 2000,
    brand: 'LEICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/LEICA/R/Leica R4s et R5 qui ne d\u00e9clenche plus.pdf`,
    language: 'fr',
    seo_title: 'Leica R4 Stuck Shutter Fix | Repair Guide PDF',
    seo_description: 'Fix your Leica R4 stuck shutter with this step-by-step repair guide. Troubleshooting instructions for when the camera stops triggering.',
  },
  {
    title: 'Leica R4 MOT Stuck Shutter - Not Triggering Fix',
    slug: 'leica-r4-mot-stuck-shutter-not-triggering-fix',
    description: 'Troubleshooting and repair guide for the Leica R4 MOT when the shutter is stuck or not triggering. Step-by-step instructions to diagnose and fix the most common mechanical failures.',
    price: 2000,
    brand: 'LEICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/LEICA/R/Leica R4s et R5 qui ne d\u00e9clenche plus.pdf`,
    language: 'fr',
    seo_title: 'Leica R4 MOT Stuck Shutter Fix | Repair Guide PDF',
    seo_description: 'Fix your Leica R4 MOT stuck shutter with this step-by-step repair guide. Troubleshooting instructions for the motorized version.',
  },
  {
    title: 'Leica R4S Stuck Shutter - Not Triggering Fix',
    slug: 'leica-r4s-stuck-shutter-not-triggering-fix',
    description: 'Troubleshooting and repair guide for the Leica R4S when the shutter is stuck or not triggering. Step-by-step instructions to diagnose and fix the most common mechanical failures.',
    price: 2000,
    brand: 'LEICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/LEICA/R/Leica R4s et R5 qui ne d\u00e9clenche plus.pdf`,
    language: 'fr',
    seo_title: 'Leica R4S Stuck Shutter Fix | Repair Guide PDF',
    seo_description: 'Fix your Leica R4S stuck shutter with this step-by-step repair guide. Troubleshooting instructions for the simplified version.',
  },
  {
    title: 'Leica R4S2 Stuck Shutter - Not Triggering Fix',
    slug: 'leica-r4s2-stuck-shutter-not-triggering-fix',
    description: 'Troubleshooting and repair guide for the Leica R4S2 when the shutter is stuck or not triggering. Step-by-step instructions to diagnose and fix the most common mechanical failures.',
    price: 2000,
    brand: 'LEICA',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/LEICA/R/Leica R4s et R5 qui ne d\u00e9clenche plus.pdf`,
    language: 'fr',
    seo_title: 'Leica R4S2 Stuck Shutter Fix | Repair Guide PDF',
    seo_description: 'Fix your Leica R4S2 stuck shutter with this step-by-step repair guide. Troubleshooting and repair instructions.',
  },
  {
    title: 'LEICA M6 Complete Documentation',
    slug: 'leica-m6-complete-documentation',
    description: 'Complete technical documentation for the Leica M6 rangefinder camera. In-depth analysis of mechanical systems, metering, specifications, and detailed technical overview.',
    price: 1000,
    brand: 'PHOT ARGUS',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/PHOT ARGUS/LEICA M6/LEICA-M6_HD.pdf`,
    language: 'fr',
    seo_title: 'Leica M6 Complete Documentation | Technical PDF',
    seo_description: 'Download complete technical documentation for the iconic Leica M6 rangefinder. Detailed analysis and specifications.',
  },

  // === PHOTOGRAPHY - ROLLEI ===
  {
    title: 'Rolleiflex T Original Technician Repair Manual',
    slug: 'rolleiflex-t-original-technician-repair-manual',
    description: 'Original factory technician repair manual for the Rolleiflex T twin-lens reflex camera. Includes complete disassembly procedures, adjustment instructions, and detailed technical diagrams.',
    price: 2500,
    brand: 'ROLLEI',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/ROLLEI/ROLLEIFLEX T/Manuel de R\u00e9paration Rolleiflex T.pdf`,
    language: 'fr',
    seo_title: 'Rolleiflex T Repair Manual | Original Technician Guide PDF',
    seo_description: 'Download the original factory Rolleiflex T repair manual. Complete technician service guide with disassembly and adjustment procedures.',
  },
  {
    title: 'ROLLEIFLEX SL35E Complete Documentation',
    slug: 'rolleiflex-sl35e-complete-documentation',
    description: 'Complete technical documentation for the Rolleiflex SL35E SLR camera. Detailed analysis of features, electronic systems, specifications, and metering.',
    price: 1000,
    brand: 'PHOT ARGUS',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/PHOT ARGUS/ROLLEIFLEX SL35E/SL35E_HD.pdf`,
    language: 'fr',
    seo_title: 'Rolleiflex SL35E Complete Documentation | PDF',
    seo_description: 'Download complete documentation for the Rolleiflex SL35E. Technical specifications and detailed analysis.',
  },

  // === PHOTOGRAPHY - MINOX ===
  {
    title: 'Minox C Disassembly Tutorial',
    slug: 'minox-c-disassembly-tutorial',
    description: 'Step-by-step disassembly tutorial for the Minox C subminiature spy camera. Detailed instructions for opening, cleaning, and servicing this precision instrument.',
    price: 2000,
    brand: 'MINOX',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/MINOX/Minox C/D\u00e9monter un Minox Espion.pdf`,
    language: 'fr',
    seo_title: 'Minox C Disassembly Tutorial | Spy Camera Repair PDF',
    seo_description: 'Download the Minox C disassembly tutorial. Step-by-step guide to open and service this classic subminiature spy camera.',
  },

  // === PHOTOGRAPHY - HASSELBLAD ===
  {
    title: 'Hasselblad 500 C & CM Troubleshooting Manual',
    slug: 'hasselblad-500-c-cm-troubleshooting-manual',
    description: 'Troubleshooting and service manual for the Hasselblad 500 C and CM medium format cameras. Covers common issues, repair procedures, and diagnostic techniques.',
    price: 2000,
    brand: 'HASSELBLAD',
    category: 'photography',
    pdf: `${BASE}/PHOTOGRAPHIE/HASSELBALD/Hasselblad 500 C et CM manuel de service.pdf`,
    language: 'fr',
    seo_title: 'Hasselblad 500 C & CM Troubleshooting Manual | Service PDF',
    seo_description: 'Download the Hasselblad 500 C & CM troubleshooting manual. Service guide for diagnosing and repairing common issues.',
  },

  // === PHOTOGRAPHY - MINOLTA ===
  {
    title: 'Minolta XG-1 Troubleshooting Tutorial',
    slug: 'minolta-xg-1-troubleshooting-tutorial',
    description: 'Troubleshooting tutorial for the Minolta XG-1 SLR camera. Diagnose and repair common issues including stuck shutter, metering problems, and mechanical failures.',
    price: 1500,
    brand: 'MINOLTA',
    category: 'photography',
    pdf: null, // PDF not found - SKIP
    language: 'fr',
    seo_title: 'Minolta XG-1 Troubleshooting Tutorial | Repair Guide PDF',
    seo_description: 'Download the Minolta XG-1 troubleshooting tutorial. Diagnose and repair common issues with this classic SLR camera.',
  },

  // === WORKSHOP & DIY - LUREM ===
  {
    title: 'LUREM C260S2 User & Maintenance Manual',
    slug: 'lurem-c260s2-user-maintenance-manual',
    description: 'User and maintenance manual for the LUREM C260S2 combination woodworking machine. Includes operating instructions, safety guidelines, maintenance schedules, and troubleshooting tips.',
    price: 1500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Manuel d'utilisation Lurem C 260 S2.pdf`,
    language: 'fr',
    seo_title: 'LUREM C260S2 User & Maintenance Manual | PDF',
    seo_description: 'Download the LUREM C260S2 user and maintenance manual. Complete operating instructions for this combination woodworking machine.',
  },
  {
    title: 'LUREM C260J User & Maintenance Manual',
    slug: 'lurem-c260j-user-maintenance-manual',
    description: 'User and maintenance manual for the LUREM C260J jointer-planer combination machine. Operating instructions, adjustment procedures, and maintenance guidelines.',
    price: 1500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Lurem C260J rabo degau.pdf`,
    language: 'fr',
    seo_title: 'LUREM C260J User & Maintenance Manual | PDF',
    seo_description: 'Download the LUREM C260J user and maintenance manual. Operating instructions for this jointer-planer combination machine.',
  },
  {
    title: 'LUREM C260N Electrical Wiring Diagrams',
    slug: 'lurem-c260n-electrical-wiring-diagrams',
    description: 'Complete electrical wiring diagrams for the LUREM C260N combination woodworking machine. Essential reference for electrical troubleshooting and motor replacement.',
    price: 500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Schemas C260N France.pdf`,
    language: 'fr',
    seo_title: 'LUREM C260N Electrical Wiring Diagrams | PDF',
    seo_description: 'Download LUREM C260N electrical wiring diagrams. Essential schematics for troubleshooting and motor replacement.',
  },
  {
    title: 'LUREM C266 Electrical Wiring Diagrams',
    slug: 'lurem-c266-electrical-wiring-diagrams',
    description: 'Complete electrical wiring diagrams for the LUREM C266 combination woodworking machine. Essential reference for electrical troubleshooting and motor replacement.',
    price: 500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Schemas C266 France.pdf`,
    language: 'fr',
    seo_title: 'LUREM C266 Electrical Wiring Diagrams | PDF',
    seo_description: 'Download LUREM C266 electrical wiring diagrams. Essential schematics for troubleshooting and motor replacement.',
  },
  {
    title: 'LUREM C410N User & Maintenance Manual',
    slug: 'lurem-c410n-user-maintenance-manual',
    description: 'User and maintenance manual for the LUREM C410N combination woodworking machine. Includes operating instructions, safety guidelines, adjustment procedures, and maintenance schedules.',
    price: 1500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Lurem-C360-C410n.pdf`,
    language: 'fr',
    seo_title: 'LUREM C410N User & Maintenance Manual | PDF',
    seo_description: 'Download the LUREM C410N user and maintenance manual. Complete operating instructions for this combination woodworking machine.',
  },
  {
    title: 'LUREM Former 260S - Exploded Views with Parts Lists',
    slug: 'lurem-former-260s-exploded-views-parts-lists',
    description: 'Exploded views with complete parts lists for the LUREM Former 260S woodworking machine. Essential reference for identifying and ordering replacement parts.',
    price: 1000,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/LUREM FORMER 260s eclate.pdf`,
    language: 'fr',
    seo_title: 'LUREM Former 260S Exploded Views & Parts Lists | PDF',
    seo_description: 'Download LUREM Former 260S exploded views with parts lists. Identify and order replacement parts for your woodworking machine.',
  },
  {
    title: 'LUREM Former 310S - Exploded Views with Parts Lists',
    slug: 'lurem-former-310s-exploded-views-parts-lists',
    description: 'Exploded views with complete parts lists for the LUREM Former 310S woodworking machine. Essential reference for identifying and ordering replacement parts.',
    price: 1000,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/lurem former 310 s \u00e9clat\u00e9s.pdf`,
    language: 'fr',
    seo_title: 'LUREM Former 310S Exploded Views & Parts Lists | PDF',
    seo_description: 'Download LUREM Former 310S exploded views with parts lists. Identify and order replacement parts for your woodworking machine.',
  },
  {
    title: 'LUREM Former 310SI - Exploded Views with Parts Lists',
    slug: 'lurem-former-310si-exploded-views-parts-lists',
    description: 'Exploded views with complete parts lists for the LUREM Former 310SI woodworking machine. Essential reference for identifying and ordering replacement parts.',
    price: 1000,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/lurem former 310 si \u00e9clat\u00e9s.pdf`,
    language: 'fr',
    seo_title: 'LUREM Former 310SI Exploded Views & Parts Lists | PDF',
    seo_description: 'Download LUREM Former 310SI exploded views with parts lists. Identify and order replacement parts for your woodworking machine.',
  },
  {
    title: 'LUREM Former 310ST - Exploded Views with Parts Lists',
    slug: 'lurem-former-310st-exploded-views-parts-lists',
    description: 'Exploded views with complete parts lists for the LUREM Former 310ST woodworking machine. Essential reference for identifying and ordering replacement parts.',
    price: 1000,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Lurem former 310 st \u00e9clat\u00e9s.pdf`,
    language: 'fr',
    seo_title: 'LUREM Former 310ST Exploded Views & Parts Lists | PDF',
    seo_description: 'Download LUREM Former 310ST exploded views with parts lists. Identify and order replacement parts for your woodworking machine.',
  },
  {
    title: 'LUREM C260N User & Maintenance Manual (French)',
    slug: 'lurem-c260n-user-maintenance-manual-french',
    description: 'Manuel d\'utilisation et d\'entretien en francais pour le combine a bois LUREM C260N. Instructions de fonctionnement, reglages, et consignes de maintenance.',
    price: 1500,
    brand: 'LUREM',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MENUISERIE/LUREM/Lurem C260N manuel.pdf`,
    language: 'fr',
    seo_title: 'LUREM C260N User & Maintenance Manual (French) | PDF',
    seo_description: 'Download the LUREM C260N user and maintenance manual in French. Complete operating instructions for this combination woodworking machine.',
  },

  // === WORKSHOP & DIY - EMCO ===
  {
    title: 'EMCO Compact 5 Lathe User Manual',
    slug: 'emco-compact-5-lathe-user-manual',
    description: 'User manual for the EMCO Compact 5 benchtop metal lathe. Includes operating instructions, specifications, accessories, and maintenance guidelines.',
    price: 2000,
    brand: 'MACHINE TOOLS',
    category: 'workshop-diy',
    pdf: `${BASE}/BRICOLAGE/MACHINES OUTIL/EMCO/COMPACT 5/Compact5_Bed_FR.pdf`,
    language: 'fr',
    seo_title: 'EMCO Compact 5 Lathe User Manual | PDF Download',
    seo_description: 'Download the EMCO Compact 5 lathe user manual. Complete operating instructions for this precision benchtop metal lathe.',
  },

  // === ELECTRONICS - HAMEG ===
  {
    title: 'Hameg HM8030-2 Function Generator Service Manual',
    slug: 'hameg-hm8030-2-function-generator-service-manual',
    description: 'Service manual for the Hameg HM8030-2 function generator module. Includes schematics, calibration procedures, and technical specifications.',
    price: 500,
    brand: 'HAMEG',
    category: 'electronics',
    pdf: `${BASE}/ELECTRONIQUE/HAMEG/HAMEG_MAN_EN_HM8030_2.pdf`,
    language: 'en',
    seo_title: 'Hameg HM8030-2 Service Manual | Function Generator PDF',
    seo_description: 'Download the Hameg HM8030-2 function generator service manual. Schematics and calibration procedures.',
  },

  // === AUTOMOTIVE - RENAULT ===
  {
    title: 'Renault Scenic 2 Air Conditioning Service Manual Vol. 1',
    slug: 'renault-scenic-2-air-conditioning-service-manual-vol-1',
    description: 'Workshop service manual for the Renault Scenic 2 air conditioning system, Volume 1. Covers AC system diagnosis, refrigerant procedures, component replacement, and troubleshooting.',
    price: 1500,
    brand: 'RENAULT',
    category: 'automotive',
    pdf: `${BASE}/AUTO MOTO/RENAULT/SCENIC Phase 2/Renault SCENIC 2/SCENIC 2  - Climatisation.pdf`,
    language: 'fr',
    seo_title: 'Renault Scenic 2 AC Service Manual Vol. 1 | Workshop PDF',
    seo_description: 'Download the Renault Scenic 2 air conditioning service manual Volume 1. Complete AC system diagnosis and repair procedures.',
  },
  {
    title: 'Renault Scenic 2 Electrical Equipment Service Manual (Complete)',
    slug: 'renault-scenic-2-electrical-equipment-service-manual-complete',
    description: 'Complete workshop service manual for the Renault Scenic 2 electrical equipment. Covers all electrical systems, wiring diagrams, component locations, and diagnostic procedures.',
    price: 2000,
    brand: 'RENAULT',
    category: 'automotive',
    pdf: `${BASE}/AUTO MOTO/RENAULT/SCENIC Phase 2/Renault SCENIC 2/SCENIC 2  - Equipement Electrique.pdf`,
    language: 'fr',
    seo_title: 'Renault Scenic 2 Electrical Service Manual | Workshop PDF',
    seo_description: 'Download the complete Renault Scenic 2 electrical equipment service manual. All wiring diagrams and diagnostic procedures.',
  },
  {
    title: 'Renault Scenic 2 Chassis & Transmission Service Manual Vol. 1',
    slug: 'renault-scenic-2-chassis-transmission-service-manual-vol-1',
    description: 'Workshop service manual for the Renault Scenic 2 chassis and transmission, Volume 1. Covers suspension, steering, braking, and manual/automatic transmission procedures.',
    price: 1000,
    brand: 'RENAULT',
    category: 'automotive',
    pdf: `${BASE}/AUTO MOTO/RENAULT/SCENIC Phase 2/Renault SCENIC 2/SCENIC 2  - Transmission 1.pdf`,
    language: 'fr',
    seo_title: 'Renault Scenic 2 Chassis & Transmission Manual Vol. 1 | PDF',
    seo_description: 'Download the Renault Scenic 2 chassis and transmission service manual Volume 1. Suspension, steering, and transmission procedures.',
  },
];

// ── Helper functions ────────────────────────────────────────────
async function generatePreview(pdfPath) {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const cc = new NodeCanvasFactory().create(viewport.width, viewport.height);

  await page.render({
    canvasContext: cc.context,
    viewport,
    canvasFactory: new NodeCanvasFactory(),
  }).promise;

  const buffer = cc.canvas.toBuffer('image/jpeg', { quality: 0.85 });
  const pageCount = doc.numPages;
  return { buffer, pageCount };
}

async function uploadPreview(slug, buffer) {
  const path = `logos/previews/${slug}.jpg`;
  const { error } = await supabase.storage
    .from('logos')
    .upload(`previews/${slug}.jpg`, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw new Error(`Preview upload failed: ${error.message}`);
  const { data } = supabase.storage.from('logos').getPublicUrl(`previews/${slug}.jpg`);
  return data.publicUrl;
}

async function uploadPdfToR2(pdfPath, slug) {
  const fileBuffer = readFileSync(pdfPath);
  const key = `${slug}.pdf`;
  await r2.send(new PutObjectCommand({
    Bucket: 'service-manuals-documents',
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  }));
  return key;
}

async function createDocument(doc, previewUrl, r2Key, pageCount) {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      price: doc.price,
      brand_id: BRANDS[doc.brand],
      category_id: CATEGORIES[doc.category],
      preview_url: previewUrl,
      file_path: r2Key,
      file_size: readFileSync(doc.pdf).length,
      page_count: pageCount,
      language: doc.language || 'en',
      active: true,
      featured: false,
      seo_title: doc.seo_title,
      seo_description: doc.seo_description,
    })
    .select()
    .single();

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return data;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

  const toProcess = DOCUMENTS.filter(d => d.pdf !== null);
  console.log(`\n=== Batch Import: ${toProcess.length} documents to process ===\n`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < toProcess.length; i++) {
    const doc = toProcess[i];
    const num = `[${i + 1}/${toProcess.length}]`;

    try {
      // Check PDF exists
      if (!existsSync(doc.pdf)) {
        throw new Error(`PDF not found: ${doc.pdf}`);
      }

      // Check if slug already exists
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('slug', doc.slug)
        .single();

      if (existing) {
        console.log(`${num} SKIP (exists): ${doc.title}`);
        continue;
      }

      console.log(`${num} Processing: ${doc.title}`);

      // Step 1: Generate preview
      process.stdout.write('  Preview... ');
      const { buffer, pageCount } = await generatePreview(doc.pdf);
      console.log(`OK (${pageCount} pages)`);

      // Step 2: Upload preview to Supabase Storage
      process.stdout.write('  Upload preview... ');
      const previewUrl = await uploadPreview(doc.slug, buffer);
      console.log('OK');

      // Step 3: Upload PDF to R2
      process.stdout.write('  Upload PDF to R2... ');
      const r2Key = await uploadPdfToR2(doc.pdf, doc.slug);
      const sizeMB = Math.round(readFileSync(doc.pdf).length / 1024 / 1024 * 10) / 10;
      console.log(`OK (${sizeMB} MB)`);

      // Step 4: Create database record
      process.stdout.write('  Create DB record... ');
      const record = await createDocument(doc, previewUrl, r2Key, pageCount);
      console.log(`OK (id: ${record.id})`);

      console.log(`  --> $${(doc.price / 100).toFixed(2)} | ${doc.slug}`);
      success++;

    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      errors.push({ title: doc.title, error: err.message });
      failed++;
    }

    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`DONE: ${success} created, ${failed} failed, ${DOCUMENTS.filter(d => d.pdf === null).length} skipped (no PDF)`);
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e.title}: ${e.error}`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
