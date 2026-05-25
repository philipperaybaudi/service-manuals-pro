import fitz, os, sys
sys.stdout.reconfigure(encoding='utf-8')

base = r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\LAND ROVER'
dest = r'C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\temp_previews'
os.makedirs(dest, exist_ok=True)

jobs = [
    ('Land-Rover_Rovers-North-Catalogue-2000 $15.pdf', 1,
     'land-rover-rovers-north-land-rover-parts-catalogue-2000.jpg'),
    ('Land-Rover_Workshop-Bulletin-SLR621-2-5L-TD $10.pdf', 2,
     'land-rover-land-rover-range-rover-turbocharger-maintenance-workshop-bulletin-slr621.jpg'),
]

for fn, page_idx, out_name in jobs:
    pdf_path = os.path.join(base, fn)
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    scale = 800 / pix.width
    pix2 = page.get_pixmap(matrix=fitz.Matrix(2.0 * scale, 2.0 * scale))
    out_path = os.path.join(dest, out_name)
    pix2.save(out_path)
    print(f'OK: {out_name} ({pix2.width}x{pix2.height})')
    doc.close()

print('Done.')
