"""
generate-smart-previews.py
==========================
Génère des previews intelligentes pour les documents ACER :
- Sélectionne la première page avec des photos (images embarquées)
- Ignore les premières pages (couverture, sécurité, sommaire)
- Upload vers Supabase Storage logos/previews/{slug}.jpg (upsert)

Usage :
    python scripts/generate-smart-previews.py [--brand ACER] [--dry-run]

Dépendances : pip install pymupdf python-dotenv requests
"""

import os
import sys
import json
import fitz  # PyMuPDF
import requests

# ── Config ────────────────────────────────────────────────────────────────────
REPORT_PATH    = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\docs-a-classer-report-informatique.json"
DOCS_EN_LIGNE  = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Informatique"
STORAGE_BUCKET = "logos"
ENV_PATH       = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\.env.local"

# Pages à ignorer en début de document (couverture, sécurité, sommaire)
SKIP_FIRST_N   = 2   # ignorer pages 0 et 1 (index), commencer à chercher à partir de page index 2
# Si aucune page image trouvée dans les N premières pages, on abandonne la recherche
MAX_SCAN_PAGES = 50
# Seuil minimum d'images pour considérer une page comme "riche"
MIN_IMAGES     = 1

# ── Args ──────────────────────────────────────────────────────────────────────
args     = sys.argv[1:]
DRY_RUN  = "--dry-run" in args
BRAND_FILTER = None
if "--brand" in args:
    idx = args.index("--brand")
    if idx + 1 < len(args):
        BRAND_FILTER = args[idx + 1].upper()

# ── Load env (lecture manuelle pour éviter les problèmes de parsing dotenv) ───
def read_env_file(path):
    """Lit un fichier .env/.env.local et retourne un dict propre."""
    env = {}
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip()
                # Retirer guillemets encadrants
                if len(val) >= 2 and val[0] in ('"', "'") and val[-1] == val[0]:
                    val = val[1:-1]
                env[key] = val
    except FileNotFoundError:
        print(f"ERREUR : fichier env introuvable : {path}")
        sys.exit(1)
    return env

env_vars    = read_env_file(ENV_PATH)
SUPABASE_URL = env_vars.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
SUPABASE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERREUR : variables NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes")
    print(f"  Clés trouvées : {list(env_vars.keys())}")
    sys.exit(1)

# Affichage masqué pour vérification
print(f"SUPABASE_URL : {SUPABASE_URL}")
print(f"SERVICE_KEY  : {SUPABASE_KEY[:20]}...{SUPABASE_KEY[-10:]}")

# ── Load report ───────────────────────────────────────────────────────────────
with open(REPORT_PATH, encoding="utf-8") as f:
    report = json.load(f)

docs = report.get("docs", [])

# Filtrer : uniquement les docs importés de la marque cible
targets = []
for doc in docs:
    if doc.get("status") != "imported":
        continue
    brand = doc.get("brand", "").upper()
    if BRAND_FILTER and brand != BRAND_FILTER:
        continue
    slug = doc.get("slug")
    original_filename = os.path.basename(doc.get("original_filename", "") or doc.get("original_path", ""))
    if not slug or not original_filename:
        continue
    # Retrouver le PDF dans DOCS EN LIGNE
    brand_folder = os.path.join(DOCS_EN_LIGNE, brand)
    pdf_path = os.path.join(brand_folder, original_filename)
    targets.append({
        "slug": slug,
        "pdf_path": pdf_path,
        "brand": brand,
        "original_filename": original_filename,
    })

print(f"Documents cibles : {len(targets)}")
if BRAND_FILTER:
    print(f"Filtre marque    : {BRAND_FILTER}")
if DRY_RUN:
    print("MODE DRY-RUN — aucun upload")
print()


def find_best_page(doc_fitz):
    """
    Trouve la première page avec des images embarquées (photos de démontage).
    Stratégie :
      1. Chercher à partir de SKIP_FIRST_N une page avec >= MIN_IMAGES images
      2. Si non trouvé dans MAX_SCAN_PAGES, revenir à la page index 1 (ou 0 si 1 seule page)
    """
    n = len(doc_fitz)

    # Cherche une page riche en images à partir de SKIP_FIRST_N
    for i in range(SKIP_FIRST_N, min(n, SKIP_FIRST_N + MAX_SCAN_PAGES)):
        page = doc_fitz[i]
        images = page.get_images(full=False)
        if len(images) >= MIN_IMAGES:
            return i, len(images)

    # Fallback : page 1 (ou 0 si doc trop court)
    fallback = min(1, n - 1)
    return fallback, 0


def generate_thumbnail(doc_fitz, page_idx, width=800):
    """Génère un JPEG 800px de large depuis la page indiquée."""
    page = doc_fitz[page_idx]
    scale = width / page.rect.width
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("jpeg")


def upload_preview(slug, jpg_bytes):
    """Upsert du JPEG dans Supabase Storage logos/previews/{slug}.jpg"""
    storage_path = f"previews/{slug}.jpg"
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }
    r = requests.post(url, headers=headers, data=jpg_bytes, timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"HTTP {r.status_code} : {r.text[:200]}")
    return storage_path


# ── Traitement ────────────────────────────────────────────────────────────────
ok = 0
errors = 0
fallbacks = 0

for i, t in enumerate(targets):
    slug      = t["slug"]
    pdf_path  = t["pdf_path"]
    brand     = t["brand"]

    if not os.path.exists(pdf_path):
        print(f"  [{i+1}/{len(targets)}] ✗ INTROUVABLE : {t['original_filename']}")
        errors += 1
        continue

    try:
        doc_fitz = fitz.open(pdf_path)
        page_idx, n_images = find_best_page(doc_fitz)

        # Indicator : fallback ou page trouvée ?
        if n_images == 0:
            marker = f"[fallback p.{page_idx+1}]"
            fallbacks += 1
        else:
            marker = f"[p.{page_idx+1}, {n_images} img]"

        if DRY_RUN:
            print(f"  [{i+1}/{len(targets)}] DRY  {marker}  {slug}")
            doc_fitz.close()
            ok += 1
            continue

        jpg_bytes = generate_thumbnail(doc_fitz, page_idx)
        doc_fitz.close()

        upload_preview(slug, jpg_bytes)
        print(f"  [{i+1}/{len(targets)}] ✓ {marker}  {slug}")
        ok += 1

    except Exception as e:
        print(f"  [{i+1}/{len(targets)}] ✗ ERREUR {slug} : {e}")
        errors += 1

print()
print(f"Terminé — {ok} OK | {fallbacks} fallback | {errors} erreurs")
