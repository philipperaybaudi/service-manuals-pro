"""Exporte les premières pages des 4 numéros Elektor 1978 en PNG."""
import fitz, sys, os
sys.stdout.reconfigure(encoding='utf-8')

BASE = "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Électronique\\ELEKTOR\\"
OUT  = "C:\\Users\\adm\\Claude Doc GB test\\service-manuals-pro\\scripts\\temp_previews\\toc\\"
os.makedirs(OUT, exist_ok=True)

FILES = [
    ("Elektor_mai-juin 1978-N°1 $3.pdf",   "el1"),
    ("Elektor_juil-aout 1978-N°2 $3.pdf",  "el2"),
    ("Elektor_sept-oct 1978-N°3 $3.pdf",   "el3"),
    ("Elektor_nov-dec 1978-N°4 $3.pdf",    "el4"),
]

for filename, prefix in FILES:
    path = BASE + filename
    doc  = fitz.open(path)
    # Pages 0-4 (premières pages — couverture + sommaire)
    for i in range(min(5, len(doc))):
        page = doc[i]
        mat  = fitz.Matrix(2.0, 2.0)
        pix  = page.get_pixmap(matrix=mat)
        out  = f"{OUT}{prefix}_p{i+1}.png"
        pix.save(out)
        print(f"  → {out}")
    doc.close()

print("Terminé.")
