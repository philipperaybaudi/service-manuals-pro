import json, re, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/docs-a-classer-report-horlogerie.json', encoding='utf-8') as f:
    data = json.load(f)

docs = [d for d in data['docs'] if d.get('status') == 'done']
errors = []

for d in docs:
    fn = d.get('original_filename', '')
    slug = d.get('slug', '')
    title_en = d.get('title_en', '')
    title_fr = d.get('title_fr', '')
    price = d.get('price', 0)
    desc_en = d.get('description_en', '')
    desc_fr = d.get('description_fr', '')
    brand = d.get('brand', '')

    # Check title lengths
    if len(title_en) > 60:
        errors.append(f'TITLE_EN_LONG [{len(title_en)}]: {fn} -> {title_en}')
    if len(title_fr) > 60:
        errors.append(f'TITLE_FR_LONG [{len(title_fr)}]: {fn} -> {title_fr}')

    # Check price vs dollar sign in filename
    m = re.search(r'\$(\d+)', fn)
    if m:
        expected = int(m.group(1)) * 100
        if price != expected:
            errors.append(f'PRICE_MISMATCH: {fn} -> price={price} expected={expected}')

    # Check empty fields
    if not desc_en:
        errors.append(f'NO_DESC_EN: {fn}')
    if not desc_fr:
        errors.append(f'NO_DESC_FR: {fn}')
    if not slug:
        errors.append(f'NO_SLUG: {fn}')
    if not title_fr:
        errors.append(f'NO_TITLE_FR: {fn}')
    if not brand:
        errors.append(f'NO_BRAND: {fn}')

print(f'Validated {len(docs)} done docs')
print(f'Errors found: {len(errors)}')
for e in errors:
    print(' ', e)
