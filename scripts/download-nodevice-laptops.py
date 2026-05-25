"""
Téléchargeur PDFs — nodevice.com/service-manuals/category/laptop
- Télécharge immédiatement chaque PDF trouvé (pas d'attente de collecte globale)
- Reprend où il s'est arrêté (skip si déjà téléchargé)
- Journal des erreurs dans download-nodevice-errors.log
"""
import os, sys, time, re, random, requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")

BASE  = "https://www.nodevice.com"
DEST  = r"D:\LAPTOP"
DELAY_MIN = 2.0   # délai minimum entre requêtes (secondes)
DELAY_MAX = 5.0   # délai maximum entre requêtes (secondes)
LOG       = os.path.join(os.path.dirname(os.path.abspath(__file__)), "download-nodevice-errors.log")
STATE_FILE= os.path.join(os.path.dirname(os.path.abspath(__file__)), "download-nodevice-state.json")

BRANDS = [
    ("acer",        "ACER"),
    ("apple",       "APPLE"),
    ("asus",        "ASUS"),
    ("benq",        "BENQ"),
    ("brother",     "BROTHER"),
    ("clevo",       "CLEVO"),
    ("compal",      "COMPAL"),
    ("compaq",      "COMPAQ"),
    ("dell",        "DELL"),
    ("eurocom",     "EUROCOM"),
    ("fic",         "FIC"),
    ("fujitsu",     "FUJITSU"),
    ("gateway",     "GATEWAY"),
    ("hp",          "HP"),
    ("ibm",         "IBM"),
    ("jvc",         "JVC"),
    ("lenovo",      "LENOVO"),
    ("lg",          "LG"),
    ("mitac",       "MITAC"),
    ("msi",         "MSI"),
    ("nec",         "NEC"),
    ("packard-bell","PACKARD-BELL"),
    ("panasonic",   "PANASONIC"),
    ("samsung",     "SAMSUNG"),
    ("sharp",       "SHARP"),
    ("sony",        "SONY"),
    ("toshiba",     "TOSHIBA"),
    ("twinhead",    "TWINHEAD"),
    ("uniwill",     "UNIWILL"),
]

TOR_PROXY  = "socks5h://127.0.0.1:9150"   # port Tor Browser
TOR_CTRL   = ("127.0.0.1", 9151)           # port contrôle Tor Browser

def new_tor_identity():
    """Demande une nouvelle identité Tor (nouvelle IP)."""
    try:
        import socket
        s = socket.socket()
        s.settimeout(5)
        s.connect(TOR_CTRL)
        s.send(b'AUTHENTICATE ""\r\nSIGNAL NEWNYM\r\n')
        s.close()
        time.sleep(random.uniform(8, 12))   # laisse le circuit s'établir
        print("  🔄 Nouvelle identité Tor — IP changée")
    except Exception as e:
        print(f"  ⚠ Contrôle Tor inaccessible ({e}) — attente 60s")
        time.sleep(60)

def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Referer":         BASE,
    })
    s.proxies = {"http": TOR_PROXY, "https": TOR_PROXY}
    return s

sess = make_session()

# Test connexion Tor
try:
    test = sess.get("https://check.torproject.org/api/ip", timeout=15)
    ip = test.json().get("IP", "?")
    print(f"  ✓ Tor actif — IP de sortie : {ip}")
except Exception as e:
    print(f"  ⚠ Tor non disponible ({e}) — connexion directe utilisée")
    sess = requests.Session()
    sess.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept":          "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Referer":         BASE,
    })

def load_state():
    """Charge l'état sauvegardé."""
    if os.path.exists(STATE_FILE):
        import json
        with open(STATE_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return (set(data.get("done_brands", [])),
                set(data.get("done_urls", [])),
                set(data.get("done_models", [])),
                set(data.get("done_listing_pages", [])))
    return set(), set(), set(), set()

def save_state(done_brands, done_urls, done_models, done_listing_pages):
    """Sauvegarde l'état sur disque."""
    import json
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "done_brands":        list(done_brands),
            "done_urls":          list(done_urls),
            "done_models":        list(done_models),
            "done_listing_pages": list(done_listing_pages),
        }, f)

def log_error(msg):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def wait_if_429(r):
    """Si le serveur répond 429, change d'IP via Tor et reprend immédiatement."""
    if r.status_code == 429:
        print(f"\n  🚫 429 — Rate limit. Changement d'identité Tor...\n")
        new_tor_identity()
        return True
    return False

def get_soup(url):
    for attempt in range(3):
        try:
            r = sess.get(url, timeout=20)
            if wait_if_429(r):
                continue  # réessaye après la pause
            r.raise_for_status()
            time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
            return BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            log_error(f"ERR fetch {url}: {e}")
            return None
    return None

def href_path(a):
    href = a.get("href", "")
    return urlparse(href).path if href.startswith("http") else href

def download_pdf(manual_path, dest_dir):
    """Télécharge le PDF. Retourne 'ok' | 'skip' | 'error'."""
    parts    = manual_path.rstrip("/").split("/")
    slug     = re.sub(r'[\\/:*?"<>|]', "_", parts[-2] if len(parts) >= 2 else "doc")
    doc_id   = parts[-1]
    filename = f"{slug}_{doc_id}.pdf"
    filepath = os.path.join(dest_dir, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 2048:
        print(f"    ⏭  {filename}")
        return "skip"

    dl_url = BASE + manual_path.rstrip("/") + "/download"
    for attempt in range(3):
        try:
            r = sess.get(dl_url, timeout=60, allow_redirects=True)
            if wait_if_429(r):
                continue  # réessaye après la pause
            ct = r.headers.get("content-type", "")
            if r.content[:4] == b"%PDF" or "pdf" in ct.lower():
                with open(filepath, "wb") as f:
                    f.write(r.content)
                print(f"    ✓  {filename} ({len(r.content)//1024} KB)")
                time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
                return "ok"
            else:
                log_error(f"Non-PDF {dl_url} ct={ct[:60]}")
                print(f"    ✗  Non-PDF : {filename}")
                return "error"
        except Exception as e:
            log_error(f"ERR download {dl_url}: {e}")
            print(f"    ✗  Erreur : {e}")
            return "error"
    return "error"

def process_brand(brand_slug, brand_name, dest_dir, done_brands, done_urls, done_models, done_listing_pages):
    """
    Pour chaque page de listing :
      → visite chaque page modèle (sauf celles déjà visitées)
      → télécharge immédiatement les PDFs trouvés
    """
    brand_path = f"/service-manuals/laptop/{brand_slug}"
    re_manual  = re.compile(rf"^{re.escape(brand_path)}/[^/]+/\d+$")
    re_model   = re.compile(rf"^{re.escape(brand_path)}/[^/]+$")

    ok = skip = err = 0
    page = 1
    seen_manuals = set(done_urls)   # URLs manuels déjà traitées
    seen_models  = set(done_models) # pages modèles déjà visitées

    # Trouver la première page de listing non traitée
    while f"{brand_slug}-{page}" in done_listing_pages:
        print(f"  [page {page}] ⏭  déjà traitée — skip")
        page += 1

    while True:
        listing_key = f"{brand_slug}-{page}"
        list_url = f"{BASE}{brand_path}?page={page}"
        print(f"  [page {page}] {list_url}")
        soup = get_soup(list_url)
        if not soup:
            break

        model_paths  = []
        manual_paths = []

        for a in soup.find_all("a", href=True):
            path = href_path(a)
            if re_manual.match(path):
                manual_paths.append(path)
            elif re_model.match(path):
                model_paths.append(path)

        # Liens manuels directs sur la page listing
        for mp in manual_paths:
            if mp in seen_manuals:
                continue
            seen_manuals.add(mp)
            done_urls.add(mp)
            r = download_pdf(mp, dest_dir)
            if r == "ok": ok += 1
            elif r == "skip": skip += 1
            else: err += 1

        # Liens modèles → suivre chaque page modèle → télécharger
        for mpath in model_paths:
            if mpath in seen_models:
                continue
            seen_models.add(mpath)
            done_models.add(mpath)  # sauvegardé dans l'état

            msoup = get_soup(BASE + mpath)
            if not msoup:
                continue

            for ma in msoup.find_all("a", href=True):
                mmanual = href_path(ma)
                if re_manual.match(mmanual) and mmanual not in seen_manuals:
                    seen_manuals.add(mmanual)
                    done_urls.add(mmanual)
                    r = download_pdf(mmanual, dest_dir)
                    if r == "ok": ok += 1
                    elif r == "skip": skip += 1
                    else: err += 1
                    # Sauvegarde périodique de l'état
                    save_state(done_brands, done_urls, done_models, done_listing_pages)

        if not model_paths and not manual_paths:
            break

        # Page de listing entièrement traitée → mémoriser
        done_listing_pages.add(listing_key)
        save_state(done_brands, done_urls, done_models, done_listing_pages)

        # Page suivante ?
        has_next = (
            soup.find("a", href=re.compile(rf"[?&]page={page+1}"))
            or soup.find("a", string=re.compile(r"(next|suivant|›|»)", re.I))
        )
        if not has_next:
            break
        page += 1

    return ok, skip, err


# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
print("  TÉLÉCHARGEMENT PDFs — nodevice.com / Laptops")
print(f"{'═'*60}\n")
print(f"  Destination : {DEST}\n")

# Chargement de l'état précédent
done_brands, done_urls, done_models, done_listing_pages = load_state()
if done_brands or done_urls:
    print(f"  ↩  Reprise — {len(done_brands)} marque(s) terminée(s), "
          f"{len(done_listing_pages)} page(s) listing skippées, "
          f"{len(done_models)} page(s) modèle skippées, "
          f"{len(done_urls)} URL(s) déjà traitée(s)\n")

total_ok = total_skip = total_err = 0

for brand_slug, brand_name in BRANDS:
    dest_dir = os.path.join(DEST, brand_name)
    os.makedirs(dest_dir, exist_ok=True)

    if brand_name in done_brands:
        print(f"  ⏭  {brand_name} — déjà terminée, skippée")
        continue

    print(f"\n{'─'*60}")
    print(f"  {brand_name}")
    print(f"{'─'*60}")

    ok, skip, err = process_brand(brand_slug, brand_name, dest_dir, done_brands, done_urls, done_models, done_listing_pages)
    print(f"  → {ok} téléchargés | {skip} déjà présents | {err} erreurs")
    total_ok += ok; total_skip += skip; total_err += err

    # Marque terminée → sauvegarde immédiate
    done_brands.add(brand_name)
    save_state(done_brands, done_urls, done_models, done_listing_pages)

print(f"\n{'═'*60}")
print(f"  TOTAL : {total_ok} téléchargés | {total_skip} ignorés | {total_err} erreurs")
print(f"  Journal erreurs : {LOG}")
print(f"{'═'*60}\n")
