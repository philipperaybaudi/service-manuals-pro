"""
analyze-dell-mismatches.py  — Étape 2 audit DELL
Lit les 3 premières pages de chaque PDF en mismatch.
Détection par caractères distinctifs (infaillible) :
  ß → Allemand (de)
  ñ → Espagnol (es)
  đ/dž → Croate (hr) vs Slovène (sl)
  æ/ø → Danois/Norvégien
  å sans æ/ø → Suédois probable
  ș/ț → Roumain (ro)
  l·l → Catalan (ca)
  Hangul → Coréen (ko)
  CJK → Chinois (zh)
  Hiragana/Katakana → Japonais (ja)
  Chars vietnamiens U+1EA0-U+1EF9 → Vietnamien (vi)

Sortie : scripts/dell-mismatches-analysis.json
"""

import os, sys, json, re
from pathlib import Path
from collections import Counter

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

import fitz  # PyMuPDF

AUDIT_FILE    = SCRIPT_DIR / "dell-audit-results.json"
OUTPUT_FILE   = SCRIPT_DIR / "dell-mismatches-analysis.json"
DOCS_EN_LIGNE = Path(r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL")

# ── Corrections-dell.json pour retrouver les chemins PDF ────────────────────
CORRECTIONS_FILE = SCRIPT_DIR / "corrections-dell.json"
with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

# Index basename → local_pdf
pdf_index = {}
for entry in corrections:
    lp = entry.get("local_pdf", "")
    if lp:
        pdf_index[os.path.basename(lp)] = lp

# Overrides manuels (6 docs corrigés)
MANUAL_PATHS = {
    "alienware-17-r4_938925.pdf":         r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\alienware-17-r4_938925.pdf",
    "g5-se-5505_1571214.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g5-se-5505_1571214.pdf",
    "g7-15-7588_1571625.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-15-7588_1571625.pdf",
    "g7-17-7790_1571811.pdf":             r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\g7-17-7790_1571811.pdf",
    "inspiron-15-5567_943968.pdf":        r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5567_943968.pdf",
    "inspiron-15-5576-gaming_944235.pdf": r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL\inspiron-15-5576-gaming_944235.pdf",
}
pdf_index.update(MANUAL_PATHS)

# ── Détection par caractères distinctifs ─────────────────────────────────────

def detect_by_chars(text):
    """
    Analyse le texte complet (toutes pages) par caractères distinctifs.
    Retourne (lang_code, confidence, reason)
    confidence: 'definitive' | 'probable' | 'low'
    """
    # ── Scripts non-latins (infaillibles) ──
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

    # ── Vietnamien : plage U+1EA0-U+1EF9 ──
    vi = sum(1 for c in text if 0x1EA0 <= ord(c) <= 0x1EF9)
    if vi > 10:
        return 'vi', 'definitive', f'Caractères vietnamiens: {vi}'

    # ── Latin : caractères distinctifs ──

    # ß → Allemand UNIQUEMENT (pas dans autres langues latines)
    if text.count('ß') > 0:
        return 'de', 'definitive', f'ß présent ({text.count("ß")} fois) → Allemand'

    # ñ/Ñ → Espagnol (et quelques langues ibériques)
    if 'ñ' in text or 'Ñ' in text:
        return 'es', 'definitive', f'ñ présent → Espagnol'

    # đ/Đ → Croate (absent en Slovène)
    if 'đ' in text or 'Đ' in text:
        return 'hr', 'definitive', f'đ présent → Croate (pas Slovène)'

    # ř/Ř → Tchèque (caractère unique au tchèque, absent partout ailleurs)
    if 'ř' in text or 'Ř' in text:
        return 'cs', 'definitive', f'ř présent → Tchèque (unique)'

    # ľ/Ľ → Slovaque (caractère unique au slovaque)
    if 'ľ' in text or 'Ľ' in text:
        return 'sk', 'definitive', f'ľ présent → Slovaque (unique)'

    # ő/ű → Hongrois (unique)
    hu = text.count('ő') + text.count('Ő') + text.count('ű') + text.count('Ű')
    if hu > 2:
        return 'hu', 'definitive', f'ő/ű présent ({hu}) → Hongrois'

    # ș/ț (virgule en dessous) → Roumain
    if 'ș' in text or 'ț' in text or 'Ș' in text or 'Ț' in text:
        return 'ro', 'definitive', f'ș/ț présent → Roumain'

    # ă/Ă → Roumain (complément : docs sans ș/ț dans les 3 premières pages)
    ro_a = text.count('ă') + text.count('Ă')
    if ro_a > 2:
        return 'ro', 'definitive', f'ă présent ({ro_a}) → Roumain'

    # l·l → Catalan distinctif
    if 'l·l' in text or 'L·L' in text:
        return 'ca', 'definitive', f'l·l présent → Catalan'

    # æ/Æ ou ø/Ø → Danois ou Norvégien (pas Suédois, pas Allemand)
    ae_oe = text.count('æ') + text.count('Æ') + text.count('ø') + text.count('Ø')
    if ae_oe > 2:
        # Distinguer Danois vs Norvégien par mots courants
        text_lower = text.lower()
        no_words = sum(text_lower.count(w) for w in [' ikke ', ' er ', ' og ', ' vi ', ' til ', ' det ', ' en ', ' på '])
        da_words = sum(text_lower.count(w) for w in [' ikke ', ' er ', ' og ', ' vi ', ' til ', ' det ', ' en ', ' på '])
        # Très similaires, on retourne da/no avec note
        return 'da', 'probable', f'æ/ø présent ({ae_oe} fois) → Danois/Norvégien (similaires)'

    # å/Å (sans æ/ø → Suédois probable, ou Fin./Nor. sans les autres)
    aa = text.count('å') + text.count('Å')
    if aa > 3:
        # Check aussi ä/ö pour Suédois
        sv_chars = aa + text.count('ä') + text.count('Ä') + text.count('ö') + text.count('Ö')
        if sv_chars > 5:
            return 'sv', 'probable', f'å/ä/ö présent ({sv_chars} total) → Suédois probable'

    # ä/ö/ü sans ß (pourrait être Suédois ou Finnois ou Allemand vieux)
    de_like = text.count('ä') + text.count('ö') + text.count('ü') + text.count('Ä') + text.count('Ö') + text.count('Ü')
    if de_like > 5:
        return 'de', 'probable', f'ä/ö/ü présent ({de_like}) sans ß → Allemand probable'

    # Catalan sans l·l : check mots
    text_lower = text.lower()
    ca_words = sum(text_lower.count(w) for w in [' però ', ' molt ', ' dels ', ' les ', ' una ', ' català ', 'catalán', 'català'])
    if ca_words > 2:
        return 'ca', 'probable', f'Mots catalans: {ca_words}'

    # Pas de signe distinctif
    return None, 'low', 'Aucun caractère distinctif trouvé (PDF image ou texte insuffisant)'


def extract_all_text(pdf_path):
    """Extrait le texte des 3 premières pages du PDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc[:3]:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        return ""


# ── Main ─────────────────────────────────────────────────────────────────────

# Charger les mismatches de l'audit
with open(AUDIT_FILE, encoding='utf-8') as f:
    audit = json.load(f)

mismatches = audit.get("mismatch", [])
print(f"\n{'═'*60}")
print(f"  ANALYSE APPROFONDIE — {len(mismatches)} mismatches")
print(f"{'═'*60}\n")

results = {
    "false_positive":  [],  # Slug correct, langdetect se trompait
    "true_error":      [],  # Vrai problème, slug à corriger
    "image_pdf":       [],  # PDF image, aucun texte extractible
    "uncertain":       [],  # Indéterminé même avec analyse complète
}

for i, m in enumerate(mismatches, 1):
    slug      = m["slug"]
    slug_lang = m["slug_lang"]
    pdf_name  = m["pdf"]

    # Trouver le chemin PDF
    pdf_path = pdf_index.get(pdf_name)
    if not pdf_path or not os.path.exists(pdf_path):
        # Chercher dans DOCS EN LIGNE directement
        candidate = DOCS_EN_LIGNE / pdf_name
        if candidate.exists():
            pdf_path = str(candidate)
        else:
            results["uncertain"].append({**m, "reason": "PDF introuvable"})
            continue

    # Extraire tout le texte
    text = extract_all_text(pdf_path)
    char_count = len(text)

    if char_count < 50:
        # PDF image
        results["image_pdf"].append({**m, "reason": f"Texte insuffisant ({char_count} chars)", "pdf_path": pdf_path})
        print(f"  [{i:2}] IMAGE  {slug[:60]}")
        continue

    # Détection par caractères distinctifs
    det_lang, confidence, reason = detect_by_chars(text)

    entry = {
        **m,
        "char_detected":  det_lang,
        "confidence":     confidence,
        "reason":         reason,
        "text_length":    char_count,
        "pdf_path":       pdf_path,
    }

    if det_lang is None or confidence == 'low':
        results["uncertain"].append(entry)
        print(f"  [{i:2}] UNCERT {slug[:55]} | slug={slug_lang} | reason={reason[:40]}")
        continue

    if det_lang == slug_lang or (det_lang == 'da' and slug_lang in ('da', 'no', 'sv')):
        # Slug correct — langdetect s'était trompé
        results["false_positive"].append(entry)
        print(f"  [{i:2}] OK✓    {slug[:55]} | {slug_lang} confirmé par chars")
    else:
        # Vrai mismatch
        results["true_error"].append(entry)
        print(f"  [{i:2}] ERROR! {slug[:55]}")
        print(f"         slug={slug_lang} | char_detected={det_lang} | {reason}")

print(f"\n{'═'*60}")
print(f"  RÉSULTATS ANALYSE APPROFONDIE")
print(f"{'═'*60}")
print(f"  ✓ Faux positifs (slug correct)  : {len(results['false_positive'])}")
print(f"  ✗ Vraies erreurs à corriger     : {len(results['true_error'])}")
print(f"  ○ PDFs image (texte absent)     : {len(results['image_pdf'])}")
print(f"  ? Incertains                    : {len(results['uncertain'])}")

if results["true_error"]:
    print(f"\n  — VRAIES ERREURS —")
    for e in results["true_error"]:
        print(f"    {e['slug']}")
        print(f"      slug={e['slug_lang']} | réel={e['char_detected']} | {e['reason']}")

if results["image_pdf"]:
    print(f"\n  — PDFs IMAGE (Étape 3 : détection par nom fichier) —")
    for e in results["image_pdf"]:
        print(f"    {e['slug']} | {e['pdf']}")

# Sauvegarder
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n  Sauvegardé : {OUTPUT_FILE}")
print(f"{'═'*60}\n")
