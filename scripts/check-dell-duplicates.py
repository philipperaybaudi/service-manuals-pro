import json
from collections import Counter

with open(r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json', encoding='utf-8') as f:
    data = json.load(f)

done = [x.get('original_path') or x.get('original_filename', '')
        for x in data['docs']
        if x.get('brand') == 'DELL' and x.get('status') == 'done']

c = Counter(done)
dups = {k: v for k, v in c.items() if v > 1}

print(f"Total done DELL : {len(done)}")
print(f"Doublons        : {len(dups)}")
if dups:
    for k, v in list(dups.items())[:10]:
        print(f"  {v}x  {k}")
else:
    print("Aucun doublon — OK pour continuer.")
