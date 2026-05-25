"""
verify-toc-quality.py
Vérifie la qualité des TOC ajoutées par toc-all-docs.py.
Lit les slugs du fichier progress, récupère description/description_fr,
détecte les problèmes de langue. LECTURE SEULE — aucune écriture DB.
"""
import os, json, re, time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
with open(env_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

import requests

try:
    from langdetect import detect, DetectorFactory
    DetectorFactory.seed = 42
    LANGDETECT_OK = True
except ImportError:
    LANGDETECT_OK = False
    print("⚠ langdetect non installé — détection approximative uniquement")

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

PROGRESS_FILE = SCRIPT_DIR / 'toc-all-docs-progress.json'

# Mots allemands courants pour détection sans langdetect
DE_WORDS = {
    'und', 'der', 'die', 'das', 'ist', 'mit', 'von', 'des', 'den', 'dem',
    'ein', 'eine', 'auf', 'für', 'zur', 'bei', 'sie', 'nicht', 'werden',
    'auch', 'nach', 'aus', 'durch', 'wird', 'wie', 'aber', 'oder', 'als',
    'nur', 'noch', 'alle', 'beim', 'vom', 'zum', 'alle', 'wenn', 'kann',
    'im', 'an', 'vor', 'so', 'da', 'zu', 'je', 'in',
    # termes techniques allemands fréquents dans les manuels
    'einstellung', 'montage', 'demontage', 'prüfung', 'wartung',
    'reparatur', 'teile', 'schaltplan', 'gehäuse', 'schrauben',
    'einbau', 'ausbau', 'zerlegen', 'justierung', 'überprüfung',
    'reinigung', 'schmierung', 'ersatzteile', 'betrieb', 'störung',
}

# Mots italiens courants
IT_WORDS = {
    'del', 'della', 'delle', 'degli', 'dei', 'con', 'per', 'una', 'uno',
    'nel', 'nella', 'nelle', 'negli', 'nei', 'sono', 'dalla', 'dalla',
    'questo', 'questa', 'questi', 'queste', 'che', 'non', 'dopo',
    'smontaggio', 'montaggio', 'riparazione', 'manutenzione', 'parti',
    'regolazione', 'pulizia', 'controllo', 'sostituzione', 'taratura',
}

# Mots espagnols courants
ES_WORDS = {
    'del', 'los', 'las', 'una', 'unos', 'unas', 'con', 'para', 'por',
    'que', 'sin', 'como', 'pero', 'también', 'más', 'sobre', 'entre',
    'desmontaje', 'montaje', 'reparación', 'mantenimiento', 'partes',
    'ajuste', 'limpieza', 'control', 'sustitución', 'calibración',
}

# Mots russes translittérés (si en cyrillique, Unicode range suffit)
CYRILLIC_RANGE = range(0x0400, 0x04FF)

def has_cyrillic(text):
    return any(ord(c) in CYRILLIC_RANGE for c in text)

def has_cjk(text):
    return any(0x4E00 <= ord(c) <= 0x9FFF for c in text)

def word_overlap(text_lower, word_set, min_hits=3):
    """Retourne True si >= min_hits mots de word_set trouvés dans le texte."""
    words = set(re.findall(r'\b[a-zäöüß]{2,}\b', text_lower))
    hits = words & word_set
    return len(hits) >= min_hits, hits

def extract_toc_section_en(description):
    """Extrait le contenu après 'Table of Contents:' dans description."""
    marker = 'Table of Contents:'
    if marker not in description:
        return None
    idx = description.index(marker)
    return description[idx + len(marker):].strip()

def extract_toc_section_fr(description_fr):
    """Extrait le contenu après 'Table des matières :' dans description_fr."""
    for marker in ['Table des matières :', 'Table des matières:']:
        if marker in description_fr:
            idx = description_fr.index(marker)
            return description_fr[idx + len(marker):].strip()
    return None

def detect_language_issues(toc_en, toc_fr, slug):
    """
    Détecte les problèmes de langue dans les sections TOC.
    Retourne une liste de problèmes trouvés.
    """
    issues = []

    # ── Check description (EN site) ─────────────────────────────────
    if toc_en:
        toc_en_low = toc_en.lower()

        # Cyrillique dans description EN
        if has_cyrillic(toc_en):
            issues.append(('CRITICAL', 'EN', 'Texte cyrillique (russe) dans description EN'))

        # CJK dans description EN
        if has_cjk(toc_en):
            issues.append(('CRITICAL', 'EN', 'Texte CJK dans description EN'))

        # Allemand dans description EN
        ok, hits = word_overlap(toc_en_low, DE_WORDS, min_hits=4)
        if ok:
            issues.append(('CRITICAL', 'EN', f'Texte allemand probable dans description EN (mots: {", ".join(list(hits)[:5])})'))

        # Italien dans description EN (seulement si mots uniques à l'IT)
        it_unique = IT_WORDS - DE_WORDS  # éviter faux positifs croisés
        ok, hits = word_overlap(toc_en_low, it_unique, min_hits=3)
        if ok:
            issues.append(('WARNING', 'EN', f'Texte italien probable dans description EN (mots: {", ".join(list(hits)[:5])})'))

        # langdetect si disponible
        if LANGDETECT_OK:
            sample = toc_en[:500].strip()
            if len(sample) > 50:
                try:
                    lang = detect(sample)
                    if lang not in ('en', 'nl', 'af'):  # nl/af proches EN
                        issues.append(('WARNING', 'EN', f'langdetect: langue détectée "{lang}" dans description EN'))
                except Exception:
                    pass

    # ── Check description_fr (FR site) ─────────────────────────────
    if toc_fr:
        toc_fr_low = toc_fr.lower()

        # Cyrillique dans description FR
        if has_cyrillic(toc_fr):
            issues.append(('CRITICAL', 'FR', 'Texte cyrillique (russe) dans description_fr'))

        # CJK dans description FR
        if has_cjk(toc_fr):
            issues.append(('CRITICAL', 'FR', 'Texte CJK dans description_fr'))

        # Allemand dans description FR
        ok, hits = word_overlap(toc_fr_low, DE_WORDS, min_hits=4)
        if ok:
            # Mais certains mots allemands existent en français ("in", "de", etc.) — seuil plus élevé
            ok2, hits2 = word_overlap(toc_fr_low, DE_WORDS - {'in', 'de', 'an', 'an', 'da', 'im', 'so', 'je', 'als', 'von', 'ein'}, min_hits=3)
            if ok2:
                issues.append(('CRITICAL', 'FR', f'Texte allemand probable dans description_fr (mots: {", ".join(list(hits2)[:5])})'))

        # langdetect si disponible
        if LANGDETECT_OK:
            sample = toc_fr[:500].strip()
            if len(sample) > 50:
                try:
                    lang = detect(sample)
                    if lang not in ('fr', 'ca', 'it'):  # ca=catalan proche FR
                        issues.append(('WARNING', 'FR', f'langdetect: langue détectée "{lang}" dans description_fr'))
                except Exception:
                    pass

    return issues

def fetch_batch(slugs_batch):
    """Récupère description et description_fr pour un lot de slugs."""
    slug_filter = ','.join(f'"{s}"' for s in slugs_batch)
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents',
        headers={**SB_HEADERS, 'Accept': 'application/json'},
        params={
            'select': 'slug,description,description_fr',
            'slug': f'in.({slug_filter})',
        },
        timeout=30
    )
    r.raise_for_status()
    return r.json()

# ── Chargement du progress ──────────────────────────────────────────
print(f'\n{"="*65}')
print(f'  VÉRIFICATION QUALITÉ TOC — lecture seule')
print(f'{"="*65}\n')

with open(PROGRESS_FILE, encoding='utf-8') as f:
    progress = json.load(f)

all_done = progress.get('done', [])
print(f'  Slugs dans progress: {len(all_done)} (updated={progress["updated"]}, skipped={progress["skipped"]})')

# ── Traitement par lots de 50 ───────────────────────────────────────
BATCH = 50
results = {
    'ok': [],
    'no_toc': [],        # skipped (pas de TOC dans description)
    'issues': [],        # problèmes de langue détectés
    'errors': [],
}

total = len(all_done)
for i in range(0, total, BATCH):
    batch_slugs = all_done[i:i+BATCH]
    print(f'  Traitement {i+1}–{min(i+BATCH, total)}/{total}...', end=' ', flush=True)

    try:
        rows = fetch_batch(batch_slugs)
    except Exception as e:
        print(f'ERREUR: {e}')
        for s in batch_slugs:
            results['errors'].append((s, str(e)))
        continue

    # Indexer par slug
    row_by_slug = {r['slug']: r for r in rows}

    batch_issues = 0
    for slug in batch_slugs:
        row = row_by_slug.get(slug)
        if not row:
            results['errors'].append((slug, 'slug non trouvé en DB'))
            continue

        desc_en = row.get('description') or ''
        desc_fr = row.get('description_fr') or ''

        # Vérifier si ce slug a un TOC ajouté
        toc_en = extract_toc_section_en(desc_en)
        toc_fr = extract_toc_section_fr(desc_fr)

        if not toc_en and not toc_fr:
            results['no_toc'].append(slug)
            continue

        # Détecter les problèmes
        issues = detect_language_issues(toc_en, toc_fr, slug)

        if issues:
            results['issues'].append({
                'slug': slug,
                'issues': issues,
                'toc_en_preview': (toc_en or '')[:200],
                'toc_fr_preview': (toc_fr or '')[:200],
            })
            batch_issues += 1
        else:
            results['ok'].append(slug)

    print(f'OK={len([s for s in batch_slugs if s in results["ok"]])} problèmes={batch_issues}')
    time.sleep(0.3)

# ── Rapport ──────────────────────────────────────────────────────────
print(f'\n{"="*65}')
print(f'  RAPPORT FINAL')
print(f'{"="*65}')
print(f'  ✓ OK (TOC correcte)         : {len(results["ok"])}')
print(f'  ○ Sans TOC (skipped)        : {len(results["no_toc"])}')
print(f'  ✗ Problèmes de langue       : {len(results["issues"])}')
print(f'  ✗ Erreurs DB                : {len(results["errors"])}')

if results['issues']:
    print(f'\n{"─"*65}')
    print(f'  DOCS AVEC PROBLÈMES DE LANGUE ({len(results["issues"])} docs)')
    print(f'{"─"*65}')
    for item in results['issues']:
        slug = item['slug']
        print(f'\n  ▶ {slug}')
        for severity, site, msg in item['issues']:
            icon = '🔴' if severity == 'CRITICAL' else '🟡'
            print(f'    {icon} [{site}] {msg}')
        if item['toc_en_preview']:
            preview = item['toc_en_preview'].replace('\n', ' | ')[:120]
            print(f'    EN aperçu: {preview}')
        if item['toc_fr_preview']:
            preview = item['toc_fr_preview'].replace('\n', ' | ')[:120]
            print(f'    FR aperçu: {preview}')

if results['errors']:
    print(f'\n{"─"*65}')
    print(f'  ERREURS ({len(results["errors"])})')
    for slug, err in results['errors']:
        print(f'  ✗ {slug}: {err}')

# Sauvegarder rapport JSON
report_path = SCRIPT_DIR / 'toc-quality-report.json'
with open(report_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Rapport sauvegardé: {report_path}')
print(f'\n{"="*65}\n')
