"""
automobile-fix-toc-vision.py
Corrige les TOC automobile via Claude Vision.
- Retire les TOC bruitees inserees precedemment
- Re-extrait proprement via Claude Vision (lecture intelligente de la page)
- Traduit en francais pour description_fr
- Met a jour la DB
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
    print('deep_translator non installe. Lancer : pip install deep-translator')
    sys.exit(1)

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

if not ANTHROPIC_KEY:
    print('ANTHROPIC_API_KEY non trouve dans .env.local')
    sys.exit(1)

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

DRY_RUN = '--dry-run' in sys.argv

DOCS_BASE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index']

# Tous les documents Automobile >= $20 (Suzuki $3 exclu)
FILE_SLUG = {
    r'ARCTIC CAT\arctic_cat_1999_atvs_all_models_service_manual $25.pdf':
        'arctic-cat-arctic-cat-1999-atvs-service-manual',
    r'BMW\BMW_3 Series_2005-2010 (E90, E91, E92, E93) Service Manual $25.pdf':
        'bmw-bmw-3-series-e90-e91-owners-workshop-manual',
    r'CITROEN\Citroen_DS_ID19 Manuel de Service $35.pdf':
        'citroen-citroen-ds-id19-repair-manual',
    r'FORD\Ford Explorer & Mountaineer - 1996-2001 - Workshop Manual $45.pdf':
        'ford-ford-explorer-mountaineer-workshop-manual-1996-2001',
    r'FORD\Ford_2N-8N-9N-I&T Service Manual $20.pdf':
        'ford-ford-2n-8n-9n-i-t-service-manual',
    r'HARLEY-DAVIDSON\2009 Ultra Classic All Touring Models Service Manual $39.pdf':
        'harley-davidson-2009-harley-davidson-ultra-classic-touring-service-manual',
    r'HONDA\1998-2004 Foreman 450 Service Manual $25.pdf':
        'honda-honda-foreman-450-service-manual-1998-2004',
    r'MERCEDES\Mercedes-Benz_190C-190Dc-220B-220Sb-220SEb-230SL-300SE Service Manual $25.pdf':
        'mercedes-mercedes-benz-190c-190dc-220b-220sb-220seb-230sl-300se-service-manual',
    r'MERCEDES\Mercedes-Benz_190c-200-190Dc-200D-230-220b-220Sb-230S-250S-220SEb-250SE-230SL-250SL-300SE-300SEb-300SEL Service Manuel $25.pdf':
        'mercedes-mercedes-benz-190c-200-190dc-200d-230-220b-220sb-230s-250s-220seb-250se-230sl-250sl-300se-300seb-300sel-service',
}

CLAUDE_PROMPT = (
    "This is a page from a technical service manual. "
    "Extract ONLY the table of contents entries. "
    "Return a clean numbered or bulleted list of chapter/section titles, one per line. "
    "Rules:\n"
    "- Include only meaningful chapter, section, or part titles\n"
    "- Exclude: page numbers, headers, footers, version stamps, dates, "
    "email addresses, URLs, standalone model numbers, watermarks\n"
    "- Exclude lines that are clearly metadata, not content titles\n"
    "- Do NOT add any commentary or explanation\n"
    "- Maximum 60 entries"
)


def find_toc_page_idx(doc, max_pages=25):
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


def extract_toc_via_claude(page_b64, doc_name):
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
            'messages': [{
                'role': 'user',
                'content': [
                    {'type': 'image', 'source': {
                        'type': 'base64', 'media_type': 'image/png', 'data': page_b64}},
                    {'type': 'text', 'text': CLAUDE_PROMPT}
                ]
            }]
        },
        timeout=60
    )
    r.raise_for_status()
    raw = r.json()['content'][0]['text']
    lines = []
    for l in raw.splitlines():
        l = l.strip().lstrip('0123456789.)•-–—* ').strip()
        if len(l) >= 4:
            lines.append(l)
    return lines


def translate_lines(lines, source='en', target='fr'):
    translator = GoogleTranslator(source=source, target=target)
    result = []
    for line in lines:
        try:
            tr = translator.translate(line)
            result.append(tr if tr else line)
        except Exception as e:
            print(f'    [trad. echouee] {line[:40]} — {e}')
            result.append(line)
        time.sleep(0.1)
    return result


def detect_lang(lines):
    fr_words = {'le', 'la', 'les', 'de', 'du', 'et', 'un', 'une', 'pour', 'avec', 'dans', 'sur'}
    words = set(re.findall(r'\b\w+\b', ' '.join(lines).lower()))
    return 'fr' if len(words & fr_words) >= 3 else 'en'


def strip_toc_block(text):
    for marker in ['\n\nTable of Contents:', '\n\nTable des matières :', '\n\nSommaire :']:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


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


print(f'\n{"="*70}')
print(f'  AUTOMOBILE — CORRECTION TOC VIA CLAUDE VISION{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

ok = 0
skipped = 0
errors = 0

for rel_path, slug in FILE_SLUG.items():
    pdf_path = DOCS_BASE / rel_path
    fname = Path(rel_path).name
    print(f'\n{"─"*70}')
    print(f'  {fname}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable : {pdf_path}')
        errors += 1
        continue

    # Lire descriptions actuelles
    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en_orig = row.get('description') or ''
    desc_fr_orig = row.get('description_fr') or ''

    # Retirer TOC existante
    desc_en_clean = strip_toc_block(desc_en_orig)
    desc_fr_clean = strip_toc_block(desc_fr_orig)

    # Trouver la page TOC dans le PDF
    try:
        doc = fitz.open(str(pdf_path))
        toc_idx = find_toc_page_idx(doc, max_pages=25)
    except Exception as e:
        print(f'  ✗ Erreur ouverture PDF: {e}')
        errors += 1
        continue

    if toc_idx is None:
        print(f'  ⚠ Aucune page TOC detectee — suppression TOC bruilee si present')
        doc.close()
        if desc_en_orig != desc_en_clean or desc_fr_orig != desc_fr_clean:
            if not DRY_RUN:
                db_patch(slug, {'description': desc_en_clean, 'description_fr': desc_fr_clean})
            print(f'  ✓ TOC bruilee retiree de la DB')
        else:
            print(f'  ○ Pas de TOC en DB — rien a faire')
            skipped += 1
        continue

    print(f'  ✓ Page TOC : {toc_idx + 1}')

    # Convertir en image et envoyer a Claude Vision
    try:
        page_b64 = page_to_base64(doc[toc_idx])
        doc.close()
    except Exception as e:
        print(f'  ✗ Erreur conversion image: {e}')
        doc.close()
        errors += 1
        continue

    print(f'  Extraction via Claude Vision...')
    try:
        toc_lines = extract_toc_via_claude(page_b64, fname)
    except Exception as e:
        print(f'  ✗ Erreur Claude API: {e}')
        errors += 1
        continue

    if not toc_lines:
        print(f'  ⚠ Claude Vision n\'a retourne aucune entree — TOC ignoree')
        skipped += 1
        doc.close() if not doc.is_closed else None
        continue

    print(f'  ✓ {len(toc_lines)} entrees extraites proprement')
    for l in toc_lines[:6]:
        print(f'    • {l}')
    if len(toc_lines) > 6:
        print(f'    ... ({len(toc_lines)-6} de plus)')

    # Detecter langue et traduire si necessaire
    src_lang = detect_lang(toc_lines)
    if src_lang == 'fr':
        toc_lines_fr = toc_lines
        print(f'  (document FR → traduction FR→EN pour site anglais)')
        toc_lines_en = translate_lines(toc_lines, source='fr', target='en')
    else:
        toc_lines_en = toc_lines
        print(f'  Traduction en francais...')
        toc_lines_fr = translate_lines(toc_lines, source='en', target='fr')
        print(f'  ✓ Traduction terminee')
        print(f'  Apercu FR :')
        for l in toc_lines_fr[:3]:
            print(f'    → {l}')

    toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
    toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

    if DRY_RUN:
        print(f'  [DRY] Mise a jour OK')
        ok += 1
        continue

    db_patch(slug, {
        'description': desc_en_clean + toc_en_block,
        'description_fr': desc_fr_clean + toc_fr_block
    })
    print(f'  ✓ DB mise a jour (TOC propre)')
    ok += 1
    time.sleep(0.3)

print(f'\n{"="*70}')
print(f'  BILAN: {ok} mis a jour | {skipped} ignores | {errors} erreurs')
print(f'{"="*70}\n')
