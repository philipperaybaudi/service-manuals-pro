"""
automobile-fix-report.py
Corrige les prix et les slugs dupliqués dans le rapport Automobile.
"""
import json, re
from pathlib import Path

report = Path('scripts/docs-a-classer-report-automobile.json')
with open(report, encoding='utf-8') as f:
    data = json.load(f)

docs = data['docs']

# ─────────────────────────────────────────────
# 1. CORRECTION DES PRIX
# ─────────────────────────────────────────────
print('=== CORRECTION PRIX ===')
prix_fixed = 0
for d in docs:
    fname = d['original_filename']
    m = re.search(r'\$(\d+)', fname)
    if m:
        price_fname = int(m.group(1)) * 100
        if d['price'] != price_fname:
            print(f"  ${d['price']//100} → ${price_fname//100} : {fname}")
            d['price'] = price_fname
            prix_fixed += 1
print(f'  {prix_fixed} prix corrigés\n')

# ─────────────────────────────────────────────
# 2. CORRECTION DES SLUGS DUPLIQUÉS
# ─────────────────────────────────────────────
print('=== CORRECTION SLUGS ===')

# Index par slug
def get_doc(fname):
    for d in docs:
        if d['original_filename'] == fname:
            return d
    return None

# Cas 1 : Polaris [1] doublon → skip
d = get_doc('2009_Polaris_850_Hd_Eps_Service_Manual[1].pdf')
if d:
    d['status'] = 'skip_duplicate'
    print("  SKIP : 2009_Polaris_850_Hd_Eps_Service_Manual[1].pdf (doublon exact)")

# Cas 2 : Renault vides → skip
for fname in ['EAVT723A.pdf', 'EAVT771A.pdf', 'EAVT726A.pdf', 'EAVT742A.pdf']:
    d = get_doc(fname)
    if d:
        d['status'] = 'skip_invalid'
        print(f"  SKIP : {fname} (document vide/illisible)")

# Cas 3 : Land Rover 300TDi — différencier les slugs
d1 = get_doc('300TDi_Engine_Overhaul_Manual.pdf')
d2 = get_doc('300TDi_Overhaul_Manual.pdf')
if d1:
    d1['slug'] = 'land-rover-300tdi-engine-overhaul-manual'
    print(f"  SLUG : 300TDi_Engine_Overhaul_Manual → land-rover-300tdi-engine-overhaul-manual")
if d2:
    d2['slug'] = 'land-rover-300tdi-overhaul-manual'
    print(f"  SLUG : 300TDi_Overhaul_Manual → land-rover-300tdi-overhaul-manual")

# Cas 4 : Land Rover Defender conducteur 300tdi vs td5
d1 = get_doc('defender_300tdi_manuel_du_conducteur.pdf')
d2 = get_doc('defender_td5_manuel_du_conducteur_99.pdf')
if d1:
    d1['slug'] = 'land-rover-defender-300tdi-manuel-du-conducteur'
    print(f"  SLUG : defender_300tdi_manuel_du_conducteur → land-rover-defender-300tdi-manuel-du-conducteur")
if d2:
    d2['slug'] = 'land-rover-defender-td5-manuel-du-conducteur'
    print(f"  SLUG : defender_td5_manuel_du_conducteur_99 → land-rover-defender-td5-manuel-du-conducteur")

# Cas 5 : Toyota 2H 12H-T — 3 fichiers, garder les 2 nouveaux, marquer l'ancien skip
# engine_manual_2H_12HT.pdf et engine_manual_2H_12HT_BD.pdf sont des anciens (DOCS EN LIGNE)
# → ils ne seront pas dans DOSSIER SOURCE, classify les aura inclus par erreur
for fname in ['engine_manual_2H_12HT.pdf', 'engine_manual_2H_12HT_BD.pdf']:
    d = get_doc(fname)
    if d:
        d['status'] = 'skip_already_imported'
        print(f"  SKIP : {fname} (déjà importé, conflit slug)")

# Cas 6 : Toyota FJ80 chassis — FJ_HZJ_HDJ80_chassis_body.pdf déjà importé
d = get_doc('FJ_HZJ_HDJ80_chassis_body.pdf')
if d:
    d['status'] = 'skip_already_imported'
    print(f"  SKIP : FJ_HZJ_HDJ80_chassis_body.pdf (déjà importé)")
# RM184E → nouveau, garder son slug mais le différencier
d = get_doc('Toyota LC80 Chassis Body Repair Manual FJ80 HZJ80 HDJ80 1990 $35.pdf')
if d:
    d['slug'] = 'toyota-land-cruiser-lc80-chassis-body-repair-manual-fj80-hzj80-hdj80-1990'
    print(f"  SLUG : RM184E → toyota-land-cruiser-lc80-chassis-body-repair-manual-fj80-hzj80-hdj80-1990")

# Cas 7 : Toyota 1PZ 1HZ 1HD-T — RM172E_FR déjà importé
d = get_doc('RM172E_FR.pdf')
if d:
    d['status'] = 'skip_already_imported'
    print(f"  SKIP : RM172E_FR.pdf (déjà importé)")

# Cas 8 : Toyota A442F — RM314E déjà importé
d = get_doc('RM314E.pdf')
if d:
    d['status'] = 'skip_already_imported'
    print(f"  SKIP : RM314E.pdf (déjà importé)")

# Cas 9 : Toyota 1HD-FT — RM437K déjà importé
d = get_doc('RM437K.pdf')
if d:
    d['status'] = 'skip_already_imported'
    print(f"  SKIP : RM437K.pdf (déjà importé)")

# Cas 10 : Toyota 2F — deux éditions différentes, différencier slugs
d1 = get_doc('Toyota 2F Engine Repair Manual 1980 $18.pdf')
d2 = get_doc('Toyota 2F Engine Repair Manual 98126E $18.pdf')
if d1:
    d1['slug'] = 'toyota-2f-engine-repair-manual-1980'
    print(f"  SLUG : 2F 1980 → toyota-2f-engine-repair-manual-1980")
if d2:
    d2['slug'] = 'toyota-2f-engine-repair-manual-98126e'
    print(f"  SLUG : 2F 98126E → toyota-2f-engine-repair-manual-98126e")

# Cas 11 : Toyota VZJ95R A/C — deux manuels différents
d1 = get_doc('Toyota Land Cruiser Prado 90 VZJ95R Air Conditioner Installation Manual $15.pdf')
d2 = get_doc('Toyota Land Cruiser Prado 90 VZJ95R Air Conditioner Installation Manual Nippondenso $15.pdf')
if d1:
    d1['slug'] = 'toyota-land-cruiser-prado-90-vzj95r-air-conditioner-installation-manual'
    print(f"  SLUG : VZJ95R A/C → ...vzj95r-air-conditioner-installation-manual")
if d2:
    d2['slug'] = 'toyota-land-cruiser-prado-90-vzj95r-air-conditioner-installation-manual-nippondenso'
    print(f"  SLUG : VZJ95R A/C Nippondenso → ...nippondenso")

# Cas 12 : Toyota LC80 EWD — 1990 et 1993 ont le même slug → ajouter l'année
d1 = get_doc('Toyota LC80 Electrical Wiring Diagram 1990 $18.pdf')
d2 = get_doc('Toyota LC80 Electrical Wiring Diagram 1993 $18.pdf')
if d1:
    d1['slug'] = 'toyota-land-cruiser-lc80-electrical-wiring-diagram-1990'
    print(f"  SLUG : LC80 EWD 1990 → ...1990")
if d2:
    d2['slug'] = 'toyota-land-cruiser-lc80-electrical-wiring-diagram-1993'
    print(f"  SLUG : LC80 EWD 1993 → ...1993")

# ─────────────────────────────────────────────
# 3. VÉRIFICATION FINALE
# ─────────────────────────────────────────────
active = [d for d in docs if d.get('status') == 'done']
slugs = [d['slug'] for d in active]
dupes = [s for s in slugs if slugs.count(s) > 1]

print(f'\n=== BILAN FINAL ===')
print(f'  Docs actifs (status=done) : {len(active)}')
print(f'  Slugs encore dupliqués    : {len(set(dupes))}')
if dupes:
    for s in set(dupes):
        print(f'    {s}')

# Sauvegarder
with open(report, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'\n  ✓ Rapport sauvegardé')
