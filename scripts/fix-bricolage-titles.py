import json, sys
sys.stdout.reconfigure(encoding='utf-8')

report = 'scripts/docs-a-classer-report-bricolage & diy.json'
with open(report, encoding='utf-8') as f:
    data = json.load(f)

fixes = {
    '500 Pannes 4e édition $25.pdf': {
        'title_en': '500 Faults: Radio, Television and Electronics',
    },
    'Aide mémoire du dépanneur $10.pdf': {
        'title_en': "Radio Technician's Reference - Components Guide",
        'title_fr': 'Aide-mémoire du dépanneur - Composants radio',
    },
    'Alignement des récepteurs radio $15.pdf': {
        'title_en': 'Radio Receiver Alignment - Circuits and Coils',
        'title_fr': 'Alignement des récepteurs radio et bobinages',
    },
    'Bases du dépannage Vol 1, Alimentation et BF $20.pdf': {
        'title_en': 'Troubleshooting Basics Vol. 1: Power and Audio',
    },
    'Bases du dépannage Vol 2, CF, HF, MF, détection $17.pdf': {
        'title_en': 'Troubleshooting Basics Vol. 2: HF, MF, Detection',
    },
    "L'art du Dépannage des TSF $11.pdf": {
        'title_fr': "L'art du dépannage et mise au point des TSF",
    },
    'Le Dépannage à la Portée de Tous $5.pdf': {
        'title_en': 'Radio Troubleshooting for Everyone',
    },
    'Memento Tungsram 3ème volume Guide Radio Dépannage $20.pdf': {
        'title_fr': 'Memento Tungsram Vol. 3 - Guide Dépannage Radio',
    },
    'Pannes Radio $18.pdf': {
        'title_en': 'Pannes Radio: Tubes and Transistor Receivers',
        'title_fr': 'Pannes Radio: Récepteurs à Tubes et Transistors',
    },
    'Réparation des Récepteurs à Transistors $17.pdf': {
        'title_en': 'Repair of Transistor Receivers',
        'title_fr': 'Réparation des Récepteurs à Transistors',
    },
    'Technique nouvelle du dépannage $15.pdf': {
        'title_en': 'New Rational Radio Troubleshooting Technique',
    },
}

fixed = 0
for d in data['docs']:
    fn = d.get('original_filename', '')
    if fn in fixes:
        for field, value in fixes[fn].items():
            old = d.get(field, '')
            d[field] = value
            print(f'  {fn[:40]} | {field}: ({len(old)}) → ({len(value)}) ✓')
            fixed += 1

with open(report, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'\nTotal : {fixed} titres corrigés')

# Vérification finale
errors = 0
for d in data['docs']:
    if d.get('status') == 'done':
        for field in ('title_en', 'title_fr'):
            v = d.get(field, '')
            if len(v) > 60:
                print(f'⚠️  ENCORE TROP LONG: {d["original_filename"]} | {field}: "{v}" ({len(v)})')
                errors += 1
if errors == 0:
    print('✓ Tous les titres sont dans la limite 60 chars')
