"""
dell-phase1-audit.py — Audit complet 2390 fiches DELL
=======================================================
Pour chaque fiche :
  1. Détecte la langue réelle du PDF (page 1, Unicode infaillible)
  2. Compte les pages réelles du PDF
  3. Compare avec le slug DB (langue)
  4. Compare avec le page_count DB
  5. Compare avec la langue mentionnée dans description_fr
  6. Détecte incohérences → rapport JSON

Sortie : scripts/dell-audit-phase1.json
Usage   : python -X utf8 scripts/dell-phase1-audit.py
"""

import os, sys, json, re, requests
from pathlib import Path
from collections import defaultdict

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

# ── .env.local ──────────────────────────────────────────────────────────────
env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

import fitz  # PyMuPDF

CORRECTIONS_FILE = SCRIPT_DIR / 'corrections-dell.json'
OUTPUT_FILE      = SCRIPT_DIR / 'dell-audit-phase1.json'
DOCS_DIR         = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL')

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

# ── Correspondances code langue → noms ──────────────────────────────────────
LANG_FR = {
    'af': 'Afrikaans', 'ar': 'Arabe', 'bg': 'Bulgare', 'ca': 'Catalan',
    'cs': 'Tchèque', 'da': 'Danois', 'de': 'Allemand', 'el': 'Grec',
    'en': 'Anglais', 'es': 'Espagnol', 'et': 'Estonien', 'fi': 'Finnois',
    'fr': 'Français', 'he': 'Hébreu', 'hr': 'Croate', 'hu': 'Hongrois',
    'id': 'Indonésien', 'it': 'Italien', 'ja': 'Japonais', 'ko': 'Coréen',
    'lt': 'Lituanien', 'lv': 'Letton', 'nl': 'Néerlandais', 'no': 'Norvégien',
    'pl': 'Polonais', 'pt': 'Portugais', 'ro': 'Roumain', 'ru': 'Russe',
    'sk': 'Slovaque', 'sl': 'Slovène', 'sr': 'Serbe', 'sv': 'Suédois',
    'th': 'Thaï', 'tl': 'Tagalog', 'tr': 'Turc', 'uk': 'Ukrainien',
    'vi': 'Vietnamien', 'zh': 'Chinois',
}
LANG_EN = {
    'af': 'Afrikaans', 'ar': 'Arabic', 'bg': 'Bulgarian', 'ca': 'Catalan',
    'cs': 'Czech', 'da': 'Danish', 'de': 'German', 'el': 'Greek',
    'en': 'English', 'es': 'Spanish', 'et': 'Estonian', 'fi': 'Finnish',
    'fr': 'French', 'he': 'Hebrew', 'hr': 'Croatian', 'hu': 'Hungarian',
    'id': 'Indonesian', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean',
    'lt': 'Lithuanian', 'lv': 'Latvian', 'nl': 'Dutch', 'no': 'Norwegian',
    'pl': 'Polish', 'pt': 'Portuguese', 'ro': 'Romanian', 'ru': 'Russian',
    'sk': 'Slovak', 'sl': 'Slovenian', 'sr': 'Serbian', 'sv': 'Swedish',
    'th': 'Thai', 'tl': 'Tagalog', 'tr': 'Turkish', 'uk': 'Ukrainian',
    'vi': 'Vietnamese', 'zh': 'Chinese',
}

# ── Détection langue par caractères (page 1 uniquement) ─────────────────────
def detect_lang(text):
    ko = sum(1 for c in text if 0xAC00 <= ord(c) <= 0xD7AF or 0x1100 <= ord(c) <= 0x11FF)
    if ko > 3: return 'ko', 'definitive'
    ja = sum(1 for c in text if 0x3040 <= ord(c) <= 0x30FF)
    if ja > 3: return 'ja', 'definitive'
    zh = sum(1 for c in text if 0x4E00 <= ord(c) <= 0x9FFF or 0x3400 <= ord(c) <= 0x4DBF)
    if zh > 5: return 'zh', 'definitive'
    ar = sum(1 for c in text if 0x0600 <= ord(c) <= 0x06FF)
    if ar > 5: return 'ar', 'definitive'
    he = sum(1 for c in text if 0x0590 <= ord(c) <= 0x05FF)
    if he > 5: return 'he', 'definitive'
    th = sum(1 for c in text if 0x0E00 <= ord(c) <= 0x0E7F)
    if th > 5: return 'th', 'definitive'
    vi = sum(1 for c in text if 0x1EA0 <= ord(c) <= 0x1EF9)
    if vi > 10: return 'vi', 'definitive'
    if text.count('ß') > 0: return 'de', 'definitive'
    if 'ñ' in text or 'Ñ' in text: return 'es', 'definitive'
    if 'đ' in text or 'Đ' in text: return 'hr', 'definitive'
    if 'ř' in text or 'Ř' in text: return 'cs', 'definitive'
    if 'ľ' in text or 'Ľ' in text: return 'sk', 'definitive'
    hu = text.count('ő') + text.count('Ő') + text.count('ű') + text.count('Ű')
    if hu > 2: return 'hu', 'definitive'
    if 'ș' in text or 'ț' in text or 'Ș' in text or 'Ț' in text: return 'ro', 'definitive'
    ro_a = text.count('ă') + text.count('Ă')
    if ro_a > 2: return 'ro', 'definitive'
    if 'l·l' in text or 'L·L' in text: return 'ca', 'definitive'
    ae_oe = text.count('æ') + text.count('Æ') + text.count('ø') + text.count('Ø')
    if ae_oe > 2: return 'da', 'probable'
    sv = text.count('å') + text.count('Å') + text.count('ä') + text.count('Ä') + text.count('ö') + text.count('Ö')
    if sv > 5: return 'sv', 'probable'
    de_l = text.count('ä') + text.count('ö') + text.count('ü') + text.count('Ä') + text.count('Ö') + text.count('Ü')
    if de_l > 5: return 'de', 'probable'
    return None, 'low'

def get_page1_text(pdf_path):
    try:
        doc = fitz.open(str(pdf_path))
        text = doc[0].get_text() if len(doc) > 0 else ''
        doc.close()
        return text.strip()
    except Exception:
        return ''

def get_page_count(pdf_path):
    try:
        doc = fitz.open(str(pdf_path))
        n = len(doc)
        doc.close()
        return n
    except Exception:
        return 0

def lang_from_slug(slug):
    m = re.search(r'-([a-z]{2,3})(?:-\d+)?$', slug)
    return m.group(1) if m else 'en'

# ── Charger corrections-dell.json ────────────────────────────────────────────
with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

# Index: old_slug → entry, new_slug → entry
by_old = {}
by_new = {}
for entry in corrections:
    old = entry.get('old_slug', '')
    new = entry.get('new_slug', '')
    if old: by_old[old] = entry
    if new: by_new[new] = entry

def find_entry(db_slug):
    if db_slug in by_old: return by_old[db_slug]
    if db_slug in by_new: return by_new[db_slug]
    return None

def find_local_pdf(entry):
    lp = entry.get('local_pdf', '')
    if not lp: return None
    p = Path(lp)
    if p.exists(): return p
    # Essai DOCS_DIR
    cand = DOCS_DIR / p.name
    if cand.exists(): return cand
    return None

# ── Requête DB : tous les slugs DELL avec données ────────────────────────────
def fetch_all_dell():
    docs = []
    offset = 0
    limit = 1000
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/documents',
            params={'select': 'id,slug,title,title_fr,description,description_fr,page_count',
                    'slug': 'like.dell-%', 'limit': str(limit), 'offset': str(offset)},
            headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json()
        if not data: break
        docs.extend(data)
        if len(data) < limit: break
        offset += limit
    return docs

# ── Détecter langue dans description_fr ─────────────────────────────────────
def find_lang_in_desc(desc_fr):
    """Retourne le code langue mentionné dans la description, ou None."""
    if not desc_fr: return None
    for code, name in LANG_FR.items():
        if f'en {name}' in desc_fr or f'En {name}' in desc_fr:
            return code
    return None

# ── MAIN ─────────────────────────────────────────────────────────────────────
print(f'\n{"═"*64}')
print('  DELL PHASE 1 — AUDIT COMPLET 2390 FICHES')
print(f'{"═"*64}\n')

print('Récupération DB...')
db_docs = fetch_all_dell()
print(f'  → {len(db_docs)} documents DELL\n')

results = {
    'ok':           [],  # tout correct
    'slug_error':   [],  # langue slug ≠ langue PDF (définitif)
    'pages_error':  [],  # page_count DB ≠ pages réelles PDF
    'desc_error':   [],  # langue dans description ≠ langue PDF
    'preview_regen':[],  # tous les docs (preview à régénérer depuis PDF)
    'no_pdf':       [],  # PDF local introuvable
    'image_pdf':    [],  # PDF image (pas de texte extractible)
    'uncertain':    [],  # détection non définitive
}

for i, doc in enumerate(db_docs, 1):
    slug      = doc['slug']
    db_pages  = doc.get('page_count') or 0
    desc_fr   = doc.get('description_fr') or ''
    slug_lang = lang_from_slug(slug)

    # Trouver le PDF local
    entry = find_entry(slug)
    if not entry:
        results['no_pdf'].append({'slug': slug, 'reason': 'Pas dans corrections-dell.json'})
        continue

    pdf_path = find_local_pdf(entry)
    if not pdf_path:
        results['no_pdf'].append({'slug': slug, 'reason': f"PDF introuvable: {entry.get('local_pdf','')}"})
        continue

    # Lire page 1 + compter pages
    text       = get_page1_text(pdf_path)
    real_pages = get_page_count(pdf_path)
    pdf_name   = pdf_path.name

    # Langue détectée
    det_lang, confidence = detect_lang(text)

    # Toujours ajouter pour régénération preview
    results['preview_regen'].append({
        'slug':     slug,
        'pdf_path': str(pdf_path),
        'pdf_name': pdf_name,
    })

    # Vérifier page count
    pages_ok = (db_pages == real_pages)

    # Vérifier langue slug vs PDF
    if confidence == 'definitive' and det_lang:
        slug_ok = (det_lang == slug_lang) or (det_lang == 'da' and slug_lang in ('da', 'no', 'sv'))
    else:
        slug_ok = True  # pas de correction si incertain

    # Vérifier langue dans description
    desc_lang = find_lang_in_desc(desc_fr)
    if confidence == 'definitive' and det_lang and desc_lang:
        desc_ok = (desc_lang == det_lang) or (det_lang == 'da' and desc_lang in ('da', 'no', 'sv'))
    else:
        desc_ok = True  # pas de correction si incertain

    # Collecter les erreurs
    issues = []
    if not pages_ok:
        issues.append('pages')
        results['pages_error'].append({
            'slug': slug, 'db_pages': db_pages, 'real_pages': real_pages,
            'pdf_path': str(pdf_path),
        })
    if not slug_ok:
        issues.append('slug')
        results['slug_error'].append({
            'slug':          slug,
            'slug_lang':     slug_lang,
            'char_detected': det_lang,
            'confidence':    confidence,
            'pdf_path':      str(pdf_path),
            'pdf_name':      pdf_name,
        })
    if not desc_ok:
        issues.append('desc')
        results['desc_error'].append({
            'slug':          slug,
            'desc_lang':     desc_lang,
            'real_lang':     det_lang,
            'desc_fr':       desc_fr[:200],
            'desc_en':       (doc.get('description') or '')[:200],
            'lang_fr_wrong': LANG_FR.get(desc_lang, desc_lang),
            'lang_fr_right': LANG_FR.get(det_lang, det_lang),
            'lang_en_wrong': LANG_EN.get(desc_lang, desc_lang),
            'lang_en_right': LANG_EN.get(det_lang, det_lang),
        })

    if not issues:
        if len(text) < 30:
            results['image_pdf'].append({'slug': slug, 'pdf_path': str(pdf_path)})
        elif confidence == 'low' or not det_lang:
            results['uncertain'].append({'slug': slug, 'pdf_path': str(pdf_path)})
        else:
            results['ok'].append(slug)

    if i % 100 == 0:
        print(f'  [{i}/{len(db_docs)}] OK={len(results["ok"])} '
              f'slug_err={len(results["slug_error"])} '
              f'pages_err={len(results["pages_error"])} '
              f'desc_err={len(results["desc_error"])}')

# ── Rapport ──────────────────────────────────────────────────────────────────
print(f'\n{"═"*64}')
print('  RÉSULTATS AUDIT PHASE 1')
print(f'{"═"*64}')
print(f'  ✓ Corrects             : {len(results["ok"])}')
print(f'  ✗ Erreurs slug         : {len(results["slug_error"])}')
print(f'  ✗ Erreurs pages        : {len(results["pages_error"])}')
print(f'  ✗ Erreurs description  : {len(results["desc_error"])}')
print(f'  ○ PDFs image           : {len(results["image_pdf"])}')
print(f'  ? Incertains           : {len(results["uncertain"])}')
print(f'  ✗ PDF introuvable      : {len(results["no_pdf"])}')
print(f'  → Previews à régénérer: {len(results["preview_regen"])}')

if results['slug_error']:
    print(f'\n  — ERREURS SLUG —')
    for e in results['slug_error']:
        print(f'    {e["slug"]} | slug={e["slug_lang"]} | réel={e["char_detected"]}')

if results['pages_error']:
    print(f'\n  — ERREURS PAGES (5 premiers) —')
    for e in results['pages_error'][:5]:
        print(f'    {e["slug"]} | DB={e["db_pages"]} | réel={e["real_pages"]}')

if results['desc_error']:
    print(f'\n  — ERREURS DESCRIPTION (5 premiers) —')
    for e in results['desc_error'][:5]:
        print(f'    {e["slug"]} | desc={e["desc_lang"]} | réel={e["real_lang"]}')

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Sauvegardé : {OUTPUT_FILE}')
print(f'{"═"*64}\n')
