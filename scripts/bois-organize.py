"""
Étape 2 — Organisation des 45 PDF BOIS
- Supprime les 2 doublons "verrouillés" (les _unlocked existent déjà)
- Renomme chaque PDF au format "MARQUE_modèle $5.pdf" (préfixe lairdubois_ supprimé)
- Crée les sous-dossiers par marque (en MAJUSCULES)
- Déplace les fichiers renommés dans le bon dossier
"""
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8')

BOIS_DIR = r"C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Machines-Outils\BOIS"

# ── 1. Fichiers à SUPPRIMER (doublons — les _unlocked sont conservés) ─────────
TO_DELETE = [
    "lairdubois_9404Jvue éclatées .pdf",    # doublon → utiliser _unlocked
    "lairdubois_NOTICE_9404.pdf",            # doublon → utiliser _unlocked
]

# ── 2. Mapping complet : nom_original → (dossier_marque, nouveau_nom) ─────────
# Format cible : "MARQUE_modèle $5.pdf"
MAPPING = {
    # ── AEG ──────────────────────────────────────────────────────────────────
    "lairdubois_425-801-MF1400KE-1-3-print.pdf":
        ("AEG", "AEG_MF 1400 KE $5.pdf"),
    "lairdubois_4931425800.pdf":
        ("AEG", "AEG_MF 1400 KE (2) $5.pdf"),

    # ── BOSCH ─────────────────────────────────────────────────────────────────
    "lairdubois_notice_GET75-150_GET55-125_Bosch.pdf":
        ("BOSCH", "BOSCH_GET 75-150 $5.pdf"),
    "lairdubois_o333224v21_160992A5H4_202003.pdf":
        ("BOSCH", "BOSCH_GKT 55 GCE Professional $5.pdf"),
    "lairdubois_pof-1400-ace-14148-original-pdf-358419-fr-fr.pdf":
        ("BOSCH", "BOSCH_POF 1400 ACE $5.pdf"),

    # ── DEWALT ────────────────────────────────────────────────────────────────
    "lairdubois_D26200-D26203-D26204_TYP1_EUR.pdf":
        ("DEWALT", "DEWALT_D26200-D26203-D26204 $5.pdf"),
    "lairdubois_d26410.pdf":
        ("DEWALT", "DEWALT_D26410 $5.pdf"),
    "lairdubois_dw682.pdf":
        ("DEWALT", "DEWALT_DW682 $5.pdf"),

    # ── FEIN ──────────────────────────────────────────────────────────────────
    "lairdubois_5a9cb53f8e20272a3d8e41211b2439b2-34101265060_Dustex_25L_35L_20210903.pdf":
        ("FEIN", "FEIN_Dustex 25L-35L $5.pdf"),

    # ── FESTOOL ───────────────────────────────────────────────────────────────
    "lairdubois_07b0e957-40e2-11e9-80f9-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_OF 1400 EBQ $5.pdf"),
    "lairdubois_0a428142-b454-11e9-80fe-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_RS 300 EQ $5.pdf"),
    "lairdubois_0a428143-b454-11e9-80fe-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_OF 1010 EQ $5.pdf"),
    "lairdubois_2b5a3d9c-f389-11ec-812a-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_TS 60 KEBQ $5.pdf"),
    "lairdubois_475b9d28-40da-11e9-80f9-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_DOMINO DF 500 Q $5.pdf"),
    "lairdubois_4afc65df-8e0c-11eb-8115-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_TS 55 FEBQ $5.pdf"),
    "lairdubois_67b49510-5fbf-11eb-8113-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_TS 75 EQ $5.pdf"),
    "lairdubois_6dc6d117-c068-11ec-8125-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_ROTEX RO 90 DX FEQ $5.pdf"),
    "lairdubois_a2b16df5-c588-11e9-80ff-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_OF 2200 EB $5.pdf"),
    "lairdubois_ab6f3aa1-af1b-11eb-8116-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_HK 85 EB $5.pdf"),
    "lairdubois_b4ed5bdf-c06d-11ec-8125-005056b31774.pdf":
        ("FESTOOL", "FESTOOL_CTM 36 E $5.pdf"),
    "lairdubois_df700_manual.pdf":
        ("FESTOOL", "FESTOOL_DOMINO XL DF 700 EQ $5.pdf"),
    "lairdubois_e6acd1b1-85fd-11e9-80fc-005056b31774(1).pdf":
        ("FESTOOL", "FESTOOL_ROTEX RO 150 FEQ $5.pdf"),

    # ── KARCHER ───────────────────────────────────────────────────────────────
    "lairdubois_BTA-5470110-000-04.pdf":
        ("KARCHER", "KARCHER_WD 5 Premium $5.pdf"),
    "lairdubois_wd_3.pdf":
        ("KARCHER", "KARCHER_WD 3 $5.pdf"),

    # ── LAMELLO ───────────────────────────────────────────────────────────────
    "lairdubois_BA Classic X Top 21.pdf":
        ("LAMELLO", "LAMELLO_Classic X $5.pdf"),
    "lairdubois_BA-Zeta-P2.pdf":
        ("LAMELLO", "LAMELLO_Zeta P2 $5.pdf"),

    # ── MAFELL ────────────────────────────────────────────────────────────────
    "lairdubois_mt55cc_west_170215_0519_m.pdf":
        ("MAFELL", "MAFELL_MT 55 CC $5.pdf"),

    # ── MAKITA ────────────────────────────────────────────────────────────────
    "lairdubois_5903R.pdf":
        ("MAKITA", "MAKITA_5903R $5.pdf"),
    "lairdubois_DHS680.pdf":
        ("MAKITA", "MAKITA_DHS680 $5.pdf"),
    "lairdubois_document.pdf":
        ("MAKITA", "MAKITA_RP1800 $5.pdf"),
    "lairdubois_Makita 5008MG Circular Saw.pdf":
        ("MAKITA", "MAKITA_5008MG $5.pdf"),
    "lairdubois_9404Jvue éclatées _unlocked.pdf":
        ("MAKITA", "MAKITA_9404 vue éclatée $5.pdf"),
    "lairdubois_NOTICE_9404_unlocked.pdf":
        ("MAKITA", "MAKITA_9404 ponceuse à bande $5.pdf"),
    "lairdubois_NOTICE_HS7601.pdf":
        ("MAKITA", "MAKITA_HS7601 $5.pdf"),
    "lairdubois_NOTICE_RT0700C.pdf":
        ("MAKITA", "MAKITA_RT0700C $5.pdf"),
    "lairdubois_NOTICE_SP6000.pdf":
        ("MAKITA", "MAKITA_SP6000 $5.pdf"),

    # ── METABO ────────────────────────────────────────────────────────────────
    "lairdubois_asa_30_l_pc_inox.pdf":
        ("METABO", "METABO_ASA 30 L PC Inox $5.pdf"),
    "lairdubois_Metabo_Of E 1229 Signal.pdf":
        ("METABO", "METABO_Of E 1229 Signal $5.pdf"),

    # ── RYOBI ─────────────────────────────────────────────────────────────────
    "lairdubois_notice-ryobi-ert1150v-anglais.pdf":
        ("RYOBI", "RYOBI_ERT1150V $5.pdf"),

    # ── SHAPER ────────────────────────────────────────────────────────────────
    "lairdubois_FR-OriginManual.pdf":
        ("SHAPER", "SHAPER_Origin $5.pdf"),

    # ── TORMEK ────────────────────────────────────────────────────────────────
    "lairdubois_hb-10-fr-v105.pdf":
        ("TORMEK", "TORMEK_Affutage outils de coupe $5.pdf"),

    # ── TRITON ────────────────────────────────────────────────────────────────
    "lairdubois_MANUEL FR TRITON MOF001-1400W - Triton.pdf":
        ("TRITON", "TRITON_MOF001 $5.pdf"),
    "lairdubois_tra001.pdf":
        ("TRITON", "TRITON_TRA001 $5.pdf"),
}

# ─────────────────────────────────────────────────────────────────────────────

print(f"\n{'═'*60}")
print("  ORGANISATION DES PDF BOIS")
print(f"{'═'*60}\n")

# Vérification que tous les fichiers du dossier sont couverts
existing = set(f for f in os.listdir(BOIS_DIR) if f.lower().endswith('.pdf'))
covered  = set(MAPPING.keys()) | set(TO_DELETE)
missing  = existing - covered

if missing:
    print("⚠ FICHIERS NON COUVERTS :")
    for f in sorted(missing):
        print(f"   {f}")
    print()

# ── Étape 1 : Suppression des doublons ───────────────────────────────────────
print("── Suppression des doublons ─────────────────────────────")
for fname in TO_DELETE:
    fpath = os.path.join(BOIS_DIR, fname)
    if os.path.exists(fpath):
        os.remove(fpath)
        print(f"  🗑  Supprimé : {fname}")
    else:
        print(f"  ⚠  Déjà absent : {fname}")

# ── Étape 2 : Création des dossiers marques ───────────────────────────────────
brands = sorted(set(brand for brand, _ in MAPPING.values()))
print(f"\n── Création de {len(brands)} dossiers marques ───────────────────")
for brand in brands:
    brand_dir = os.path.join(BOIS_DIR, brand)
    os.makedirs(brand_dir, exist_ok=True)
    print(f"  📁 {brand}/")

# ── Étape 3 : Renommage + déplacement ────────────────────────────────────────
print(f"\n── Renommage et déplacement ({len(MAPPING)} fichiers) ──────────────")
ok = errors = 0

for original_name, (brand, new_name) in sorted(MAPPING.items()):
    src  = os.path.join(BOIS_DIR, original_name)
    dest = os.path.join(BOIS_DIR, brand, new_name)

    if not os.path.exists(src):
        print(f"  ✗  Introuvable : {original_name}")
        errors += 1
        continue

    if os.path.exists(dest):
        print(f"  ⚠  Destination existe déjà : {dest}")
        errors += 1
        continue

    try:
        shutil.move(src, dest)
        print(f"  ✓  {original_name[:50]}")
        print(f"     → {brand}/{new_name}")
        ok += 1
    except Exception as e:
        print(f"  ✗  Erreur ({original_name}) : {e}")
        errors += 1

# ── Résumé ────────────────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
print(f"  Réussis  : {ok}")
print(f"  Erreurs  : {errors}")
print(f"  Dossiers : {', '.join(brands)}")
print(f"{'═'*60}\n")
