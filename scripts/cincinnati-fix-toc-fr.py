"""
cincinnati-fix-toc-fr.py
Corrige les description_fr des 4 docs Cincinnati :
- Retire le bloc TOC anglais de description_fr
- Traduit les items en français via deep_translator (Google, gratuit)
- Réinjecte le bloc traduit dans description_fr
"""
import os, re, time
from pathlib import Path
import fitz

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

import requests
try:
    from deep_translator import GoogleTranslator
except ImportError:
    print('deep_translator non installé. Lancer : pip install deep-translator')
    import sys; sys.exit(1)

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

DOCS_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Machines-Outils\CINCINNATI')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire']

FILE_SLUG = {
    'A_Treatise_On_Milling_And_Milling_Machines $25.pdf':
        'cincinnati-a-treatise-on-milling-and-milling-machines',
    'Cincinnati_2-3-4-Mills_-Op $20.pdf':
        'cincinnati-cincinnati-nos-2-3-and-4-dial-type-milling-machines-model-er-operator-s-instruction-book',
    'Cincinnati_2-3-4-Parts-1953 $30.pdf':
        'cincinnati-cincinnati-milacron-2-3-4-parts-and-service-manual',
    'Cincinnati_DialType-Mil $20.pdf':
        'cincinnati-cincinnati-dial-type-milling-machines-operator-instruction-book-model-415-16-vertedt',
}


def find_toc_text(doc, max_pages=25):
    for i in range(min(max_pages, len(doc))):
        text = doc[i].get_text().strip()
        text_low = text.lower()
        has_kw = any(kw in text_low for kw in TOC_KEYWORDS)
        has_pages = len(re.findall(r'\d+\s*$', text, re.MULTILINE)) >= 3
        if has_kw and has_pages:
            return i + 1, text
    return None, None


def clean_toc_lines(raw_text):
    lines = raw_text.splitlines()
    result = []
    skip_words = {'page', 'contents', 'table of contents', 'index', 'sommaire',
                  'the cincinnati milling machine company', 'table  of  contents',
                  'd  tool  grinder', 'chapter', 'i', 'ii', 'iii', 'iv', 'v',
                  'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'}
    pending_chapter = None

    for line in lines:
        line = line.strip()
        if not line:
            if pending_chapter:
                result.append(pending_chapter)
                pending_chapter = None
            continue
        line = re.sub(r'\s{2,}', ' ', line)
        line = re.sub(r'\.{2,}', '', line).strip()
        line = re.sub(r'_\d+', '', line).strip()
        if len(line) < 4:
            continue
        if re.fullmatch(r'[\d\s,\-\.;•\*]+', line):
            continue
        if re.fullmatch(r'\d+[-–]\d+[•\.]?', line):
            continue
        line_low = line.lower()
        if re.match(r'^chapter\s*$', line_low, re.I):
            if pending_chapter:
                result.append(pending_chapter)
            pending_chapter = 'Chapter'
            continue
        if re.match(r'^chapter\s+[ivxlcdm\d]+\s*$', line_low, re.I):
            chap_num = line.split()[-1].upper()
            if pending_chapter:
                result.append(pending_chapter)
            pending_chapter = f'Chapter {chap_num}'
            continue
        if pending_chapter:
            if line_low not in skip_words:
                pending_chapter = f'{pending_chapter} — {line}'
                result.append(pending_chapter)
            pending_chapter = None
            continue
        if line_low in skip_words:
            continue
        alpha = sum(1 for c in line if c.isalpha())
        noise = sum(1 for c in line if c in '^[];}{|\\~`@#$%&*')
        if noise > 1 or (alpha > 0 and noise / len(line) > 0.1):
            continue
        if len(line) < 4:
            continue
        result.append(line)

    if pending_chapter:
        result.append(pending_chapter)
    return result


def translate_lines_to_fr(lines):
    """Traduit les lignes en français par batch (Google Translate, gratuit)."""
    translator = GoogleTranslator(source='en', target='fr')
    translated = []
    # Traduction par lots de 10 pour éviter les timeouts
    batch_size = 10
    for i in range(0, len(lines), batch_size):
        batch = lines[i:i + batch_size]
        for line in batch:
            try:
                tr = translator.translate(line)
                translated.append(tr if tr else line)
            except Exception as e:
                print(f'    [traduction échouée, conservé en anglais] {line[:50]} — {e}')
                translated.append(line)
            time.sleep(0.1)  # Politesse envers l'API
    return translated


def strip_toc_block(text, markers):
    """Retire le bloc TOC existant (EN ou FR) à la fin du texte."""
    for marker in markers:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


def db_get(slug):
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug, data):
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=HEADERS, json=data
    )
    r.raise_for_status()


print(f'\n{"="*70}')
print(f'  CINCINNATI — CORRECTION TOC FR (traduction en français)')
print(f'{"="*70}\n')

ok = 0
errors = 0

for fname, slug in FILE_SLUG.items():
    pdf_path = DOCS_DIR / fname
    print(f'\n{"─"*70}')
    print(f'  {fname}')
    print(f'  slug: {slug}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable')
        errors += 1
        continue

    # Extraire TOC
    try:
        doc = fitz.open(str(pdf_path))
        page_num, raw_text = find_toc_text(doc, max_pages=25)
        doc.close()
    except Exception as e:
        print(f'  ✗ Erreur lecture PDF: {e}')
        errors += 1
        continue

    if not page_num:
        print(f'  ⚠ Aucun TOC trouvé — ignoré')
        continue

    toc_lines_en = clean_toc_lines(raw_text)
    print(f'  ✓ TOC extraite : {len(toc_lines_en)} lignes')

    # Traduction
    print(f'  Traduction en français...')
    toc_lines_fr = translate_lines_to_fr(toc_lines_en)
    print(f'  ✓ Traduction terminée')

    # Récupérer descriptions actuelles
    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    # Retirer le bloc TOC existant (EN dans description_fr — erreur précédente)
    desc_fr_clean = strip_toc_block(desc_fr, ['\n\nTable des matières :', '\n\nTable of Contents:'])
    desc_en_clean = strip_toc_block(desc_en, ['\n\nTable of Contents:', '\n\nTable des matières :'])

    # Construire les nouveaux blocs
    toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
    toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

    new_desc_en = desc_en_clean + toc_en_block
    new_desc_fr = desc_fr_clean + toc_fr_block

    db_patch(slug, {'description': new_desc_en, 'description_fr': new_desc_fr})
    print(f'  ✓ DB mise à jour (TOC FR traduite)')

    # Aperçu
    print(f'  Aperçu FR (5 premières lignes) :')
    for l in toc_lines_fr[:5]:
        print(f'    • {l}')

    ok += 1

print(f'\n{"="*70}')
print(f'  BILAN: {ok} corrigés | {errors} erreurs')
print(f'{"="*70}\n')
