"""
automobile-update-toc.py
Extrait, nettoie, traduit (FR) et insère les tables des matières
dans les descriptions DB des documents Automobile >= $20.
TOC EN -> description (site anglais)
TOC FR -> description_fr (site français, traduit via Google Translate)
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

DRY_RUN = '--dry-run' in __import__('sys').argv

DOCS_BASE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index']

# Mapping fichier → slug DB (documents >= $20 uniquement, Suzuki $3 exclu)
FILE_SLUG = {
    # ARCTIC CAT
    r'ARCTIC CAT\arctic_cat_1999_atvs_all_models_service_manual $25.pdf':
        'arctic-cat-arctic-cat-1999-atvs-service-manual',
    # BMW
    r'BMW\BMW_3 Series_2005-2010 (E90, E91, E92, E93) Service Manual $25.pdf':
        'bmw-bmw-3-series-e90-e91-owners-workshop-manual',
    # CITROEN
    r'CITROEN\Citroen_DS_ID19 Manuel de Service $35.pdf':
        'citroen-citroen-ds-id19-repair-manual',
    # FORD
    r'FORD\Ford Explorer & Mountaineer - 1996-2001 - Workshop Manual $45.pdf':
        'ford-ford-explorer-mountaineer-workshop-manual-1996-2001',
    r'FORD\Ford_2N-8N-9N-I&T Service Manual $20.pdf':
        'ford-ford-2n-8n-9n-i-t-service-manual',
    # HARLEY-DAVIDSON
    r'HARLEY-DAVIDSON\2009 Ultra Classic All Touring Models Service Manual $39.pdf':
        'harley-davidson-2009-harley-davidson-ultra-classic-touring-service-manual',
    # HONDA
    r'HONDA\1998-2004 Foreman 450 Service Manual $25.pdf':
        'honda-honda-foreman-450-service-manual-1998-2004',
    # MERCEDES
    r'MERCEDES\Mercedes-Benz_190C-190Dc-220B-220Sb-220SEb-230SL-300SE Service Manual $25.pdf':
        'mercedes-mercedes-benz-190c-190dc-220b-220sb-220seb-230sl-300se-service-manual',
    r'MERCEDES\Mercedes-Benz_190c-200-190Dc-200D-230-220b-220Sb-230S-250S-220SEb-250SE-230SL-250SL-300SE-300SEb-300SEL Service Manuel $25.pdf':
        'mercedes-mercedes-benz-190c-200-190dc-200d-230-220b-220sb-230s-250s-220seb-250se-230sl-250sl-300se-300seb-300sel-service',
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
                  'inhaltsverzeichnis', 'subject index', 'section',
                  'chapter', 'i', 'ii', 'iii', 'iv', 'v',
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
        if re.match(r'^section\s+\d+', line_low, re.I):
            if pending_chapter:
                result.append(pending_chapter)
                pending_chapter = None
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


def translate_lines(lines, source='en', target='fr'):
    """Traduit une liste de lignes. Retourne les lignes traduites."""
    translator = GoogleTranslator(source=source, target=target)
    translated = []
    for line in lines:
        try:
            tr = translator.translate(line)
            translated.append(tr if tr else line)
        except Exception as e:
            print(f'    [traduction échouée] {line[:50]} — {e}')
            translated.append(line)
        time.sleep(0.1)
    return translated


def detect_source_lang(lines):
    """Détecte si les lignes sont plutôt en anglais ou français."""
    fr_words = {'le', 'la', 'les', 'de', 'du', 'des', 'et', 'en', 'un', 'une',
                'pour', 'avec', 'dans', 'sur', 'par', 'au', 'aux', 'ou'}
    text = ' '.join(lines).lower()
    words = set(re.findall(r'\b\w+\b', text))
    fr_count = len(words & fr_words)
    return 'fr' if fr_count >= 3 else 'en'


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
print(f'  AUTOMOBILE — MISE A JOUR TOC EN DB{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

ok = 0
skipped = 0
errors = 0

for rel_path, slug in FILE_SLUG.items():
    pdf_path = DOCS_BASE / rel_path
    print(f'\n{"─"*70}')
    print(f'  {rel_path}')
    print(f'  slug: {slug}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable : {pdf_path}')
        errors += 1
        continue

    try:
        doc = fitz.open(str(pdf_path))
        page_num, raw_text = find_toc_text(doc, max_pages=25)
        doc.close()
    except Exception as e:
        print(f'  ✗ Erreur lecture PDF: {e}')
        errors += 1
        continue

    if not page_num:
        print(f'  ⚠ Aucun TOC trouvé dans les 25 premières pages — ignoré')
        skipped += 1
        continue

    print(f'  ✓ TOC trouvée page {page_num}')
    toc_lines = clean_toc_lines(raw_text)
    print(f'  {len(toc_lines)} lignes extraites')
    for l in toc_lines[:5]:
        print(f'    • {l}')
    if len(toc_lines) > 5:
        print(f'    ... ({len(toc_lines)-5} de plus)')

    # Détecter langue source
    src_lang = detect_source_lang(toc_lines)
    print(f'  Langue source détectée : {src_lang}')

    # Traduire pour description_fr
    if src_lang == 'fr':
        toc_lines_fr = toc_lines
        print(f'  (document FR → traduction FR→EN pour site anglais)')
        toc_lines_en = translate_lines(toc_lines, source='fr', target='en')
    else:
        # Source anglais → traduit en FR pour description_fr
        toc_lines_en = toc_lines
        print(f'  Traduction en français...')
        toc_lines_fr = translate_lines(toc_lines, source='en', target='fr')
        print(f'  ✓ Traduction terminée')
        print(f'  Aperçu FR :')
        for l in toc_lines_fr[:3]:
            print(f'    → {l}')

    # Récupérer descriptions actuelles
    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    # Vérifier si TOC déjà présente
    if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
        print(f'  ○ TOC déjà présente — ignoré')
        skipped += 1
        continue

    toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
    toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

    new_desc_en = desc_en + toc_en_block
    new_desc_fr = desc_fr + toc_fr_block

    if DRY_RUN:
        print(f'  [DRY] Mise à jour OK')
        ok += 1
        continue

    db_patch(slug, {'description': new_desc_en, 'description_fr': new_desc_fr})
    print(f'  ✓ DB mise à jour')
    ok += 1

print(f'\n{"="*70}')
print(f'  BILAN: {ok} mis à jour | {skipped} ignorés | {errors} erreurs')
print(f'{"="*70}\n')
