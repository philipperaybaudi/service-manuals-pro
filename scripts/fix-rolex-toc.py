"""
fix-rolex-toc.py
Ajoute le TOC aux 4 docs Rolex ignorés par toc-all-docs.py
(Jaccard trop bas car noms de fichiers très courts vs slugs longs).

Matching : extraction du numéro de calibre depuis le slug → recherche
dans le dossier ROLEX par ce numéro. Dry-run obligatoire pour validation.

Usage :
  python -X utf8 scripts/fix-rolex-toc.py --dry-run   ← toujours d'abord
  python -X utf8 scripts/fix-rolex-toc.py
"""
import os, re, sys, time, base64
from pathlib import Path
import fitz
import requests

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DRY_RUN     = '--dry-run' in sys.argv

env_file = PROJECT_DIR / '.env.local'
with open(env_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL  = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

if not ANTHROPIC_KEY and not DRY_RUN:
    print('✗ ANTHROPIC_API_KEY manquant'); sys.exit(1)

SB_HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

ROLEX_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Horlogerie\ROLEX')

SLUGS_TO_FIX = [
    'rolex-rolex-caliber-3135-parts-list',
    'rolex-rolex-calibre-4030-parts-list',
    'rolex-rolex-calibre-1210-parts-list-and-technical-data',
    'rolex-rolex-calibre-1225-parts-list-and-technical-specifications',
    'rolex-rolex-caliber-1565-parts-list-and-specifications',
]

VISION_PROMPT = (
    "Look at this page carefully.\n\n"
    "If this is a Table of Contents (or index / parts list index / sommaire), "
    "extract ALL entries and provide them in TWO versions:\n\n"
    "1. An ENGLISH version — translate every entry to English if not already in English.\n"
    "2. A FRENCH version — translate every entry to French if not already in French.\n\n"
    "Format EXACTLY like this (no other text):\n"
    "EN:\n- entry one\n- entry two\n...\n"
    "FR:\n- entrée un\n- entrée deux\n...\n\n"
    "If this page is NOT a Table of Contents, reply with exactly: NOT TOC"
)


def sanitize(s: str) -> str:
    return ''.join(c for c in s if 0 < ord(c) < 65536)


def extract_calibre_keywords(slug: str) -> list:
    """
    Extrait les mots-clés distinctifs d'un slug Rolex pour trouver le fichier.
    Retourne une liste de chaînes à chercher dans le nom de fichier (insensible à la casse).
    """
    keywords = []
    # Numéros purs ≥3 chiffres
    nums = re.findall(r'\b\d{3,}\b', slug)
    keywords.extend(nums)
    # Codes alphanum type "72a" → chercher aussi la variante numérique ("722")
    codes = re.findall(r'\b(\d+)[a-z]+\b', slug.lower())
    for c in codes:
        keywords.append(c)           # la partie numérique seule ("72" pour "72a")
        keywords.append(c + '2')     # variante fréquente ("722")
        keywords.append(c + '2-1')   # sous-variante ("722-1")
    # Mots-clés spéciaux
    if 'gmt' in slug.lower():
        keywords.append('gmt')
    return keywords


def find_rolex_pdf(slug: str) -> tuple:
    """
    Cherche le PDF Rolex dans ROLEX_DIR par numéro de calibre.
    Retourne (Path, raison) ou (None, raison).
    """
    if not ROLEX_DIR.exists():
        return None, f'Dossier ROLEX introuvable : {ROLEX_DIR}'

    keywords = extract_calibre_keywords(slug)
    if not keywords:
        return None, 'Aucun mot-clé extrait du slug'

    all_pdfs = list(ROLEX_DIR.glob('*.pdf'))
    candidates = []

    for pdf in all_pdfs:
        name_lower = pdf.stem.lower()
        # Compter combien de keywords sont présents dans le nom
        hits = sum(1 for kw in keywords if kw.lower() in name_lower)
        if hits > 0:
            candidates.append((hits, pdf))

    if not candidates:
        return None, f'Aucun fichier contenant {keywords} dans {ROLEX_DIR.name}'

    # Prendre le meilleur candidat (max hits, puis nom le plus court = le plus précis)
    candidates.sort(key=lambda x: (-x[0], len(x[1].stem)))
    best_hits, best_pdf = candidates[0]
    return best_pdf, f'keywords={keywords}, hits={best_hits}'


def vision_extract_toc(pdf_path: Path, max_pages: int = 15) -> tuple:
    """Vision sur le PDF, retourne (lines_en, lines_fr) ou (None, None)."""
    doc = fitz.open(str(pdf_path))
    n   = len(doc)
    doc.close()

    for i in range(min(max_pages, n)):
        for dpi in (120, 72):
            try:
                doc = fitz.open(str(pdf_path))
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
                b64 = base64.standard_b64encode(pix.tobytes('jpeg')).decode()
                doc.close()

                r = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={'x-api-key': ANTHROPIC_KEY,
                             'anthropic-version': '2023-06-01',
                             'content-type': 'application/json'},
                    json={'model': 'claude-haiku-4-5-20251001', 'max_tokens': 2048,
                          'messages': [{'role': 'user', 'content': [
                              {'type': 'image', 'source': {'type': 'base64',
                               'media_type': 'image/jpeg', 'data': b64}},
                              {'type': 'text', 'text': VISION_PROMPT}
                          ]}]},
                    timeout=60
                )
                r.raise_for_status()
                raw = r.json()['content'][0]['text'].strip()

                if raw == 'NOT TOC':
                    break

                en, fr = _parse(raw)
                if en and fr:
                    return en, fr
                break

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 400 and dpi == 120:
                    continue
                break
            except Exception:
                break
        time.sleep(0.2)

    return None, None


def _parse(raw: str) -> tuple:
    en, fr, cur = [], [], None
    for line in raw.splitlines():
        s = line.strip()
        if s == 'EN:':   cur = 'en'
        elif s == 'FR:': cur = 'fr'
        elif s.startswith('- ') and cur == 'en': en.append(s[2:].strip())
        elif s.startswith('- ') and cur == 'fr': fr.append(s[2:].strip())
    return (en, fr) if en and fr else (None, None)


def db_get(slug: str) -> dict | None:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents',
        headers={**SB_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'},
        params={'select': 'description,description_fr', 'slug': f'eq.{slug}'},
        timeout=20
    )
    if r.status_code == 406: return None
    r.raise_for_status()
    return r.json()


def db_patch(slug: str, data: dict):
    clean = {k: sanitize(v) if isinstance(v, str) else v for k, v in data.items()}
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SB_HEADERS, json=clean, timeout=20
    )
    if not r.ok:
        raise Exception(f'DB {r.status_code}: {r.text[:200]}')


# ── MAIN ─────────────────────────────────────────────────────────

print(f'\n{"="*65}')
print(f'  FIX TOC ROLEX — {len(SLUGS_TO_FIX)} docs')
if DRY_RUN: print(f'  MODE DRY-RUN')
print(f'{"="*65}\n')

stats = {'ok': 0, 'no_pdf': 0, 'no_toc': 0, 'errors': 0}

for slug in SLUGS_TO_FIX:
    print(f'{"─"*65}')
    print(f'  ▶ {slug}')

    # 1. Trouver le PDF par numéro de calibre
    pdf_path, reason = find_rolex_pdf(slug)
    if not pdf_path:
        print(f'  ✗ PDF non trouvé : {reason}')
        stats['no_pdf'] += 1
        continue
    print(f'  ✓ PDF : {pdf_path.name}  ({reason})')

    if DRY_RUN:
        print(f'  [DRY-RUN] Vision non lancée')
        stats['ok'] += 1
        continue

    # 2. Récupérer description actuelle
    try:
        row = db_get(slug)
    except Exception as e:
        print(f'  ✗ DB get : {e}'); stats['errors'] += 1; continue
    if not row:
        print(f'  ✗ Slug absent DB'); stats['errors'] += 1; continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
        print(f'  ○ TOC déjà présente — ignoré')
        stats['ok'] += 1; continue

    # 3. Vision
    print(f'  Vision scan...')
    try:
        lines_en, lines_fr = vision_extract_toc(pdf_path, max_pages=15)
    except Exception as e:
        print(f'  ✗ Vision : {e}'); stats['errors'] += 1; continue

    if not lines_en or not lines_fr:
        print(f'  ○ Aucun TOC trouvé'); stats['no_toc'] += 1; continue

    print(f'  ✓ {len(lines_en)} entrées EN / {len(lines_fr)} entrées FR')
    for l in lines_en[:3]: print(f'    EN • {l}')
    if len(lines_en) > 3: print(f'    EN   ... ({len(lines_en)-3} de plus)')

    # 4. Mise à jour DB
    toc_en = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in lines_en)
    toc_fr = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in lines_fr)
    try:
        db_patch(slug, {'description': desc_en + toc_en,
                        'description_fr': desc_fr + toc_fr})
        print(f'  ✓ DB mise à jour')
        stats['ok'] += 1
    except Exception as e:
        print(f'  ✗ DB patch : {e}'); stats['errors'] += 1
    time.sleep(0.5)

print(f'\n{"="*65}')
print(f'  ✓ OK : {stats["ok"]}  ✗ PDF non trouvé : {stats["no_pdf"]}  '
      f'○ Sans TOC : {stats["no_toc"]}  ✗ Erreurs : {stats["errors"]}')
print(f'{"="*65}\n')
