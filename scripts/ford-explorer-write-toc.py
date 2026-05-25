"""
ford-explorer-write-toc.py
Lit les pages TOC du Ford Explorer Workshop Manual (5564 pages)
via Claude Vision, puis synthetise en ~30 grandes sections.
Met a jour description et description_fr en DB.
"""
import os, re, time, base64, sys
from pathlib import Path
import fitz
import requests

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

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

PDF_PATH = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\FORD\Ford Explorer & Mountaineer - 1996-2001 - Workshop Manual $45.pdf')
SLUG = 'ford-ford-explorer-mountaineer-workshop-manual-1996-2001'
MAX_TOC_SCAN_PAGES = 150  # scanner les 150 premieres pages pour trouver les pages de TOC

TOC_KEYWORDS = ['contents', 'table of contents', 'section', 'group']


def page_to_base64(page, dpi=120):
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return base64.b64encode(pix.tobytes('png')).decode()


def is_toc_page(page):
    text = page.get_text().strip().lower()
    if len(text) < 30:
        return False
    has_kw = any(kw in text for kw in TOC_KEYWORDS)
    has_nums = len(re.findall(r'\d+\s*$', page.get_text(), re.MULTILINE)) >= 3
    return has_kw and has_nums


def claude_extract_toc_entries(page_b64, page_num):
    prompt = (
        f"This is page {page_num} of the Ford Explorer & Mountaineer 1996-2001 Workshop Manual. "
        "List ALL the chapter/section/group titles visible in this table of contents page. "
        "One entry per line. Include section codes if visible (e.g. '100-00 General Information'). "
        "Exclude page numbers. No commentary."
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
            'max_tokens': 1024,
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
    lines = [l.strip().lstrip('•-–—*0123456789.) ').strip() for l in raw.splitlines() if len(l.strip()) >= 4]
    return lines


def claude_synthesize(all_entries):
    """Synthetise toutes les entrees en ~50 grandes sections."""
    entries_text = '\n'.join(all_entries)
    prompt = (
        "You are writing the table of contents for a product page selling the "
        "Ford Explorer & Mountaineer 1996-2001 Workshop Manual (5564 pages).\n\n"
        "Below is the raw list of all sections extracted from the manual's table of contents.\n\n"
        "Write a clean, professional table of contents of exactly 48 to 52 lines "
        "for the Ford Explorer & Mountaineer 1996-2001 Workshop Manual (5,564 pages). "
        "Use the raw sections below as a base, then EXPAND to cover ALL major vehicle systems "
        "proportionally. Each system gets 3 to 6 lines maximum — no single system should dominate. "
        "Systems to cover (in logical order): General/Identification — Engine (all variants: "
        "4.0L OHV, 4.0L SOHC, 5.0L V8) — Fuel & Emissions — Ignition — Cooling — Lubrication — "
        "Exhaust — Manual Transmission — Automatic Transmission — Transfer Case — "
        "Driveshaft & Axles — Front Suspension (4x2 and 4x4) — Rear Suspension — "
        "Wheel Alignment — Steering (manual and power) — Brakes (ABS and non-ABS) — "
        "Wheels & Tires — Body Structure & Frame — Doors Windows Locks — Interior & Trim — "
        "Seats Restraints Airbags — HVAC — Battery & Starting — Charging — Lighting — "
        "Instruments & Warning Systems — Wiper Washer — Power Accessories — "
        "Diagnostics & Wiring Diagrams. "
        "Each line = one meaningful section title. No sub-sub-sections. No markdown headers. "
        "No page numbers. No numbering. No bullet points — just one title per line.\n\n"
        f"Raw sections:\n{entries_text}"
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
            'messages': [{'role': 'user', 'content': prompt}]
        },
        timeout=60
    )
    r.raise_for_status()
    raw = r.json()['content'][0]['text']
    lines = [l.strip().lstrip('•-–—*0123456789.) ').strip()
             for l in raw.splitlines() if len(l.strip()) >= 4]
    return lines


def claude_translate_to_fr(lines):
    """Traduit la liste de titres en francais via Claude."""
    titles = '\n'.join(lines)
    prompt = (
        "Translate the following English chapter titles to French. "
        "Return only the translated titles, one per line, in the same order. "
        "Keep technical terms accurate (automotive/mechanical). No commentary.\n\n"
        f"{titles}"
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
            'messages': [{'role': 'user', 'content': prompt}]
        },
        timeout=60
    )
    r.raise_for_status()
    raw = r.json()['content'][0]['text']
    lines_fr = [l.strip().lstrip('•-–—*0123456789.) ').strip()
                for l in raw.splitlines() if len(l.strip()) >= 4]
    return lines_fr


def db_get(slug):
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**SUPABASE_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug, data):
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SUPABASE_HEADERS, json=data
    )
    r.raise_for_status()


def strip_toc_block(text):
    for marker in ['\n\nTable of Contents:', '\n\nTable des matières :', '\n\nSommaire :']:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


DRY_RUN = '--dry-run' in sys.argv

print(f'\n{"="*70}')
print(f'  FORD EXPLORER — ECRITURE TOC PERSONNALISEE{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

# 1. Trouver les pages TOC dans les MAX_TOC_SCAN_PAGES premieres pages
print(f'  Scan des {MAX_TOC_SCAN_PAGES} premieres pages...')
doc = fitz.open(str(PDF_PATH))
total_pages = len(doc)
print(f'  PDF : {total_pages} pages')

toc_page_indices = []
for i in range(min(MAX_TOC_SCAN_PAGES, total_pages)):
    if is_toc_page(doc[i]):
        toc_page_indices.append(i)

print(f'  {len(toc_page_indices)} pages TOC trouvees : {[p+1 for p in toc_page_indices]}')

if not toc_page_indices:
    print('  ✗ Aucune page TOC detectee dans les 150 premieres pages')
    doc.close()
    sys.exit(1)

# 2. Extraire les entrees de chaque page TOC via Claude Vision
all_entries = []
print(f'\n  Extraction via Claude Vision...')
for idx in toc_page_indices:
    page_b64 = page_to_base64(doc[idx])
    entries = claude_extract_toc_entries(page_b64, idx + 1)
    print(f'    Page {idx+1} : {len(entries)} entrees')
    all_entries.extend(entries)
    time.sleep(0.3)

doc.close()
print(f'\n  Total brut : {len(all_entries)} entrees extraites')

# 3. Synthese en ~30 grandes sections
print(f'\n  Synthese en 30 grandes sections...')
toc_lines_en = claude_synthesize(all_entries)
print(f'  ✓ {len(toc_lines_en)} sections synthetisees')
for l in toc_lines_en:
    print(f'    • {l}')

# 4. Traduction FR via Claude
print(f'\n  Traduction en francais...')
toc_lines_fr = claude_translate_to_fr(toc_lines_en)
print(f'  ✓ Traduction terminee')
print(f'  Apercu FR :')
for l in toc_lines_fr[:5]:
    print(f'    → {l}')

# 5. Mise a jour DB
row = db_get(SLUG)
if not row:
    print(f'\n  ✗ Slug introuvable en DB')
    sys.exit(1)

desc_en = strip_toc_block(row.get('description') or '')
desc_fr = strip_toc_block(row.get('description_fr') or '')

toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

if DRY_RUN:
    print(f'\n  [DRY] DB non modifiee')
else:
    db_patch(SLUG, {
        'description': desc_en + toc_en_block,
        'description_fr': desc_fr + toc_fr_block
    })
    print(f'\n  ✓ DB mise a jour')

print(f'\n{"="*70}')
print(f'  TERMINE')
print(f'{"="*70}\n')
