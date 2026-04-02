const j = JSON.parse(require('fs').readFileSync('scripts/sync-results.json', 'utf8'));
console.log('Total FR products:', j.length);
const matched = j.filter(r => r.enId);
const unmatched = j.filter(r => r.enId === undefined || r.enId === null);
console.log('Matched:', matched.length);
console.log('Unmatched:', unmatched.length);
console.log('With description:', j.filter(r => r.description).length);
console.log('With image:', j.filter(r => r.imageUrl).length);
const ids = new Set(matched.map(r => r.enId));
console.log('Unique EN docs matched:', ids.size);

// Show some unmatched
console.log('\n--- Unmatched FR products ---');
unmatched.slice(0, 10).forEach(r => console.log(' ', r.frTitle));

// Show score distribution
const scores = {};
matched.forEach(r => {
  const bucket = Math.floor(r.score / 10) * 10;
  scores[bucket] = (scores[bucket] || 0) + 1;
});
console.log('\n--- Score distribution ---');
Object.keys(scores).sort((a,b) => a-b).forEach(k => console.log(`  ${k}-${parseInt(k)+9}: ${scores[k]}`));
