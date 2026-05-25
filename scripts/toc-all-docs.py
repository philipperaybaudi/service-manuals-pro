"""
toc-all-docs.py
Ajoute les TOC à tous les docs actifs ≥$20 qui n'en ont pas encore.

Stratégie d'extraction (conforme pipeline sécurisé) :
  1. get_text() UNIQUEMENT pour localiser le numéro de page TOC — rien n'est mis en DB
  2. Claude Vision sur cette page précise → extrait ET traduit EN + FR en un seul appel
  3. Pour PDFs image-only (aucune couche texte) : Vision page par page (max 12)

Matching PDF local : Jaccard sur tokens slug/filename (seuil 0.50)
Reprise sur interruption : toc-all-docs-progress.json

Usage :
  python -X utf8 scripts/toc-all-docs.py               # lot de 100 docs
  python -X utf8 scripts/toc-all-docs.py --batch 50    # lot personnalisé
  python -X utf8 scripts/toc-all-docs.py --dry-run     # simulation sans écriture DB
  python -X utf8 scripts/toc-all-docs.py --reset       # repart de zéro
"""
import os, re, sys, json, time, base64
from pathlib import Path
import fitz
import requests

SCRIPT_DIR    = Path(__file__).parent
PROJECT_DIR   = SCRIPT_DIR.parent
PROGRESS_FILE = SCRIPT_DIR / 'toc-all-docs-progress.json'

# ── Arguments ────────────────────────────────────────────────────
argv       = sys.argv[1:]
DRY_RUN    = '--dry-run' in argv
RESET      = '--reset'   in argv
BATCH_SIZE = 100
for i, a in enumerate(argv):
    if a == '--batch' and i + 1 < len(argv):
        try: BATCH_SIZE = int(argv[i + 1])
        except ValueError: pass

# ── Variables d'environnement ────────────────────────────────────
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

SB_HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

DOCS_BASE    = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index', 'inhalt',
                'indice', 'содержание']

VISION_PROMPT = (
    "Look at this page carefully.\n\n"
    "If this is a Table of Contents (or index / sommaire / Inhaltsverzeichnis / indice), "
    "extract ALL entries and provide them in TWO versions:\n\n"
    "1. An ENGLISH version — translate every entry to English if it is not already in English.\n"
    "2. A FRENCH version — translate every entry to French if it is not already in French.\n\n"
    "Format your response EXACTLY like this (no preamble, no other text):\n"
    "EN:\n"
    "- entry one\n"
    "- entry two\n"
    "...\n"
    "FR:\n"
    "- entrée un\n"
    "- entrée deux\n"
    "...\n\n"
    "If this page is NOT a Table of Contents, reply with exactly: NOT TOC"
)


# ════════════════════════════════════════════════════════════════
#  UTILITAIRES
# ════════════════════════════════════════════════════════════════

def sanitize(s: str) -> str:
    """Supprime null bytes et caractères hors BMP (rejetés par PostgreSQL)."""
    return ''.join(c for c in s if 0 < ord(c) < 65536)


# ── Progression ──────────────────────────────────────────────────

def load_progress() -> dict:
    if PROGRESS_FILE.exists() and not RESET:
        with open(PROGRESS_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {'done': [], 'updated': 0, 'skipped': 0, 'errors': 0, 'vision_calls': 0}


def save_progress(prog: dict):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(prog, f, ensure_ascii=False, indent=2)


# ── Index local PDF ──────────────────────────────────────────────

def _slug_tokens(s: str) -> set:
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    # Conserver les nombres ≥3 chiffres (numéros de calibre, modèles, etc.)
    return {t for t in s.split() if len(t) >= 2 and (not t.isdigit() or len(t) >= 3)}


def _jaccard(a: set, b: set) -> float:
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)


def build_local_index() -> list:
    print('  Indexation DOCS EN LIGNE...')
    idx, count = [], 0
    for pdf in DOCS_BASE.rglob('*.pdf'):
        try:
            tokens = _slug_tokens(pdf.stem)
            if tokens:
                idx.append((tokens, pdf))
                count += 1
        except Exception:
            pass
    print(f'  {count} PDFs indexés')
    return idx


def find_local_pdf(idx: list, slug: str, page_count: int = 0) -> tuple:
    """
    Retourne (Path, score) ou (None, 0.0).
    Jaccard > 0.50 sur tokens slug/filename.
    Confirmation page_count (±5) pour scores 0.50–0.70.
    """
    slug_tok   = _slug_tokens(slug)
    best_path  = None
    best_score = 0.0
    for (file_tok, path) in idx:
        score = _jaccard(slug_tok, file_tok)
        if score > best_score:
            best_score = score
            best_path  = path
    if best_score <= 0.45:
        return None, 0.0
    if best_score <= 0.70 and page_count and best_path:
        try:
            doc = fitz.open(str(best_path))
            n   = len(doc)
            doc.close()
            if abs(n - page_count) > 5:
                return None, 0.0
        except Exception:
            pass
    return best_path, best_score


# ── Localisation page TOC (get_text navigation uniquement) ───────

def find_toc_page(pdf_path: Path, max_pages: int = 20) -> tuple:
    """
    Utilise get_text() UNIQUEMENT pour trouver le numéro de page du TOC.
    Aucun texte extrait n'est mis en DB — cette fonction retourne un index de page.
    Retourne (page_idx: int | None, image_only: bool).
    """
    try:
        doc = fitz.open(str(pdf_path))
        has_text  = False
        toc_page  = None

        for i in range(min(max_pages, len(doc))):
            txt = doc[i].get_text().strip()
            if len(txt) > 80:
                has_text = True
                txt_low  = txt.lower()
                if any(kw in txt_low for kw in TOC_KEYWORDS):
                    nums = re.findall(r'\d+\s*$', txt, re.MULTILINE)
                    if len(nums) >= 3:
                        toc_page = i
                        break

        doc.close()
        return toc_page, not has_text

    except Exception as e:
        return None, True


# ── Vision ───────────────────────────────────────────────────────

def _vision_call(img_b64: str) -> tuple:
    """
    Appel unique à Claude Haiku Vision.
    Retourne (lines_en, lines_fr) ou (None, None).
    """
    payload = {
        'model':      'claude-haiku-4-5-20251001',
        'max_tokens': 2048,
        'messages':   [{'role': 'user', 'content': [
            {'type': 'image',
             'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': img_b64}},
            {'type': 'text', 'text': VISION_PROMPT}
        ]}]
    }
    r = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key':           ANTHROPIC_KEY,
            'anthropic-version':   '2023-06-01',
            'content-type':        'application/json',
        },
        json=payload, timeout=60
    )
    r.raise_for_status()
    raw = r.json()['content'][0]['text'].strip()

    if raw.strip() == 'NOT TOC':
        return None, None

    return _parse_bilingual(raw)


def _parse_bilingual(raw: str) -> tuple:
    """Parse la réponse EN: / FR: de Vision."""
    lines_en, lines_fr = [], []
    current = None
    for line in raw.splitlines():
        s = line.strip()
        if s == 'EN:':
            current = 'en'
        elif s == 'FR:':
            current = 'fr'
        elif s.startswith('- ') and current == 'en':
            entry = s[2:].strip()
            if entry: lines_en.append(entry)
        elif s.startswith('- ') and current == 'fr':
            entry = s[2:].strip()
            if entry: lines_fr.append(entry)
    if lines_en and lines_fr:
        return lines_en, lines_fr
    return None, None


def _page_to_b64(pdf_path: Path, page_idx: int, dpi: int = 120) -> str:
    doc = fitz.open(str(pdf_path))
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = doc[page_idx].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    b64 = base64.standard_b64encode(pix.tobytes('jpeg')).decode()
    doc.close()
    return b64


def vision_on_page(pdf_path: Path, page_idx: int) -> tuple:
    """
    Vision sur UNE page précise (connue via find_toc_page).
    Retry à 72 DPI si erreur 400.
    Retourne (lines_en, lines_fr) ou (None, None).
    """
    for dpi in (120, 72):
        try:
            b64 = _page_to_b64(pdf_path, page_idx, dpi)
            en, fr = _vision_call(b64)
            return en, fr
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400 and dpi == 120:
                continue
            raise
    return None, None


def vision_scan_image_only(pdf_path: Path, max_pages: int = 12) -> tuple:
    """
    Vision page par page pour PDFs sans couche texte.
    S'arrête dès qu'un TOC est trouvé.
    Retourne (lines_en, lines_fr) ou (None, None).
    """
    doc       = fitz.open(str(pdf_path))
    n_pages   = len(doc)
    doc.close()

    for i in range(min(max_pages, n_pages)):
        for dpi in (120, 72):
            try:
                b64 = _page_to_b64(pdf_path, i, dpi)
                en, fr = _vision_call(b64)
                if en and fr:
                    return en, fr
                break   # NOT TOC → page suivante
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 400 and dpi == 120:
                    continue
                break
            except Exception:
                break
        time.sleep(0.2)

    return None, None


# ── DB ───────────────────────────────────────────────────────────

def db_patch(slug: str, data: dict):
    clean = {k: sanitize(v) if isinstance(v, str) else v for k, v in data.items()}
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SB_HEADERS, json=clean, timeout=20
    )
    if not r.ok:
        raise Exception(f'DB {r.status_code}: {r.text[:200]}')


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

print(f'\n{"="*65}')
s = f'  TOC — TOUS DOCS ≥$20  |  lot={BATCH_SIZE}'
if DRY_RUN: s += '  [DRY-RUN]'
print(s)
print(f'{"="*65}\n')

if not ANTHROPIC_KEY:
    print('✗ ANTHROPIC_API_KEY manquant'); sys.exit(1)

# Progression
prog       = load_progress()
done_slugs = set(prog['done'])
if RESET:
    print('  [RESET] Progression effacée\n')

# Récupération docs Supabase
print('  Récupération docs ≥$20 sans TOC depuis Supabase...')
all_docs, offset, PAGE = [], 0, 1000

while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents',
        headers={**SB_HEADERS, 'Range-Unit': 'items',
                 'Range': f'{offset}-{offset+PAGE-1}'},
        params={
            'select': 'slug,title,price,page_count,description,description_fr',
            'active': 'eq.true',
            'price':  'gte.2000',
        }
    )
    r.raise_for_status()
    batch = r.json()
    if not batch: break

    for doc in batch:
        desc    = doc.get('description')    or ''
        desc_fr = doc.get('description_fr') or ''
        if 'Table of Contents:' in desc or 'Table des matières' in desc_fr:
            continue
        if doc['slug'] in done_slugs:
            continue
        all_docs.append(doc)

    offset += len(batch)
    if len(batch) < PAGE: break

print(f'  Docs restants à traiter : {len(all_docs)}')
if not all_docs:
    print('\n  ✓ Tous les docs sont déjà traités !')
    sys.exit(0)

lot = all_docs[:BATCH_SIZE]
print(f'  Ce lot                  : {len(lot)} docs\n')

# Index local
idx = build_local_index()

# ── Traitement ───────────────────────────────────────────────────
upd_session = skp_session = err_session = vis_session = 0

for num, doc in enumerate(lot, 1):
    slug       = doc['slug']
    title      = doc.get('title', '')[:55]
    page_count = doc.get('page_count') or 0
    desc_en    = doc.get('description')    or ''
    desc_fr_db = doc.get('description_fr') or ''

    print(f'\n{"─"*65}')
    print(f'  [{num}/{len(lot)}] {title}')
    print(f'  slug : {slug}')

    # 1. Trouver PDF local
    pdf_path, match_score = find_local_pdf(idx, slug, page_count)
    if not pdf_path:
        print(f'  ⚠ PDF non trouvé localement — ignoré')
        prog['done'].append(slug)
        prog['skipped'] += 1
        save_progress(prog)
        skp_session += 1
        continue

    print(f'  PDF  : ...\\{pdf_path.parent.name}\\{pdf_path.name}  [score={match_score:.2f}]')

    # 2. Localiser la page TOC (navigation get_text uniquement)
    try:
        toc_page_idx, image_only = find_toc_page(pdf_path, max_pages=20)
    except Exception as e:
        print(f'  ✗ Erreur lecture PDF : {e}')
        prog['done'].append(slug)
        prog['errors'] += 1
        save_progress(prog)
        err_session += 1
        continue

    lines_en = lines_fr = None

    # 3. Extraction Vision
    try:
        if toc_page_idx is not None:
            # Page TOC localisée → Vision sur cette page précise
            print(f'  Page TOC localisée (p.{toc_page_idx + 1}) → Vision...')
            lines_en, lines_fr = vision_on_page(pdf_path, toc_page_idx)
            vis_session += 1
            prog['vision_calls'] += 1

        elif image_only:
            # PDF sans couche texte → scan Vision page par page
            print(f'  PDF image-only → Vision scan...')
            lines_en, lines_fr = vision_scan_image_only(pdf_path, max_pages=12)
            vis_session += 1
            prog['vision_calls'] += 1

        else:
            # Couche texte présente mais pas de TOC détectée → pas de TOC
            print(f'  ⚠ Texte présent, aucune TOC détectée — doc sans TOC, ignoré')

    except Exception as e:
        print(f'  ✗ Erreur Vision : {e}')
        prog['done'].append(slug)
        prog['errors'] += 1
        save_progress(prog)
        err_session += 1
        continue

    if not lines_en or not lines_fr:
        print(f'  ⚠ Aucun TOC trouvé — ignoré')
        prog['done'].append(slug)
        prog['skipped'] += 1
        save_progress(prog)
        skp_session += 1
        continue

    print(f'  ✓ TOC extrait : {len(lines_en)} entrées EN / {len(lines_fr)} entrées FR')
    for l in lines_en[:3]:
        print(f'    EN • {l}')
    if len(lines_en) > 3:
        print(f'    EN   ... ({len(lines_en) - 3} de plus)')

    # 4. Construire blocs TOC
    toc_block_en = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in lines_en)
    toc_block_fr = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in lines_fr)

    # 5. Mise à jour DB
    if DRY_RUN:
        print(f'  [DRY-RUN] DB non modifiée')
    else:
        try:
            db_patch(slug, {
                'description':    desc_en    + toc_block_en,
                'description_fr': desc_fr_db + toc_block_fr,
            })
            print(f'  ✓ DB mise à jour')
        except Exception as e:
            print(f'  ✗ DB erreur : {e}')
            prog['errors'] += 1
            save_progress(prog)
            err_session += 1
            continue

    prog['done'].append(slug)
    prog['updated'] += 1
    save_progress(prog)
    upd_session += 1
    time.sleep(0.5)

# ── Bilan ────────────────────────────────────────────────────────
remaining = len(all_docs) - len(lot)
print(f'\n{"="*65}')
print(f'  BILAN LOT')
print(f'{"="*65}')
print(f'  Mis à jour      : {upd_session}')
print(f'  Sans TOC/skip   : {skp_session}')
print(f'  Erreurs         : {err_session}')
print(f'  Appels Vision   : {vis_session}  (~${vis_session * 0.007:.3f})')
print(f'  Total traités   : {len(prog["done"])}')
if remaining > 0:
    print(f'\n  ↻ {remaining} docs restants — relancez pour continuer')
else:
    print(f'\n  ✓ Traitement complet !')
print(f'{"="*65}\n')
