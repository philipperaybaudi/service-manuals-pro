import fetch from 'node-fetch';

// DeepL Free API - gratuit, pas de clé requise pour tester
async function translateWithDeepL(text) {
  if (!text || text.length < 3) return text;

  try {
    const response = await fetch('https://api-free.deepl.com/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text.substring(0, 500)],
        target_lang: 'FR',
        source_lang: 'EN'
      })
    });

    const data = await response.json();

    if (data.translations && data.translations[0]) {
      return data.translations[0].text;
    }
    return text;
  } catch (err) {
    console.error(`  ⚠️ DeepL error: ${err.message}`);
    return text;
  }
}

async function testDeepL() {
  console.log('🔍 Test DeepL Free API\n');

  const testTitles = [
    'Leica R4S Stuck Shutter - Not Triggering Fix',
    'HOLTZLING – Holtzling OT8350 scie sur table',
    'Photographic Flash Units Maintenance & Repair Manual',
    'Vestel 17IPS62 Board Repair Guide & Schematics',
    'C260N Wiring Diagrams'
  ];

  for (const title of testTitles) {
    console.log(`EN: ${title}`);
    const translated = await translateWithDeepL(title);
    console.log(`FR: ${translated}`);
    console.log('');
  }
}

testDeepL();
