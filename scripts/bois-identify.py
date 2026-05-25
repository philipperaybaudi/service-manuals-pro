"""
Étape 1 — Identification des PDF BOIS
- Tente d'ouvrir chaque PDF (gère les protections owner-only)
- Extrait le texte des pages 1-3
- Exporte la page 1 en PNG pour les fichiers scannés ou à nom opaque
- Génère un rapport JSON
"""
import fitz, sys, os, json
sys.stdout.reconfigure(encoding='utf-8')

BOIS_DIR = r"C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Machines-Outils\BOIS"
PNG_DIR  = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_previews\bois"
OUT_JSON = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\bois_report.json"

os.makedirs(PNG_DIR, exist_ok=True)

files = sorted(f for f in os.listdir(BOIS_DIR) if f.lower().endswith('.pdf'))
print(f"{len(files)} PDF trouvés\n")

report = []

for fname in files:
    fpath = os.path.join(BOIS_DIR, fname)
    entry = {
        'file'     : fname,
        'path'     : fpath,
        'status'   : '?',
        'encrypted': False,
        'pages'    : 0,
        'text'     : '',
        'png'      : '',
    }

    # ── Ouverture ────────────────────────────────────────────────────────────
    try:
        doc = fitz.open(fpath)
    except Exception as e:
        entry['status'] = 'ERROR_OPEN'
        entry['error']  = str(e)
        report.append(entry)
        print(f"  ✗ {fname[:70]} — {e}")
        continue

    entry['encrypted'] = doc.is_encrypted
    entry['pages']     = len(doc)

    if doc.is_encrypted:
        # Essayer password vide (souvent suffisant pour "owner restrictions")
        ok = doc.authenticate("")
        if not ok:
            entry['status'] = 'NEED_PASSWORD'
            doc.close()
            report.append(entry)
            print(f"  🔒 {fname[:70]} — mot de passe requis")
            continue

    # ── Extraction texte pages 1-3 ───────────────────────────────────────────
    text_parts = []
    for i in range(min(3, len(doc))):
        t = doc[i].get_text().strip()
        if t:
            text_parts.append(t)
    entry['text'] = "\n---PAGE---\n".join(text_parts)[:1000]

    # ── Export PNG page 1 ────────────────────────────────────────────────────
    try:
        page     = doc[0]
        mat      = fitz.Matrix(1.5, 1.5)
        pix      = page.get_pixmap(matrix=mat)
        png_name = fname.replace('.pdf', '_p1.png').replace(' ', '_')
        png_path = os.path.join(PNG_DIR, png_name)
        pix.save(png_path)
        entry['png'] = png_path
    except Exception as e:
        entry['png_error'] = str(e)

    entry['status'] = 'OK'
    doc.close()

    short_text = entry['text'][:120].replace('\n', ' ')
    print(f"  ✓ {fname[:60]}")
    if short_text:
        print(f"      → {short_text}")

# ── Sauvegarde rapport ───────────────────────────────────────────────────────
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

locked = [e for e in report if e['status'] == 'NEED_PASSWORD']
errors = [e for e in report if e['status'] == 'ERROR_OPEN']
ok     = [e for e in report if e['status'] == 'OK']

print(f"\n{'═'*60}")
print(f"  OK           : {len(ok)}")
print(f"  Verrouillés  : {len(locked)}")
print(f"  Erreurs      : {len(errors)}")
print(f"\n→ Rapport : {OUT_JSON}")
print(f"→ PNGs    : {PNG_DIR}")
