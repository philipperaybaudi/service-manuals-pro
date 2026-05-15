import fs from 'fs';

const docs = JSON.parse(fs.readFileSync('documents-to-translate.json', 'utf8'));

// Extract Batch 3 (docs 201-300) and create translations
const startIdx = 200;
const endIdx = 300;
const batch = docs.slice(startIdx, endIdx);

const translations = batch.map((doc) => {
  // Simple translation rules
  let title_fr = doc.title
    .replace(/Manual/gi, 'Manuel')
    .replace(/User Manual/gi, 'Manuel d\'utilisation')
    .replace(/Operating Instructions/gi, 'Instructions d\'exploitation')
    .replace(/Technical Manual/gi, 'Manuel technique')
    .replace(/Repair/gi, 'Réparation')
    .replace(/Assembly/gi, 'Assemblage')
    .replace(/Guide/gi, 'Guide')
    .replace(/Handbook/gi, 'Manuel')
    .replace(/Service/gi, 'Service')
    .replace(/Parts/gi, 'Pièces')
    .replace(/List/gi, 'Liste')
    .replace(/Specifications/gi, 'Spécifications')
    .replace(/Instructions/gi, 'Instructions')
    .replace(/Maintenance/gi, 'Entretien')
    .replace(/Operation/gi, 'Opération')
    .replace(/Setup/gi, 'Configuration')
    .replace(/Troubleshooting/gi, 'Dépannage');

  let description_fr = doc.description
    .replace(/Manual/gi, 'Manuel')
    .replace(/manual/gi, 'manuel')
    .replace(/documentation/gi, 'documentation')
    .replace(/technical/gi, 'technique')
    .replace(/specifications/gi, 'spécifications')
    .replace(/installation/gi, 'installation')
    .replace(/maintenance/gi, 'maintenance')
    .replace(/operation/gi, 'opération')
    .replace(/repair/gi, 'réparation')
    .replace(/assembly/gi, 'assemblage')
    .replace(/adjustment/gi, 'réglage')
    .replace(/parts/gi, 'pièces')
    .replace(/safety/gi, 'sécurité')
    .replace(/covers/gi, 'couvre');

  return {
    id: doc.id,
    title_fr,
    description_fr
  };
});

fs.writeFileSync(
  'batch3-fr.json',
  JSON.stringify(translations, null, 2)
);

console.log(`✓ Created batch3-fr.json with ${translations.length} document translations`);
