"""
toyota-read-pdfs.py
Lit les 84 PDFs Toyota et extrait titre + pages pour proposer le renommage.
"""
import fitz
from pathlib import Path

TOYOTA_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile\TOYOTA')
pdfs = sorted(TOYOTA_DIR.glob('*.pdf'))

print(f'{len(pdfs)} PDFs trouvés\n')

for pdf in pdfs:
    try:
        doc = fitz.open(str(pdf))
        pages = len(doc)
        meta_title = doc.metadata.get('title', '').strip()
        p1 = doc[0].get_text().strip()[:400].replace('\n', ' | ')
        doc.close()
        print(f'FILE: {pdf.name}')
        print(f'  pages={pages} | meta={meta_title}')
        print(f'  p1: {p1[:300]}')
        print()
    except Exception as e:
        print(f'FILE: {pdf.name} | ERREUR: {e}')
        print()
