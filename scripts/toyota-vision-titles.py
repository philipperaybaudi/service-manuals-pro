"""
toyota-vision-titles.py
Lit la couverture de chaque PDF Toyota via Claude Vision (haiku)
et génère une liste de renommage proposé avec prix.
Sortie : toyota-rename-proposals.txt
"""
import os, base64, json, time, requests, fitz
from pathlib import Path

TOYOTA_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile\TOYOTA')
OUTPUT    = Path(__file__).parent / 'toyota-rename-proposals.txt'

env_file = Path(__file__).parent.parent / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

PROMPT = (
    "This is the cover page of a Toyota service/repair document. "
    "Extract the following information in JSON format:\n"
    "{\n"
    '  "doc_type": "Repair Manual / Body Repair Manual / Electrical Wiring Diagram / Engine Repair Manual / '
    'New Car Features / Air Conditioning Manual / Transmission Manual / Supplement / Other",\n'
    '  "series": "Land Cruiser 60 / Land Cruiser 80 / Land Cruiser Prado 90 / Other (specify)",\n'
    '  "models": "e.g. FJ60 FJ62 HJ60 HJ61 / FJ80 HZJ80 HDJ80 / KZJ90 KZJ95 etc.",\n'
    '  "engine": "e.g. 2F / 3F / 1HZ / 1HD-T / 1KZ-T / etc. (or null)",\n'
    '  "year": "e.g. 1981 / 1990-1997 / etc.",\n'
    '  "title_en": "Full English title as printed on cover",\n'
    '  "language": "English / French / Japanese",\n'
    '  "notes": "any other relevant info"\n'
    "}\n"
    "If the page is blank or unreadable, return your best guess based on document code visible."
)

def page_to_b64(pdf_path, page_idx=0):
    doc = fitz.open(str(pdf_path))
    page = doc[min(page_idx, len(doc)-1)]
    mat = fitz.Matrix(150/72, 150/72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    b64 = base64.b64encode(pix.tobytes('png')).decode()
    pages = len(doc)
    doc.close()
    return b64, pages

def ask_vision(b64):
    r = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        json={
            'model': 'claude-haiku-4-5-20251001',
            'max_tokens': 1024,
            'messages': [{'role': 'user', 'content': [
                {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/png', 'data': b64}},
                {'type': 'text', 'text': PROMPT}
            ]}]
        },
        timeout=60
    )
    r.raise_for_status()
    return r.json()['content'][0]['text']

pdfs = sorted(TOYOTA_DIR.glob('*.pdf'))
# Exclure les fichiers déjà renommés (contiennent $)
pdfs_to_process = [p for p in pdfs if '$' not in p.name]
already_named   = [p for p in pdfs if '$' in p.name]

print(f'\n{"="*70}')
print(f'  TOYOTA — LECTURE COUVERTURES VIA VISION ({len(pdfs_to_process)} PDFs)')
print(f'  Déjà nommés avec prix : {len(already_named)}')
print(f'{"="*70}\n')

results = []

for i, pdf in enumerate(pdfs_to_process, 1):
    print(f'[{i:02d}/{len(pdfs_to_process)}] {pdf.name}...', end=' ', flush=True)
    try:
        b64, pages = page_to_b64(pdf)
        raw = ask_vision(b64)
        # Extraire le JSON de la réponse
        start = raw.find('{')
        end   = raw.rfind('}') + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
        else:
            data = {'title_en': raw[:100], 'doc_type': '?', 'series': '?', 'models': '?', 'year': '?', 'language': '?', 'notes': raw}
        data['filename'] = pdf.name
        data['pages']    = pages
        results.append(data)
        print(f'✓ {pages}p — {data.get("title_en","?")[:60]}')
    except Exception as e:
        print(f'✗ {e}')
        results.append({'filename': pdf.name, 'pages': 0, 'title_en': '?', 'error': str(e)})
    time.sleep(0.3)

# Écrire le rapport
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('TOYOTA LAND CRUISER — PROPOSITIONS DE RENOMMAGE\n')
    f.write('='*70 + '\n\n')
    f.write(f'Fichiers déjà nommés avec prix :\n')
    for p in already_named:
        f.write(f'  {p.name}\n')
    f.write('\n' + '='*70 + '\n\n')
    f.write('FICHIERS À RENOMMER (proposition) :\n\n')
    for r in results:
        f.write(f"ORIGINAL : {r['filename']} ({r.get('pages','?')}p)\n")
        f.write(f"TYPE     : {r.get('doc_type','?')}\n")
        f.write(f"SÉRIE    : {r.get('series','?')}\n")
        f.write(f"MODÈLES  : {r.get('models','?')}\n")
        f.write(f"MOTEUR   : {r.get('engine','?')}\n")
        f.write(f"ANNÉE    : {r.get('year','?')}\n")
        f.write(f"TITRE    : {r.get('title_en','?')}\n")
        f.write(f"LANGUE   : {r.get('language','?')}\n")
        f.write(f"NOTES    : {r.get('notes','')}\n")
        f.write(f"PROPOSÉ  : *** À COMPLÉTER ***\n")
        f.write('-'*70 + '\n')

print(f'\n✓ Rapport écrit : {OUTPUT}')
print(f'{"="*70}\n')
