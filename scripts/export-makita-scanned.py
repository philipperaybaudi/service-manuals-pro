"""Export pages 1-3 as PNG for scanned Makita PDFs"""
import fitz, sys, os
sys.stdout.reconfigure(encoding='utf-8')

base = "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Machines-Outils\\MAKITA"
out_dir = "C:\\Users\\adm\\Claude Doc GB test\\service-manuals-pro\\scripts\\temp_previews"

files = [
    "MAKITA_5008MG $5.pdf",
    "MAKITA_SP6000 $5.pdf",
]

for fname in files:
    fpath = os.path.join(base, fname)
    print(f"Processing: {fname}")
    print(f"  Exists: {os.path.exists(fpath)}")
    doc = fitz.open(fpath)
    name = fname.replace(".pdf", "").replace(" ", "_").replace("$", "S")
    for i in range(min(3, len(doc))):
        pix = doc[i].get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        out = os.path.join(out_dir, f"{name}_p{i+1}.png")
        pix.save(out)
        print(f"  Saved: {out}")
    doc.close()
print("Done")
