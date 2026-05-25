"""
ford-explorer-update-desc.py
Remplace le descriptif court par un texte vendeur,
en conservant le bloc TOC existant intact.
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

SLUG = 'ford-ford-explorer-mountaineer-workshop-manual-1996-2001'

DESC_EN = (
    "The Ford Explorer & Mountaineer 1996-2001 Workshop Manual is one of the most "
    "exhaustive factory service references ever produced for these vehicles. "
    "Spanning 5,564 pages, this official manual covers every mechanical, electrical, "
    "and body system in complete detail — including all three engine variants "
    "(4.0L OHV, 4.0L SOHC V6, and 5.0L V8), and the full range of 2WD, 4x2, "
    "4x4, and AWD drivetrain configurations. "
    "Whether you are performing routine maintenance, diagnosing a complex electrical "
    "fault, rebuilding a transmission, or overhauling an axle, this document gives you "
    "the factory specifications, torque values, step-by-step procedures, wiring diagrams, "
    "diagnostic charts, and component illustrations you need to do the job right the "
    "first time. An indispensable reference for professional mechanics and serious "
    "DIY enthusiasts alike. Covers both Ford Explorer and Mercury Mountaineer."
)

DESC_FR = (
    "Le Manuel d'atelier Ford Explorer & Mountaineer 1996-2001 est l'une des références "
    "techniques les plus exhaustives jamais produites pour ces véhicules. "
    "Fort de ses 5 564 pages, ce manuel d'atelier officiel couvre dans le détail "
    "chaque système mécanique, électrique et carrosserie — incluant les trois variantes "
    "de moteur disponibles (4,0 L OHV, 4,0 L SOHC V6 et 5,0 L V8) ainsi que "
    "l'ensemble des configurations de transmission 2RM, 4x2, 4x4 et AWD. "
    "Que vous effectuiez un entretien courant, diagnostiquiez une panne électrique "
    "complexe, révisiez une boîte de vitesses ou remettiez en état un pont arrière, "
    "ce document vous apporte les spécifications d'usine, les couples de serrage, "
    "les procédures étape par étape, les schémas électriques, les tableaux de "
    "diagnostic et les illustrations de composants nécessaires pour travailler dans "
    "les règles de l'art du premier coup. Une référence incontournable pour les "
    "mécaniciens professionnels comme pour les passionnés exigeants. "
    "Couvre à la fois le Ford Explorer et le Mercury Mountaineer."
)

TOC_MARKER_EN = '\n\nTable of Contents:'
TOC_MARKER_FR = '\n\nTable des matières :'

# Lire descriptions actuelles
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/documents?select=description,description_fr&slug=eq.{SLUG}',
    headers={**HEADERS, 'Accept': 'application/vnd.pgrst.object+json'}
)
r.raise_for_status()
row = r.json()

desc_en = row.get('description') or ''
desc_fr = row.get('description_fr') or ''

# Extraire le bloc TOC existant
toc_en = ''
idx = desc_en.find(TOC_MARKER_EN)
if idx != -1:
    toc_en = desc_en[idx:]

toc_fr = ''
idx = desc_fr.find(TOC_MARKER_FR)
if idx != -1:
    toc_fr = desc_fr[idx:]

new_desc_en = DESC_EN + toc_en
new_desc_fr = DESC_FR + toc_fr

r = requests.patch(
    f'{SUPABASE_URL}/rest/v1/documents?slug=eq.{SLUG}',
    headers=HEADERS,
    json={'description': new_desc_en, 'description_fr': new_desc_fr}
)
r.raise_for_status()

print('✓ Description mise a jour.')
print(f'  EN : {len(new_desc_en)} caracteres')
print(f'  FR : {len(new_desc_fr)} caracteres')
