"""
cincinnati-update-toc.py
Extrait, nettoie et insère les tables des matières dans les descriptions DB
des documents Cincinnati >= $20
"""
import os, re, json
from pathlib import Path
import fitz  # PyMuPDF

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

import requests

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}',
           'Content-Type': 'application/json', 'Prefer': 'return=minimal'}

class FakeDB:
    def from_(self, table):
        return FakeTable(table)

class FakeTable:
    def __init__(self, table): self.table = table; self._filters = {}; self._sel = '*'
    def select(self, cols): self._sel = cols; return self
    def update(self, data): self._data = data; return self
    def eq(self, col, val): self._filters[col] = val; return self
    def maybe_single(self): return self
    def execute(self):
        if hasattr(self, '_data'):
            # UPDATE
            params = '&'.join(f'{k}=eq.{v}' for k,v in self._filters.items())
            r = requests.patch(f'{SUPABASE_URL}/rest/v1/{self.table}?{params}',
                               headers=HEADERS, json=self._data)
            r.raise_for_status()
            return type('R', (), {'data': True})()
        else:
            # SELECT
            params = '&'.join(f'{k}=eq.{v}' for k,v in self._filters.items())
            r = requests.get(f'{SUPABASE_URL}/rest/v1/{self.table}?select={self._sel}&{params}',
                             headers={**HEADERS, 'Accept': 'application/vnd.pgrst.object+json'})
            if r.status_code == 406: return type('R', (), {'data': None})()
            r.raise_for_status()
            return type('R', (), {'data': r.json()})()

supabase = FakeDB()

DRY_RUN = '--dry-run' in __import__('sys').argv
DOCS_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Machines-Outils\CINCINNATI')
TOC_KEYWORDS = ['contents', 'table of contents', 'index', 'sommaire']

# Mapping fichier → slug DB
FILE_SLUG = {
    'A_Treatise_On_Milling_And_Milling_Machines $25.pdf':
        'cincinnati-a-treatise-on-milling-and-milling-machines',
    'Cincinnati_2-3-4-Mills_-Op $20.pdf':
        'cincinnati-cincinnati-nos-2-3-and-4-dial-type-milling-machines-model-er-operator-s-instruction-book',
    'Cincinnati_2-3-4-Parts-1953 $30.pdf':
        'cincinnati-cincinnati-milacron-2-3-4-parts-and-service-manual',
    'Cincinnati_DialType-Mil $20.pdf':
        'cincinnati-cincinnati-dial-type-milling-machines-operator-instruction-book-model-415-16-vertedt',
    # Cincinnati_no-2-cutter-and-tool-grinder : OCR trop bruité, exclu
}


def find_toc_text(doc, max_pages=25):
    """Cherche la page TOC dans les max_pages premières pages."""
    for i in range(min(max_pages, len(doc))):
        text = doc[i].get_text().strip()
        text_low = text.lower()
        # Doit contenir un mot-clé ET avoir des numéros de page (chiffres en fin de ligne)
        has_kw = any(kw in text_low for kw in TOC_KEYWORDS)
        has_pages = len(re.findall(r'\d+\s*$', text, re.MULTILINE)) >= 3
        if has_kw and has_pages:
            return i + 1, text
    return None, None


def clean_toc_lines(raw_text):
    """Nettoie le texte OCR d'un TOC et retourne une liste de lignes propres."""
    lines = raw_text.splitlines()
    result = []
    skip_words = {'page', 'contents', 'table of contents', 'index', 'sommaire',
                  'the cincinnati milling machine company', 'table  of  contents',
                  'd  tool  grinder', 'chapter', 'i', 'ii', 'iii', 'iv', 'v',
                  'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'}
    pending_chapter = None  # Pour fusionner "CHAPTER" + numéro + titre

    for line in lines:
        line = line.strip()
        if not line:
            if pending_chapter:
                result.append(pending_chapter)
                pending_chapter = None
            continue

        # Nettoyer espaces multiples dans les mots (bruit OCR)
        line = re.sub(r'\s{2,}', ' ', line)
        # Supprimer points de suite (....)
        line = re.sub(r'\.{2,}', '', line).strip()
        # Supprimer tirets de type "32_33" → garder le texte avant
        line = re.sub(r'_\d+', '', line).strip()
        # Ignorer lignes trop courtes ou purement numériques
        if len(line) < 4:
            continue
        if re.fullmatch(r'[\d\s,\-\.;•\*]+', line):
            continue
        # Ignorer références de page seules (ex: "23-29•", "9-15")
        if re.fullmatch(r'\d+[-–]\d+[•\.]?', line):
            continue

        line_low = line.lower()

        # Détecter "CHAPTER [roman/num]" → commencer accumulation
        if re.match(r'^chapter\s*$', line_low, re.I):
            if pending_chapter:
                result.append(pending_chapter)
            pending_chapter = 'Chapter'
            continue
        if re.match(r'^chapter\s+[ivxlcdm\d]+\s*$', line_low, re.I):
            chap_num = line.split()[-1].upper()
            if pending_chapter:
                result.append(pending_chapter)
            pending_chapter = f'Chapter {chap_num}'
            continue

        # Si on accumule un chapitre : ajouter le titre à la ligne en cours
        if pending_chapter:
            if line_low not in skip_words:
                pending_chapter = f'{pending_chapter} — {line}'
                result.append(pending_chapter)
            pending_chapter = None
            continue

        # Ignorer les en-têtes isolés
        if line_low in skip_words:
            continue

        # Détecter lignes OCR trop bruitées (> 20% de caractères spéciaux non-alpha)
        alpha = sum(1 for c in line if c.isalpha())
        noise = sum(1 for c in line if c in '^[];}{|\\~`@#$%&*')
        if noise > 1 or (alpha > 0 and noise / len(line) > 0.1):
            continue  # Trop bruité

        # Ignorer les lignes trop courtes après nettoyage
        if len(line) < 4:
            continue

        result.append(line)

    if pending_chapter:
        result.append(pending_chapter)

    return result


def format_toc_en(lines):
    """Formate le TOC pour description_en."""
    items = '\n'.join(f'- {l}' for l in lines)
    return f'\n\nTable of Contents:\n{items}'


def format_toc_fr(lines):
    """Formate le TOC pour description_fr."""
    items = '\n'.join(f'- {l}' for l in lines)
    return f'\n\nTable des matières :\n{items}'


print(f'\n{"="*70}')
print(f'  CINCINNATI — MISE A JOUR TOC EN DB{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"="*70}\n')

ok = 0
skipped = 0
errors = 0

for fname, slug in FILE_SLUG.items():
    pdf_path = DOCS_DIR / fname
    print(f'\n{"─"*70}')
    print(f'  {fname}')
    print(f'  slug: {slug}')

    if not pdf_path.exists():
        print(f'  ✗ Fichier introuvable')
        errors += 1
        continue

    # Extraire TOC
    try:
        doc = fitz.open(str(pdf_path))
        page_num, raw_text = find_toc_text(doc, max_pages=25)
        doc.close()
    except Exception as e:
        print(f'  ✗ Erreur lecture PDF: {e}')
        errors += 1
        continue

    if not page_num:
        print(f'  ⚠ Aucun TOC trouvé — ignoré')
        skipped += 1
        continue

    print(f'  ✓ TOC trouvée page {page_num}')
    toc_lines = clean_toc_lines(raw_text)
    print(f'  {len(toc_lines)} lignes extraites')
    for l in toc_lines[:10]:
        print(f'    • {l}')
    if len(toc_lines) > 10:
        print(f'    ... ({len(toc_lines)-10} de plus)')

    # Récupérer descriptions actuelles
    result = supabase.from_('documents').select('description,description_fr').eq('slug', slug).maybe_single().execute()
    if not result.data:
        print(f'  ✗ Slug introuvable en DB')
        errors += 1
        continue

    desc_en = result.data.get('description') or ''
    desc_fr = result.data.get('description_fr') or ''

    # Vérifier si TOC déjà présente
    if 'Table of Contents:' in desc_en or 'Table des matières' in desc_fr:
        print(f'  ○ TOC déjà présente — ignoré')
        skipped += 1
        continue

    new_desc_en = desc_en + format_toc_en(toc_lines)
    new_desc_fr = desc_fr + format_toc_fr(toc_lines)

    if DRY_RUN:
        print(f'  [DRY] Mise à jour OK')
        ok += 1
        continue

    upd = supabase.from_('documents').update({
        'description': new_desc_en,
        'description_fr': new_desc_fr,
    }).eq('slug', slug).execute()

    print(f'  ✓ DB mise à jour')
    ok += 1

print(f'\n{"="*70}')
print(f'  BILAN: {ok} mis à jour | {skipped} ignorés | {errors} erreurs')
print(f'{"="*70}\n')
