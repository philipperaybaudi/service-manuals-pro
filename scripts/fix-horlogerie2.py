import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/docs-a-classer-report-horlogerie.json', encoding='utf-8') as f:
    data = json.load(f)

price_fixes = {
    'Marshall 1 $7.pdf': 700,
    'Marshall 3 $7.pdf': 700,
    'Marshall 4 $7.pdf': 700,
    '674_Zenith40.0,3029PHC,41.0,3029PHF $2.pdf': 200,
}

for d in data['docs']:
    fn = d.get('original_filename', '')
    if fn in price_fixes:
        old = d.get('price')
        d['price'] = price_fixes[fn]
        print(f'Fixed price {fn}: {old} -> {price_fixes[fn]}')

with open('scripts/docs-a-classer-report-horlogerie.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done.')
