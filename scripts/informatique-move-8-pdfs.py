"""
informatique-move-8-pdfs.py
Déplace les 8 PDFs Informatique restants de DOSSIER SOURCE vers DOCS EN LIGNE.
Ces docs sont déjà en base Supabase (statut "imported") — seul le fichier local manque.
"""
import shutil
from pathlib import Path

SRC = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Informatique')
DST = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique')

moves = [
    (SRC / 'HP'       / 'compaq-presario-1825_381459.pdf', DST / 'HP'       / 'compaq-presario-1825_381459.pdf'),
    (SRC / 'HP'       / 'compaq-presario-1905_381465.pdf', DST / 'HP'       / 'compaq-presario-1905_381465.pdf'),
    (SRC / 'IBM'      / 'thinkpad-r30_318051.pdf',         DST / 'IBM'      / 'thinkpad-r30_318051.pdf'),
    (SRC / 'IBM'      / 'thinkpad-340x_381210.pdf',        DST / 'IBM'      / 'thinkpad-340x_381210.pdf'),
    (SRC / 'PANASONIC'/ 'cf-18_246141.pdf',                DST / 'PANASONIC'/ 'cf-18_246141.pdf'),
    (SRC / 'SONY'     / 'pcg-f340_395667.pdf',             DST / 'SONY'     / 'pcg-f340_395667.pdf'),
    (SRC / 'SONY'     / 'pcgfx310_218637.pdf',             DST / 'SONY'     / 'pcgfx310_218637.pdf'),
    (SRC / 'SONY'     / 'vgn-fj_380970.pdf',               DST / 'SONY'     / 'vgn-fj_380970.pdf'),
]

ok = 0
for src, dst in moves:
    if src.exists():
        shutil.move(str(src), str(dst))
        print(f'OK : {src.name}')
        ok += 1
    else:
        print(f'MANQUANT : {src.name}')

print(f'\n{ok}/{len(moves)} fichiers déplacés.')
