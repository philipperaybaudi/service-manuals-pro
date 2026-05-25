"""
automobile-toc-complet.py
Ajoute les tables des matières pour tous les docs Automobile >= $20
qui n'en ont pas encore.

Approche hybride :
 1. Essai extraction texte native (fitz) → rapide, sans API
 2. Si PDF scanné (pas de texte), scan Vision pages 1-12 une par une
 3. Traduction EN→FR via Google Translate
 4. Mise à jour DB Supabase
"""
import os, re, time, base64, sys
from pathlib import Path
import fitz
import requests

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print('deep_translator non installe. Lancer : pip install deep-translator')
    sys.exit(1)

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

if not ANTHROPIC_KEY:
    print('ANTHROPIC_API_KEY non trouve dans .env.local')
    sys.exit(1)

SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

DRY_RUN = '--dry-run' in sys.argv

DOCS_BASE = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile')

TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index', 'inhalt', 'indice']

# ─────────────────────────────────────────────────────────────────────────────
# FILE_SLUG : chemin relatif depuis DOCS_BASE → slug DB
# ─────────────────────────────────────────────────────────────────────────────
FILE_SLUG = {

    # ── HONDA ────────────────────────────────────────────────────────────────
    r'HONDA\1998-2004 Foreman 450 Service Manual $25.pdf':
        'honda-honda-foreman-450-service-manual-1998-2004',

    # ── MERCEDES ─────────────────────────────────────────────────────────────
    r'MERCEDES\Mercedes-Benz_190c-200-190Dc-200D-230-220b-220Sb-230S-250S-220SEb-250SE-230SL-250SL-300SE-300SEb-300SEL Service Manuel $25.pdf':
        'mercedes-mercedes-benz-190c-200-190dc-200d-230-220b-220sb-230s-250s-220seb-250se-230sl-250sl-300se-300seb-300sel-service',

    # ── SIMCA ────────────────────────────────────────────────────────────────
    r'SIMCA\Simca_Marmon-4x4-MH600_MAT4155+MAT2844 $30.pdf':
        'simca-simca-marmon-4x4-1-5t-mh600-technical-manual-operation-and-maintenance',

    # ── ALPINE ───────────────────────────────────────────────────────────────
    r'ALPINE\Refection faisceau électrique A110 1300VC $25.pdf':
        'alpine-refection-faisceau-electrique-a110-1300vc',

    # ── LAND ROVER ───────────────────────────────────────────────────────────
    # 300TDi_Engine_Overhaul_Manual.pdf : importé en DB mais fichier physique absent
    r'LAND ROVER\300TDi_Overhaul_Manual.pdf':
        'land-rover-300tdi-overhaul-manual',
    r'LAND ROVER\40_46_V8_overhaul.pdf':
        'land-rover-land-rover-4-0-4-6-litre-v8-engine-overhaul-manual',
    r'LAND ROVER\35_39_42_V8_overhaul.pdf':
        'land-rover-rover-v8-engine-3-5-3-9-4-2-litre-overhaul-manual',
    r'LAND ROVER\D1_Workshop_Manual.pdf':
        'land-rover-land-rover-discovery-workshop-manual-1995',
    r'LAND ROVER\D2_Workshop_Manual.pdf':
        'land-rover-land-rover-discovery-series-ii-workshop-manual-1999my',
    r'LAND ROVER\Defender1996.pdf':
        'land-rover-land-rover-defender-300tdi-workshop-manual-1996',
    r'LAND ROVER\Defender_Workshop_Manual_96_on.pdf':
        'land-rover-land-rover-defender-300tdi-workshop-manual-1996-onwards',
    r'LAND ROVER\DEFENDER_300Tdi_Manuel_atelier-3eme_edition.pdf':
        'land-rover-land-rover-defender-300tdi-workshop-manual-3rd-edition',
    r'LAND ROVER\DEFENDER_Td5_AM99-02-Manuel_atelier-2eme_edition.pdf':
        'land-rover-land-rover-defender-td5-am1999-2002-workshop-manual',
    r'LAND ROVER\Land-Rover_Defender-90-110-Workshop-Manual $25.pdf':
        'land-rover-land-rover-ninety-workshop-manual',
    r'LAND ROVER\Land-Rover_Defender-TD5-1999-2002-Manuel-Atelier $25.pdf':
        'land-rover-land-rover-defender-td5-1999-2002-workshop-manual',
    r'LAND ROVER\Land-Rover_Defender-TD5-Werkstatthandbuch $25.pdf':
        'land-rover-land-rover-defender-td5-workshop-manual',
    r'LAND ROVER\Land-Rover_R6-Military-Workshop-Manual $25.pdf':
        'land-rover-land-rover-series-iii-s-workshop-repair-manual-volume-1',
    r'LAND ROVER\Land-Rover_Series-I-IIA-Workshop-Manual $20.pdf':
        'land-rover-land-rover-series-i-iia-workshop-manual-engine-petrol-models',
    r'LAND ROVER\Land-Rover_Series-II-IIA-Parts-Catalogue $25.pdf':
        'land-rover-land-rover-series-ii-iia-parts-catalogue-petrol-diesel',
    r'LAND ROVER\Land-Rover_Series-III-ROM $22.pdf':
        'land-rover-land-rover-series-iii-repair-operation-manual',
    r'LAND ROVER\Def_90_110_WSM_book7_LT77S_Gearbox_Supplement.pdf':
        'land-rover-land-rover-defender-lt77s-gearbox-workshop-manual-supplement',
    r'LAND ROVER\Land-Rover_2e-Echelon-Ambulance $20.pdf':
        'land-rover-land-rover-ambulance-second-echelon-service-manual',

    # ── TOYOTA (nouveaux) ─────────────────────────────────────────────────────
    r'TOYOTA\Toyota LC60 Heavy Duty Chassis Body Repair Manual FJ6 BJ6 HJ6 $35.pdf':
        'toyota-toyota-land-cruiser-fj-bj-hj-series-chassis-body-repair-manual',
    r'TOYOTA\Toyota LC60 Heavy Duty Chassis Body Repair Manual 1984 $30.pdf':
        'toyota-toyota-land-cruiser-heavy-duty-chassis-body-repair-manual',
    r'TOYOTA\Toyota LC80 Chassis Body Repair Manual FJ80 HZJ80 HDJ80 1990 $35.pdf':
        'toyota-land-cruiser-lc80-chassis-body-repair-manual-fj80-hzj80-hdj80-1990',
    r'TOYOTA\Toyota Land Cruiser Prado 90 Chassis Body Repair Manual RZJ90 KZJ90 1996 $35.pdf':
        'toyota-toyota-land-cruiser-prado-90-chassis-body-repair-manual',
    r'TOYOTA\Toyota Land Cruiser Prado 90 Chassis Body Repair Manual Supplement 1999 $25.pdf':
        'toyota-toyota-land-cruiser-prado-90-chassis-body-repair-manual-supplement-1999',
    r'TOYOTA\Toyota LC80 Chassis Body Repair Manual Supplement 1992 $22.pdf':
        'toyota-toyota-land-cruiser-hardtop-canvas-top-station-wagon-chassis-body-repair-manual-supplement-1992',
    r'TOYOTA\Toyota LC70 LC80 Chassis Body Repair Manual Supplement 1992 $22.pdf':
        'toyota-toyota-land-cruiser-chassis-body-repair-manual-supplement-1992',
    r'TOYOTA\Toyota LC80 Chassis Body Repair Manual Supplement FZJ80 HZJ80 HDJ80 1995 $20.pdf':
        'toyota-toyota-land-cruiser-station-wagon-chassis-body-repair-manual-supplement-fzj80-hzj80-hdj80',
    r'TOYOTA\Toyota 1FZ-F 1FZ-FE Engine Repair Manual 1992 $22.pdf':
        'toyota-toyota-1fz-f-1fz-fe-engine-repair-manual',
    r'TOYOTA\Toyota 1FZ-FE Engine Emission Control Repair Manual 1992 $21.pdf':
        'toyota-toyota-1fz-fe-engine-emission-control-repair-manual',
    r'TOYOTA\Toyota 1KZ-TE Engine Repair Manual 1999 $20.pdf':
        'toyota-toyota-1kz-te-engine-repair-manual',
    r'TOYOTA\Toyota Land Cruiser Prado 90 Electrical Wiring Diagram 1996 $22.pdf':
        'toyota-toyota-land-cruiser-prado-90-electrical-wiring-diagram-1996',
    r'TOYOTA\Toyota FJ62-HJ60-HJ61 Air-Conditioner Installation Manual $25.pdf':
        'toyota-toyota-land-cruiser-fj62-hj60-hj61-air-conditioner-installation-manual',
    r'TOYOTA\Toyota FJ-BJ-HJ60_Series Service Training Information $21.pdf':
        'toyota-toyota-land-cruiser-fj-bj-hj60-series-service-training-information',
    r'TOYOTA\Toyota 2H_12H-T  Engines - Service Training Information $20.pdf':
        'toyota-toyota-2h-12h-t-engines-service-training-information',
    r'TOYOTA\manuel_chassis_HJ6_BJ7.pdf':
        'toyota-toyota-land-cruiser-hard-body-chassis-and-bodywork-repair-manual-fj60-bj60-hj60-series',
}

VISION_PROMPT = (
    "This is page {page_num} of a technical service manual. "
    "Does this page contain a table of contents, index, or sommaire with chapter/section titles?\n"
    "If YES: extract ONLY the chapter/section titles as a clean list, one per line. "
    "Include only meaningful entries (no page numbers, no headers/footers, max 60 lines).\n"
    "If NO: respond with exactly 'NO_TOC'\n"
    "Do not add any commentary."
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def find_toc_text(doc, max_pages=20):
    """Cherche une page TOC via extraction texte native."""
    for i in range(min(max_pages, len(doc))):
        text = doc[i].get_text().strip()
        text_low = text.lower()
        has_kw = any(kw in text_low for kw in TOC_KEYWORDS)
        has_pages = len(re.findall(r'\d+\s*$', text, re.MULTILINE)) >= 3
        if has_kw and has_pages:
            return i, text
    return None, None


def page_to_base64(page, dpi=120):
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return base64.b64encode(pix.tobytes('png')).decode()


def vision_call(page_b64, prompt):
    """Appel Claude Vision. Retourne le texte brut ou lève une exception."""
    r = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        json={
            'model': 'claude-haiku-4-5-20251001',
            'max_tokens': 1024,
            'messages': [{
                'role': 'user',
                'content': [
                    {'type': 'image', 'source': {
                        'type': 'base64', 'media_type': 'image/png',
                        'data': page_b64}},
                    {'type': 'text', 'text': prompt}
                ]
            }]
        },
        timeout=60
    )
    r.raise_for_status()
    return r.json()['content'][0]['text'].strip()


def vision_scan_for_toc(doc, max_pages=12):
    """Scan les premières pages via Claude Vision pour trouver le TOC.
    Essaie 120 DPI d'abord, puis 72 DPI si erreur 400."""
    for i in range(min(max_pages, len(doc))):
        prompt = VISION_PROMPT.format(page_num=i + 1)
        raw = None

        for dpi in (120, 72):
            try:
                page_b64 = page_to_base64(doc[i], dpi=dpi)
            except Exception as e:
                print(f'    [vision] page {i+1} image error: {e}')
                break
            try:
                raw = vision_call(page_b64, prompt)
                break  # succès
            except requests.exceptions.HTTPError as e:
                if e.response is not None and e.response.status_code == 400 and dpi == 120:
                    print(f'    [vision] page {i+1} 400 @{dpi}dpi → retry 72dpi')
                    time.sleep(1)
                    continue
                print(f'    [vision] page {i+1} API error: {e}')
                time.sleep(2)
                break
            except Exception as e:
                print(f'    [vision] page {i+1} API error: {e}')
                time.sleep(2)
                break

        if raw is None:
            continue

        if raw == 'NO_TOC' or not raw:
            print(f'    page {i+1} : pas de TOC')
            time.sleep(0.5)
            continue

        # TOC trouvé
        lines = []
        for l in raw.splitlines():
            l = l.strip().lstrip('0123456789.)•-–—* ').strip()
            if len(l) >= 4 and l.upper() != 'NO_TOC':
                lines.append(l)
        if lines:
            print(f'    ✓ TOC trouvé page {i+1} via Vision ({len(lines)} entrées)')
            return i, lines
        time.sleep(0.5)

    return None, None


def clean_text_toc(raw_text):
    lines = raw_text.splitlines()
    result = []
    skip_words = {'page', 'contents', 'table of contents', 'index', 'sommaire',
                  'inhaltsverzeichnis', 'subject index', 'section', 'chapter',
                  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'}
    for line in lines:
        line = line.strip()
        if not line or len(line) < 4:
            continue
        line = re.sub(r'\s{2,}', ' ', line)
        line = re.sub(r'\.{3,}', '', line).strip()
        if re.fullmatch(r'[\d\s,\-\.;•\*]+', line):
            continue
        if line.lower() in skip_words:
            continue
        alpha = sum(1 for c in line if c.isalpha())
        if alpha < 3:
            continue
        result.append(line)
    return result


def translate_lines(lines, source='en', target='fr'):
    translator = GoogleTranslator(source=source, target=target)
    result = []
    for line in lines:
        try:
            tr = translator.translate(line)
            result.append(tr if tr else line)
        except Exception as e:
            print(f'    [trad] {line[:40]} — {e}')
            result.append(line)
        time.sleep(0.08)
    return result


def detect_lang(lines):
    fr_words = {'le', 'la', 'les', 'de', 'du', 'des', 'et', 'un', 'une',
                'pour', 'avec', 'dans', 'sur', 'par', 'au', 'aux'}
    words = set(re.findall(r'\b\w+\b', ' '.join(lines).lower()))
    return 'fr' if len(words & fr_words) >= 3 else 'en'


def db_get(slug):
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**SUPABASE_HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    if r.status_code == 406:
        return None
    r.raise_for_status()
    return r.json()


def db_patch(slug, data):
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=SUPABASE_HEADERS, json=data
    )
    r.raise_for_status()


def strip_toc_block(text):
    for marker in ['\n\nTable of Contents:', '\n\nTable des matières :', '\n\nSommaire :']:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

print(f'\n{"="*70}')
print(f'  AUTOMOBILE — TOC COMPLET{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'  {len(FILE_SLUG)} documents à traiter')
print(f'{"="*70}\n')

ok = 0
already = 0
skipped = 0
errors = 0

for rel_path, slug in FILE_SLUG.items():
    pdf_path = DOCS_BASE / rel_path
    fname = Path(rel_path).name
    print(f'\n{"─"*70}')
    print(f'  {fname}')
    print(f'  slug: {slug[:65]}')

    # Vérifier fichier
    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable')
        errors += 1
        continue

    # Récupérer descriptions DB
    row = db_get(slug)
    if not row:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en_orig = row.get('description') or ''
    desc_fr_orig = row.get('description_fr') or ''

    # TOC déjà présent ?
    if ('Table of Contents:' in desc_en_orig or
            'Table des matières' in desc_fr_orig or
            'Sommaire :' in desc_fr_orig):
        print(f'  ○ TOC déjà présent — ignoré')
        already += 1
        continue

    desc_en_clean = strip_toc_block(desc_en_orig)
    desc_fr_clean = strip_toc_block(desc_fr_orig)

    # Ouvrir PDF
    try:
        doc = fitz.open(str(pdf_path))
        n_pages = len(doc)
    except Exception as e:
        print(f'  ✗ Erreur ouverture PDF: {e}')
        errors += 1
        continue

    print(f'  Pages : {n_pages}')

    # 1. Essai texte natif
    toc_idx, toc_raw = find_toc_text(doc, max_pages=20)
    toc_lines = None
    method = None

    if toc_idx is not None:
        print(f'  ✓ TOC texte natif page {toc_idx+1}')
        toc_lines = clean_text_toc(toc_raw)
        method = 'text'
        # Améliorer via Vision si texte trop bruité
        if len(toc_lines) < 5:
            print(f'  ⚠ Texte trop bruité ({len(toc_lines)} lignes) → Vision sur cette page')
            try:
                page_b64 = page_to_base64(doc[toc_idx])
                doc_tmp = {'page_num': toc_idx + 1}
                prompt = VISION_PROMPT.format(page_num=toc_idx + 1)
                r = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': ANTHROPIC_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    json={
                        'model': 'claude-haiku-4-5-20251001',
                        'max_tokens': 1024,
                        'messages': [{
                            'role': 'user',
                            'content': [
                                {'type': 'image', 'source': {
                                    'type': 'base64', 'media_type': 'image/png',
                                    'data': page_b64}},
                                {'type': 'text', 'text': prompt}
                            ]
                        }]
                    },
                    timeout=60
                )
                r.raise_for_status()
                raw = r.json()['content'][0]['text'].strip()
                if raw != 'NO_TOC':
                    vision_lines = [l.strip().lstrip('0123456789.)•-–—* ').strip()
                                    for l in raw.splitlines()
                                    if len(l.strip()) >= 4]
                    if len(vision_lines) > len(toc_lines):
                        toc_lines = vision_lines
                        method = 'vision+text'
            except Exception as e:
                print(f'    Vision fallback error: {e}')
    else:
        # 2. PDF scanné → scan Vision
        print(f'  ⚠ Pas de texte natif — scan Vision pages 1-12...')
        toc_idx, toc_lines = vision_scan_for_toc(doc, max_pages=12)
        method = 'vision'

    doc.close()

    if not toc_lines or len(toc_lines) < 3:
        print(f'  ○ Aucun TOC trouvable — ignoré')
        skipped += 1
        continue

    print(f'  ✓ {len(toc_lines)} entrées ({method})')
    for l in toc_lines[:5]:
        print(f'    • {l}')
    if len(toc_lines) > 5:
        print(f'    ... ({len(toc_lines)-5} de plus)')

    # Détecter langue & traduire
    src_lang = detect_lang(toc_lines)
    if src_lang == 'fr':
        toc_lines_fr = toc_lines
        print(f'  (document FR → traduction FR→EN pour site anglais)')
        toc_lines_en = translate_lines(toc_lines, source='fr', target='en')
        print(f'  ✓ Aperçu EN: {toc_lines_en[0] if toc_lines_en else "—"}')
    else:
        toc_lines_en = toc_lines
        print(f'  Traduction EN→FR...')
        toc_lines_fr = translate_lines(toc_lines, source='en', target='fr')
        print(f'  ✓ Aperçu FR: {toc_lines_fr[0] if toc_lines_fr else "—"}')

    toc_en_block = '\n\nTable of Contents:\n' + '\n'.join(f'- {l}' for l in toc_lines_en)
    toc_fr_block = '\n\nTable des matières :\n' + '\n'.join(f'- {l}' for l in toc_lines_fr)

    if DRY_RUN:
        print(f'  [DRY] OK')
        ok += 1
        continue

    def sanitize(s):
        return ''.join(c for c in s if ord(c) > 0 and ord(c) < 65536)

    try:
        db_patch(slug, {
            'description': sanitize(desc_en_clean + toc_en_block),
            'description_fr': sanitize(desc_fr_clean + toc_fr_block)
        })
        print(f'  ✓ DB mise à jour')
        ok += 1
    except Exception as e:
        print(f'  ✗ DB error: {e}')
        errors += 1

    time.sleep(0.3)

print(f'\n{"="*70}')
print(f'  BILAN : {ok} mis à jour | {already} déjà OK | {skipped} sans TOC | {errors} erreurs')
print(f'{"="*70}\n')
