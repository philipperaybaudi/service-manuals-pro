"""
detect_language_robust.py
=========================
Module de détection de langue ROBUSTE pour PDFs.

STRATÉGIE EN 2 ÉTAPES :
  1. Détection par plages Unicode (INFAILLIBLE pour scripts non-latins)
     → Japonais, Coréen, Chinois, Arabe, Hébreu, Thaï, Cyrillique fort
  2. langdetect en fallback UNIQUEMENT pour les scripts latins

POURQUOI CETTE APPROCHE :
  - langdetect confond régulièrement chinois↔russe, japonais↔autres, etc.
  - Les plages Unicode sont déterministes : un caractère est ou n'est pas
    dans la plage — aucune ambiguïté possible.
  - PAGE 1 UNIQUEMENT : la couverture est toujours dans la langue du document ;
    le corps peut être multilingue (cas DELL et la plupart des manuels).

USAGE :
    from detect_language_robust import detect_language_page1
    lang_code = detect_language_page1("/path/to/file.pdf")
    # Retourne : 'zh', 'ja', 'ko', 'ar', 'ru', 'en', 'fr', ... ou None

RÈGLE ABSOLUE (pipeline) :
    Ne JAMAIS utiliser langdetect directement dans un script d'import.
    Toujours passer par cette fonction.
"""

import fitz  # PyMuPDF

try:
    from langdetect import detect
    HAS_LANGDETECT = True
except ImportError:
    HAS_LANGDETECT = False


# ── Détection par plages Unicode ───────────────────────────────────────────────

def detect_script(text: str) -> str | None:
    """
    Identifie le script dominant via les plages Unicode.
    Retourne un code ISO 639-1, ou None si le texte est en script latin/cyrillique.

    Scripts détectés de manière INFAILLIBLE :
      - Japonais  (hiragana + katakana, uniques au japonais)
      - Coréen    (hangul)
      - Chinois   (CJK sans kana ni hangul)
      - Arabe
      - Hébreu
      - Thaï
    """
    if not text:
        return None

    counts = {
        'cjk':      0,  # CJK Unified Ideographs (chinois + japonais partagent ce bloc)
        'hiragana': 0,  # Uniquement japonais
        'katakana': 0,  # Uniquement japonais
        'hangul':   0,  # Uniquement coréen
        'arabic':   0,
        'hebrew':   0,
        'thai':     0,
    }

    for c in text:
        cp = ord(c)
        # CJK Unified Ideographs + Extension A + Compatibility
        if (0x4E00 <= cp <= 0x9FFF or
                0x3400 <= cp <= 0x4DBF or
                0xF900 <= cp <= 0xFAFF or
                0x20000 <= cp <= 0x2A6DF):
            counts['cjk'] += 1
        elif 0x3040 <= cp <= 0x309F:   # Hiragana
            counts['hiragana'] += 1
        elif 0x30A0 <= cp <= 0x30FF:   # Katakana
            counts['katakana'] += 1
        elif (0xAC00 <= cp <= 0xD7AF or  # Hangul syllables
              0x1100 <= cp <= 0x11FF or  # Hangul Jamo
              0xA960 <= cp <= 0xA97F or  # Hangul Jamo Extended-A
              0xD7B0 <= cp <= 0xD7FF):   # Hangul Jamo Extended-B
            counts['hangul'] += 1
        elif 0x0600 <= cp <= 0x06FF:   # Arabic
            counts['arabic'] += 1
        elif 0x0590 <= cp <= 0x05FF:   # Hebrew
            counts['hebrew'] += 1
        elif 0x0E00 <= cp <= 0x0E7F:   # Thai
            counts['thai'] += 1

    total = max(len(text), 1)
    # Seuil : au moins 8% du texte dans le script OU minimum 30 caractères
    threshold = max(30, total * 0.08)

    # ── JAPONAIS : présence de kana (caractères UNIQUES au japonais) ──────────
    # Même 20 kana suffisent — aucune autre langue n'utilise hiragana/katakana
    if counts['hiragana'] + counts['katakana'] >= 20:
        return 'ja'

    # ── CORÉEN : hangul ────────────────────────────────────────────────────────
    if counts['hangul'] >= threshold:
        return 'ko'

    # ── CHINOIS : CJK sans kana ni hangul ────────────────────────────────────
    # (si des kana étaient présents, japonais aurait déjà été retourné)
    if counts['cjk'] >= threshold:
        return 'zh'

    # ── ARABE ──────────────────────────────────────────────────────────────────
    if counts['arabic'] >= threshold:
        return 'ar'

    # ── HÉBREU ────────────────────────────────────────────────────────────────
    if counts['hebrew'] >= threshold:
        return 'he'

    # ── THAÏ ──────────────────────────────────────────────────────────────────
    if counts['thai'] >= threshold:
        return 'th'

    # Script latin, cyrillique ou mixte → laisser langdetect trancher
    return None


def detect_language_robust(text: str) -> str | None:
    """
    Détecte la langue d'un texte brut de manière robuste.

    Étape 1 : scripts Unicode non-latins → résultat certain
    Étape 2 : langdetect pour latin, cyrillique, etc.

    Retourne un code ISO 639-1 ou None si indétectable.
    """
    if not text or len(text.strip()) < 20:
        return None

    # Étape 1 — Unicode (infaillible)
    lang = detect_script(text)
    if lang:
        return lang

    # Étape 2 — langdetect (fiable pour latin/cyrillique)
    if HAS_LANGDETECT:
        try:
            return detect(text)
        except Exception:
            return None

    return None


def detect_language_page1(pdf_path: str) -> str | None:
    """
    Détecte la langue d'un PDF en analysant LA PAGE 1 UNIQUEMENT.

    Règle pipeline : page 1 = couverture = langue de référence.
    Le corps du document peut être multilingue — ne JAMAIS analyser
    plusieurs pages pour la détection de langue.

    Retourne un code ISO 639-1 ou None si le texte est insuffisant
    (PDF scanné sans couche texte, etc.).
    """
    try:
        doc = fitz.open(pdf_path)
        text = doc[0].get_text().strip()
        doc.close()
        return detect_language_robust(text)
    except Exception:
        return None
