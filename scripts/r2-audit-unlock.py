"""
r2-audit-unlock.py — Audit et correction des PDFs proteges dans R2
====================================================================
Pour chaque document en DB dont la marque est listee dans docs-unlock-report.json :
  1. Telecharge le PDF depuis R2 (en memoire)
  2. Verifie si protege avec pikepdf
  3. Si protege : deverrouille en memoire et re-uploade vers R2
  4. Si MDP utilisateur requis : signale (impossible sans MDP)

Aucun fichier temporaire sur disque. Tout en memoire.

Usage : python -X utf8 scripts/r2-audit-unlock.py [--dry-run]
        python -X utf8 scripts/r2-audit-unlock.py --all-brands   (toutes les marques, pas seulement celles du rapport)
"""

import os, sys, json, io
from pathlib import Path

DRY_RUN   = '--dry-run'   in sys.argv
ALL_BRANDS = '--all-brands' in sys.argv

SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

# Charger .env.local
env_file = PROJECT_DIR / '.env.local'
if env_file.exists():
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

try:
    import pikepdf
except ImportError:
    print('pikepdf non installe. Lancer : pip install pikepdf')
    sys.exit(1)

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print('boto3 non installe. Lancer : pip install boto3')
    sys.exit(1)

try:
    import requests
except ImportError:
    print('requests non installe. Lancer : pip install requests')
    sys.exit(1)

# Config R2
R2_BUCKET    = os.environ.get('R2_BUCKET_NAME', 'service-manuals-documents')
R2_ACCOUNT   = os.environ['R2_ACCOUNT_ID']
R2_ACCESS    = os.environ['R2_ACCESS_KEY_ID']
R2_SECRET    = os.environ['R2_SECRET_ACCESS_KEY']
SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{R2_ACCOUNT}.r2.cloudflarestorage.com',
    aws_access_key_id=R2_ACCESS,
    aws_secret_access_key=R2_SECRET,
    config=Config(signature_version='s3v4'),
    region_name='auto',
)

# Lire le rapport de Script A pour identifier les marques concernees
REPORT_FILE = SCRIPT_DIR / 'docs-unlock-report.json'

if not REPORT_FILE.exists() and not ALL_BRANDS:
    print(f'Rapport introuvable : {REPORT_FILE}')
    print('Lancer d\'abord : python -X utf8 scripts/scan-unlock-docs-en-ligne.py')
    print('Ou utiliser --all-brands pour auditer toutes les marques.')
    sys.exit(1)

# Identifier les marques a auditer
if ALL_BRANDS:
    brands_to_check = None  # None = toutes
    print('  Mode : toutes les marques')
else:
    with open(REPORT_FILE, encoding='utf-8') as f:
        report = json.load(f)
    brands_to_check = set(e['brand'].upper() for e in report.get('unlocked', []))
    if not brands_to_check:
        print('  Aucune marque concernee dans le rapport. R2 est propre.')
        sys.exit(0)
    print(f'  Marques concernees (depuis rapport) : {", ".join(sorted(brands_to_check))}')

# Recuperer les slugs en DB
def fetch_slugs(brand_names=None):
    """Recupere tous les slugs (+ brand name) depuis Supabase."""
    docs = []
    offset = 0
    limit  = 1000
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    }
    while True:
        params = {
            'select': 'slug,brands(name)',
            'limit':  str(limit),
            'offset': str(offset),
        }
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/documents',
            params=params, headers=headers, timeout=30
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        for d in data:
            brand_name = ''
            if d.get('brands'):
                b = d['brands']
                brand_name = b['name'] if isinstance(b, dict) else ''
            docs.append({'slug': d['slug'], 'brand': brand_name.upper()})
        if len(data) < limit:
            break
        offset += limit
    return docs

print(f'\n{"=":=<64}')
print(f'  R2 AUDIT + UNLOCK{"  [DRY-RUN]" if DRY_RUN else ""}')
print(f'{"=":=<64}\n')

print('  Recuperation des slugs depuis la DB...')
all_docs = fetch_slugs()
print(f'  -> {len(all_docs)} documents total')

# Filtrer par marques concernees
if brands_to_check is not None:
    docs_to_check = [d for d in all_docs if d['brand'] in brands_to_check]
else:
    docs_to_check = all_docs

print(f'  -> {len(docs_to_check)} documents a verifier\n')

results = {
    'unlocked':     [],
    'already_clean':[],
    'need_password':[],
    'missing_r2':   [],
    'errors':       [],
}

for i, doc in enumerate(docs_to_check, 1):
    slug  = doc['slug']
    brand = doc['brand']
    key   = f'documents/{slug}.pdf'

    try:
        # Telecharger depuis R2
        response = s3.get_object(Bucket=R2_BUCKET, Key=key)
        pdf_bytes = response['Body'].read()

    except s3.exceptions.NoSuchKey:
        results['missing_r2'].append(slug)
        print(f'  ABSENT R2 : {slug}')
        continue
    except Exception as e:
        if 'NoSuchKey' in str(e) or '404' in str(e):
            results['missing_r2'].append(slug)
        else:
            results['errors'].append({'slug': slug, 'error': str(e)})
            print(f'  ERREUR download : {slug} -- {e}')
        continue

    try:
        # Verifier avec pikepdf
        with pikepdf.open(io.BytesIO(pdf_bytes)) as pdf:
            enc = pdf.encryption
            if not enc:
                results['already_clean'].append(slug)
                continue

            # Protege (owner password) -> deverrouiller
            if DRY_RUN:
                print(f'  [DRY] Protege : {slug} ({brand})')
                results['unlocked'].append(slug)
                continue

            output = io.BytesIO()
            pdf.save(output, encryption=False)
            unlocked_bytes = output.getvalue()

        # Re-uploader vers R2
        s3.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=unlocked_bytes,
            ContentType='application/pdf',
        )
        print(f'  OK : {slug} ({brand})')
        results['unlocked'].append(slug)

    except pikepdf.PasswordError:
        print(f'  VERROU MDP : {slug} ({brand})')
        results['need_password'].append(slug)
    except Exception as e:
        print(f'  ERREUR traitement : {slug} -- {e}')
        results['errors'].append({'slug': slug, 'error': str(e)})

    if i % 50 == 0:
        print(f'  [{i}/{len(docs_to_check)}] '
              f'{len(results["unlocked"])} corriges, '
              f'{len(results["already_clean"])} propres, '
              f'{len(results["need_password"])} MDP, '
              f'{len(results["errors"])} erreurs')

print(f'\n{"=":=<64}')
print(f'  RESULTATS R2 AUDIT')
print(f'{"=":=<64}')
print(f'  OK Deverrouilles  : {len(results["unlocked"])}')
print(f'  Deja propres      : {len(results["already_clean"])}')
print(f'  MDP requis        : {len(results["need_password"])}')
print(f'  Absents R2        : {len(results["missing_r2"])}')
print(f'  Erreurs           : {len(results["errors"])}')

if results['need_password']:
    print(f'\n  -- MDP utilisateur requis (non traites) --')
    for s in results['need_password']:
        print(f'    {s}')

if results['missing_r2']:
    print(f'\n  -- Absents de R2 --')
    for s in results['missing_r2'][:20]:
        print(f'    {s}')

report_out = SCRIPT_DIR / 'r2-audit-report.json'
with open(report_out, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f'\n  Rapport : {report_out}')
print(f'{"=":=<64}\n')
