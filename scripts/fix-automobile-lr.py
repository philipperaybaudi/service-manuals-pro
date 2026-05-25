import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/docs-a-classer-report-automobile.json', encoding='utf-8') as f:
    data = json.load(f)

# --- 1. Auto-fix prices from $X in filename ---
price_fixed = 0
for d in data['docs']:
    if d.get('status') != 'done':
        continue
    fn = d.get('original_filename', '')
    m = re.search(r'\$(\d+)', fn)
    if m:
        expected = int(m.group(1)) * 100
        if d.get('price') != expected:
            d['price'] = expected
            price_fixed += 1

print(f'Prix corrigés: {price_fixed}')

# --- 2. Fix titles > 60 chars ---
title_fixes = {
    'Land-Rover_2e-Echelon-Ambulance $20.pdf': {
        'title_fr': 'Ambulance Land Rover Second Échelon - Manuel technique',
    },
    'Land-Rover_3e-Echelon-Ambulance $18.pdf': {
        'title_en': 'Land Rover 3e Echelon Ambulance Technical Manual 4x4',
        'title_fr': 'Manuel technique ambulance Land Rover 3e échelon 4x4',
    },
    'Land-Rover_Discovery-Series-II-V8-Engine-Repairs $12.pdf': {
        'title_fr': 'Moteur V8 Land Rover Discovery Series II - Réparations',
    },
    'Land-Rover_Lucas-Equipment-Spare-Parts-1957 $10.pdf': {
        'title_fr': 'Lucas - Pièces détachées pour Rover et Land Rover 1957',
    },
    'Land-Rover_R6-Military-Workshop-Manual $25.pdf': {
        'title_fr': 'Land Rover Série III S - Manuel de Réparation Vol. 1',
    },
    'Land-Rover_Series-I-Brakes $10.pdf': {
        'title_fr': 'Land Rover Series I - Cylindres de Frein, Pièces S1',
    },
    'Land-Rover_Series-I-IIA-Workshop-Manual $20.pdf': {
        'title_en': 'Land Rover Series I/IIA Workshop Manual - Petrol Engine',
        'title_fr': 'Land Rover Series I/IIA - Manuel atelier moteur essence',
    },
    'Land-Rover_Series-II-IIA-Parts-Catalogue $25.pdf': {
        'title_en': 'Land Rover Series II and IIA Parts Catalogue',
        'title_fr': 'Catalogue de pièces Land Rover Série II et IIA',
    },
    'Land-Rover_Series-III-Military $10.pdf': {
        'title_en': 'Land Rover 3/4 Ton Military Vehicle - Specifications',
        'title_fr': 'Land Rover 3/4 Ton Véhicule Militaire - Spécifications',
    },
    'Land-Rover_Series-Optional-Parts-Catalogue $18.pdf': {
        'title_en': 'Land Rover Series IIA/III Optional Equipment Catalogue',
        'title_fr': 'Catalogue pièces équipements optionnels Land Rover IIA/III',
    },
    'Land-Rover_Superwinch-Overdrive-Series-I-II-III $10.pdf': {
        'title_fr': 'Superwinch Overdrive - Instructions de montage S I/II/III',
    },
}

title_fixed = 0
for d in data['docs']:
    if d.get('status') != 'done':
        continue
    fn = d.get('original_filename', '')
    if fn in title_fixes:
        for field, val in title_fixes[fn].items():
            d[field] = val
            title_fixed += 1

print(f'Titres corrigés: {title_fixed}')

with open('scripts/docs-a-classer-report-automobile.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('JSON sauvegardé.')

# --- Re-validate ---
docs = [d for d in data['docs'] if d.get('status') == 'done']
errors = []
for d in docs:
    fn = d.get('original_filename', '')
    m = re.search(r'\$(\d+)', fn)
    if m:
        expected = int(m.group(1)) * 100
        if d.get('price') != expected:
            errors.append(f'PRICE [{fn}]: {d.get("price")} != {expected}')
    if len(d.get('title_en', '')) > 60:
        errors.append(f'TITLE_EN_LONG [{len(d["title_en"])}] {fn}')
    if len(d.get('title_fr', '')) > 60:
        errors.append(f'TITLE_FR_LONG [{len(d["title_fr"])}] {fn}')

if errors:
    print(f'\n{len(errors)} erreurs restantes:')
    for e in errors:
        print(' ', e)
else:
    print('\nAll clear - aucune erreur restante!')
