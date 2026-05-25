"""
generate-asus-jpgs.py
======================
Génère les thumbnails JPG pour ASUS :
- Slug contient "schematic" → crop top-left 55% de la page 1 (règle schema pipeline)
- Sinon → cherche première page avec photos (démontage)

Usage :
    python scripts/generate-asus-jpgs.py [--dry-run]

Sortie : scripts/temp_smart_previews/{slug}.jpg
"""

import os
import sys
import json
import fitz  # PyMuPDF

REPORT_PATH   = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_EN_LIGNE = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\ASUS"
OUT_DIR       = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_smart_previews"

SKIP_FIRST_N  = 2
MAX_SCAN      = 50
MIN_IMAGES    = 1
THUMB_WIDTH   = 800
CROP_RATIO    = 0.55  # schema : crop top-left 55%

DRY_RUN = "--dry-run" in sys.argv

with open(REPORT_PATH, encoding="utf-8") as f:
    report = json.load(f)

targets = []
for doc in report.get("docs", []):
    if doc.get("status") != "imported":
        continue
    if (doc.get("brand") or "").upper() != "ASUS":
        continue
    slug = doc.get("slug")
    original_filename = os.path.basename(doc.get("original_filename") or doc.get("original_path") or "")
    if not slug or not original_filename:
        continue
    pdf_path = os.path.join(DOCS_EN_LIGNE, original_filename)
    is_schema = "schematic" in slug or "schema" in slug
    targets.append({"slug": slug, "pdf_path": pdf_path,
                    "filename": original_filename, "is_schema": is_schema})

print(f"Marque           : ASUS")
print(f"Documents cibles : {len(targets)}")
schemas = sum(1 for t in targets if t["is_schema"])
manuals = len(targets) - schemas
print(f"  dont schémas   : {schemas}")
print(f"  dont manuels   : {manuals}")
if DRY_RUN:
    print("MODE DRY-RUN — aucun fichier écrit")
print()

if not DRY_RUN:
    os.makedirs(OUT_DIR, exist_ok=True)


def render_schema_thumb(doc_fitz):
    """Page 1, crop top-left 55%."""
    page = doc_fitz[0]
    w, h = page.rect.width, page.rect.height
    clip  = fitz.Rect(0, 0, w * CROP_RATIO, h * CROP_RATIO)
    scale = THUMB_WIDTH / (w * CROP_RATIO)
    mat   = fitz.Matrix(scale, scale)
    pix   = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return pix.tobytes("jpeg")


def find_best_page(doc_fitz):
    n = len(doc_fitz)
    for i in range(SKIP_FIRST_N, min(n, SKIP_FIRST_N + MAX_SCAN)):
        images = doc_fitz[i].get_images(full=False)
        if len(images) >= MIN_IMAGES:
            return i, len(images)
    return min(1, n - 1), 0


def render_manual_thumb(doc_fitz, page_idx):
    page  = doc_fitz[page_idx]
    scale = THUMB_WIDTH / page.rect.width
    mat   = fitz.Matrix(scale, scale)
    pix   = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("jpeg")


ok = 0
errors = 0
fallbacks = 0

for i, t in enumerate(targets):
    slug      = t["slug"]
    pdf_path  = t["pdf_path"]
    num       = f"[{i+1}/{len(targets)}]"

    if not os.path.exists(pdf_path):
        print(f"  {num} ✗ INTROUVABLE : {t['filename']}")
        errors += 1
        continue

    try:
        doc = fitz.open(pdf_path)

        if t["is_schema"]:
            marker = "[schema crop 55%]"
            if not DRY_RUN:
                jpg = render_schema_thumb(doc)
        else:
            page_idx, n_images = find_best_page(doc)
            if n_images == 0:
                marker = f"[fallback p.{page_idx+1}]"
                fallbacks += 1
            else:
                marker = f"[p.{page_idx+1}, {n_images} img]"
            if not DRY_RUN:
                jpg = render_manual_thumb(doc, page_idx)

        doc.close()

        if DRY_RUN:
            print(f"  {num} DRY  {marker}  {slug}")
            ok += 1
            continue

        out_path = os.path.join(OUT_DIR, f"{slug}.jpg")
        with open(out_path, "wb") as f:
            f.write(jpg)
        print(f"  {num} OK  {marker}  {slug}")
        ok += 1

    except Exception as e:
        print(f"  {num} ✗ ERREUR {slug} : {e}")
        errors += 1

print()
print(f"Terminé — {ok} OK | {fallbacks} fallback | {errors} erreurs")
print(f"JPGs dans : {OUT_DIR}")
