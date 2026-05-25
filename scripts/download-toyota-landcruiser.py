"""
download-toyota-landcruiser.py
Télécharge les 74 PDFs de landcruiserworkshop.com via Tor.
Reprise automatique via fichier d'état JSON.
"""
import os, json, time, random, sys
from pathlib import Path
import requests

BASE_URL   = "https://files.landcruiserworkshop.com"
DEST_DIR   = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile\TOYOTA')
STATE_FILE = Path(__file__).parent / 'download-toyota-state.json'

TOR_PROXY = "socks5h://127.0.0.1:9150"
TOR_CTRL  = ("127.0.0.1", 9151)

DEST_DIR.mkdir(parents=True, exist_ok=True)

PDFS = [
    # --- Série 60 (1980-1990) ---
    "https://files.landcruiserworkshop.com/manuals/36044E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36262E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM033E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36104E.pdf",
    "https://files.landcruiserworkshop.com/manuals/98126E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36253E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM134E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36047E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM024E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM035E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM132E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36048E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM012E.pdf",
    "https://files.landcruiserworkshop.com/manuals/STI006E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36043E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36380E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36237E.pdf",
    "https://files.landcruiserworkshop.com/manuals/36264E.pdf",
    "https://files.landcruiserworkshop.com/manuals/98961.pdf",
    "https://files.landcruiserworkshop.com/manuals/36683F.pdf",
    "https://files.landcruiserworkshop.com/manuals/36713F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD046F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD066F.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-501.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-515.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-1004.pdf",
    "https://files.landcruiserworkshop.com/manuals/RAC-015.pdf",
    "https://files.landcruiserworkshop.com/manuals/35008.pdf",
    "https://files.landcruiserworkshop.com/manuals/608131.pdf",
    # --- Série 80 (1990-1998) ---
    "https://files.landcruiserworkshop.com/manuals/RM184E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM290E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM315E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM434E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM534E.pdf",
    "https://files.landcruiserworkshop.com/manuals/BRM050E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM283E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM321E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM436E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM172E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM437E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM523E.pdf",
    "https://files.landcruiserworkshop.com/manuals/ERM068E.pdf",
    "https://files.landcruiserworkshop.com/manuals/ERM096E.pdf",
    "https://files.landcruiserworkshop.com/manuals/ERM111E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM188E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM314E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM314E-Supp.pdf",
    "https://files.landcruiserworkshop.com/manuals/ATH021F.pdf",
    "https://files.landcruiserworkshop.com/manuals/ATH031F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD090F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD114F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD169F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD232F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD272F.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-1019.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-1032.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-1067.pdf",
    "https://files.landcruiserworkshop.com/manuals/NCF064E.pdf",
    "https://files.landcruiserworkshop.com/manuals/AANCF004.pdf",
    # --- Série 90 Prado (1996-2002) ---
    "https://files.landcruiserworkshop.com/manuals/RM517E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM627E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM702E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM805E.pdf",
    "https://files.landcruiserworkshop.com/manuals/BRM061E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM519E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM703E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM898E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM520E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM521E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM704E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM353E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM522E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM710E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM790E.pdf",
    "https://files.landcruiserworkshop.com/manuals/RM528E.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD269F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD340F.pdf",
    "https://files.landcruiserworkshop.com/manuals/EWD376F.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-A458.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-A486.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-A510.pdf",
    "https://files.landcruiserworkshop.com/manuals/MAC-1079.pdf",
    "https://files.landcruiserworkshop.com/manuals/NCF131E.pdf",
    "https://files.landcruiserworkshop.com/manuals/NCF195E.pdf",
]


def new_tor_identity():
    try:
        import socket
        s = socket.socket()
        s.settimeout(5)
        s.connect(TOR_CTRL)
        s.send(b'AUTHENTICATE ""\r\nSIGNAL NEWNYM\r\n')
        s.close()
        time.sleep(random.uniform(8, 12))
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
        "Accept": "application/pdf,*/*",
        "Referer": "https://landcruiserworkshop.com/",
    })
    s.proxies = {"http": TOR_PROXY, "https": TOR_PROXY}
    return s


def check_tor(sess):
    try:
        r = sess.get("https://check.torproject.org/api/ip", timeout=15)
        ip = r.json().get("IP", "?")
        print(f"  ✓ Tor actif — IP de sortie : {ip}")
        return True
    except Exception as e:
        print(f"  ⚠ Tor non disponible ({e})")
        return False


def get_with_tor_retry(sess, url, max_retries=5):
    for attempt in range(max_retries):
        try:
            r = sess.get(url, timeout=60, stream=True)
            if r.status_code in (429, 403):
                print(f"\n  🚫 {r.status_code} — Changement d'identité Tor...")
                new_tor_identity()
                sess = make_session()
                continue
            return r, sess
        except Exception as e:
            print(f"  ⚠ Erreur réseau ({e}) — retry {attempt+1}/{max_retries}")
            time.sleep(random.uniform(5, 15))
    return None, sess


def load_state():
    if STATE_FILE.exists():
        with open(STATE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


# --- Main ---
state = load_state()
sess = make_session()

total = len(PDFS)
already_done = sum(1 for u in PDFS if state.get(u) == 'ok')

print(f'\n{"="*65}')
print(f'  TOYOTA LAND CRUISER — TÉLÉCHARGEMENT ({total} PDFs)')
print(f'  Déjà téléchargés : {already_done}')
print(f'{"="*65}\n')

check_tor(sess)

errors_list = []

for i, url in enumerate(PDFS, 1):
    filename = url.split('/')[-1]
    dest = DEST_DIR / filename

    if state.get(url) == 'ok' and dest.exists():
        print(f'  [{i:02d}/{total}] ○ {filename}')
        continue

    print(f'  [{i:02d}/{total}] ↓ {filename}...', end=' ', flush=True)
    r, sess = get_with_tor_retry(sess, url)

    if r is None:
        print('✗ échec après retries')
        state[url] = 'error'
        errors_list.append(filename)
        save_state(state)
        continue

    if r.status_code == 404:
        print('404 — introuvable')
        state[url] = 'skip_404'
        save_state(state)
        continue

    if r.status_code != 200:
        print(f'✗ HTTP {r.status_code}')
        state[url] = f'error_{r.status_code}'
        errors_list.append(filename)
        save_state(state)
        continue

    # Téléchargement avec gestion des coupures mid-stream
    download_ok = False
    for dl_attempt in range(3):
        try:
            if dl_attempt > 0:
                print(f'\n  [{i:02d}/{total}] ↓ retry {dl_attempt+1}/3 {filename}...', end=' ', flush=True)
                r, sess = get_with_tor_retry(sess, url)
                if r is None or r.status_code != 200:
                    break
            with open(dest, 'wb') as f:
                for chunk in r.iter_content(chunk_size=65536):
                    f.write(chunk)
            download_ok = True
            break
        except Exception as e:
            print(f'\n  ⚠ Coupure mid-stream ({e.__class__.__name__}) — nouvelle identité Tor...')
            if dest.exists():
                dest.unlink()  # supprimer le fichier partiel
            new_tor_identity()
            sess = make_session()

    if download_ok:
        size_kb = dest.stat().st_size // 1024
        print(f'✓ ({size_kb} KB)')
        state[url] = 'ok'
    else:
        print(f'✗ échec après 3 tentatives')
        state[url] = 'error'
        errors_list.append(filename)
    save_state(state)
    time.sleep(random.uniform(0.5, 1.5))

ok = sum(1 for v in state.values() if v == 'ok')
skipped = sum(1 for v in state.values() if v == 'skip_404')

print(f'\n{"="*65}')
print(f'  BILAN : {ok} téléchargés | {skipped} introuvables | {len(errors_list)} erreurs')
if errors_list:
    print(f'  ERREURS : {", ".join(errors_list)}')
print(f'  Dossier : {DEST_DIR}')
print(f'{"="*65}\n')
