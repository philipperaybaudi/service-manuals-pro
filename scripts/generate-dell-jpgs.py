"""
generate-dell-jpgs.py
=====================
Génère les previews JPG pour les docs DELL déjà importés (status="imported").
- Page 1 (couverture) systématiquement — montre la langue du document
- Polices système Windows (CJK, arabe, etc.) via PyMuPDF
- Sortie : scripts/temp_smart_previews/{slug}.jpg

Usage :
    python scripts/generate-dell-jpgs.py [--status imported|done]
    Par défaut : --status imported
"""

import os, sys, json, re
import fitz  # PyMuPDF

# ── Chemins ───────────────────────────────────────────────────────────────────
REPORT_PATH  = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_SOURCE  = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL"
OUTPUT_DIR   = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_smart_previews"

THUMB_WIDTH  = 800   # px largeur finale
TARGET_STATUS = "done" if "--status" in sys.argv and sys.argv[sys.argv.index("--status") + 1] == "done" else "imported"

# ── Préparation dossier sortie ────────────────────────────────────────────────
os.makedirs(OUTPUT_DIR, exist_ok=True)

existing = os.listdir(OUTPUT_DIR)
if existing:
    print(f"⚠️  {len(existing)} fichier(s) dans temp_smart_previews/ — vidage...")
    for f in existing:
        os.remove(os.path.join(OUTPUT_DIR, f))
    print("   Dossier vidé.\n")

# ── Chargement JSON ───────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding='utf-8') as f:
    data = json.load(f)

targets = [d for d in data['docs']
           if d.get('brand') == 'DELL' and d.get('status') == TARGET_STATUS]

print(f"Docs DELL ({TARGET_STATUS}) à traiter : {len(targets)}")
print()

# ── Génération ────────────────────────────────────────────────────────────────
ok = missing = error = 0

for i, doc in enumerate(targets):
    slug = doc.get('slug', '')
    if not slug:
        missing += 1
        continue

    # Retrouver le PDF dans DOCS EN LIGNE
    fname    = os.path.basename(doc.get('original_path') or doc.get('original_filename') or '')
    pdf_path = os.path.join(DOCS_SOURCE, fname)

    if not os.path.exists(pdf_path):
        print(f"  [MANQUANT] {fname}")
        missing += 1
        continue

    out_path = os.path.join(OUTPUT_DIR, f"{slug}.jpg")

    try:
        doc_fitz = fitz.open(pdf_path)
        page     = doc_fitz[0]  # Page 1 (couverture)

        # Calcul du scale pour atteindre THUMB_WIDTH
        scale = THUMB_WIDTH / page.rect.width
        mat   = fitz.Matrix(scale, scale)
        pix   = page.get_pixmap(matrix=mat, alpha=False)

        pix.save(out_path)
        doc_fitz.close()
        ok += 1

    except Exception as e:
        print(f"  [ERREUR] {slug} : {e}")
        error += 1

    if (i + 1) % 50 == 0:
        print(f"  {i + 1}/{len(targets)} traités...")

print()
print(f"Terminé — {ok} OK | {missing} manquants | {error} erreurs")
print(f"JPGs dans : {OUTPUT_DIR}")
print()
print("Étape suivante :")
print('  node scripts/upload-smart-previews.mjs')
