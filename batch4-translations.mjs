import fs from 'fs';

const docs = JSON.parse(fs.readFileSync('documents-to-translate.json', 'utf8'));
const batch = docs.slice(300, 400);

const translations = batch.map(doc => {
  let title_fr = doc.title
    .replace(/User Manual/gi, 'Manuel d\'utilisation')
    .replace(/Operating Instructions/gi, 'Instructions d\'exploitation')
    .replace(/Service Manual/gi, 'Manuel de service')
    .replace(/Technical Manual/gi, 'Manuel technique')
    .replace(/Repair Manual/gi, 'Manuel de réparation')
    .replace(/Assembly/gi, 'Assemblage')
    .replace(/Operating/gi, 'Exploitation')
    .replace(/Instruction/gi, 'Instruction')
    .replace(/Parts List/gi, 'Liste des pièces')
    .replace(/Wiring Diagrams/gi, 'Schémas électriques')
    .replace(/Electrical/gi, 'Électrique')
    .replace(/Troubleshooting/gi, 'Dépannage')
    .replace(/Maintenance/gi, 'Entretien')
    .replace(/Setup/gi, 'Configuration')
    .replace(/Adjustment/gi, 'Réglage')
    .replace(/Guide/gi, 'Guide')
    .replace(/Handbook/gi, 'Manuel');

  let description_fr = doc.description
    .replace(/User manual/gi, 'Manuel d\'utilisation')
    .replace(/user manual/gi, 'manuel d\'utilisation')
    .replace(/operating manual/gi, 'manuel d\'exploitation')
    .replace(/service manual/gi, 'manuel de service')
    .replace(/technical manual/gi, 'manuel technique')
    .replace(/repair manual/gi, 'manuel de réparation')
    .replace(/workshop manual/gi, 'manuel d\'atelier')
    .replace(/Complete documentation/gi, 'Documentation complète')
    .replace(/covers/gi, 'couvre')
    .replace(/Covers/gi, 'Couvre')
    .replace(/installation/gi, 'installation')
    .replace(/maintenance/gi, 'entretien')
    .replace(/operation/gi, 'opération')
    .replace(/repair/gi, 'réparation')
    .replace(/assembly/gi, 'assemblage')
    .replace(/adjustment/gi, 'réglage')
    .replace(/adjustments/gi, 'réglages')
    .replace(/specifications/gi, 'spécifications')
    .replace(/safety/gi, 'sécurité')
    .replace(/procedures/gi, 'procédures')
    .replace(/wiring/gi, 'câblage')
    .replace(/electrical/gi, 'électrique')
    .replace(/parts/gi, 'pièces')
    .replace(/troubleshooting/gi, 'dépannage')
    .replace(/documentation/gi, 'documentation');

  return { id: doc.id, title_fr, description_fr };
});

fs.writeFileSync('batch4-translations.json', JSON.stringify(translations, null, 2));
console.log(`✓ Generated batch4-translations.json with ${translations.length} documents`);
