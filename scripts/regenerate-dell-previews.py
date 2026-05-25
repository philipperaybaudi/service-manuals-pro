"""
regenerate-dell-previews.py
============================
Régénère les previews manquantes pour les docs DELL dont la preview
n'a pas pu être renommée dans Supabase (listés dans dell-needs-preview.json).

Usage :
    python scripts/regenerate-dell-previews.py
"""

import os, json
import fitz  # PyMuPDF

NEEDS_PREVIEW_PATH = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\dell-needs-preview.json"
OUTPUT_DIR         = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_smart_previews"
THUMB_WIDTH        = 800

# Vider le dossier de sortie
os.makedirs(OUTPUT_DIR, exist_ok=True)
existing = os.listdir(OUTPUT_DIR)
if existing:
    print(f"Vidage de temp_smart_previews/ ({len(existing)} fichiers)...")
    for f in existing:
        os.remove(os.path.join(OUTPUT_DIR, f))

with open(NEEDS_PREVIEW_PATH, encoding='utf-8') as f:
    items = json.load(f)

print(f"Previews à régénérer : {len(items)}\n")

ok = missing = error = 0

for item in items:
    new_slug  = item['new_slug']
    local_pdf = item['local_pdf']

    if not local_pdf or not os.path.exists(local_pdf):
        print(f"  [MANQUANT] {new_slug} — {local_pdf}")
        missing += 1
        continue

    out_path = os.path.join(OUTPUT_DIR, f"{new_slug}.jpg")
    try:
        doc  = fitz.open(local_pdf)
        page = doc[0]
        scale = THUMB_WIDTH / page.rect.width
        pix   = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        pix.save(out_path)
        doc.close()
        ok += 1
    except Exception as e:
        print(f"  [ERREUR] {new_slug} : {e}")
        error += 1

print(f"\nTerminé — {ok} OK | {missing} manquants | {error} erreurs")
print(f"JPGs dans : {OUTPUT_DIR}")
print("\nÉtape suivante :")
print("  node scripts/upload-smart-previews.mjs")
