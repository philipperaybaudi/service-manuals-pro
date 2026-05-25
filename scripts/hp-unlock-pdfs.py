"""
hp-unlock-pdfs.py — Supprime les protections PDF de tous les PDFs HP
=====================================================================
- Parcourt récursivement D:\LAPTOP\HP
- Pour chaque PDF :
    * Owner-password uniquement (restrictions) → supprimé sans mot de passe
    * User-password (verrou ouverture) → signalé dans le rapport (impossible sans MDP)
    * Déjà déverrouillé → ignoré
- Écrase le fichier source (pas de copie séparée)
- Rapport final : hp-unlock-report.json

Usage : python -X utf8 scripts/hp-unlock-pdfs.py [--dry-run]
"""

import os, sys, json
from pathlib import Path

DRY_RUN = '--dry-run' in sys.argv
SOURCE_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Usinage')

try:
    import pikepdf
except ImportError:
    print('❌ pikepdf non installé. Lancer : pip install pikepdf')
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
REPORT_FILE = SCRIPT_DIR / 'hp-unlock-report.json'

print(f'\n{"═"*64}')
print(f'  HP PDF UNLOCK{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'  Source : {SOURCE_DIR}')
print(f'{"═"*64}\n')

if not SOURCE_DIR.exists():
    print(f'❌ Dossier introuvable : {SOURCE_DIR}')
    sys.exit(1)

# Collecter tous les PDFs
all_pdfs = sorted(SOURCE_DIR.rglob('*.pdf'))
print(f'  {len(all_pdfs)} PDFs trouvés\n')

results = {
    'unlocked':      [],  # protection levée avec succès
    'already_open':  [],  # déjà sans protection
    'need_password': [],  # user password requis
    'errors':        [],  # autres erreurs
}

for i, pdf_path in enumerate(all_pdfs, 1):
    rel = pdf_path.relative_to(SOURCE_DIR)

    try:
        # Tenter d'ouvrir sans mot de passe
        pdf = pikepdf.open(str(pdf_path), allow_overwriting_input=True)

        # Vérifier si des restrictions existent
        enc = pdf.encryption
        if not enc:
            # Pas de chiffrement du tout
            pdf.close()
            results['already_open'].append(str(rel))
            continue

        # Il y a du chiffrement : on peut le lever (owner password uniquement)
        if DRY_RUN:
            print(f'  [DRY] À déverrouiller : {rel}')
            pdf.close()
            results['unlocked'].append(str(rel))
            continue

        # Sauvegarder sans chiffrement (écrase l'original)
        pdf.save(str(pdf_path), encryption=False)
        pdf.close()
        print(f'  ✓ {rel}')
        results['unlocked'].append(str(rel))

    except pikepdf.PasswordError:
        # User password requis
        print(f'  🔒 MDP requis : {rel}')
        results['need_password'].append(str(rel))

    except Exception as e:
        print(f'  ✗ Erreur : {rel} — {e}')
        results['errors'].append({'file': str(rel), 'error': str(e)})

    if i % 50 == 0:
        print(f'  [{i}/{len(all_pdfs)}] {len(results["unlocked"])} déverrouillés, '
              f'{len(results["need_password"])} avec MDP, '
              f'{len(results["errors"])} erreurs')

# ── Rapport ──────────────────────────────────────────────────────────────────
print(f'\n{"═"*64}')
print(f'  RÉSULTATS')
print(f'{"═"*64}')
print(f'  ✓ Déverrouillés     : {len(results["unlocked"])}')
print(f'  ○ Déjà ouverts      : {len(results["already_open"])}')
print(f'  🔒 MDP requis       : {len(results["need_password"])}')
print(f'  ✗ Erreurs           : {len(results["errors"])}')

if results['need_password']:
    print(f'\n  — PDFs nécessitant un mot de passe —')
    for f in results['need_password']:
        print(f'    {f}')

if results['errors']:
    print(f'\n  — Erreurs —')
    for e in results['errors']:
        print(f'    {e["file"]} | {e["error"]}')

with open(REPORT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Rapport : {REPORT_FILE}')
print(f'{"═"*64}\n')
