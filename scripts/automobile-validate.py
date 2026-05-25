"""
automobile-validate.py
Vérifie prix et slugs dupliqués dans le rapport Automobile.
"""
import json, re
from pathlib import Path

report = Path('scripts/docs-a-classer-report-automobile.json')
with open(report, encoding='utf-8') as f:
    data = json.load(f)

docs = data['docs']

print('=== PRIX INCOHÉRENTS (nom fichier vs rapport) ===')
prix_ko = []
for d in docs:
    fname = d['original_filename']
    m = re.search(r'\$(\d+)', fname)
    if m:
        price_fname = int(m.group(1)) * 100
        price_report = d['price']
        if price_fname != price_report:
            prix_ko.append(d)
            print(f"  FICHIER=${price_fname//100} vs RAPPORT=${price_report//100} : {fname}")

if not prix_ko:
    print('  Aucun — OK')

print(f'\n=== SLUGS DUPLIQUÉS — détail ({len(docs)} docs) ===')
slugs = {}
for d in docs:
    s = d['slug']
    if s not in slugs:
        slugs[s] = []
    slugs[s].append(d['original_filename'])

dupes_found = 0
for slug, files in slugs.items():
    if len(files) > 1:
        dupes_found += 1
        print(f'  {slug}')
        for f in files:
            print(f'    - {f}')

if dupes_found == 0:
    print('  Aucun — OK')
