import fs from 'fs';

const csvFile = '../export-all-urls.CSV';
const content = fs.readFileSync(csvFile, 'utf-8');
const lines = content.split('\n').filter(l => l.trim());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Démarrage...');
console.log(`📊 ${lines.length - 1} documents à traiter`);

const mapping = [];
const missing = [];

(async () => {
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const oldUrl = parts[2]?.trim();
    const oldTitle = parts[1]?.trim();
    
    if (!oldUrl || !oldTitle) continue;

    try {
      const searchUrl = `${supabaseUrl}/rest/v1/documents?select=slug&or=(title_fr.ilike.*${oldTitle}*,title.ilike.*${oldTitle}*)&limit=1`;
      const res = await fetch(searchUrl, { headers: { 'apikey': supabaseKey } });
      const data = await res.json();

      if (data && data.length > 0) {
        const newUrl = `https://service-manuels-pro.fr/docs/${data[0].slug}`;
        mapping.push(`${oldUrl},${newUrl}`);
        if (i % 50 === 0) console.log(`✅ ${i} traités...`);
      } else {
        missing.push(oldTitle);
      }
    } catch (e) {
      missing.push(`${oldTitle} (erreur: ${e.message})`);
    }
  }

  fs.writeFileSync('mapping-redirects.csv', mapping.join('\n'));
  fs.writeFileSync('missing-docs.json', JSON.stringify({ found: mapping.length, missing: missing.slice(0, 20) }, null, 2));
  
  console.log(`\n✅ Trouvés: ${mapping.length}, ❌ Manquants: ${missing.length}`);
})();