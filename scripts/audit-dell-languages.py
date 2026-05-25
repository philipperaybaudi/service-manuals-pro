"""
audit-dell-languages.py  — Étape 1/4 du plan d'audit DELL

Pour chaque doc DELL importé :
  1. Trouve le PDF local correspondant (via corrections-dell.json)
  2. Détecte la langue avec detect_language_robust (Unicode ranges infaillibles + langdetect fallback)
  3. Compare avec le suffixe de langue du slug actuel en DB
  4. Classe en : OK / MISMATCH / NO_TEXT (PDF image) / PDF_MISSING

Sortie : scripts/dell-audit-results.json

Étape 2 : résolution des conflits (doublons vs renommage)
Étape 3 : PDFs image → détection par nom de fichier DELL
Étape 4 : vérification finale 0 erreur
"""

import os, sys, json, re
from pathlib import Path

# ── Chemins ─────────────────────────────────────────────────────────────────
SCRIPT_DIR       = Path(__file__).parent
PROJECT_DIR      = SCRIPT_DIR.parent
CORRECTIONS_FILE = SCRIPT_DIR / "corrections-dell.json"
OUTPUT_FILE      = SCRIPT_DIR / "dell-audit-results.json"
DOCS_EN_LIGNE    = Path(r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL")

# ── Import du module de détection robuste ───────────────────────────────────
sys.path.insert(0, str(SCRIPT_DIR))
from detect_language_robust import detect_language_page1

# ── Slugs corrigés manuellement (overrides pour les 6 conflits) ─────────────
# Clé = nom du fichier PDF local (basename)
# Valeur = slug réellement en base APRÈS correction manuelle
MANUAL_SLUG_OVERRIDES = {
    "alienware-17-r4_938925.pdf":          "dell-alienware-17-r4-service-manual-de-4",
    "g5-se-5505_1571214.pdf":              "dell-dell-g5-se-service-manual-it",        # slug inchangé
    "g7-15-7588_1571625.pdf":              "dell-dell-g7-15-service-manual-zh",
    "g7-17-7790_1571811.pdf":             "dell-dell-g7-7790-service-manual-it",
    "inspiron-15-5567_943968.pdf":         "dell-dell-inspiron-15-5567-service-manual-vi",
    "inspiron-15-5576-gaming_944235.pdf":  "dell-dell-inspiron-15-5576-gaming-service-manual-ko",
    # Doc classifié séparément (pas dans corrections-dell.json)
    "inspiron-11-3162-3164_939786.pdf":    "dell-dell-inspiron-11-3162-service-manual",
}

# ── Extraction du code langue depuis un slug ─────────────────────────────────
def lang_from_slug(slug):
    """
    Extrait le code langue du slug.
    'dell-alienware-17-r4-service-manual-de-4' → 'de'
    'dell-dell-g7-7790-service-manual-it'      → 'it'
    'dell-dell-inspiron-11-3162-service-manual' → 'en' (pas de suffixe = anglais)
    """
    m = re.search(r'-([a-z]{2,3})(?:-\d+)?$', slug)
    if m:
        code = m.group(1)
        # Exclure les faux positifs (suffixes qui ne sont pas des codes langue)
        NON_LANG = {'se', 'g5', 'g7', 'ru', 'ko', 'zh', 'ja'}  # 'ru'/'ko'/'zh' sont des langues, pas des modèles ici
        # On accepte tout code qui a 2-3 lettres minuscules — les modèles Dell
        # contiennent rarement des 2-lettres en fin de slug qui ne soient pas des langues
        return code
    return 'en'  # pas de suffixe → anglais

# ── Vérification de cohérence détection ↔ slug ───────────────────────────────
def langs_match(detected, slug_lang):
    """
    True si la langue détectée correspond au code langue du slug.
    Gère les cas ambigus (ex: 'no' norvégien souvent confondu avec 'da' danois).
    """
    if detected is None:
        return None  # pas de texte extractible (PDF image)
    if detected == slug_lang:
        return True
    # Alias acceptés (langdetect peut retourner des variantes)
    ALIASES = {
        'zh-cn': 'zh', 'zh-tw': 'zh',
        'nb': 'no', 'nn': 'no',  # norvégien
        'pt': 'pt', 'pt-br': 'pt',
        'tl': 'tl',
    }
    det_norm = ALIASES.get(detected, detected)
    if det_norm == slug_lang:
        return True
    return False

# ── Main ─────────────────────────────────────────────────────────────────────

print("\n════════════════════════════════════════════════════════════════")
print("  AUDIT DELL — Détection langue vs slug")
print("════════════════════════════════════════════════════════════════\n")

# Charger corrections-dell.json
with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

print(f"  {len(corrections)} entrées dans corrections-dell.json")

# Construire le dictionnaire local_pdf → slug_actuel
slug_map = {}  # basename_pdf → current_slug_in_db

for entry in corrections:
    local_pdf = entry.get("local_pdf", "")
    if not local_pdf:
        continue
    basename = os.path.basename(local_pdf)
    new_slug  = entry.get("new_slug") or entry.get("old_slug")
    # Override si correction manuelle
    if basename in MANUAL_SLUG_OVERRIDES:
        new_slug = MANUAL_SLUG_OVERRIDES[basename]
    slug_map[basename] = {"slug": new_slug, "path": local_pdf}

# Ajouter le doc classifié séparément
for basename, slug in MANUAL_SLUG_OVERRIDES.items():
    if basename not in slug_map:
        path = str(DOCS_EN_LIGNE / basename)
        slug_map[basename] = {"slug": slug, "path": path}

print(f"  {len(slug_map)} PDFs à auditer\n")

# ── Audit ────────────────────────────────────────────────────────────────────
results = {
    "ok":          [],   # slug correct
    "mismatch":    [],   # langue détectée ≠ slug
    "no_text":     [],   # PDF image, pas de couche texte
    "pdf_missing": [],   # PDF introuvable localement
}

total = len(slug_map)
for i, (basename, info) in enumerate(sorted(slug_map.items()), 1):
    slug     = info["slug"]
    pdf_path = info["path"]
    slug_lang = lang_from_slug(slug)

    if i % 100 == 0 or i == 1:
        print(f"  [{i}/{total}] Traitement en cours...")

    if not os.path.exists(pdf_path):
        results["pdf_missing"].append({
            "slug": slug,
            "pdf":  pdf_path,
            "slug_lang": slug_lang,
        })
        continue

    detected = detect_language_page1(pdf_path)

    match = langs_match(detected, slug_lang)

    entry = {
        "slug":       slug,
        "slug_lang":  slug_lang,
        "detected":   detected,
        "pdf":        basename,
    }

    if match is None:
        results["no_text"].append(entry)
    elif match:
        results["ok"].append(entry)
    else:
        results["mismatch"].append(entry)
        # Afficher immédiatement les erreurs
        print(f"  ✗ MISMATCH : {slug}")
        print(f"      slug_lang={slug_lang}  |  détecté={detected}  |  PDF={basename}")

# ── Résultats ────────────────────────────────────────────────────────────────
print(f"\n════════════════════════════════════════════════════════════════")
print(f"  RÉSULTATS AUDIT DELL")
print(f"════════════════════════════════════════════════════════════════")
print(f"  ✓ OK          : {len(results['ok'])}")
print(f"  ✗ MISMATCH    : {len(results['mismatch'])}")
print(f"  ○ No text     : {len(results['no_text'])}")
print(f"  ⚠ PDF manquat : {len(results['pdf_missing'])}")
print(f"  Total         : {total}")

# Afficher les mismatches
if results["mismatch"]:
    print(f"\n  — MISMATCHES DÉTAILLÉS —")
    for m in results["mismatch"]:
        print(f"    {m['slug']}")
        print(f"      slug_lang={m['slug_lang']} | détecté={m['detected']} | pdf={m['pdf']}")

# Afficher les PDF manquants (warning seulement si > 10)
if results["pdf_missing"]:
    print(f"\n  — PDFs MANQUANTS ({len(results['pdf_missing'])}) —")
    for m in results["pdf_missing"][:20]:
        print(f"    {m['pdf']}")
    if len(results["pdf_missing"]) > 20:
        print(f"    ... et {len(results['pdf_missing'])-20} autres")

# Sauvegarder
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n  Résultats sauvegardés : {OUTPUT_FILE}")
print(f"════════════════════════════════════════════════════════════════\n")
