import json, sys
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://ylsbqehotapcprfinsnu.supabase.co/storage/v1/object/public/logos/previews'

report = 'scripts/docs-a-classer-report-photographie.json'
with open(report, encoding='utf-8') as f:
    data = json.load(f)

fixed = 0
for d in data['docs']:
    if d.get('status') == 'imported' and not d.get('preview_url'):
        slug = d.get('slug', '')
        if slug:
            d['preview_url'] = f'{BASE_URL}/{slug}.jpg'
            fixed += 1

with open(report, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Fixed {fixed} preview_urls in photographie JSON')
