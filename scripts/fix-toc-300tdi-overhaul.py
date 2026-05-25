"""
fix-toc-300tdi-overhaul.py
Ajoute le TOC au 300TDi_Overhaul_Manual.pdf
(réimporté dans R2 + Supabase mais TOC non encore traité).
"""
import os, re, time, sys
from pathlib import Path
import fitz
import requests

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
with open(env_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print('pip install deep-translator')
    sys.exit(1)

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

PDF_PATH = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\LAND ROVER\300TDi_Overhaul_Manual.pdf')
SLUG     = 'land-rover-300tdi-overhaul-manual'

TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'amendment', 'introduction']


def sanitize(s):
    """Supprime null bytes et caractères hors BMP (rejetés par PostgreSQL)."""
    return ''.join(c for c in s if ord(c) > 0 and ord(c) < 65536)


def find_toc_text(doc, max_pages=15):
    for i in range(min(max_pages, len(doc))):
        text = doc[i].get_text().strip()
        text_low = text.lower()
        has_kw = any(kw in text_low for kw in TOC_KEYWORDS)
        has_pages = len(re.findall(r'\d+\s*$', text, re.MULTILINE)) >= 3
        if has_kw and has_pages:
            return i, text
    return None, None


def clean_toc(raw):
    lines = raw.splitlines()
    result = []
    skip = {'page', 'contents', 'table of contents', 'index', 'section', 'introduction'}
    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue
        line = re.sub(r'\s{2,}', ' ', line)
        line = re.sub(r'\.{3,}', '', line).strip()
        line = re.sub(r'_\d+', '', line).strip()
        if re.fullmatch(r'[\d\s,\-\.;•\*]+', line):
            continue
        if line.lower() in skip:
            continue
        if sum(1 for c in line if c.isalpha()) < 3:
            continue
        noise = sum(1 for c in line if c in '^[];}{|\\~`@#$%&*')
        if noise > 1:
            continue
        result.append(line)
    return result


def translate_lines(lines, source='en', target='fr'):
    translator = GoogleTranslator(source=source, target=target)
    result = []
    for line in lines:
        line_clean = sanitize(line)
        try:
            tr = translator.translate(line_clean)
            tr_clean = sanitize(tr or line_clean)
            result.append(tr_clean)
        except Exception as e:
            print(f'    [trad] {line[:40]} — {e}')
            result.append(line_clean)
        time.sleep(0.1)
    return result


def vision_scan_for_toc(pdf_path, max_pages=12):
    """Scan via Claude Vision pour PDFs sans couche texte."""
    import base64
    doc = fitz.open(str(pdf_path))
    result_text = None
    result_page = None

    for i in range(min(max_pages, len(doc))):
        for dpi in (120, 72):
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img_b64 = base64.standard_b64encode(pix.tobytes('jpeg')).decode()

            payload = {
                'model': 'claude-haiku-4-5-20251001',
                'max_tokens': 2048,
                'messages': [{
                    'role': 'user',
                    'content': [
                        {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': img_b64}},
                        {'type': 'text', 'text': (
                            'Is this a Table of Contents page? '
                            'If yes, extract ALL entries exactly as written, one per line. '
                            'Start your response with "TOC:" if it is a TOC, or "NOT TOC" if it is not.'
                        )}
                    ]
                }]
            }

            try:
                r = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': ANTHROPIC_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    json=payload,
                    timeout=60
                )
                r.raise_for_status()
                raw = r.json()['content'][0]['text'].strip()
                if raw.startswith('TOC:'):
                    result_text = raw[4:].strip()
                    result_page = i
                    break
                break  # NOT TOC, pas besoin de retry
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 400 and dpi == 120:
                    print(f'    [vision] page {i+1} retry 72dpi')
                    continue
                raise
        if result_text:
            break
        time.sleep(0.3)

    doc.close()
    return result_page, result_text


def db_get(slug):
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**SB_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug, data):
    clean_data = {k: sanitize(v) if isinstance(v, str) else v for k, v in data.items()}
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SB_HEADERS,
        json=clean_data
    )
    if not r.ok:
        print(f'  ✗ DB {r.status_code}: {r.text[:300]}')
        r.raise_for_status()


print(f'\n{"="*60}')
print(f'  FIX TOC — 300TDi Overhaul Manual')
print(f'{"="*60}\n')

if not PDF_PATH.exists():
    print(f'✗ PDF introuvable : {PDF_PATH}')
    sys.exit(1)
print(f'✓ PDF présent ({PDF_PATH.stat().st_size // 1024} KB, 103 pages)')

row = db_get(SLUG)
if not row:
    print(f'✗ Slug absent DB : {SLUG}')
    sys.exit(1)

desc_en = row.get('description') or ''
desc_fr = row.get('description_fr') or ''

if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
    print(f'○ TOC déjà présente — rien à faire')
    sys.exit(0)

# Tentative texte d'abord
print(f'\n  Extraction texte TOC...')
doc = fitz.open(str(PDF_PATH))
toc_idx, raw = find_toc_text(doc, max_pages=15)
doc.close()

if toc_idx is not None:
    print(f'  ✓ TOC texte trouvée page {toc_idx+1}')
    lines_en = clean_toc(raw)
else:
    print(f'  ⚠ Aucun TOC texte — scan Vision...')
    if not ANTHROPIC_KEY:
        print(f'  ✗ ANTHROPIC_API_KEY manquant')
        sys.exit(1)
    toc_idx, raw = vision_scan_for_toc(PDF_PATH, max_pages=12)
    if toc_idx is None or not raw:
        print(f'  ✗ TOC introuvable (texte + Vision)')
        sys.exit(1)
    print(f'  ✓ TOC Vision page {toc_idx+1}')
    lines_en = clean_toc(raw)

print(f'  {len(lines_en)} entrées extraites')
for l in lines_en[:5]:
    print(f'    • {l}')
if len(lines_en) > 5:
    print(f'    ... ({len(lines_en)-5} de plus)')

print(f'\n  Traduction EN→FR...')
lines_fr = translate_lines(lines_en, source='en', target='fr')
print(f'  ✓ Aperçu FR: {lines_fr[0] if lines_fr else "—"}')

toc_en = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in lines_en)
toc_fr = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in lines_fr)

print(f'\n  Mise à jour DB...')
db_patch(SLUG, {
    'description': desc_en + toc_en,
    'description_fr': desc_fr + toc_fr
})
print(f'  ✓ DB mise à jour')

print(f'\n{"="*60}')
print(f'  TERMINÉ')
print(f'{"="*60}\n')
