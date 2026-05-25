import fitz, os, sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Copy collection-airplane-photography-1920.jpg to DOSSIER SOURCE
src = r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Photographie\COLLECTION\collection-airplane-photography-1920.jpg'
dst_dir = r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Photographie\COLLECTION'
dst = os.path.join(dst_dir, 'collection-airplane-photography-1920.jpg')

if os.path.exists(src):
    os.makedirs(dst_dir, exist_ok=True)
    with open(src, 'rb') as f:
        data = f.read()
    with open(dst, 'wb') as f:
        f.write(data)
    print(f'Copied airplane preview to DOSSIER SOURCE')
else:
    print(f'ERROR: source not found: {src}')

# 2. Generate Land Rover previews into temp_previews (no accents)
lr_base = r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\LAND ROVER'
tp = r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_previews'
os.makedirs(tp, exist_ok=True)

jobs = [
    ('Land-Rover_Rovers-North-Catalogue-2000 $15.pdf', 1,
     'land-rover-rovers-north-land-rover-parts-catalogue-2000.jpg'),
    ('Land-Rover_Workshop-Bulletin-SLR621-2-5L-TD $10.pdf', 2,
     'land-rover-land-rover-range-rover-turbocharger-maintenance-workshop-bulletin-slr621.jpg'),
]

for fn, page_idx, out_name in jobs:
    pdf_path = os.path.join(lr_base, fn)
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    scale = 800 / pix.width
    pix2 = page.get_pixmap(matrix=fitz.Matrix(2.0 * scale, 2.0 * scale))
    out_path = os.path.join(tp, out_name)
    pix2.save(out_path)
    print(f'OK: {out_name} ({pix2.width}x{pix2.height})')
    doc.close()

print('All done - run fix-missing-preview.mjs now')
