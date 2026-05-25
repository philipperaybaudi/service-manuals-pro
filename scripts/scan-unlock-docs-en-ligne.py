"""
scan-unlock-docs-en-ligne.py — Scanne et déverrouille tous les PDFs de DOCS EN LIGNE
======================================================================================
- Parcourt récursivement DOCS EN LIGNE
- Détecte et lève les owner passwords (sans MDP)
- Écrase les fichiers in-place
- Rapport : scripts/docs-unlock-report.json
  → liste des fichiers déverrouillés avec catégorie + marque (pour alimenter Script B)

Usage : python -X utf8 scripts/scan-unlock-docs-en-ligne.py [--dry-run]
"""

import os, sys, json
from pathlib import Path

DRY_RUN = '--dry-run' in sys.argv

DOCS_EN_LIGNE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE')
SCRIPT_DIR    = Path(__file__).parent
REPORT_FILE   = SCRIPT_DIR / 'docs-unlock-report.json'

try:
    import pikepdf
except ImportError:
    print('pikepdf non installe. Lancer : pip install pikepdf')
    sys.exit(1)

print(f'\n{"=":=<64}')
print(f'  SCAN + UNLOCK DOCS EN LIGNE{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'  Source : {DOCS_EN_LIGNE}')
print(f'{"=":=<64}\n')

all_pdfs = sorted(DOCS_EN_LIGNE.rglob('*.pdf'))
print(f'  {len(all_pdfs)} PDFs trouves\n')

results = {
    'unlocked':     [],
    'already_open': [],
    'need_password':[],
    'errors':       [],
}

for i, pdf_path in enumerate(all_pdfs, 1):
    rel   = pdf_path.relative_to(DOCS_EN_LIGNE)
    parts = rel.parts  # ex: ('Informatique', 'HP', 'filename.pdf')

    category = parts[0] if len(parts) > 0 else ''
    brand    = parts[1] if len(parts) > 1 else ''
    filename = parts[-1]

    try:
        pdf = pikepdf.open(str(pdf_path), allow_overwriting_input=True)
        enc = pdf.encryption
        if not enc:
            pdf.close()
            results['already_open'].append(str(rel))
            continue

        if DRY_RUN:
            print(f'  [DRY] Protege : {rel}')
            pdf.close()
            results['unlocked'].append({
                'path': str(pdf_path), 'rel': str(rel),
                'category': category, 'brand': brand, 'filename': filename,
            })
            continue

        pdf.save(str(pdf_path), encryption=False)
        pdf.close()
        print(f'  OK : {rel}')
        results['unlocked'].append({
            'path': str(pdf_path), 'rel': str(rel),
            'category': category, 'brand': brand, 'filename': filename,
        })

    except pikepdf.PasswordError:
        print(f'  VERROU : {rel}')
        results['need_password'].append({'rel': str(rel), 'category': category, 'brand': brand})
    except Exception as e:
        print(f'  ERREUR : {rel} -- {e}')
        results['errors'].append({'rel': str(rel), 'error': str(e)})

    if i % 200 == 0:
        print(f'  [{i}/{len(all_pdfs)}] {len(results["unlocked"])} deverrouilles, '
              f'{len(results["need_password"])} avec MDP, {len(results["errors"])} erreurs')

# Résumé par marque
brands_unlocked = {}
for entry in results['unlocked']:
    b = entry['brand']
    brands_unlocked[b] = brands_unlocked.get(b, 0) + 1

print(f'\n{"=":=<64}')
print(f'  RESULTATS')
print(f'{"=":=<64}')
print(f'  OK Deverrouilles  : {len(results["unlocked"])}')
print(f'  Deja ouverts      : {len(results["already_open"])}')
print(f'  MDP requis        : {len(results["need_password"])}')
print(f'  Erreurs           : {len(results["errors"])}')

if brands_unlocked:
    print(f'\n  -- Marques concernees --')
    for b, n in sorted(brands_unlocked.items(), key=lambda x: -x[1]):
        print(f'    {b}: {n} fichiers')

if results['need_password']:
    print(f'\n  -- PDFs avec MDP a l\'ouverture (non traites) --')
    for e in results['need_password']:
        print(f'    {e["rel"]}')

with open(REPORT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Rapport : {REPORT_FILE}')
print(f'{"=":=<64}\n')
