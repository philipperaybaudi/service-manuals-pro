"""
Test diagnostic — nodevice.com — JVC seulement (10 modèles)
Affiche chaque requête en temps réel pour voir ce qui bloque.
"""
import sys, time, re, requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding="utf-8")

BASE  = "https://www.nodevice.com"
DELAY = 1.5

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

def fetch(url):
    print(f"  → GET {url}", end=" ", flush=True)
    r = sess.get(url, timeout=20)
    ct = r.headers.get("content-type","")
    print(f"[{r.status_code}] {len(r.content)} bytes", flush=True)
    time.sleep(DELAY)
    # Détecte une page de protection (Cloudflare, CAPTCHA)
    if r.status_code == 403 or "captcha" in r.text.lower() or "cloudflare" in r.text.lower():
        print("  ⚠ PROTECTION DÉTECTÉE (CAPTCHA/Cloudflare)")
        return None
    return BeautifulSoup(r.text, "html.parser")

def href_path(a):
    href = a.get("href","")
    return urlparse(href).path if href.startswith("http") else href

# ── Étape 1 : page de listing JVC ────────────────────────────────────────────
print("\n═══ TEST NODEVICE — JVC ═══\n")
brand_slug = "jvc"
brand_path = f"/service-manuals/laptop/{brand_slug}"
re_manual  = re.compile(rf"^{re.escape(brand_path)}/[^/]+/\d+$")
re_model   = re.compile(rf"^{re.escape(brand_path)}/[^/]+$")

print("1. Page listing JVC")
soup = fetch(f"{BASE}{brand_path}")
if not soup:
    print("BLOQUÉ dès la page listing. Le site filtre les requêtes Python.")
    sys.exit(1)

model_links = []
for a in soup.find_all("a", href=True):
    path = href_path(a)
    if re_model.match(path):
        model_links.append(path)

print(f"   {len(model_links)} liens modèles trouvés : {model_links[:3]}...")

if not model_links:
    print("\n   AUCUN lien trouvé — voici les 500 premiers chars du HTML reçu :")
    print(soup.get_text()[:500])
    sys.exit(1)

# ── Étape 2 : première page modèle ───────────────────────────────────────────
print("\n2. Page modèle (1er modèle)")
msoup = fetch(BASE + model_links[0])
if not msoup:
    print("BLOQUÉ sur la page modèle.")
    sys.exit(1)

manual_links = []
for a in msoup.find_all("a", href=True):
    path = href_path(a)
    if re_manual.match(path):
        manual_links.append(path)

print(f"   {len(manual_links)} lien(s) manuel trouvé(s) : {manual_links}")

if not manual_links:
    print("\n   AUCUN lien manuel — HTML reçu (500 chars) :")
    print(msoup.get_text()[:500])
    sys.exit(1)

# ── Étape 3 : téléchargement ──────────────────────────────────────────────────
print("\n3. Téléchargement PDF")
dl_url = BASE + manual_links[0] + "/download"
print(f"  → GET {dl_url}", end=" ", flush=True)
r = sess.get(dl_url, timeout=30, allow_redirects=True)
ct = r.headers.get("content-type","")
print(f"[{r.status_code}] {len(r.content)} bytes | content-type: {ct}")

if r.content[:4] == b"%PDF" or "pdf" in ct.lower():
    print("  ✓ C'est bien un PDF — le téléchargement fonctionne !")
else:
    print("  ✗ Ce n'est PAS un PDF. Contenu reçu (200 chars) :")
    print(r.text[:200])

print("\n═══ FIN DU TEST ═══\n")
