"""
fix-dell-6-gen-previews.py
Génère les 5 previews JPG manquantes pour les docs DELL corrigés.
Sélectionne la première page avec image embarquée (smart preview DELL).
Sortie : scripts/temp_smart_previews/{new_slug}.jpg
"""
import os, sys
import fitz  # PyMuPDF

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR    = os.path.join(SCRIPT_DIR, "temp_smart_previews")
os.makedirs(OUT_DIR, exist_ok=True)

DOCS = [
    {
        "new_slug": "dell-alienware-17-r4-service-manual-de-4",
        "pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\alienware-17-r4_938925.pdf",
    },
    {
        "new_slug": "dell-dell-g7-15-service-manual-zh",
        "pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-15-7588_1571625.pdf",
    },
    {
        "new_slug": "dell-dell-g7-7790-service-manual-it",
        "pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-17-7790_1571811.pdf",
    },
    {
        "new_slug": "dell-dell-inspiron-15-5567-service-manual-vi",
        "pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5567_943968.pdf",
    },
    {
        "new_slug": "dell-dell-inspiron-15-5576-gaming-service-manual-ko",
        "pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5576-gaming_944235.pdf",
    },
]

def find_best_page(doc):
    """Première page avec au moins 1 image embarquée (à partir de la page 3)."""
    for i in range(2, min(50, len(doc))):
        if doc[i].get_images():
            return i
    # Fallback page 1
    return 1

for entry in DOCS:
    slug = entry["new_slug"]
    pdf_path = entry["pdf"]
    out_path = os.path.join(OUT_DIR, f"{slug}.jpg")

    if not os.path.exists(pdf_path):
        print(f"  ✗ PDF introuvable : {pdf_path}")
        continue

    doc = fitz.open(pdf_path)
    page_idx = find_best_page(doc)
    page = doc[page_idx]

    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat)

    # Redimensionner à 800px de large
    scale = 800 / pix.width
    mat2 = fitz.Matrix(2.0 * scale, 2.0 * scale)
    pix = page.get_pixmap(matrix=mat2)

    pix.save(out_path)
    doc.close()
    print(f"  ✓ {slug}.jpg (page {page_idx + 1})")

print(f"\nDone — {len(DOCS)} previews générées dans temp_smart_previews/")
