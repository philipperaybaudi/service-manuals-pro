"""
add-dell-language-to-descriptions.py
======================================
Post-traitement des descriptions DELL :
1. Détecte la langue de chaque PDF (langdetect, zéro coût API)
2. Différencie les slugs dupliqués avec suffixe langue (-ko, -de, -fr, etc.)
3. Si même langue en doublon → ajoute -2, -3, etc.
4. Préfixe les descriptions avec la langue (règle DELL)
5. Met language = null → visible sur les deux sites FR et EN

Usage :
    python scripts/add-dell-language-to-descriptions.py [--dry-run]
"""

import os, sys, json, re
from collections import defaultdict
import fitz
from langdetect import detect, LangDetectException

REPORT_PATH = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_SOURCE = r"C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Informatique\DELL"

DRY_RUN = "--dry-run" in sys.argv

# ISO 639-1 → (nom EN, nom FR, suffixe slug)
LANG_MAP = {
    "en": ("English",    "Anglais",     "en"),
    "fr": ("French",     "Français",    "fr"),
    "de": ("German",     "Allemand",    "de"),
    "es": ("Spanish",    "Espagnol",    "es"),
    "it": ("Italian",    "Italien",     "it"),
    "pt": ("Portuguese", "Portugais",   "pt"),
    "ko": ("Korean",     "Coréen",      "ko"),
    "ja": ("Japanese",   "Japonais",    "ja"),
    "zh": ("Chinese",    "Chinois",     "zh"),
    "ru": ("Russian",    "Russe",       "ru"),
    "ar": ("Arabic",     "Arabe",       "ar"),
    "nl": ("Dutch",      "Néerlandais", "nl"),
    "pl": ("Polish",     "Polonais",    "pl"),
    "cs": ("Czech",      "Tchèque",     "cs"),
    "hu": ("Hungarian",  "Hongrois",    "hu"),
    "ro": ("Romanian",   "Roumain",     "ro"),
    "tr": ("Turkish",    "Turc",        "tr"),
    "sv": ("Swedish",    "Suédois",     "sv"),
    "da": ("Danish",     "Danois",      "da"),
    "fi": ("Finnish",    "Finnois",     "fi"),
    "nb": ("Norwegian",  "Norvégien",   "no"),
    "el": ("Greek",      "Grec",        "el"),
    "he": ("Hebrew",     "Hébreu",      "he"),
    "th": ("Thai",       "Thaï",        "th"),
    "uk": ("Ukrainian",  "Ukrainien",   "uk"),
}

def get_lang_info(code):
    if not code:
        return ("Unknown", "Inconnu", "xx")
    base = code.split('-')[0]
    return LANG_MAP.get(code) or LANG_MAP.get(base) or (code.upper(), code.upper(), base)

def detect_language(pdf_path, max_pages=5):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for i in range(min(max_pages, len(doc))):
            text += doc[i].get_text()
        doc.close()
        text = text.strip()
        if len(text) < 30:
            return None
        return detect(text)
    except Exception:
        return None

def strip_existing_prefix(desc):
    if not desc:
        return ""
    pattern = r'^.{0,150},\s*(?:de\s+)?\d+\s+pages?\s+(?:in|en)\s+\w+\.\s*'
    return re.sub(pattern, '', desc, flags=re.IGNORECASE).strip()

# ── Load report ───────────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding='utf-8') as f:
    data = json.load(f)

targets = [d for d in data['docs']
           if d.get('brand') == 'DELL' and d.get('status') == 'done']

# Slugs déjà en base (imported) — à ne pas dupliquer
imported_slugs = {d['slug'] for d in data['docs'] if d.get('status') == 'imported'}

print(f"Docs DELL à traiter : {len(targets)}")
if DRY_RUN:
    print("MODE DRY-RUN — aucune modification du JSON")
print()

# ── Étape 1 : détecter les langues ───────────────────────────────────────────
print("Détection des langues...")
lang_results = {}  # original_path → lang_code

for i, doc in enumerate(targets):
    fname    = os.path.basename(doc.get('original_path') or doc.get('original_filename') or '')
    pdf_path = os.path.join(DOCS_SOURCE, fname)
    if os.path.exists(pdf_path):
        lang_results[doc.get('original_path')] = detect_language(pdf_path)
    else:
        lang_results[doc.get('original_path')] = None
    if (i+1) % 100 == 0:
        print(f"  {i+1}/{len(targets)} analysés...")

print(f"Détection terminée.\n")

# ── Étape 2 : résolution des doublons de slugs ───────────────────────────────
# slug_base → liste de (doc, lang_code)
slug_groups = defaultdict(list)
for doc in targets:
    slug_groups[doc['slug']].append(doc)

# Slugs finaux attribués (pour éviter les conflits)
used_slugs = set(imported_slugs)
# Ajouter les slugs des docs already imported dans ce lot
for doc in data['docs']:
    if doc.get('status') == 'imported':
        used_slugs.add(doc['slug'])

def assign_unique_slug(base_slug, lang_suffix, used):
    """Génère un slug unique en ajoutant le suffixe langue puis -2, -3..."""
    if lang_suffix and lang_suffix != 'en':
        candidate = f"{base_slug}-{lang_suffix}"
    else:
        candidate = base_slug

    if candidate not in used:
        used.add(candidate)
        return candidate

    # Conflit → ajouter numéro
    n = 2
    while True:
        numbered = f"{candidate}-{n}"
        if numbered not in used:
            used.add(numbered)
            return numbered
        n += 1

# ── Étape 3 : appliquer les corrections ──────────────────────────────────────
ok = skipped = 0

for base_slug, group in slug_groups.items():
    if len(group) == 1:
        # Pas de doublon — traitement simple
        doc       = group[0]
        lang_code = lang_results.get(doc.get('original_path'))
        lang_en, lang_fr, lang_sfx = get_lang_info(lang_code)

        new_slug = assign_unique_slug(base_slug, lang_sfx, used_slugs)

        title_en  = doc.get('title_en') or doc.get('title') or ''
        title_fr  = doc.get('title_fr') or title_en
        page_count = doc.get('page_count')

        desc_en = strip_existing_prefix(doc.get('description_en') or doc.get('description') or '')
        desc_fr = strip_existing_prefix(doc.get('description_fr') or '')

        pages_en = f"{page_count} pages" if page_count else "unknown pages"
        pages_fr = f"{page_count} pages" if page_count else "pages inconnues"

        if lang_code:
            new_desc_en = f"{title_en}, {pages_en} in {lang_en}. {desc_en}".strip()
            new_desc_fr = f"{title_fr}, de {pages_fr} en {lang_fr}. {desc_fr}".strip()
        else:
            new_desc_en = desc_en
            new_desc_fr = desc_fr
            skipped += 1

        if not DRY_RUN:
            doc['slug']           = new_slug
            doc['description_en'] = new_desc_en
            doc['description']    = new_desc_en
            doc['description_fr'] = new_desc_fr
            doc['language']       = None   # visible sur les deux sites
        else:
            lang_label = lang_en if lang_code else "NON DÉTECTÉE"
            print(f"  [{lang_label}]  {base_slug} → {new_slug}")
        ok += 1

    else:
        # Groupe de doublons → différencier par langue
        for doc in group:
            lang_code = lang_results.get(doc.get('original_path'))
            lang_en, lang_fr, lang_sfx = get_lang_info(lang_code)

            new_slug = assign_unique_slug(base_slug, lang_sfx, used_slugs)

            title_en   = doc.get('title_en') or doc.get('title') or ''
            title_fr   = doc.get('title_fr') or title_en
            page_count = doc.get('page_count')

            desc_en = strip_existing_prefix(doc.get('description_en') or doc.get('description') or '')
            desc_fr = strip_existing_prefix(doc.get('description_fr') or '')

            pages_en = f"{page_count} pages" if page_count else "unknown pages"
            pages_fr = f"{page_count} pages" if page_count else "pages inconnues"

            if lang_code:
                new_desc_en = f"{title_en}, {pages_en} in {lang_en}. {desc_en}".strip()
                new_desc_fr = f"{title_fr}, de {pages_fr} en {lang_fr}. {desc_fr}".strip()
            else:
                new_desc_en = desc_en
                new_desc_fr = desc_fr
                skipped += 1

            if not DRY_RUN:
                doc['slug']           = new_slug
                doc['description_en'] = new_desc_en
                doc['description']    = new_desc_en
                doc['description_fr'] = new_desc_fr
                doc['language']       = None
            else:
                lang_label = lang_en if lang_code else "NON DÉTECTÉE"
                print(f"  [{lang_label}]  {base_slug} → {new_slug}")
            ok += 1

# ── Sauvegarder ───────────────────────────────────────────────────────────────
if not DRY_RUN:
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"JSON mis à jour : {REPORT_PATH}")

print(f"\nTerminé — {ok} traités | {skipped} langue non détectée (description sans préfixe) | language=null sur tous")
