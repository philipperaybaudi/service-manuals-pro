"""
fix-toc-defender-300tdi.py
Ajoute le TOC aux 2 Defender 300TDi qui avaient échoué (DB error 400)
lors du premier passage de automobile-toc-complet.py.
"""
import os, re, time, base64, sys
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

DOCS_BASE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\LAND ROVER')

FILE_SLUG = {
    'Defender1996.pdf':
        'land-rover-land-rover-defender-300tdi-workshop-manual-1996',
    'Defender_Workshop_Manual_96_on.pdf':
        'land-rover-land-rover-defender-300tdi-workshop-manual-1996-onwards',
}

TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'amendment']


def find_toc_text(doc, max_pages=10):
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
    skip = {'page', 'contents', 'table of contents', 'index', 'section'}
    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue
        line = re.sub(r'\s{2,}', ' ', line)
        line = re.sub(r'\.{3,}', '', line).strip()
        if re.fullmatch(r'[\d\s,\-\.;]+', line):
            continue
        if line.lower() in skip:
            continue
        if sum(1 for c in line if c.isalpha()) < 3:
            continue
        result.append(line)
    return result


def translate_lines(lines, source='en', target='fr'):
    translator = GoogleTranslator(source=source, target=target)
    result = []
    for line in lines:
        # Nettoyer les caractères potentiellement problématiques
        line_clean = ''.join(c for c in line if ord(c) < 65536)
        try:
            tr = translator.translate(line_clean)
            # Nettoyer la traduction aussi
            tr_clean = ''.join(c for c in (tr or line_clean) if ord(c) < 65536)
            result.append(tr_clean)
        except Exception as e:
            print(f'    [trad] {line[:40]} — {e}')
            result.append(line_clean)
        time.sleep(0.1)
    return result


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
    # Nettoyer toutes les valeurs string avant envoi
    clean_data = {}
    for k, v in data.items():
        if isinstance(v, str):
            # Supprimer null bytes et caractères hors BMP (PostgreSQL les refuse)
            clean_data[k] = ''.join(c for c in v if ord(c) > 0 and ord(c) < 65536)
        else:
            clean_data[k] = v
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SB_HEADERS,
        json=clean_data
    )
    if not r.ok:
        print(f'  ✗ DB {r.status_code}: {r.text[:300]}')
        r.raise_for_status()


print(f'\n{"="*60}')
print(f'  FIX TOC — 2 DEFENDER 300TDi')
print(f'{"="*60}\n')

for fname, slug in FILE_SLUG.items():
    pdf_path = DOCS_BASE / fname
    print(f'\n{"─"*60}')
    print(f'  {fname}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable')
        continue

    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug absent DB')
        continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
        print(f'  ○ TOC déjà présent')
        continue

    doc = fitz.open(str(pdf_path))
    toc_idx, raw = find_toc_text(doc, max_pages=10)
    doc.close()

    if toc_idx is None:
        print(f'  ⚠ Aucun TOC texte trouvé')
        continue

    print(f'  ✓ TOC page {toc_idx+1}')
    lines_en = clean_toc(raw)
    print(f'  {len(lines_en)} entrées')

    print(f'  Traduction EN→FR...')
    lines_fr = translate_lines(lines_en, source='en', target='fr')
    print(f'  ✓ Aperçu FR: {lines_fr[0] if lines_fr else "—"}')

    toc_en = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in lines_en)
    toc_fr = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in lines_fr)

    db_patch(slug, {
        'description': desc_en + toc_en,
        'description_fr': desc_fr + toc_fr
    })
    print(f'  ✓ DB mise à jour')
    time.sleep(0.5)

print(f'\n{"="*60}')
print(f'  TERMINÉ')
print(f'{"="*60}\n')
