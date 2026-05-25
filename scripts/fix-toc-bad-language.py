"""
fix-toc-bad-language.py
Corrige les 12 docs dont le TOC est dans la mauvaise langue.
Extraction VISION UNIQUEMENT (Claude Haiku) — aucun get_text().
Le prompt Vision demande directement les versions EN et FR.
Remplace la section TOC existante dans description/description_fr.
"""
import os, re, sys, json, time, base64
from pathlib import Path
import fitz
import requests

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

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

if not ANTHROPIC_KEY:
    print('✗ ANTHROPIC_API_KEY manquant'); sys.exit(1)

SB_HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
}

DOCS_BASE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE')

# ── 12 docs confirmés avec mauvaise langue ───────────────────────
SLUGS_TO_FIX = [
    'edixa-edixa-reflex-repair-german',
    'uher-uher-4000-report-monitor-av-service-manual',
    'voitglander-voigtlander-bessamatic-repair',
    'leitz-leitz-projector-pradovit-service-manual',
    'leica-leicina-camera-service-manual-20',
    'leica-leica-iiig-service-manual',
    'leica-leica-iiif-repair-manual-20',
    'leica-leica-m3-repair-manual-25',
    'kiev-kiev-60ttl-repair-russian',
    'hasselblad-hasselblad-accessories-repair-manual',
    'nikon-nikon-300mm-f28ais-repair',
    'lurem-c20-notice',
]

DRY_RUN = '--dry-run' in sys.argv


# ════════════════════════════════════════════════════════════════
#  UTILITAIRES
# ════════════════════════════════════════════════════════════════

def sanitize(s: str) -> str:
    return ''.join(c for c in s if 0 < ord(c) < 65536)


def _slug_tokens(s: str) -> set:
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return {t for t in s.split() if len(t) >= 2 and not t.isdigit()}


def _jaccard(a: set, b: set) -> float:
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)


def build_local_index() -> list:
    idx = []
    for pdf in DOCS_BASE.rglob('*.pdf'):
        try:
            tokens = _slug_tokens(pdf.stem)
            if tokens:
                idx.append((tokens, pdf))
        except Exception:
            pass
    return idx


def find_local_pdf(idx: list, slug: str) -> tuple:
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
    return best_path, best_score


def vision_extract_toc(pdf_path: Path, max_pages: int = 15) -> tuple:
    """
    Scanne les pages via Claude Vision.
    Demande directement à Claude d'extraire le TOC en anglais ET en français.
    Retourne (lines_en: list, lines_fr: list) ou (None, None).
    """
    doc = fitz.open(str(pdf_path))
    lines_en = None
    lines_fr = None

    PROMPT = (
        "Look at this page carefully.\n\n"
        "If this is a Table of Contents (or index, or sommaire, or Inhaltsverzeichnis), "
        "extract ALL entries and provide them in TWO versions:\n\n"
        "1. An ENGLISH version — translate every entry to English if it is not already in English.\n"
        "2. A FRENCH version — translate every entry to French if it is not already in French.\n\n"
        "Format your response EXACTLY like this (no other text):\n"
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

    for i in range(min(max_pages, len(doc))):
        for dpi in (120, 72):
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = doc[i].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img_b64 = base64.standard_b64encode(pix.tobytes('jpeg')).decode()

            payload = {
                'model': 'claude-haiku-4-5-20251001',
                'max_tokens': 2048,
                'messages': [{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': 'image/jpeg',
                                'data': img_b64
                            }
                        },
                        {'type': 'text', 'text': PROMPT}
                    ]
                }]
            }

            try:
                r = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': ANTHROPIC_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    json=payload,
                    timeout=60
                )
                r.raise_for_status()
                raw = r.json()['content'][0]['text'].strip()

                if raw == 'NOT TOC':
                    break  # cette page n'est pas un TOC, page suivante

                # Parser EN: / FR: sections
                en_lines, fr_lines = _parse_vision_response(raw)
                if en_lines and fr_lines:
                    lines_en = en_lines
                    lines_fr = fr_lines
                    break  # TOC trouvé

                break  # réponse inattendue, page suivante

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 400 and dpi == 120:
                    print(f'    [vision] page {i+1} retry 72dpi')
                    continue
                raise

        if lines_en:
            break
        time.sleep(0.3)

    doc.close()
    return lines_en, lines_fr


def _parse_vision_response(raw: str) -> tuple:
    """
    Parse la réponse Vision formatée EN: / FR:.
    Retourne (list_en, list_fr) ou (None, None).
    """
    lines_en = []
    lines_fr = []
    current  = None

    for line in raw.splitlines():
        stripped = line.strip()
        if stripped == 'EN:':
            current = 'en'
        elif stripped == 'FR:':
            current = 'fr'
        elif stripped.startswith('- ') and current == 'en':
            entry = stripped[2:].strip()
            if entry:
                lines_en.append(entry)
        elif stripped.startswith('- ') and current == 'fr':
            entry = stripped[2:].strip()
            if entry:
                lines_fr.append(entry)

    if lines_en and lines_fr:
        return lines_en, lines_fr
    return None, None


def db_get(slug: str) -> dict | None:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents',
        headers={**SB_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'},
        params={'select': 'description,description_fr', 'slug': f'eq.{slug}'},
        timeout=20
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug: str, data: dict):
    clean = {k: sanitize(v) if isinstance(v, str) else v for k, v in data.items()}
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SB_HEADERS,
        json=clean,
        timeout=20
    )
    if not r.ok:
        print(f'  ✗ DB {r.status_code}: {r.text[:300]}')
        r.raise_for_status()


def replace_toc_section(description: str, new_toc_block: str, lang: str) -> str:
    """
    Remplace la section TOC existante dans description.
    Si aucune section TOC existante, l'ajoute à la fin.
    lang='en'  → cherche 'Table of Contents:'
    lang='fr'  → cherche 'Table des matières'
    """
    if lang == 'en':
        marker = 'Table of Contents:'
    else:
        marker = 'Table des matières'

    # Chercher la position du marker existant
    idx = description.find(marker)
    if idx != -1:
        # Conserver tout ce qui précède le marker (la description originale)
        before = description[:idx].rstrip()
        return before + '\n\n' + new_toc_block
    else:
        # Pas de section TOC existante → ajouter à la fin
        return description.rstrip() + '\n\n' + new_toc_block


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

print(f'\n{"="*65}')
print(f'  FIX TOC MAUVAISE LANGUE — {len(SLUGS_TO_FIX)} docs')
if DRY_RUN:
    print(f'  MODE DRY-RUN — aucune écriture DB')
print(f'{"="*65}\n')

print('  Indexation PDFs locaux...')
local_idx = build_local_index()
print(f'  {len(local_idx)} PDFs indexés\n')

stats = {'ok': 0, 'no_pdf': 0, 'no_toc': 0, 'errors': 0}
vision_calls = 0

for slug in SLUGS_TO_FIX:
    print(f'{"─"*65}')
    print(f'  ▶ {slug}')

    # 1. Trouver le PDF local
    pdf_path, score = find_local_pdf(local_idx, slug)
    if not pdf_path:
        print(f'  ✗ PDF local introuvable (score max insuffisant)')
        stats['no_pdf'] += 1
        continue
    print(f'  ✓ PDF: {pdf_path.name} (Jaccard={score:.2f})')

    # 2. Récupérer la description actuelle en DB
    try:
        row = db_get(slug)
    except Exception as e:
        print(f'  ✗ Erreur DB get: {e}')
        stats['errors'] += 1
        continue
    if not row:
        print(f'  ✗ Slug absent de la DB')
        stats['errors'] += 1
        continue

    desc_en = row.get('description') or ''
    desc_fr = row.get('description_fr') or ''

    # 3. Extraction Vision — demande EN + FR en un seul appel par page
    print(f'  Vision scan ({pdf_path.stat().st_size // 1024} KB)...')
    try:
        lines_en, lines_fr = vision_extract_toc(pdf_path, max_pages=15)
        vision_calls += 1
    except Exception as e:
        print(f'  ✗ Erreur Vision: {e}')
        stats['errors'] += 1
        continue

    if not lines_en or not lines_fr:
        print(f'  ○ Aucun TOC trouvé par Vision dans les 15 premières pages')
        stats['no_toc'] += 1
        continue

    print(f'  ✓ TOC extrait : {len(lines_en)} entrées EN, {len(lines_fr)} entrées FR')
    # Aperçu
    for l in lines_en[:3]:
        print(f'    EN • {l}')
    if len(lines_en) > 3:
        print(f'    EN   ... ({len(lines_en)-3} de plus)')
    for l in lines_fr[:3]:
        print(f'    FR • {l}')
    if len(lines_fr) > 3:
        print(f'    FR   ... ({len(lines_fr)-3} de plus)')

    # 4. Construire les blocs TOC
    toc_block_en = 'Table of Contents:\n' + '\n'.join(f'- {l}' for l in lines_en)
    toc_block_fr = 'Table des matières :\n' + '\n'.join(f'- {l}' for l in lines_fr)

    # 5. Remplacer dans les descriptions existantes
    new_desc_en = replace_toc_section(desc_en, toc_block_en, lang='en')
    new_desc_fr = replace_toc_section(desc_fr, toc_block_fr, lang='fr')

    if DRY_RUN:
        print(f'  [DRY-RUN] DB non modifiée')
        stats['ok'] += 1
        continue

    # 6. Mise à jour DB
    try:
        db_patch(slug, {
            'description':    new_desc_en,
            'description_fr': new_desc_fr,
        })
        print(f'  ✓ DB mise à jour')
        stats['ok'] += 1
    except Exception as e:
        print(f'  ✗ Erreur DB patch: {e}')
        stats['errors'] += 1

    time.sleep(1.0)  # respirer entre les appels

print(f'\n{"="*65}')
print(f'  RÉSUMÉ')
print(f'{"="*65}')
print(f'  ✓ Corrigés          : {stats["ok"]}')
print(f'  ○ PDF introuvable   : {stats["no_pdf"]}')
print(f'  ○ TOC non trouvé    : {stats["no_toc"]}')
print(f'  ✗ Erreurs           : {stats["errors"]}')
print(f'  Vision calls        : {vision_calls}')
print(f'  Coût Vision estimé  : ~${vision_calls * 0.007:.3f}')
print(f'\n{"="*65}\n')
