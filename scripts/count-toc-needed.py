"""
count-toc-needed.py
Partie 1 : Requête Supabase — docs actifs ≥$20 sans TOC en DB
Partie 2 : Échantillon 300 PDFs locaux — ratio texte extractible vs image-only (Vision)
Aucun frais Anthropic.
"""
import os, re, random
from pathlib import Path
import fitz
import requests

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
env_file = PROJECT_DIR / '.env.local'
with open(env_file, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

DOCS_BASE  = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE')
SAMPLE_SIZE = 300

TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire',
                'inhaltsverzeichnis', 'subject index']

# ── PARTIE 1 : DB Supabase ───────────────────────────────────────
print(f'\n{"="*60}')
print(f'  PARTIE 1 — DOCS ≥$20 SANS TOC (SUPABASE)')
print(f'{"="*60}\n')

total_gte20  = 0
already_toc  = 0
needs_toc    = 0
offset       = 0
PAGE         = 1000

while True:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents',
        headers={**HEADERS,
                 'Range-Unit': 'items',
                 'Range': f'{offset}-{offset + PAGE - 1}'},
        params={
            'select': 'slug,price,description,description_fr',
            'active': 'eq.true',
            'price':  'gte.2000',
        }
    )
    r.raise_for_status()
    batch = r.json()
    if not batch:
        break

    for doc in batch:
        total_gte20 += 1
        desc    = doc.get('description')    or ''
        desc_fr = doc.get('description_fr') or ''
        if 'Table of Contents:' in desc or 'Table des matières' in desc_fr:
            already_toc += 1
        else:
            needs_toc += 1

    offset += len(batch)
    if len(batch) < PAGE:
        break

print(f'  Total docs actifs ≥$20          : {total_gte20}')
print(f'  Déjà avec TOC                   : {already_toc}')
print(f'  Sans TOC — à traiter            : {needs_toc}')

# ── PARTIE 2 : Échantillon local ─────────────────────────────────
print(f'\n{"="*60}')
print(f'  PARTIE 2 — ÉCHANTILLON {SAMPLE_SIZE} PDFs LOCAUX')
print(f'  (estimation ratio texte / image-only)')
print(f'{"="*60}\n')

all_pdfs = list(DOCS_BASE.rglob('*.pdf'))
print(f'  PDFs trouvés dans DOCS EN LIGNE : {len(all_pdfs)}')

random.seed(42)
sample = random.sample(all_pdfs, min(SAMPLE_SIZE, len(all_pdfs)))

text_with_toc  = 0   # TOC détectée en texte pur → gratuit
text_no_toc    = 0   # couche texte présente mais pas de TOC détectée
image_only     = 0   # aucune couche texte → Vision nécessaire
errors_scan    = 0

for i, pdf_path in enumerate(sample):
    if i % 50 == 0 and i > 0:
        print(f'  ... {i}/{len(sample)}')
    try:
        doc = fitz.open(str(pdf_path))
        found_text = False
        found_toc  = False

        for page_idx in range(min(15, len(doc))):
            txt = doc[page_idx].get_text().strip()
            if len(txt) > 80:
                found_text = True
                txt_low = txt.lower()
                if any(kw in txt_low for kw in TOC_KEYWORDS):
                    nums = re.findall(r'\d+\s*$', txt, re.MULTILINE)
                    if len(nums) >= 3:
                        found_toc = True
                        break

        doc.close()

        if found_toc:
            text_with_toc += 1
        elif found_text:
            text_no_toc += 1
        else:
            image_only += 1

    except Exception as e:
        errors_scan += 1

n_valid = len(sample) - errors_scan
pct_toc_text  = text_with_toc / n_valid * 100 if n_valid else 0
pct_text_only = text_no_toc   / n_valid * 100 if n_valid else 0
pct_image     = image_only    / n_valid * 100 if n_valid else 0

print(f'\n  Résultats ({n_valid} PDFs valides) :')
print(f'  → TOC extractible en texte      : {text_with_toc} ({pct_toc_text:.0f}%)')
print(f'  → Texte présent, pas de TOC     : {text_no_toc} ({pct_text_only:.0f}%)')
print(f'  → Image-only (Vision requis)    : {image_only} ({pct_image:.0f}%)')
print(f'  → Erreurs scan                  : {errors_scan}')

# ── Estimation finale ────────────────────────────────────────────
print(f'\n{"="*60}')
print(f'  ESTIMATION FINALE')
print(f'{"="*60}')

if n_valid > 0:
    ratio_image = image_only / n_valid
    est_vision  = int(needs_toc * ratio_image)
    est_free    = needs_toc - est_vision
    # Haiku Vision ~$0.007/appel (image 120 DPI + prompt + réponse)
    est_cost    = est_vision * 0.007

    print(f'\n  Docs sans TOC à traiter         : {needs_toc}')
    print(f'  → Extractibles en texte (gratuit): ~{est_free}')
    print(f'  → Image-only → Vision           : ~{est_vision}')
    print(f'  Coût Vision estimé (~$0.007/doc) : ~${est_cost:.2f}')
    print(f'  Budget disponible               : $3.00')

    if est_cost <= 3.00:
        print(f'  ✓ Budget suffisant')
    else:
        remaining_calls = int(3.00 / 0.007)
        print(f'  ⚠ Budget insuffisant')
        print(f'    Max avec $3 : {remaining_calls} appels Vision')
        print(f'    → Traiter texte en priorité, Vision limité aux {remaining_calls} premiers image-only')

print(f'\n{"="*60}\n')
