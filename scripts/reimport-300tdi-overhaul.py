"""
reimport-300tdi-overhaul.py
Ré-importe 300TDi_Overhaul_Manual.pdf (présent dans DOCS EN LIGNE
mais absent de R2 et Supabase suite à un import raté).
"""
import os, json, base64, requests, boto3
from pathlib import Path
import fitz

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
with open(env_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ACCOUNT_ID   = os.environ['R2_ACCOUNT_ID']
R2_BUCKET    = os.environ['R2_BUCKET_NAME']

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

s3 = boto3.client('s3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    region_name='auto'
)

PDF_PATH = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\LAND ROVER\300TDi_Overhaul_Manual.pdf')
SLUG     = 'land-rover-300tdi-overhaul-manual'
R2_KEY   = f'documents/{SLUG}.pdf'
PREVIEW_KEY = f'previews/{SLUG}.jpg'

# Métadonnées (depuis le rapport JSON + structure DB)
CATEGORY_ID = 'a4454fdf-0f4f-4ad2-96c4-848d98fb50cd'  # Automobile
BRAND_ID    = '8e414cfd-d87a-431e-9be9-783c76fcbfbf'  # LAND ROVER

DOC_DATA = {
    'slug':        SLUG,
    'title':       '300TDi Engine Overhaul Manual',
    'title_fr':    'Manuel de révision moteur 300TDi',
    'description': (
        'Complete overhaul manual for the 300TDi diesel engine fitted to Land Rover '
        'Discovery, Defender and Range Rover Classic from 1995 onwards. Covers cylinder '
        'block, pistons, camshaft, crankshaft, sump, oil pump, bearing shells, and related '
        'components. Includes detailed exploded diagrams, component identification, and '
        'assembly procedures. Published by Rover Technical Communication.'
    ),
    'description_fr': (
        'Manuel complet de révision du moteur diesel 300TDi équipant les Land Rover '
        'Discovery, Defender et Range Rover Classic à partir de 1995. Couvre le bloc '
        'cylindre, pistons, arbre à cames, vilebrequin, carter d\'huile, pompe à huile '
        'et composants associés. Inclut des schémas éclatés détaillés, identification '
        'des pièces et procédures d\'assemblage. Publié par Rover Technical Communication.'
    ),
    'price':      2000,
    'page_count': 103,
    'file_size':  PDF_PATH.stat().st_size,
    'file_path':  R2_KEY,
    'language':   'en',
    'brand_id':   BRAND_ID,
    'category_id': CATEGORY_ID,
    'active':     True,
    'featured':   False,
    'download_count': 0,
}

print(f'\n{"="*60}')
print(f'  REIMPORT : {SLUG}')
print(f'{"="*60}\n')

# ── 1. Vérifications préalables ──────────────────────────────
if not PDF_PATH.exists():
    print(f'✗ PDF introuvable : {PDF_PATH}')
    exit(1)
print(f'✓ PDF présent : {PDF_PATH.stat().st_size // 1024} KB')

# Vérifier que le slug n'existe pas déjà en DB
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/documents?select=id&slug=eq.{SLUG}',
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
)
if r.json():
    print(f'✗ Slug déjà présent en DB — annulé')
    exit(1)
print(f'✓ Slug absent de la DB — OK pour insertion')

# ── 2. Upload PDF → R2 ───────────────────────────────────────
print(f'\n  Upload R2 : {R2_KEY}...')
with open(PDF_PATH, 'rb') as f:
    s3.upload_fileobj(f, R2_BUCKET, R2_KEY,
                      ExtraArgs={'ContentType': 'application/pdf'})
print(f'  ✓ PDF uploadé dans R2')

# ── 3. Générer preview (page 1) ──────────────────────────────
print(f'\n  Génération preview...')
doc = fitz.open(str(PDF_PATH))
page = doc[0]
mat = fitz.Matrix(150 / 72, 150 / 72)
pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)

# Redimensionner à max 800px de large, ratio conservé
import io
from PIL import Image
img_bytes = pix.tobytes('jpeg')
img = Image.open(io.BytesIO(img_bytes))
max_w = 800
if img.width > max_w:
    ratio = max_w / img.width
    img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)

# Tronquer à 55% hauteur (convention site)
crop_h = int(img.height * 0.55)
img = img.crop((0, 0, img.width, crop_h))

out_buf = io.BytesIO()
img.save(out_buf, 'JPEG', quality=85)
out_buf.seek(0)

# Upload preview → Supabase Storage (bucket logos)
preview_upload_url = f'{SUPABASE_URL}/storage/v1/object/logos/{PREVIEW_KEY}'
r_prev = requests.post(
    preview_upload_url,
    headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
    },
    data=out_buf.read()
)
if r_prev.status_code not in (200, 201):
    print(f'  ✗ Preview upload échoué : {r_prev.status_code} {r_prev.text[:200]}')
    preview_url = None
else:
    preview_url = f'{SUPABASE_URL}/storage/v1/object/public/logos/{PREVIEW_KEY}'
    print(f'  ✓ Preview uploadée : {preview_url[:80]}')

doc.close()

if preview_url:
    DOC_DATA['preview_url'] = preview_url

# ── 4. Insertion DB ──────────────────────────────────────────
print(f'\n  Insertion DB...')
r_db = requests.post(
    f'{SUPABASE_URL}/rest/v1/documents',
    headers={**SB_HEADERS, 'Prefer': 'return=representation'},
    json=DOC_DATA
)
if r_db.status_code not in (200, 201):
    print(f'  ✗ DB insert échoué : {r_db.status_code}')
    print(f'  {r_db.text[:400]}')
    exit(1)

result = r_db.json()
doc_id = result[0]['id'] if isinstance(result, list) else result.get('id')
print(f'  ✓ DB inséré — id: {doc_id}')

print(f'\n{"="*60}')
print(f'  ✓ REIMPORT TERMINÉ : {SLUG}')
print(f'{"="*60}\n')
