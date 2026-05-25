"""
fix-dell-language-detection.py
================================
Corrige la détection de langue pour les docs DELL importés (status="imported").
- Re-détecte depuis la PAGE 1 UNIQUEMENT (couverture = référence fiable)
- Recalcule les slugs corrects
- Génère corrections-dell.json pour apply-dell-corrections.mjs

Usage :
    python scripts/fix-dell-language-detection.py [--dry-run]
"""

import os, sys, json, re
from collections import defaultdict
import fitz
from detect_language_robust import detect_language_page1

REPORT_PATH      = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_SOURCE      = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL"
CORRECTIONS_PATH = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\corrections-dell.json"

DRY_RUN = "--dry-run" in sys.argv

LANG_MAP = {
    "en": ("English",    "Anglais",      "en"),
    "fr": ("French",     "Français",     "fr"),
    "de": ("German",     "Allemand",     "de"),
    "es": ("Spanish",    "Espagnol",     "es"),
    "it": ("Italian",    "Italien",      "it"),
    "pt": ("Portuguese", "Portugais",    "pt"),
    "ko": ("Korean",     "Coréen",       "ko"),
    "ja": ("Japanese",   "Japonais",     "ja"),
    "zh": ("Chinese",    "Chinois",      "zh"),
    "ru": ("Russian",    "Russe",        "ru"),
    "ar": ("Arabic",     "Arabe",        "ar"),
    "nl": ("Dutch",      "Néerlandais",  "nl"),
    "pl": ("Polish",     "Polonais",     "pl"),
    "cs": ("Czech",      "Tchèque",      "cs"),
    "hu": ("Hungarian",  "Hongrois",     "hu"),
    "ro": ("Romanian",   "Roumain",      "ro"),
    "tr": ("Turkish",    "Turc",         "tr"),
    "sv": ("Swedish",    "Suédois",      "sv"),
    "da": ("Danish",     "Danois",       "da"),
    "fi": ("Finnish",    "Finnois",      "fi"),
    "nb": ("Norwegian",  "Norvégien",    "no"),
    "el": ("Greek",      "Grec",         "el"),
    "he": ("Hebrew",     "Hébreu",       "he"),
    "th": ("Thai",       "Thaï",         "th"),
    "uk": ("Ukrainian",  "Ukrainien",    "uk"),
    "id": ("Indonesian", "Indonésien",   "id"),
    "ms": ("Malay",      "Malais",       "ms"),
    "hr": ("Croatian",   "Croate",       "hr"),
    "sk": ("Slovak",     "Slovaque",     "sk"),
    "sl": ("Slovenian",  "Slovène",      "sl"),
    "bg": ("Bulgarian",  "Bulgare",      "bg"),
    "sr": ("Serbian",    "Serbe",        "sr"),
    "lt": ("Lithuanian", "Lituanien",    "lt"),
    "lv": ("Latvian",    "Letton",       "lv"),
    "et": ("Estonian",   "Estonien",     "et"),
    "vi": ("Vietnamese", "Vietnamien",   "vi"),
}

ALL_LANG_SUFFIXES = sorted(set(v[2] for v in LANG_MAP.values()) | {"xx"}, key=len, reverse=True)

def get_lang_info(code):
    if not code:
        return ("Unknown", "Inconnu", "xx")
    base = code.split('-')[0]
    return LANG_MAP.get(code) or LANG_MAP.get(base) or (code.upper(), code.upper(), base[:3])

# detect_language_page1 importé depuis detect_language_robust

def strip_existing_prefix(desc):
    if not desc:
        return ""
    pattern = r'^.{0,200},\s*(?:de\s+)?\d+\s+pages?\s+(?:in|en)\s+\w+\.\s*'
    return re.sub(pattern, '', desc, flags=re.IGNORECASE).strip()

def get_base_slug(current_slug):
    """Extrait le slug de base en retirant le suffixe numérique puis langue."""
    slug = re.sub(r'-\d+$', '', current_slug)  # retire -2, -3...
    for sfx in ALL_LANG_SUFFIXES:
        if slug.endswith(f'-{sfx}'):
            return slug[:-len(sfx)-1]
    return slug  # aucun suffixe langue → était anglais

def assign_unique_slug(base_slug, lang_suffix, used):
    candidate = f"{base_slug}-{lang_suffix}" if lang_suffix and lang_suffix != 'en' else base_slug
    if candidate not in used:
        used.add(candidate)
        return candidate
    n = 2
    while True:
        numbered = f"{candidate}-{n}"
        if numbered not in used:
            used.add(numbered)
            return numbered
        n += 1

# ── Chargement JSON ───────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding='utf-8') as f:
    data = json.load(f)

targets = [d for d in data['docs']
           if d.get('brand') == 'DELL' and d.get('status') == 'imported']

print(f"Docs DELL importés à corriger : {len(targets)}")
if DRY_RUN:
    print("MODE DRY-RUN\n")

# Slugs déjà utilisés (hors docs traités) — pour éviter conflits
used_slugs = {d['slug'] for d in data['docs']
              if d.get('slug') and not (d.get('brand') == 'DELL' and d.get('status') == 'imported')}

# ── Détection langues page 1 ──────────────────────────────────────────────────
print("Détection des langues (page 1 uniquement)...")
lang_by_slug = {}

for i, doc in enumerate(targets):
    fname    = os.path.basename(doc.get('original_path') or doc.get('original_filename') or '')
    pdf_path = os.path.join(DOCS_SOURCE, fname)
    if os.path.exists(pdf_path):
        lang_by_slug[doc['slug']] = detect_language_page1(pdf_path)
    else:
        print(f"  [MANQUANT] {fname}")
        lang_by_slug[doc['slug']] = None
    if (i + 1) % 50 == 0:
        print(f"  {i+1}/{len(targets)} analysés...")

print("Détection terminée.\n")

# ── Calcul des corrections ────────────────────────────────────────────────────
corrections    = []
changed_slug   = 0
changed_desc   = 0
unchanged      = 0

for doc in targets:
    old_slug   = doc['slug']
    lang_code  = lang_by_slug.get(old_slug)
    lang_en, lang_fr, lang_sfx = get_lang_info(lang_code)

    base_slug  = get_base_slug(old_slug)
    new_slug   = assign_unique_slug(base_slug, lang_sfx, used_slugs)

    title_en   = doc.get('title_en') or doc.get('title') or ''
    title_fr   = doc.get('title_fr') or title_en
    page_count = doc.get('page_count')
    pages_en   = f"{page_count} pages" if page_count else "unknown pages"
    pages_fr   = f"{page_count} pages" if page_count else "pages inconnues"

    raw_en = strip_existing_prefix(doc.get('description_en') or doc.get('description') or '')
    raw_fr = strip_existing_prefix(doc.get('description_fr') or '')

    if lang_code:
        new_desc_en = f"{title_en}, {pages_en} in {lang_en}. {raw_en}".strip()
        new_desc_fr = f"{title_fr}, de {pages_fr} en {lang_fr}. {raw_fr}".strip()
    else:
        new_desc_en = raw_en
        new_desc_fr = raw_fr

    slug_changed = (new_slug != old_slug)

    if DRY_RUN:
        label = "SLUG+DESC" if slug_changed else "DESC SEUL"
        lang_label = lang_en if lang_code else "NON DÉTECTÉE"
        print(f"  [{label}]  [{lang_label:12}]  {old_slug}  →  {new_slug}")

    if slug_changed:
        changed_slug += 1
    elif new_desc_en != (doc.get('description_en') or ''):
        changed_desc += 1
    else:
        unchanged += 1

    # Chemin local du PDF dans DOCS EN LIGNE
    original_fname = os.path.basename(doc.get('original_path') or doc.get('original_filename') or '')
    local_pdf = os.path.join(DOCS_SOURCE, original_fname)

    corrections.append({
        "old_slug":     old_slug,
        "new_slug":     new_slug,
        "slug_changed": slug_changed,
        "lang_code":    lang_code,
        "lang_en":      lang_en,
        "new_desc_en":  new_desc_en,
        "new_desc_fr":  new_desc_fr,
        "local_pdf":    local_pdf,
    })

print(f"\nRésumé :")
print(f"  Slug + description à changer : {changed_slug}")
print(f"  Description seule            : {changed_desc}")
print(f"  Inchangés                    : {unchanged}")
print(f"  Total                        : {len(corrections)}")

if not DRY_RUN:
    with open(CORRECTIONS_PATH, 'w', encoding='utf-8') as f:
        json.dump(corrections, f, ensure_ascii=False, indent=2)
    print(f"\nFichier écrit : {CORRECTIONS_PATH}")
    print("Étape suivante : node scripts/apply-dell-corrections.mjs --dry-run")
