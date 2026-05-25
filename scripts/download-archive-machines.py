"""
download-archive-machines.py
=============================
Aspiration PDFs depuis archive.org (API officielle, gratuite, sans Tor nécessaire).
Cible : machines-outils, menuiserie, automobile/moto/bateaux/avions.

Sortie : D:\MACHINES\{MARQUE}\{fichier}.pdf

Anti-doublons (2 niveaux) :
  1. Fichier déjà présent dans DOCS EN LIGNE\Machines-Outils\{marque}\
  2. Fichier déjà présent dans D:\MACHINES\{marque}\
  3. Identifiant archive.org déjà traité (fichier d'état JSON)

Reprise automatique : scripts/download-archive-machines-state.json

Usage :
    python scripts/download-archive-machines.py

STRATÉGIE DE RECHERCHE :
  - Recherche large par nom de marque (sans exiger "service manual" dans le titre)
  - Filtre APRÈS récupération : par nom de fichier PDF et taille
  - Les manuels sur archive.org ont rarement "service manual" dans leur titre
    (ex: "LUREM C210B" suffit → le fichier s'appelle "lurem_c210b_service.pdf")
"""

import os, json, time, random, requests
from urllib.parse import quote

# ── Configuration ─────────────────────────────────────────────────────────────

OUTPUT_ROOT    = r"D:\MACHINES"
DOCS_EN_LIGNE  = r"C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Machines-Outils"
STATE_FILE     = r"C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\download-archive-machines-state.json"

MIN_FILE_SIZE  = 1_000_000    # 1 MB minimum — filtre les scans de mauvaise qualité
MAX_FILE_SIZE  = 500_000_000  # 500 MB maximum
ROWS_PER_PAGE  = 100
MAX_RESULTS    = 1000         # max résultats par requête de marque
DELAY_API      = (1, 3)       # délai entre appels API (secondes)
DELAY_DL       = (2, 5)       # délai entre téléchargements

# ── Mots-clés exclus dans le NOM DE FICHIER ──────────────────────────────────
# (le titre de l'item archive.org n'est pas fiable — on filtre sur le filename)
EXCLUDED_IN_FILENAME = [
    "brochure", "catalog", "catalogue", "advertisement", "flyer",
    "prospectus", "price_list", "pricelist", "sales",
]

# ── Mots-clés préférés dans le nom de fichier (bonus, pas obligatoire) ────────
PREFERRED_IN_FILENAME = [
    "service", "repair", "workshop", "parts", "operator", "maintenance",
    "overhaul", "manual", "handbuch", "betrieb", "ersatz",
    "manuel", "schema", "wiring", "illustrated",
]

# ── Marques — Format : ("DOSSIER", ["termes de recherche"]) ──────────────────
# Recherche LARGE : juste le nom de marque, sans filtrer sur "service manual"
BRANDS = [
    # ── Priorité absolue ──────────────────────────────────────────────────────
    ("LUREM",            ["LUREM"]),

    # ── Machines-outils métal ─────────────────────────────────────────────────
    ("ACIERA",           ["ACIERA"]),
    ("BRIDGEPORT",       ["Bridgeport milling machine"]),
    ("CAZENEUVE",        ["CAZENEUVE lathe", "Cazeneuve tour"]),
    ("CINCINNATI",       ["Cincinnati milling", "Cincinnati lathe", "Cincinnati grinder"]),
    ("CLAUSING",         ["Clausing lathe", "Clausing mill"]),
    ("COLCHESTER",       ["Colchester lathe"]),
    ("DECKEL",           ["Deckel FP", "Deckel milling"]),
    ("EMCO",             ["EMCO Maximat", "EMCO lathe"]),
    ("ERNAULT",          ["Ernault lathe", "Ernault Somua"]),
    ("GAMBIN",           ["Gambin milling", "Gambin fraiseuse"]),
    ("HARDINGE",         ["Hardinge lathe", "Hardinge HLVH"]),
    ("HARRISON",         ["Harrison lathe", "Harrison M300"]),
    ("HENDEY",           ["Hendey lathe"]),
    ("HERMLE",           ["Hermle milling"]),
    ("LEBLOND",          ["LeBlond lathe", "Le Blond lathe"]),
    ("LODGE-SHIPLEY",    ["Lodge Shipley lathe"]),
    ("MAHO",             ["MAHO milling", "MAHO MH400"]),
    ("MONARCH",          ["Monarch lathe", "Monarch 10EE"]),
    ("MYFORD",           ["Myford lathe", "Myford ML7", "Myford Super 7"]),
    ("NARDINI",          ["Nardini lathe"]),
    ("OKUMA",            ["Okuma lathe", "Okuma mill"]),
    ("SCHAUBLIN",        ["Schaublin lathe", "Schaublin mill"]),
    ("SOUTH-BEND",       ["South Bend lathe"]),
    ("TOS",              ["TOS lathe", "TOS SN320", "TOS SN400"]),
    ("VICTOR",           ["Victor lathe"]),
    ("WEILER",           ["Weiler lathe", "Weiler Praktikant"]),
    ("WORCESTER",        ["Worcester lathe"]),
    ("DENBIGH",          ["Denbigh lathe"]),
    ("BOXFORD",          ["Boxford lathe"]),
    ("DEAN-SMITH-GRACE", ["Dean Smith Grace lathe"]),
    ("VICKERS",          ["Vickers lathe"]),
    ("SIDNEY",           ["Sidney lathe"]),
    ("AMERICAN-PACEMAKER",["American Pacemaker lathe"]),
    ("MAZAK",            ["Mazak lathe", "Yamazaki Mazak"]),
    ("TIGER",            ["Tiger lathe"]),
    ("TOOL-ROOM",        ["toolroom lathe"]),

    # ── Machines à bois / menuiserie / ébénisterie ───────────────────────────
    ("CASADEI",          ["Casadei woodworking"]),
    ("COMEVA",           ["Comeva woodworking"]),
    ("DELTA",            ["Delta woodworking machinery", "Delta Rockwell saw", "Delta Rockwell drill"]),
    ("DOMINION",         ["Dominion woodworking"]),
    ("FELDER",           ["Felder woodworking"]),
    ("INVICTA",          ["Invicta woodworking"]),
    ("JET",              ["JET woodworking", "JET machinery"]),
    ("MINIMAX",          ["Minimax woodworking", "SCM Minimax"]),
    ("POWERMATIC",       ["Powermatic woodworking", "Powermatic bandsaw"]),
    ("ROBLAND",          ["Robland woodworking"]),
    ("SCM",              ["SCM woodworking"]),
    ("SEDGWICK",         ["Sedgwick woodworking"]),
    ("STARTRITE",        ["Startrite bandsaw", "Startrite woodworking"]),
    ("WEINIG",           ["Weinig moulder", "Weinig Unimat"]),
    ("ROCKWELL",         ["Rockwell woodworking", "Rockwell saw"]),
    ("OLIVER",           ["Oliver woodworking", "Oliver saw"]),
    ("EKSTROM-CARLSON",  ["Ekstrom Carlson"]),
    ("WHITNEY",          ["Whitney woodworking", "Whitney Bros"]),

    # ── Automobile ───────────────────────────────────────────────────────────
    ("ALFA-ROMEO",       ["Alfa Romeo service manual", "Alfa Romeo repair manual"]),
    ("ASTON-MARTIN",     ["Aston Martin service manual"]),
    ("BMW",              ["BMW service manual", "BMW repair manual"]),
    ("CITROEN",          ["Citroen service manual", "Citroen repair manual"]),
    ("FERRARI",          ["Ferrari service manual", "Ferrari workshop manual"]),
    ("FIAT",             ["Fiat service manual", "Fiat repair manual"]),
    ("FORD",             ["Ford service manual", "Ford repair manual"]),
    ("JAGUAR",           ["Jaguar service manual", "Jaguar repair manual"]),
    ("LAMBORGHINI",      ["Lamborghini service manual"]),
    ("LANCIA",           ["Lancia service manual"]),
    ("MASERATI",         ["Maserati service manual", "Maserati workshop"]),
    ("MERCEDES-BENZ",    ["Mercedes-Benz service manual", "Mercedes workshop manual"]),
    ("PEUGEOT",          ["Peugeot service manual", "Peugeot repair manual"]),
    ("PORSCHE",          ["Porsche service manual", "Porsche workshop"]),
    ("RENAULT",          ["Renault service manual", "Renault repair manual"]),
    ("ROLLS-ROYCE-AUTO", ["Rolls-Royce automobile service", "Rolls Royce workshop manual"]),
    ("TOYOTA",           ["Toyota service manual", "Toyota repair manual"]),
    ("VOLKSWAGEN",       ["Volkswagen service manual", "VW repair manual"]),
    ("VOLVO-AUTO",       ["Volvo service manual", "Volvo repair manual"]),
    ("TRIUMPH-AUTO",     ["Triumph automobile service manual"]),
    ("MG",               ["MG service manual", "MG workshop manual"]),
    ("AUSTIN",           ["Austin service manual", "Austin workshop"]),
    ("MORRIS",           ["Morris service manual", "Morris Minor workshop"]),
    ("LAND-ROVER",       ["Land Rover service manual", "Land Rover workshop"]),
    ("SUNBEAM",          ["Sunbeam service manual"]),
    ("HILLMAN",          ["Hillman service manual"]),
    ("SAAB",             ["Saab service manual", "Saab repair manual"]),

    # ── Moto ─────────────────────────────────────────────────────────────────
    ("BMW-MOTO",         ["BMW motorcycle service manual", "BMW R series service"]),
    ("BSA",              ["BSA motorcycle service manual", "BSA workshop manual"]),
    ("DUCATI",           ["Ducati service manual", "Ducati workshop manual"]),
    ("HARLEY-DAVIDSON",  ["Harley-Davidson service manual", "Harley Davidson workshop"]),
    ("HONDA-MOTO",       ["Honda motorcycle service manual", "Honda CB service"]),
    ("KAWASAKI",         ["Kawasaki motorcycle service manual"]),
    ("MOTO-GUZZI",       ["Moto Guzzi service manual"]),
    ("NORTON",           ["Norton motorcycle service manual", "Norton Commando workshop"]),
    ("ROYAL-ENFIELD",    ["Royal Enfield service manual"]),
    ("SUZUKI-MOTO",      ["Suzuki motorcycle service manual"]),
    ("TRIUMPH-MOTO",     ["Triumph motorcycle service manual", "Triumph Bonneville workshop"]),
    ("VELOCETTE",        ["Velocette service manual"]),
    ("VINCENT",          ["Vincent HRD service manual"]),
    ("YAMAHA-MOTO",      ["Yamaha motorcycle service manual"]),
    ("ZUNDAPP",          ["Zundapp service manual"]),

    # ── Quad / ATV ───────────────────────────────────────────────────────────
    ("ARCTIC-CAT",       ["Arctic Cat ATV service manual", "Arctic Cat snowmobile service manual"]),
    ("CAN-AM",           ["Can-Am ATV service manual"]),
    ("POLARIS",          ["Polaris ATV service manual", "Polaris snowmobile service manual"]),
    ("SKI-DOO",          ["Ski-Doo service manual", "Ski-Doo snowmobile"]),
    ("YAMAHA-ATV",       ["Yamaha ATV service manual"]),

    # ── Marine / Hors-bord ───────────────────────────────────────────────────
    ("EVINRUDE",         ["Evinrude outboard service manual"]),
    ("JOHNSON-MARINE",   ["Johnson outboard service manual"]),
    ("MERCURY-MARINE",   ["Mercury Marine service manual", "Mercury outboard"]),
    ("VOLVO-PENTA",      ["Volvo Penta service manual"]),
    ("YAMAHA-MARINE",    ["Yamaha outboard service manual"]),
    ("OMC",              ["OMC outboard service manual"]),
    ("CHRYSLER-MARINE",  ["Chrysler outboard service manual"]),

    # ── Aviation ─────────────────────────────────────────────────────────────
    ("CESSNA",           ["Cessna service manual", "Cessna maintenance manual"]),
    ("LYCOMING",         ["Lycoming engine overhaul", "Lycoming O-320", "Lycoming O-360"]),
    ("CONTINENTAL",      ["Continental aircraft engine overhaul"]),
    ("PIPER",            ["Piper aircraft service manual", "Piper Cherokee service"]),
    ("ROBINSON",         ["Robinson helicopter service manual", "Robinson R22"]),
    ("BEECHCRAFT",       ["Beechcraft service manual", "Beechcraft Bonanza"]),
    ("BELL-HELICOPTER",  ["Bell helicopter service manual", "Bell 47 maintenance"]),
]

# ── Requêtes génériques par type (pour les marques non listées) ───────────────
# Format : ("DOSSIER_SORTIE", "requête archive.org")
GENERIC_QUERIES = [
    ("_MACHINES-METAL",   'subject:"machine tools" mediatype:texts'),
    ("_MACHINES-METAL",   'subject:"lathes" mediatype:texts'),
    ("_MACHINES-METAL",   'subject:"milling machines" mediatype:texts'),
    ("_MACHINES-METAL",   'subject:"grinding machines" mediatype:texts'),
    ("_MACHINES-METAL",   'subject:"drill press" mediatype:texts'),
    ("_MACHINES-BOIS",    'subject:"woodworking machinery" mediatype:texts'),
    ("_MACHINES-BOIS",    'subject:"woodworking tools" mediatype:texts'),
    ("_QUAD",             'subject:"all terrain vehicles" mediatype:texts'),
    ("_BATEAU",           'subject:"outboard motors" mediatype:texts'),
    ("_BATEAU",           'subject:"marine engines" mediatype:texts'),
    ("_AVIATION",         'subject:"aircraft engines" mediatype:texts'),
    ("_AVIATION",         'subject:"helicopters" AND title:"maintenance" mediatype:texts'),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

# Mots génériques à ignorer lors de la comparaison anti-doublon
DEDUP_STRIP_WORDS = {
    "service", "manual", "manuals", "parts", "part", "operator", "operators",
    "repair", "workshop", "maintenance", "overhaul", "illustrated", "handbook",
    "guide", "instruction", "instructions", "supplement", "supplementary",
    "manuel", "handbuch", "betriebsanleitung", "ersatzteilliste",
    "manuale", "schema", "wiring", "diagram", "list", "book",
    "the", "and", "for", "de", "du", "des", "le", "la", "les",
    "vol", "volume", "edition", "ed", "rev", "revision",
}

def normalize_for_dedup(filename):
    """
    Normalise un nom de fichier pour comparaison anti-doublon.
    Résultat : mots-clés du modèle uniquement (sans mots génériques ni séparateurs).
    Ex : "Lurem_Optimake_Service_Manual.pdf" → "lurem optimake"
         "lurem-optimake.pdf"               → "lurem optimake"
    """
    name = os.path.splitext(filename)[0]                        # retire .pdf
    name = name.lower()
    name = name.replace('_', ' ').replace('-', ' ').replace('.', ' ')
    words = [w for w in name.split()
             if w not in DEDUP_STRIP_WORDS and len(w) > 2]
    return ' '.join(words)

def build_existing_index(brand_folder):
    """
    Construit l'index des fichiers existants (normalisés) pour une marque.
    Scanne DOCS EN LIGNE et D:\MACHINES.
    """
    index = set()
    for root_dir in [
        os.path.join(DOCS_EN_LIGNE, brand_folder),
        os.path.join(OUTPUT_ROOT, brand_folder),
    ]:
        if os.path.exists(root_dir):
            for f in os.listdir(root_dir):
                if f.lower().endswith('.pdf'):
                    index.add(normalize_for_dedup(f))
    return index

def is_duplicate(filename, existing_index):
    """
    Vérifie si le fichier est un doublon par comparaison de noms normalisés.
    Détecte les doublons même si le nom de fichier diffère légèrement.
    Ex : "Lurem_Optimake_Service_Manual.pdf" == "lurem-optimake.pdf" → DOUBLON
    """
    new_norm = normalize_for_dedup(filename)
    if not new_norm:
        return False
    for existing_norm in existing_index:
        # Doublon si l'un contient l'autre (substring bidirectionnel)
        if new_norm in existing_norm or existing_norm in new_norm:
            return True
    return False

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {"done_ids": [], "done_brands": []}

def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def is_excluded_filename(filename):
    """Exclut les brochures/catalogues détectés dans le nom de fichier."""
    fn = filename.lower()
    return any(kw in fn for kw in EXCLUDED_IN_FILENAME)

def score_filename(filename):
    """Score de pertinence : plus c'est élevé, plus c'est un vrai manuel."""
    fn = filename.lower()
    return sum(1 for kw in PREFERRED_IN_FILENAME if kw in fn)

def search_archive(query, start=0):
    """Requête API archive.org — retourne (docs, total)."""
    url = "https://archive.org/advancedsearch.php"
    params = {
        "q":       query,
        "fl[]":    ["identifier", "title", "subject", "creator"],
        "sort[]":  "downloads desc",
        "rows":    ROWS_PER_PAGE,
        "start":   start,
        "output":  "json",
    }
    try:
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        resp = r.json().get("response", {})
        return resp.get("docs", []), resp.get("numFound", 0)
    except Exception as e:
        print(f"  ⚠ Erreur API : {e}")
        return [], 0

def get_pdf_files(identifier):
    """Récupère les fichiers PDF d'un item, filtrés par taille."""
    url = f"https://archive.org/metadata/{identifier}/files"
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        files = r.json().get("result", [])
        pdfs = []
        for f in files:
            name = f.get("name", "")
            size = int(f.get("size", 0))
            if (name.lower().endswith(".pdf")
                    and MIN_FILE_SIZE <= size <= MAX_FILE_SIZE
                    and not is_excluded_filename(name)):
                pdfs.append(f)
        # Trier par pertinence du nom de fichier
        pdfs.sort(key=lambda f: score_filename(f["name"]), reverse=True)
        return pdfs
    except Exception as e:
        print(f"  ⚠ Erreur metadata {identifier} : {e}")
        return []

def download_pdf(identifier, filename, dest_path):
    """Télécharge un PDF depuis archive.org."""
    url = f"https://archive.org/download/{identifier}/{quote(filename)}"
    try:
        r = requests.get(url, timeout=180, stream=True)
        r.raise_for_status()
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
        size_mb = os.path.getsize(dest_path) / 1_000_000
        print(f"  ✓ {filename} ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"  ✗ Erreur téléchargement {filename} : {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False

def process_items(items, brand_folder, state, existing_index):
    """Filtre, vérifie doublons, télécharge les PDFs d'une liste d'items."""
    downloaded = 0
    for item in items:
        identifier = item.get("identifier", "")
        title      = item.get("title", "")[:60]

        if identifier in state["done_ids"]:
            continue

        time.sleep(random.uniform(*DELAY_API))
        pdfs = get_pdf_files(identifier)

        if not pdfs:
            state["done_ids"].append(identifier)
            continue

        for pdf in pdfs:
            filename = pdf["name"]
            size_mb  = int(pdf.get("size", 0)) / 1_000_000

            # Anti-doublon par nom normalisé (insensible aux variations de nommage)
            if is_duplicate(filename, existing_index):
                print(f"  ⏭ Doublon : {filename}")
                continue

            dest_path = os.path.join(OUTPUT_ROOT, brand_folder, filename)
            if os.path.exists(dest_path):
                continue

            print(f"  ↓ [{title}] {filename} ({size_mb:.1f} MB)")
            if download_pdf(identifier, filename, dest_path):
                downloaded += 1
                # Ajouter au cache local pour éviter doublon dans la même session
                existing_index.add(normalize_for_dedup(filename))
            time.sleep(random.uniform(*DELAY_DL))

        state["done_ids"].append(identifier)
        save_state(state)

    return downloaded

# ── Main ──────────────────────────────────────────────────────────────────────

print("=" * 60)
print("Aspiration archive.org — Machines & Véhicules")
print("=" * 60)

os.makedirs(OUTPUT_ROOT, exist_ok=True)
state = load_state()
total_downloaded = 0

# ── Phase 1 : Marques ─────────────────────────────────────────────────────────
print("\n── PHASE 1 : Recherche par marque ───────────────────────────\n")

for brand_folder, search_terms in BRANDS:
    if brand_folder in state.get("done_brands", []):
        print(f"[SKIP] {brand_folder}")
        continue

    print(f"\n{'─' * 50}")
    print(f"Marque : {brand_folder}")
    brand_dl = 0

    # Construire l'index des fichiers existants pour cette marque
    existing_index = build_existing_index(brand_folder)
    print(f"  Index existants : {len(existing_index)} fichier(s) déjà présent(s)")

    for term in search_terms:
        query = f'"{term}" AND mediatype:texts'

        start = 0
        while True:
            print(f"  Recherche : {term} (résultats {start}–{start+ROWS_PER_PAGE})")
            items, total = search_archive(query, start)
            if not items:
                break

            brand_dl += process_items(items, brand_folder, state, existing_index)

            start += ROWS_PER_PAGE
            if start >= min(total, MAX_RESULTS):
                break
            time.sleep(random.uniform(*DELAY_API))

    state.setdefault("done_brands", []).append(brand_folder)
    save_state(state)
    total_downloaded += brand_dl
    print(f"  → {brand_dl} téléchargé(s) pour {brand_folder}")

# ── Phase 2 : Requêtes génériques ────────────────────────────────────────────
print("\n── PHASE 2 : Types de machines (générique) ──────────────────\n")

for folder_hint, query in GENERIC_QUERIES:
    key = f"GENERIC::{folder_hint}::{query[:50]}"
    if key in state["done_ids"]:
        print(f"[SKIP] {query[:60]}")
        continue

    print(f"\n→ {folder_hint} : {query[:70]}...")
    generic_index = build_existing_index(folder_hint)
    start = 0
    while True:
        items, total = search_archive(query, start)
        if not items:
            break
        total_downloaded += process_items(items, folder_hint, state, generic_index)
        start += ROWS_PER_PAGE
        if start >= min(total, 500):
            break
        time.sleep(random.uniform(*DELAY_API))

    state["done_ids"].append(key)
    save_state(state)

# ── Résumé ────────────────────────────────────────────────────────────────────
print(f"\n{'=' * 60}")
print(f"Terminé — {total_downloaded} PDF(s) téléchargé(s)")
print(f"Dossier : {OUTPUT_ROOT}")
print(f"État    : {STATE_FILE}")
