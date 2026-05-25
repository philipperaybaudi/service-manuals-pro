"""
automobile-unlock-pdfs.py — Phase 0 : déverrouillage PDFs Automobile
Supprime les owner passwords sans connaître le mot de passe (pikepdf).
"""
import sys
from pathlib import Path

SOURCE_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile')

try:
    import pikepdf
except ImportError:
    print('pikepdf non installé. Lancer : pip install pikepdf')
    sys.exit(1)

all_pdfs = sorted(SOURCE_DIR.rglob('*.pdf'))
print(f'\n{"="*60}')
print(f'  AUTOMOBILE — PHASE 0 DÉVERROUILLAGE ({len(all_pdfs)} PDFs)')
print(f'{"="*60}\n')

unlocked = 0
already_ok = 0
errors = []

for pdf_path in all_pdfs:
    rel = pdf_path.relative_to(SOURCE_DIR)
    try:
        with pikepdf.open(str(pdf_path), allow_overwriting_input=True) as doc:
            if doc.is_encrypted:
                doc.save(str(pdf_path), encryption=False)
                print(f'  ✓ Déverrouillé : {rel}')
                unlocked += 1
            else:
                print(f'  ○ OK (pas de protection) : {rel}')
                already_ok += 1
    except pikepdf.PasswordError:
        print(f'  ✗ USER PASSWORD requis (impossible à déverrouiller) : {rel}')
        errors.append(str(rel))
    except Exception as e:
        print(f'  ✗ Erreur : {rel} — {e}')
        errors.append(str(rel))

print(f'\n{"="*60}')
print(f'  BILAN : {unlocked} déverrouillés | {already_ok} déjà OK | {len(errors)} erreurs')
if errors:
    print(f'  ERREURS :')
    for e in errors:
        print(f'    {e}')
print(f'{"="*60}\n')
