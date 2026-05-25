"""
hp-remove-cover-page.py — Supprime la page publicitaire servicemanuals4u.com
=============================================================================
Detecre la page 1 contenant "servicemanuals4u" et la supprime.
SECURITE :
  - Ne supprime QUE la page 1 (jamais une autre page)
  - Ne supprime que si le texte "servicemanuals4u" est present sur cette page
  - Si le PDF n'a qu'une seule page => ignoré (on ne cree pas un PDF vide)
  - Dry-run disponible pour verifier avant

Usage :
  python -X utf8 scripts/hp-remove-cover-page.py --dry-run
  python -X utf8 scripts/hp-remove-cover-page.py
"""

import sys, json
from pathlib import Path

DRY_RUN    = '--dry-run' in sys.argv
SOURCE_DIR = Path(r'D:\LAPTOP\HP')
SCRIPT_DIR = Path(__file__).parent
REPORT_FILE = SCRIPT_DIR / 'hp-remove-cover-report.json'

# Marqueur textuel identifiant la page publicitaire (insensible a la casse)
MARKER = 'servicemanuals4u'

try:
    import fitz  # PyMuPDF
except ImportError:
    print('PyMuPDF non installe. Lancer : pip install pymupdf')
    sys.exit(1)

print(f'\n{"=":=<64}')
print(f'  HP REMOVE COVER PAGE{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'  Source : {SOURCE_DIR}')
print(f'  Marqueur : "{MARKER}"')
print(f'{"=":=<64}\n')

all_pdfs = sorted(SOURCE_DIR.rglob('*.pdf'))
print(f'  {len(all_pdfs)} PDFs a verifier\n')

results = {
    'removed':      [],   # page 1 supprimee
    'not_found':    [],   # marqueur absent -> PDF non touche
    'single_page':  [],   # PDF 1 seule page avec marqueur -> ignore
    'errors':       [],
}

for i, pdf_path in enumerate(all_pdfs, 1):
    rel = pdf_path.relative_to(SOURCE_DIR)

    try:
        doc = fitz.open(str(pdf_path))
        n_pages = len(doc)

        if n_pages == 0:
            doc.close()
            results['errors'].append({'file': str(rel), 'error': 'PDF vide'})
            continue

        # Lire UNIQUEMENT la page 1
        page1_text = doc[0].get_text().lower()

        if MARKER not in page1_text:
            # Page 1 ne contient pas le marqueur -> ne rien faire
            doc.close()
            results['not_found'].append(str(rel))
            continue

        # Marqueur trouve sur page 1
        if n_pages == 1:
            # PDF d'une seule page -> on ne cree pas un PDF vide
            doc.close()
            print(f'  [1 PAGE] Ignore (PDF ne serait vide) : {rel}')
            results['single_page'].append(str(rel))
            continue

        if DRY_RUN:
            print(f'  [DRY] Page 1 a supprimer ({n_pages} pages -> {n_pages-1}) : {rel}')
            doc.close()
            results['removed'].append({'file': str(rel), 'pages_before': n_pages, 'pages_after': n_pages - 1})
            continue

        # Supprimer la page 1 (index 0) et sauvegarder via buffer
        import io
        doc.delete_page(0)
        buf = io.BytesIO()
        doc.save(buf, garbage=4, deflate=True)
        doc.close()
        with open(str(pdf_path), 'wb') as f:
            f.write(buf.getvalue())

        print(f'  OK ({n_pages} -> {n_pages-1} pages) : {rel}')
        results['removed'].append({'file': str(rel), 'pages_before': n_pages, 'pages_after': n_pages - 1})

    except Exception as e:
        print(f'  ERREUR : {rel} -- {e}')
        results['errors'].append({'file': str(rel), 'error': str(e)})

    if i % 50 == 0:
        print(f'  [{i}/{len(all_pdfs)}] {len(results["removed"])} supprimes, '
              f'{len(results["not_found"])} sans marqueur, {len(results["errors"])} erreurs')

print(f'\n{"=":=<64}')
print(f'  RESULTATS')
print(f'{"=":=<64}')
print(f'  Page supprimee    : {len(results["removed"])}')
print(f'  Sans marqueur     : {len(results["not_found"])}')
print(f'  1 seule page (ok) : {len(results["single_page"])}')
print(f'  Erreurs           : {len(results["errors"])}')

if results['single_page']:
    print(f'\n  -- PDFs 1 page avec marqueur (a verifier manuellement) --')
    for f in results['single_page']:
        print(f'    {f}')

if results['errors']:
    print(f'\n  -- Erreurs --')
    for e in results['errors']:
        print(f'    {e["file"]} | {e["error"]}')

with open(REPORT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Rapport : {REPORT_FILE}')
print(f'{"=":=<64}\n')
