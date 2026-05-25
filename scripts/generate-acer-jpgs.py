"""
generate-acer-jpgs.py
======================
Étape 1 : génère les thumbnails JPG des docs ACER dans un dossier temp.
Sélectionne la première page avec des images (photos de démontage).

Usage :
    python scripts/generate-acer-jpgs.py [--brand ACER] [--dry-run]

Sortie : scripts/temp_smart_previews/{slug}.jpg
"""

import os
import sys
import json
import fitz  # PyMuPDF

# ── Config ────────────────────────────────────────────────────────────────────
REPORT_PATH   = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_EN_LIGNE = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique"
OUT_DIR       = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_smart_previews"

SKIP_FIRST_N  = 2    # ignorer pages 0 et 1, chercher à partir de l'index 2
MAX_SCAN      = 50   # scanner au plus 50 pages
MIN_IMAGES    = 1    # nombre minimum d'images pour retenir une page
THUMB_WIDTH   = 800  # largeur thumbnail px

# ── Args ──────────────────────────────────────────────────────────────────────
args         = sys.argv[1:]
DRY_RUN      = "--dry-run" in args
BRAND_FILTER = "ACER"
if "--brand" in args:
    idx = args.index("--brand")
    if idx + 1 < len(args):
        BRAND_FILTER = args[idx + 1].upper()

# ── Load report ───────────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding="utf-8") as f:
    report = json.load(f)

targets = []
for doc in report.get("docs", []):
    if doc.get("status") != "imported":
        continue
    if (doc.get("brand") or "").upper() != BRAND_FILTER:
        continue
    slug = doc.get("slug")
    original_filename = os.path.basename(doc.get("original_filename") or doc.get("original_path") or "")
    if not slug or not original_filename:
        continue
    pdf_path = os.path.join(DOCS_EN_LIGNE, BRAND_FILTER, original_filename)
    targets.append({"slug": slug, "pdf_path": pdf_path, "filename": original_filename})

print(f"Marque           : {BRAND_FILTER}")
print(f"Documents cibles : {len(targets)}")
print(f"Dossier sortie   : {OUT_DIR}")
if DRY_RUN:
    print("MODE DRY-RUN — aucun fichier écrit")
print()

if not DRY_RUN:
    os.makedirs(OUT_DIR, exist_ok=True)


def find_best_page(doc_fitz):
    n = len(doc_fitz)
    for i in range(SKIP_FIRST_N, min(n, SKIP_FIRST_N + MAX_SCAN)):
        page   = doc_fitz[i]
        images = page.get_images(full=False)
        if len(images) >= MIN_IMAGES:
            return i, len(images)
    return min(1, n - 1), 0


def render_thumb(doc_fitz, page_idx):
    page  = doc_fitz[page_idx]
    scale = THUMB_WIDTH / page.rect.width
    mat   = fitz.Matrix(scale, scale)
    pix   = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("jpeg")


ok = 0
errors = 0
fallbacks = 0

for i, t in enumerate(targets):
    slug     = t["slug"]
    pdf_path = t["pdf_path"]
    num      = f"[{i+1}/{len(targets)}]"

    if not os.path.exists(pdf_path):
        print(f"  {num} ✗ INTROUVABLE : {t['filename']}")
        errors += 1
        continue

    try:
        doc  = fitz.open(pdf_path)
        page_idx, n_images = find_best_page(doc)

        if n_images == 0:
            marker = f"[fallback p.{page_idx+1}]"
            fallbacks += 1
        else:
            marker = f"[p.{page_idx+1}, {n_images} img]"

        if DRY_RUN:
            print(f"  {num} DRY  {marker}  {slug}")
            doc.close()
            ok += 1
            continue

        jpg = render_thumb(doc, page_idx)
        doc.close()

        out_path = os.path.join(OUT_DIR, f"{slug}.jpg")
        with open(out_path, "wb") as f:
            f.write(jpg)

        print(f"  {num} ✓ {marker}  {slug}")
        ok += 1

    except Exception as e:
        print(f"  {num} ✗ ERREUR {slug} : {e}")
        errors += 1

print()
print(f"Terminé — {ok} OK | {fallbacks} fallback | {errors} erreurs")
print(f"JPGs dans : {OUT_DIR}")
