"""
dell-phase2-previews.py — Génération de toutes les previews DELL depuis le PDF réel
=====================================================================================
- Résout les 95 PDFs manquants via base slug
- Génère page 1 de CHAQUE PDF en JPG 800px
- Sortie : scripts/temp_dell_previews/{slug}.jpg
- Ne touche PAS à Supabase (upload = phase 3)

Usage : python -X utf8 scripts/dell-phase2-previews.py
"""

import os, sys, json, re
from pathlib import Path

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

import fitz  # PyMuPDF

CORRECTIONS_FILE = SCRIPT_DIR / 'corrections-dell.json'
AUDIT_FILE       = SCRIPT_DIR / 'dell-audit-phase1.json'
OUT_DIR          = SCRIPT_DIR / 'temp_dell_previews'
DOCS_DIR         = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique\DELL')

OUT_DIR.mkdir(exist_ok=True)

def compute_base(slug):
    return re.sub(r'-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$', '', slug)

def find_local_pdf(lp):
    p = Path(lp)
    if p.exists(): return p
    cand = DOCS_DIR / p.name
    if cand.exists(): return cand
    return None

# ── Index corrections-dell.json ──────────────────────────────────────────────
with open(CORRECTIONS_FILE, encoding='utf-8') as f:
    corrections = json.load(f)

by_old  = {}
by_new  = {}
by_base = {}
for entry in corrections:
    old = entry.get('old_slug', '')
    new = entry.get('new_slug', '')
    lp  = entry.get('local_pdf', '')
    if not lp: continue
    if old:
        by_old[old] = lp
        b = compute_base(old)
        if b not in by_base: by_base[b] = lp
    if new:
        by_new[new] = lp
        b = compute_base(new)
        if b not in by_base: by_base[b] = lp

def get_pdf_path(slug):
    if slug in by_old:
        p = find_local_pdf(by_old[slug])
        if p: return p
    if slug in by_new:
        p = find_local_pdf(by_new[slug])
        if p: return p
    b = compute_base(slug)
    if b in by_base:
        p = find_local_pdf(by_base[b])
        if p: return p
    return None

# ── Charger audit phase 1 ────────────────────────────────────────────────────
with open(AUDIT_FILE, encoding='utf-8') as f:
    audit = json.load(f)

# Tous les slugs à traiter (preview_regen + no_pdf résolus)
todo = {}
for item in audit.get('preview_regen', []):
    todo[item['slug']] = item['pdf_path']

# Ajouter les no_pdf via base slug
for item in audit.get('no_pdf', []):
    slug = item['slug']
    if slug not in todo:
        pdf_path = get_pdf_path(slug)
        if pdf_path:
            todo[slug] = str(pdf_path)

print(f'\n{"═"*64}')
print(f'  DELL PHASE 2 — GÉNÉRATION PREVIEWS ({len(todo)} docs)')
print(f'{"═"*64}\n')

ok = 0
errors = []
already = 0

for i, (slug, pdf_path_str) in enumerate(todo.items(), 1):
    out_jpg = OUT_DIR / f'{slug}.jpg'

    # Skip si déjà généré (reprise)
    if out_jpg.exists():
        already += 1
        if i % 200 == 0:
            print(f'  [{i}/{len(todo)}] {ok} générés, {already} déjà OK, {len(errors)} erreurs')
        continue

    pdf_path = Path(pdf_path_str)
    if not pdf_path.exists():
        pdf_path = get_pdf_path(slug)
        if not pdf_path:
            errors.append({'slug': slug, 'reason': 'PDF introuvable'})
            continue

    try:
        doc  = fitz.open(str(pdf_path))
        page = doc[0]
        # Rendu 800px de large
        w    = page.rect.width
        zoom = 800 / w if w > 0 else 1.0
        mat  = fitz.Matrix(zoom, zoom)
        pix  = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(str(out_jpg))
        doc.close()
        ok += 1
    except Exception as e:
        errors.append({'slug': slug, 'reason': str(e)})

    if i % 200 == 0:
        print(f'  [{i}/{len(todo)}] {ok} générés, {already} déjà OK, {len(errors)} erreurs')

print(f'\n{"═"*64}')
print(f'  RÉSULTATS PHASE 2')
print(f'{"═"*64}')
print(f'  ✓ Générés  : {ok}')
print(f'  ○ Déjà OK  : {already}')
print(f'  ✗ Erreurs  : {len(errors)}')
if errors:
    for e in errors[:10]:
        print(f'    {e["slug"]} | {e["reason"][:60]}')

# Sauvegarder rapport
report = {'generated': ok, 'already': already, 'errors': errors, 'total': len(todo)}
with open(SCRIPT_DIR / 'dell-phase2-report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(f'\n  Previews dans : {OUT_DIR}')
print(f'{"═"*64}\n')
