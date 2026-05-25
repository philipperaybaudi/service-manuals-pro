"""
generate-dell-previews-for-import.py
=====================================
Génère les previews page 1 (PyMuPDF) pour les 1927 docs DELL (status="done")
et les place dans scripts/temp_previews/ pour que l'import les utilise.

Remplace les previews générées par classify (polices manquantes).

Usage :
    python scripts/generate-dell-previews-for-import.py
"""

import os, sys, json
import fitz  # PyMuPDF

REPORT_PATH = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_SOURCE = r"C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Informatique\DELL"
OUTPUT_DIR  = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_previews"

THUMB_WIDTH = 800

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Chargement ────────────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding='utf-8') as f:
    data = json.load(f)

targets = [d for d in data['docs']
           if d.get('brand') == 'DELL' and d.get('status') == 'done']

print(f"Docs DELL (done) à traiter : {len(targets)}")
print(f"Sortie : {OUTPUT_DIR}\n")

ok = missing = error = 0

for i, doc in enumerate(targets):
    slug  = doc.get('slug', '')
    if not slug:
        missing += 1
        continue

    fname    = os.path.basename(doc.get('original_path') or doc.get('original_filename') or '')
    pdf_path = os.path.join(DOCS_SOURCE, fname)

    if not os.path.exists(pdf_path):
        print(f"  [MANQUANT] {fname}")
        missing += 1
        continue

    out_path = os.path.join(OUTPUT_DIR, f"{slug}.jpg")

    try:
        doc_fitz = fitz.open(pdf_path)
        page     = doc_fitz[0]  # Page 1 — couverture
        scale    = THUMB_WIDTH / page.rect.width
        mat      = fitz.Matrix(scale, scale)
        pix      = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(out_path)
        doc_fitz.close()
        ok += 1
    except Exception as e:
        print(f"  [ERREUR] {slug} : {e}")
        error += 1

    if (i + 1) % 100 == 0:
        print(f"  {i+1}/{len(targets)} traités...")

print(f"\nTerminé — {ok} OK | {missing} manquants | {error} erreurs")
print(f"\nÉtape suivante :")
print('  cd "C:\\Users\\adm\\Claude Doc GB test\\service-manuals-pro" && node scripts/import-from-report.mjs Informatique --dry-run')
