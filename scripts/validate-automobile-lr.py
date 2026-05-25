import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/docs-a-classer-report-automobile.json', encoding='utf-8') as f:
    data = json.load(f)

docs = [d for d in data['docs'] if d.get('status') == 'done']
print(f'Nouvelles entrees (done): {len(docs)}')

errors = []
slugs = []

for d in docs:
    fn = d.get('original_filename', '')
    slug = d.get('slug', '')
    title_en = d.get('title_en', '')
    title_fr = d.get('title_fr', '')
    price = d.get('price', 0)
    desc_en = d.get('description_en', '')
    desc_fr = d.get('description_fr', '')
    brand = d.get('brand', '')

    # Prix vs $X dans filename
    m = re.search(r'\$(\d+)', fn)
    if m:
        expected = int(m.group(1)) * 100
        if price != expected:
            errors.append(f'PRICE [{fn}]: {price} != {expected}')

    # Longueur titres
    if len(title_en) > 60:
        errors.append(f'TITLE_EN_LONG [{len(title_en)}] {fn}: {title_en}')
    if len(title_fr) > 60:
        errors.append(f'TITLE_FR_LONG [{len(title_fr)}] {fn}: {title_fr}')

    # Champs vides
    if not slug: errors.append(f'NO_SLUG: {fn}')
    if not title_fr: errors.append(f'NO_TITLE_FR: {fn}')
    if not brand: errors.append(f'NO_BRAND: {fn}')
    if not desc_en: errors.append(f'NO_DESC_EN: {fn}')
    if not desc_fr: errors.append(f'NO_DESC_FR: {fn}')

    # Doublons de slug interne
    if slug in slugs:
        errors.append(f'SLUG_DUP_INTERNE: {slug} ({fn})')
    else:
        slugs.append(slug)

    print(f'  [{price//100}$] {slug}')

print(f'\nErreurs: {len(errors)}')
for e in errors:
    print(' ', e)
