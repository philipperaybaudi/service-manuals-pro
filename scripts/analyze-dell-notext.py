"""
analyze-dell-notext.py  — Étape 3 audit DELL
Analyse les 126 PDFs classés "no_text" (page 1 sans couche texte).
Tente d'extraire du texte sur les 3 premières pages.
Même détection par caractères distinctifs que l'étape 2.

Sortie : scripts/dell-notext-analysis.json
"""

import os, sys, json, re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

import fitz  # PyMuPDF

AUDIT_FILE    = SCRIPT_DIR / "dell-audit-results.json"
OUTPUT_FILE   = SCRIPT_DIR / "dell-notext-analysis.json"
DOCS_EN_LIGNE = Path(r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL")

CORRECTIONS_FILE = SCRIPT_DIR / "corrections-dell.json"
with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

pdf_index = {}
for entry in corrections:
    lp = entry.get("local_pdf", "")
    if lp:
        pdf_index[os.path.basename(lp)] = lp

MANUAL_PATHS = {
    "alienware-17-r4_938925.pdf":         r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\alienware-17-r4_938925.pdf",
    "g5-se-5505_1571214.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g5-se-5505_1571214.pdf",
    "g7-15-7588_1571625.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-15-7588_1571625.pdf",
    "g7-17-7790_1571811.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-17-7790_1571811.pdf",
    "inspiron-15-5567_943968.pdf":        r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5567_943968.pdf",
    "inspiron-15-5576-gaming_944235.pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5576-gaming_944235.pdf",
}
pdf_index.update(MANUAL_PATHS)

# ── Détection par caractères distinctifs (identique étape 2) ─────────────────

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

    if 'ß' in text:
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

    de_like = text.count('ä') + text.count('ö') + text.count('ü') + text.count('Ä') + text.count('Ö') + text.count('Ü')
    if de_like > 5:
        return 'de', 'probable', f'ä/ö/ü présent ({de_like}) sans ß → Allemand probable'

    return None, 'low', 'Aucun caractère distinctif (PDF image ou texte insuffisant)'


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


def lang_from_slug(slug):
    m = re.search(r'-([a-z]{2,3})(?:-\d+)?$', slug)
    return m.group(1) if m else 'en'


# ── Main ─────────────────────────────────────────────────────────────────────

with open(AUDIT_FILE, encoding='utf-8') as f:
    audit = json.load(f)

no_text_list = audit.get("no_text", [])
print(f"\n{'='*60}")
print(f"  ÉTAPE 3 — {len(no_text_list)} PDFs no_text")
print(f"{'='*60}\n")

results = {
    "confirmed":    [],   # slug correct, texte trouvé et confirmé
    "true_error":   [],   # vraie erreur détectée
    "still_notext": [],   # vraiment image, aucun texte extractible
    "uncertain":    [],   # texte trouvé mais pas de caractère distinctif
}

for i, m in enumerate(no_text_list, 1):
    slug      = m["slug"]
    slug_lang = lang_from_slug(slug)
    pdf_name  = m["pdf"]

    pdf_path = pdf_index.get(pdf_name)
    if not pdf_path or not os.path.exists(pdf_path):
        candidate = DOCS_EN_LIGNE / pdf_name
        if candidate.exists():
            pdf_path = str(candidate)
        else:
            results["still_notext"].append({**m, "reason": "PDF introuvable", "slug_lang": slug_lang})
            print(f"  [{i:3}] MISSING {slug[:55]}")
            continue

    text = extract_text_3pages(pdf_path)
    char_count = len(text)

    if char_count < 30:
        results["still_notext"].append({**m, "reason": f"Aucun texte ({char_count} chars)", "slug_lang": slug_lang, "pdf_path": pdf_path})
        print(f"  [{i:3}] IMAGE   {slug[:55]}")
        continue

    det_lang, confidence, reason = detect_by_chars(text)

    entry = {
        **m,
        "slug_lang":     slug_lang,
        "char_detected": det_lang,
        "confidence":    confidence,
        "reason":        reason,
        "text_length":   char_count,
        "pdf_path":      pdf_path,
    }

    if det_lang is None or confidence == 'low':
        results["uncertain"].append(entry)
        print(f"  [{i:3}] UNCERT  {slug[:50]} | slug={slug_lang}")
        continue

    match = (det_lang == slug_lang) or (det_lang == 'da' and slug_lang in ('da', 'no', 'sv'))

    if match:
        results["confirmed"].append(entry)
        print(f"  [{i:3}] OK      {slug[:50]} | {slug_lang} confirme")
    else:
        results["true_error"].append(entry)
        print(f"  [{i:3}] ERROR!  {slug[:50]}")
        print(f"          slug={slug_lang} | reel={det_lang} | {reason}")

print(f"\n{'='*60}")
print(f"  RESULTATS ETAPE 3")
print(f"{'='*60}")
print(f"  OK confirme    : {len(results['confirmed'])}")
print(f"  Vraies erreurs : {len(results['true_error'])}")
print(f"  Encore image   : {len(results['still_notext'])}")
print(f"  Incertains     : {len(results['uncertain'])}")

if results["true_error"]:
    print(f"\n  -- VRAIES ERREURS --")
    for e in results["true_error"]:
        print(f"    {e['slug']}")
        print(f"      slug={e['slug_lang']} | reel={e['char_detected']} | {e['reason']}")

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n  Sauvegarde : {OUTPUT_FILE}")
print(f"{'='*60}\n")
