"""
usinage-add-toc-theory-machines.py
Ajoute la TOC (EN + FR) au document Theory of Machines and Mechanisms ($20)
via Claude Vision. Améliore aussi le descriptif.
"""
import os, re, time, base64, sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

try:
    import fitz
except ImportError:
    print('pip install pymupdf'); sys.exit(1)

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print('pip install deep-translator'); sys.exit(1)

import requests

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

HEADERS_SB = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

SLUG = 'usinage-theory-of-machines-and-mechanisms'
PDF_PATH = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Usinage\Theory_of_Machines_and_Mechanisms $20.pdf')

TOC_KEYWORDS = ['contents', 'table of contents', 'preface', 'chapter']

DRY_RUN = '--dry-run' in sys.argv

DESC_EN = (
    "Theory of Machines and Mechanisms by Joseph Edward Shigley and John Joseph Uicker Jr. "
    "is a comprehensive mechanical engineering textbook published by McGraw-Hill (5th printing, 1988, international edition). "
    "This 592-page reference covers the complete theory of mechanisms and machines, from kinematic analysis "
    "to dynamic forces and machine design. An essential reference for mechanical engineers, students, "
    "and anyone working with gear systems, cams, linkages, or mechanical transmissions."
)

DESC_FR = (
    "Theory of Machines and Mechanisms de Joseph Edward Shigley et John Joseph Uicker Jr. "
    "est un manuel complet de génie mécanique publié par McGraw-Hill (5e tirage, 1988, édition internationale). "
    "Cette référence de 592 pages couvre l'ensemble de la théorie des mécanismes et des machines, "
    "de l'analyse cinématique aux forces dynamiques et à la conception des machines. "
    "Une référence indispensable pour les ingénieurs en mécanique, les étudiants "
    "et toute personne travaillant avec des engrenages, des cames, des liaisons ou des transmissions mécaniques."
)


def page_to_base64(page, dpi=150):
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return base64.b64encode(pix.tobytes('png')).decode()


def is_toc_page(page):
    text = page.get_text().strip().lower()
    if len(text) < 20:
        return False
    return any(kw in text for kw in TOC_KEYWORDS)


NO_TOC_MARKERS = [
    'no table of contents', 'not visible', 'cover page', 'title page',
    'no contents', 'cannot see', 'does not contain', 'this page',
    'patent', 'serial number', 'copyright', 'all rights reserved',
]

TOC_POSITIVE_HINTS = [
    'chapter', 'part', 'section', 'kinematics', 'dynamics', 'mechanism',
    'velocity', 'acceleration', 'force', 'gear', 'cam', 'linkage',
    'analysis', 'synthesis', 'motion', 'engine', 'balancing',
]


def is_valid_toc(lines):
    if len(lines) < 4:
        return False
    combined = ' '.join(lines).lower()
    if any(m in combined for m in NO_TOC_MARKERS):
        return False
    if not any(h in combined for h in TOC_POSITIVE_HINTS):
        return False
    return True


def extract_toc_via_claude(page_b64, page_num):
    prompt = (
        f"This is page {page_num} of 'Theory of Machines and Mechanisms' by Shigley & Uicker (592 pages). "
        "Extract ONLY the chapter/section titles visible in this table of contents. "
        "One entry per line. No page numbers, no commentary."
    )
    r = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        json={
            'model': 'claude-haiku-4-5-20251001',
            'max_tokens': 2048,
            'messages': [{'role': 'user', 'content': [
                {'type': 'image', 'source': {
                    'type': 'base64', 'media_type': 'image/png', 'data': page_b64}},
                {'type': 'text', 'text': prompt}
            ]}]
        },
        timeout=60
    )
    r.raise_for_status()
    raw = r.json()['content'][0]['text']
    lines = [l.strip().lstrip('•-–—*0123456789.) ').strip()
             for l in raw.splitlines() if len(l.strip()) >= 4]
    return lines


def translate_lines(lines):
    translator = GoogleTranslator(source='en', target='fr')
    result = []
    for line in lines:
        try:
            tr = translator.translate(line)
            result.append(tr if tr else line)
        except Exception:
            result.append(line)
        time.sleep(0.1)
    return result


def strip_toc_block(text):
    for marker in ['\n\nTable of Contents:', '\n\nTable des matières :']:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


print(f'\n{"="*70}')
print(f'  THEORY OF MACHINES — AJOUT TOC{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

if not PDF_PATH.exists():
    print(f'  ✗ Fichier introuvable : {PDF_PATH}')
    sys.exit(1)

doc = fitz.open(str(PDF_PATH))
print(f'  PDF : {len(doc)} pages')

# Chercher les pages TOC dans les 30 premières pages
toc_pages = []
for i in range(min(30, len(doc))):
    if is_toc_page(doc[i]):
        toc_pages.append(i)

print(f'  Pages TOC détectées (OCR) : {[p+1 for p in toc_pages]}')

if not toc_pages:
    print('  ⚠ Pas de TOC détectée par OCR — scan Vision pages 1-20...')
    toc_pages = list(range(min(20, len(doc))))

# Extraire les entrées de toutes les pages TOC
all_entries = []
for idx in toc_pages:
    b64 = page_to_base64(doc[idx])
    print(f'  Vision page {idx+1}...')
    try:
        candidates = extract_toc_via_claude(b64, idx + 1)
    except Exception as e:
        print(f'    ✗ Erreur : {e}')
        continue
    if is_valid_toc(candidates):
        print(f'    ✓ {len(candidates)} entrées valides')
        all_entries.extend(candidates)
        # Si on a trouvé une vraie page TOC via OCR, on ne scanne pas tout
        if toc_pages != list(range(min(20, len(doc)))):
            break
    else:
        print(f'    Page {idx+1} : pas de TOC valide')
    time.sleep(0.2)

doc.close()

if not all_entries:
    print('  ⚠ Aucune TOC valide trouvée — abandon')
    sys.exit(0)

# Dédoublonner en conservant l'ordre
seen = set()
toc_lines_en = []
for l in all_entries:
    if l.lower() not in seen:
        seen.add(l.lower())
        toc_lines_en.append(l)

print(f'\n  ✓ {len(toc_lines_en)} entrées uniques extraites')
for l in toc_lines_en[:6]:
    print(f'    • {l}')
if len(toc_lines_en) > 6:
    print(f'    ... ({len(toc_lines_en)-6} de plus)')

print(f'\n  Traduction FR...')
toc_lines_fr = translate_lines(toc_lines_en)
print(f'  ✓ Traduction terminée')

toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

new_desc_en = DESC_EN + toc_en_block
new_desc_fr = DESC_FR + toc_fr_block

print(f'\n  Nouveau descriptif EN ({len(new_desc_en)} chars) + TOC')
print(f'  Nouveau descriptif FR ({len(new_desc_fr)} chars) + TOC')

if DRY_RUN:
    print(f'\n  [DRY] DB non modifiée')
    print(f'\n  Aperçu EN :\n{new_desc_en[:400]}...')
else:
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{SLUG}',
        headers=HEADERS_SB,
        json={'description': new_desc_en, 'description_fr': new_desc_fr}
    )
    r.raise_for_status()
    print(f'  ✓ DB mise à jour')

print(f'\n{"="*70}')
print(f'  TERMINÉ')
print(f'{"="*70}\n')
