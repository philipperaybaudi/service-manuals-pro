"""
cincinnati-extract-toc.py
Extrait les tables des matières des PDFs Cincinnati >= $20
et affiche le texte trouvé pour validation.
"""
import re, sys
from pathlib import Path
import fitz  # PyMuPDF

DOCS_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Machines-Outils\CINCINNATI')

# PDFs eligibles (>= $20)
ELIGIBLE = [f for f in DOCS_DIR.glob('*.pdf')
            if (m := re.search(r'\$(\d+)', f.name)) and int(m.group(1)) >= 20]
ELIGIBLE.sort()

TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index', 'section']

def find_toc_page(doc, max_pages=15):
    """Cherche la page contenant une table des matières dans les premiers max_pages."""
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        text = page.get_text().strip()
        text_low = text.lower()
        if any(kw in text_low for kw in TOC_KEYWORDS) and len(text) > 50:
            return i, text
    return None, None

print(f'\n{"="*70}')
print(f'  CINCINNATI — EXTRACTION TABLES DES MATIERES ({len(ELIGIBLE)} PDFs)')
print(f'{"="*70}\n')

results = {}

for pdf_path in ELIGIBLE:
    price_match = re.search(r'\$(\d+)', pdf_path.name)
    price = int(price_match.group(1)) if price_match else 0
    print(f'\n{"─"*70}')
    print(f'  {pdf_path.name}  [${price}]')
    print(f'{"─"*70}')

    try:
        doc = fitz.open(str(pdf_path))
        n = len(doc)
        print(f'  Pages: {n}')

        # Chercher TOC dans les 15 premières pages
        toc_page_idx, toc_text = find_toc_page(doc, max_pages=15)

        if toc_page_idx is not None:
            print(f'  ✓ TOC trouvée page {toc_page_idx + 1}')
            print(f'  --- TEXTE EXTRAIT ---')
            # Nettoyer et afficher
            lines = [l.strip() for l in toc_text.splitlines() if l.strip()]
            for line in lines[:60]:  # Limiter affichage
                print(f'  {line}')
            if len(lines) > 60:
                print(f'  ... ({len(lines) - 60} lignes supplémentaires)')
            results[pdf_path.name] = {
                'path': str(pdf_path),
                'toc_page': toc_page_idx + 1,
                'toc_lines': lines,
            }
        else:
            print(f'  ✗ Aucune TOC trouvée dans les 15 premières pages')
            # Afficher les 5 premières pages pour diagnostic
            for i in range(min(5, n)):
                txt = doc[i].get_text().strip()
                if txt:
                    print(f'  [Page {i+1} texte]: {txt[:200]}')
                else:
                    print(f'  [Page {i+1}]: image/scan sans texte extractible')
            results[pdf_path.name] = {'path': str(pdf_path), 'toc_page': None, 'toc_lines': []}

        doc.close()
    except Exception as e:
        print(f'  ERREUR: {e}')

print(f'\n{"="*70}')
print(f'  BILAN: {sum(1 for r in results.values() if r["toc_page"])} TOC trouvées / {len(ELIGIBLE)} PDFs')
print(f'{"="*70}\n')
