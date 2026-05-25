"""
Retire les faux blocs TOC inseres par erreur sur 2 docs Cincinnati.
"""
import os
from pathlib import Path
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

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

SLUGS = [
    'cincinnati-cincinnati-nos-3-4-5-6-high-power-dual-power-dial-type-milling-machines-operator-instruction-book',
    'cincinnati-cincinnati-milling-machine-cutting-gear-teeth',
]

def strip_toc_block(text):
    for marker in ['\n\nTable of Contents:', '\n\nTable des matières :']:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx].rstrip()
    return text

for slug in SLUGS:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{slug}',
        headers={**HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
    )
    row = r.json()
    desc_en = strip_toc_block(row.get('description') or '')
    desc_fr = strip_toc_block(row.get('description_fr') or '')
    requests.patch(
        f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{slug}',
        headers=HEADERS,
        json={'description': desc_en, 'description_fr': desc_fr}
    ).raise_for_status()
    print(f'  ✓ TOC retirée : {slug}')
