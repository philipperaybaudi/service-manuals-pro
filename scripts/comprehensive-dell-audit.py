"""
comprehensive-dell-audit.py — Audit COMPLET depuis la DB
=========================================================
Requête directe Supabase → tous les slugs dell-*
Bypass total de corrections-dell.json comme source de slugs.
Match chaque slug DB à son PDF (par old_slug / new_slug / base slug).
Détection par caractères Unicode (infaillible, pas langdetect).
Sortie : scripts/comprehensive-dell-errors.json (compatible fix-dell-true-errors.mjs)

Usage :
  python -X utf8 scripts/comprehensive-dell-audit.py
"""

import os, sys, json, re, requests
from pathlib import Path

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

# ── Charger .env.local manuellement ─────────────────────────────────────────
env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

import fitz  # PyMuPDF

CORRECTIONS_FILE = SCRIPT_DIR / "corrections-dell.json"
OUTPUT_FILE      = SCRIPT_DIR / "comprehensive-dell-errors.json"
DOCS_EN_LIGNE    = Path(r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL")

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']


# ── Utilitaires slug ──────────────────────────────────────────────────────────

def compute_base(slug):
    """Supprime le suffixe langue : -xx / -xx-xx / -xx-N"""
    return re.sub(r'-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$', '', slug)

def lang_from_slug(slug):
    m = re.search(r'-([a-z]{2,3})(?:-\d+)?$', slug)
    return m.group(1) if m else 'en'


# ── Détection par caractères distinctifs (identique étape 2/3) ───────────────

def detect_by_chars(text):
    ko = sum(1 for c in text if 0xAC00 <= ord(c) <= 0xD7AF or 0x1100 <= ord(c) <= 0x11FF)
    if ko > 3:
        return 'ko', 'definitive', f'Hangul: {ko} chars'

    ja = sum(1 for c in text if 0x3040 <= ord(c) <= 0x30FF)
    if ja > 3:
        return 'ja', 'definitive', f'Hiragana/Katakana: {ja} chars'

    zh = sum(1 for c in text if 0x4E00 <= ord(c) <= 0x9FFF or 0x3400 <= ord(c) <= 0x4DBF)
    if zh > 5:
        return 'zh', 'definitive', f'CJK: {zh} chars'

    ar = sum(1 for c in text if 0x0600 <= ord(c) <= 0x06FF)
    if ar > 5:
        return 'ar', 'definitive', f'Arabe: {ar} chars'

    he = sum(1 for c in text if 0x0590 <= ord(c) <= 0x05FF)
    if he > 5:
        return 'he', 'definitive', f'Hébreu: {he} chars'

    th = sum(1 for c in text if 0x0E00 <= ord(c) <= 0x0E7F)
    if th > 5:
        return 'th', 'definitive', f'Thaï: {th} chars'

    vi = sum(1 for c in text if 0x1EA0 <= ord(c) <= 0x1EF9)
    if vi > 10:
        return 'vi', 'definitive', f'Caractères vietnamiens: {vi}'

    if text.count('ß') > 0:
        return 'de', 'definitive', f'ß présent ({text.count("ß")} fois) → Allemand'

    if 'ñ' in text or 'Ñ' in text:
        return 'es', 'definitive', f'ñ présent → Espagnol'

    if 'đ' in text or 'Đ' in text:
        return 'hr', 'definitive', f'đ présent → Croate'

    if 'ř' in text or 'Ř' in text:
        return 'cs', 'definitive', f'ř présent → Tchèque (unique)'

    if 'ľ' in text or 'Ľ' in text:
        return 'sk', 'definitive', f'ľ présent → Slovaque (unique)'

    hu = text.count('ő') + text.count('Ő') + text.count('ű') + text.count('Ű')
    if hu > 2:
        return 'hu', 'definitive', f'ő/ű présent ({hu}) → Hongrois'

    if 'ș' in text or 'ț' in text or 'Ș' in text or 'Ț' in text:
        return 'ro', 'definitive', f'ș/ț présent → Roumain'

    ro_a = text.count('ă') + text.count('Ă')
    if ro_a > 2:
        return 'ro', 'definitive', f'ă présent ({ro_a}) → Roumain'

    if 'l·l' in text or 'L·L' in text:
        return 'ca', 'definitive', f'l·l présent → Catalan'

    ae_oe = text.count('æ') + text.count('Æ') + text.count('ø') + text.count('Ø')
    if ae_oe > 2:
        return 'da', 'probable', f'æ/ø présent ({ae_oe}) → Danois/Norvégien'

    aa = text.count('å') + text.count('Å')
    sv_chars = aa + text.count('ä') + text.count('Ä') + text.count('ö') + text.count('Ö')
    if sv_chars > 5:
        return 'sv', 'probable', f'å/ä/ö présent ({sv_chars}) → Suédois probable'

    de_like = text.count('ä') + text.count('ö') + text.count('ü') + \
              text.count('Ä') + text.count('Ö') + text.count('Ü')
    if de_like > 5:
        return 'de', 'probable', f'ä/ö/ü présent ({de_like}) sans ß → Allemand probable'

    return None, 'low', 'Aucun caractère distinctif'


def extract_text_3pages(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc[:3]:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception:
        return ""


# ── 1. Requête DB : tous les slugs dell-* ────────────────────────────────────

def get_all_dell_slugs():
    slugs = []
    offset = 0
    limit  = 1000
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Range-Unit":    "items",
    }
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/documents",
            params={
                "select": "slug",
                "slug":   "like.dell-%",
                "limit":  str(limit),
                "offset": str(offset),
            },
            headers=headers,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        slugs.extend(d['slug'] for d in data)
        if len(data) < limit:
            break
        offset += limit
    return slugs


# ── 2. Construire l'index PDF depuis corrections-dell.json ────────────────────
# Priorité : old_slug exact > new_slug exact > base slug (fallback)

with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

by_old_slug  = {}  # old_slug  → pdf_path
by_new_slug  = {}  # new_slug  → pdf_path
by_base      = {}  # base      → pdf_path (premier trouvé)

for entry in corrections:
    pdf = entry.get('local_pdf', '')
    if not pdf:
        continue
    old = entry.get('old_slug', '')
    new = entry.get('new_slug', '')
    if old:
        by_old_slug[old] = pdf
        b = compute_base(old)
        if b not in by_base:
            by_base[b] = pdf
    if new:
        by_new_slug[new] = pdf
        b = compute_base(new)
        if b not in by_base:
            by_base[b] = pdf


def find_pdf(db_slug):
    """Trouve le chemin PDF pour un slug DB.
    Retourne (pdf_path, match_type) où match_type = 'exact' | 'base' | None.
    Les correspondances via 'base' sont signalées pour filtrage ultérieur.
    """
    # 1. Correspondance exacte old_slug
    if db_slug in by_old_slug:
        p = by_old_slug[db_slug]
        if os.path.exists(p):
            return p, 'exact'
        cand = DOCS_EN_LIGNE / os.path.basename(p)
        if cand.exists():
            return str(cand), 'exact'

    # 2. Correspondance exacte new_slug
    if db_slug in by_new_slug:
        p = by_new_slug[db_slug]
        if os.path.exists(p):
            return p, 'exact'
        cand = DOCS_EN_LIGNE / os.path.basename(p)
        if cand.exists():
            return str(cand), 'exact'

    # 3. Correspondance par base (fallback — potentielle collision)
    base = compute_base(db_slug)
    if base in by_base:
        p = by_base[base]
        if os.path.exists(p):
            return p, 'base'
        cand = DOCS_EN_LIGNE / os.path.basename(p)
        if cand.exists():
            return str(cand), 'base'

    return None, None


# ── 3. Audit ──────────────────────────────────────────────────────────────────

print(f"\n{'═'*64}")
print("  COMPREHENSIVE DELL AUDIT — requête DB directe")
print(f"{'═'*64}\n")

print("Récupération des slugs dell-* depuis Supabase...")
db_slugs = get_all_dell_slugs()
print(f"  → {len(db_slugs)} slugs dell-* trouvés en DB\n")

true_errors  = []   # erreurs définitives → à corriger
no_pdf_list  = []   # PDF introuvable
no_text_list = []   # PDF image / sans texte
uncertain    = []   # détection ambiguë
confirmed_n  = 0

for i, db_slug in enumerate(db_slugs, 1):
    slug_lang = lang_from_slug(db_slug)

    pdf_path, match_type = find_pdf(db_slug)
    if not pdf_path:
        no_pdf_list.append({'slug': db_slug})
        continue

    text = extract_text_3pages(pdf_path)
    if len(text) < 30:
        no_text_list.append({'slug': db_slug, 'pdf': os.path.basename(pdf_path), 'pdf_path': pdf_path})
        continue

    det_lang, confidence, reason = detect_by_chars(text)

    if confidence == 'low' or det_lang is None:
        uncertain.append({'slug': db_slug, 'reason': reason})
        continue

    # Correspondance OK ?
    ok = (det_lang == slug_lang) or (det_lang == 'da' and slug_lang in ('da', 'no', 'sv'))

    if ok:
        confirmed_n += 1
        if i % 200 == 0:
            print(f"  [{i}/{len(db_slugs)}] {confirmed_n} OK …")
    elif confidence == 'definitive':
        true_errors.append({
            'slug':          db_slug,
            'slug_lang':     slug_lang,
            'char_detected': det_lang,
            'confidence':    confidence,
            'reason':        reason,
            'pdf_path':      pdf_path,
            'match_type':    match_type,
        })
    else:
        # Probable → noter, non corrigé
        true_errors.append({
            'slug':          db_slug,
            'slug_lang':     slug_lang,
            'char_detected': det_lang,
            'confidence':    confidence,
            'reason':        reason,
            'pdf_path':      pdf_path,
            'match_type':    match_type,
        })

# ── Post-traitement : supprimer les collisions de base slug ───────────────────
# Règle : même pdf_path + même compute_base(slug) pour plusieurs slugs → faux positif
from collections import defaultdict
pdf_to_slugs = defaultdict(list)
for e in true_errors:
    pdf_to_slugs[e['pdf_path']].append(e['slug'])

collision_slugs = set()
for pdf, slugs in pdf_to_slugs.items():
    if len(slugs) > 1:
        bases = set(compute_base(s) for s in slugs)
        if len(bases) == 1:
            for s in slugs:
                collision_slugs.add(s)

# Déplacer les collisions vers uncertain
non_collision_errors = []
for e in true_errors:
    if e['slug'] in collision_slugs:
        uncertain.append({'slug': e['slug'], 'reason': f"Collision base slug → PDF ambigu ({os.path.basename(e['pdf_path'])})"})
    else:
        non_collision_errors.append(e)
true_errors = non_collision_errors


# ── 4. Résultats ──────────────────────────────────────────────────────────────

definitive_errors = [e for e in true_errors if e['confidence'] == 'definitive']
probable_errors   = [e for e in true_errors if e['confidence'] == 'probable']

# Affichage des erreurs définitives
for e in definitive_errors:
    print(f"  ✗ ERROR  {e['slug']}")
    print(f"           slug={e['slug_lang']} | réel={e['char_detected']} | {e['reason']}")

print(f"\n{'═'*64}")
print(f"  RÉSULTATS AUDIT COMPLET")
print(f"{'═'*64}")
print(f"  Total DB         : {len(db_slugs)}")
print(f"  ✓ Corrects       : {confirmed_n}")
print(f"  ✗ Erreurs cert.  : {len(definitive_errors)}")
print(f"  ? Erreurs prob.  : {len(probable_errors)}")
print(f"  ○ Sans PDF       : {len(no_pdf_list)}")
print(f"  ○ PDFs image     : {len(no_text_list)}")
print(f"  ? Incertains     : {len(uncertain)}")

if definitive_errors:
    print(f"\n  — ERREURS DÉFINITIVES —")
    for e in definitive_errors:
        print(f"    {e['slug']}")
        print(f"      slug={e['slug_lang']} | réel={e['char_detected']} | {e['reason']}")

# Format de sortie compatible fix-dell-true-errors.mjs
output = {
    "true_error":   true_errors,   # contient definitive + probable (fix filtre confidence)
    "no_pdf":       no_pdf_list,
    "no_text":      no_text_list,
    "uncertain":    uncertain,
}

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n  Sauvegardé : {OUTPUT_FILE}")
print(f"{'═'*64}\n")
