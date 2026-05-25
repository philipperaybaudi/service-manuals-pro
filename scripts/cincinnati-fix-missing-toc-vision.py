"""
cincinnati-fix-missing-toc-vision.py
Ajoute les TOC manquantes aux 3 docs Cincinnati via Claude Vision.
TOC EN -> description | TOC FR traduite -> description_fr
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

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print('pip install deep-translator')
    sys.exit(1)

import requests as req

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

DRY_RUN = '--dry-run' in sys.argv

DOCS_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Machines-Outils\CINCINNATI')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire']

FILE_SLUG = {
    'Cincinnati_no-2-cutter-and-tool-grinder $25.pdf':
        'cincinnati-cincinnati-no-2-cutter-and-tool-grinder-operator-s-instruction-book',
    'Cincinnati_no 3 4 5 and 6 Milling Machine $20.pdf':
        'cincinnati-cincinnati-nos-3-4-5-6-high-power-dual-power-dial-type-milling-machines-operator-instruction-book',
    'Cincinnati_Cutting-Gear-Teeth $20.pdf':
        'cincinnati-cincinnati-milling-machine-cutting-gear-teeth',
}

CLAUDE_PROMPT = (
    "This is a page from a Cincinnati machine tool technical manual (milling machines or grinders). "
    "Extract ONLY the table of contents entries visible on this page. "
    "Return a clean list of chapter/section titles, one per line. "
    "Rules:\n"
    "- Include only meaningful chapter or section titles\n"
    "- Exclude: page numbers, headers, footers, version stamps, dates, "
    "email addresses, noise characters, standalone numbers\n"
    "- Do NOT add any commentary — just the list\n"
    "- Maximum 60 entries"
)


def find_toc_page_idx(doc, max_pages=30):
    for i in range(min(max_pages, len(doc))):
        text = doc[i].get_text().strip().lower()
        has_kw = any(kw in text for kw in TOC_KEYWORDS)
        has_nums = len(re.findall(r'\d+\s*$', doc[i].get_text(), re.MULTILINE)) >= 3
        if has_kw and has_nums:
            return i
    return None


def page_to_base64(page, dpi=150):
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return base64.b64encode(pix.tobytes('png')).decode()


def extract_toc_via_claude(page_b64):
    r = req.post(
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
                {'type': 'text', 'text': CLAUDE_PROMPT}
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


def db_get(slug):
    r = req.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**SUPABASE_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug, data):
    r = req.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SUPABASE_HEADERS, json=data
    )
    r.raise_for_status()


print(f'\n{"="*70}')
print(f'  CINCINNATI — TOC MANQUANTES VIA CLAUDE VISION{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

ok = 0
skipped = 0
errors = 0

for fname, slug in FILE_SLUG.items():
    pdf_path = DOCS_DIR / fname
    print(f'\n{"─"*70}')
    print(f'  {fname}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable')
        errors += 1
        continue

    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
        print(f'  ○ TOC déjà présente — ignoré')
        skipped += 1
        continue

    try:
        doc = fitz.open(str(pdf_path))
        toc_idx = find_toc_page_idx(doc, max_pages=30)
    except Exception as e:
        print(f'  ✗ Erreur PDF: {e}')
        errors += 1
        continue

    # Mots-clés indiquant que Claude n'a pas trouvé de TOC (réponse descriptive, pas une TOC)
    NO_TOC_MARKERS = [
        'no table of contents', 'not visible', 'cover page', 'title page',
        'no contents', 'cannot see', 'does not contain', 'this page',
        'aucune table', 'page de couverture',
        # Pages copyright/brevet (pas des TOC)
        'patent', 'serial number', 'reference number', 'registered',
        'all rights reserved', 'printed in', 'manufactured by',
        'copyright', 'trade mark', 'trademark',
    ]

    # Mots-clés qui doivent être présents dans au moins UNE ligne pour valider une vraie TOC
    TOC_POSITIVE_HINTS = [
        'section', 'chapter', 'part', 'introduction', 'installation',
        'operation', 'maintenance', 'specification', 'adjustment', 'lubrication',
        'safety', 'assembly', 'description', 'instruction', 'procedure',
        'grinding', 'milling', 'cutting', 'feed', 'speed', 'table',
        'motor', 'electrical', 'troubleshoot', 'repair', 'appendix', 'index',
    ]

    def is_valid_toc(lines):
        """Retourne True si les lignes sont de vraies entrées TOC (pas une réponse descriptive)."""
        if len(lines) < 4:
            return False  # Moins de 4 lignes = probablement pas une vraie TOC
        combined = ' '.join(lines).lower()
        # Rejeter si mots-clés négatifs détectés
        if any(m in combined for m in NO_TOC_MARKERS):
            return False
        # Valider qu'au moins un mot-clé positif de section est présent
        if not any(h in combined for h in TOC_POSITIVE_HINTS):
            return False
        return True

    toc_lines_en = []

    if toc_idx is not None:
        # Page TOC détectée par OCR — essayer en premier
        pages_to_try = [toc_idx]
    else:
        print(f'  ⚠ Pas de page TOC détectée par OCR — scan Vision pages 1-15...')
        pages_to_try = list(range(min(15, len(doc))))

    for page_try in pages_to_try:
        try:
            page_b64 = page_to_base64(doc[page_try])
        except Exception as e:
            continue

        print(f'  Extraction via Claude Vision (page {page_try + 1})...')
        try:
            candidates = extract_toc_via_claude(page_b64)
        except Exception as e:
            print(f'  ✗ Erreur Claude API: {e}')
            continue

        if is_valid_toc(candidates):
            toc_lines_en = candidates
            print(f'  ✓ TOC valide trouvée page {page_try + 1}')
            break
        else:
            print(f'    Page {page_try + 1} : pas de TOC valide, suite...')
        time.sleep(0.2)

    doc.close()

    if not toc_lines_en:
        print(f'  ⚠ Aucune TOC valide trouvée dans ce PDF — ignoré')
        skipped += 1
        continue

    print(f'  ✓ {len(toc_lines_en)} entrées extraites')
    for l in toc_lines_en[:5]:
        print(f'    • {l}')
    if len(toc_lines_en) > 5:
        print(f'    ... ({len(toc_lines_en)-5} de plus)')

    print(f'  Traduction FR...')
    toc_lines_fr = translate_lines(toc_lines_en)
    print(f'  ✓ Traduction terminée')
    for l in toc_lines_fr[:3]:
        print(f'    → {l}')

    toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
    toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

    if DRY_RUN:
        print(f'  [DRY] OK')
        ok += 1
        continue

    db_patch(slug, {
        'description': desc_en + toc_en_block,
        'description_fr': desc_fr + toc_fr_block
    })
    print(f'  ✓ DB mise à jour')
    ok += 1
    time.sleep(0.3)

print(f'\n{"="*70}')
print(f'  BILAN: {ok} mis à jour | {skipped} ignorés | {errors} erreurs')
print(f'{"="*70}\n')
