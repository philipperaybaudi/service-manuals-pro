"""
informatique-split-lots.py
Découpe les 559 entrées "done" en 2 lots pour respecter la limite Supabase.
Lot 1 : 300 premières entrées "done" → restent "done"
Lot 2 : 259 dernières entrées "done" → passent à "hold" (restaurables)

Usage :
  python informatique-split-lots.py split   → prépare le lot 1 (met 259 en "hold")
  python informatique-split-lots.py restore → remet les 259 "hold" en "done" pour lot 2
"""
import json, sys
from pathlib import Path

REPORT = Path(__file__).parent / 'docs-a-classer-report-informatique.json'
LOT1_SIZE = 300

with open(REPORT, encoding='utf-8') as f:
    data = json.load(f)

docs = data['docs']

if sys.argv[1] == 'split':
    done_indices = [i for i, d in enumerate(docs) if d['status'] == 'done']
    hold_indices = done_indices[LOT1_SIZE:]  # les 259 derniers
    for i in hold_indices:
        docs[i]['status'] = 'hold'
    with open(REPORT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  ✓ Lot 1 prêt : {LOT1_SIZE} entrées "done"')
    print(f'  ✓ Lot 2 en attente : {len(hold_indices)} entrées "hold"')

elif sys.argv[1] == 'restore':
    hold_indices = [i for i, d in enumerate(docs) if d['status'] == 'hold']
    for i in hold_indices:
        docs[i]['status'] = 'done'
    with open(REPORT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  ✓ {len(hold_indices)} entrées restaurées en "done" — Lot 2 prêt')
