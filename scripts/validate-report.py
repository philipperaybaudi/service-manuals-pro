import json, re
from pathlib import Path
from collections import Counter

f = Path(r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-machines-outils.json')
data = json.loads(f.read_text(encoding='utf-8'))
docs = data['docs']

statuses = Counter(d['status'] for d in docs)
print(f'Total entrees JSON: {len(docs)}')
print(f'Par status: {dict(statuses)}')
print()

new_docs = [d for d in docs if d['status'] == 'done']
print(f'=== {len(new_docs)} nouvelles (status=done) ===')

issues = []
for d in new_docs:
    fname = d.get('original_filename', '')
    m = re.search(r'\$(\d+)', fname)
    price_in_name = int(m.group(1)) * 100 if m else None

    price_ok = (price_in_name is None or price_in_name == d.get('price', 0))
    desc_all = (d.get('description_en', '') + ' ' + d.get('description_fr', '')).lower()
    lang_words = ['in english', 'in french', 'in german', 'en anglais', 'en français', 'en allemand', 'en anglais']
    lang_in_desc = any(w in desc_all for w in lang_words)
    html_in_desc = any(c in desc_all for c in ['<b>', '<p>', '<br>', '<ul>'])

    flag = []
    if not price_ok:
        flag.append(f'PRIX: nom={price_in_name} vs json={d.get("price")}')
    if lang_in_desc:
        flag.append('LANGUE dans desc')
    if html_in_desc:
        flag.append('HTML dans desc')

    marker = '  [OK]' if not flag else '  [!!]'
    print(f'{marker} [{d["brand"]}] {d["slug"]}')
    print(f'       prix={d.get("price")}cts | lang={d.get("language")} | pages={d.get("page_count")}')
    if flag:
        for fl in flag:
            print(f'       => {fl}')
        issues.append({'slug': d['slug'], 'issues': flag})

print()
print(f'=== BILAN: {len(new_docs)} nouvelles entrees | {len(issues)} avec problemes ===')
