import fs from 'fs';

const docs = JSON.parse(fs.readFileSync('documents-to-translate.json', 'utf8'));

// Extract Batch 3 (docs 201-300)
const startIdx = 200; // 0-based, so 200 = doc 201
const endIdx = 300;
const batch = docs.slice(startIdx, endIdx);

console.log(`Batch 3: Documents ${startIdx + 1}-${endIdx}`);
console.log(`Total: ${batch.length} documents\n`);

batch.forEach((doc, idx) => {
  console.log(`${startIdx + idx + 1}. ${doc.title}`);
  console.log(`   ${doc.description}\n`);
});
