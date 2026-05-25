import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

tp = r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_previews'
dst_dir = r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile\LAND ROVER'
os.makedirs(dst_dir, exist_ok=True)

jobs = [
    ('land-rover-rovers-north-land-rover-parts-catalogue-2000',
     'land-rover-rovers-north-land-rover-parts-catalogue-2000.jpg'),
    ('land-rover-land-rover-range-rover-turbocharger-maintenance-workshop-bulletin-slr621',
     'land-rover-land-rover-range-rover-turbocharger-maintenance-workshop-bulletin-slr621.jpg'),
]

# Copy JPGs using open('rb'/'wb') - works with accented paths
for slug, fn in jobs:
    src = os.path.join(tp, fn)
    dst = os.path.join(dst_dir, fn)
    with open(src, 'rb') as f:
        data = f.read()
    with open(dst, 'wb') as f:
        f.write(data)
    print(f'Copied: {fn}')

# Update preview_file to absolute paths in JSON report
report = r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-automobile.json'
with open(report, encoding='utf-8') as f:
    data = json.load(f)

for d in data['docs']:
    for slug, fn in jobs:
        if d.get('slug') == slug:
            new_path = os.path.join(dst_dir, fn)
            d['preview_file'] = new_path
            print(f'Updated preview_file: {slug}')

with open(report, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done - run fix-missing-preview.mjs now')
