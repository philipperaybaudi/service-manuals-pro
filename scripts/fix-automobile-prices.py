"""
fix-automobile-prices.py
Corrige les prix dans le JSON automobile : le nom de fichier fait foi.
Si $X dans le nom → price = X * 100
Si pas de $ dans le nom → prix inchangé (classify a estimé)
"""
import json, re
from pathlib import Path

JSON_PATH = Path(r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-automobile.json')

data = json.loads(JSON_PATH.read_text(encoding='utf-8'))
docs = data['docs']

new_docs = [d for d in docs if d['status'] == 'done']

fixed = 0
for d in new_docs:
    fname = d.get('original_filename', '')
    m = re.search(r'\$(\d+)', fname)
    if m:
        price_from_name = int(m.group(1)) * 100
        if price_from_name != d.get('price', 0):
            old = d['price']
            d['price'] = price_from_name
            print(f'  FIX [{d["brand"]}] {d["slug"]}')
            print(f'       {old}cts → {price_from_name}cts (${price_from_name//100})')
            fixed += 1

JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'\n  {fixed} prix corrigés — JSON sauvegardé.')
