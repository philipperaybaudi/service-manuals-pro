"""Met à jour les descriptions des 4 numéros Elektor 1978 avec leurs sommaires
et réordonne les entrées en ordre chronologique N°1 → N°2 → N°3 → N°4."""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

JSON_PATH = "C:\\Users\\adm\\Claude Doc GB test\\service-manuals-pro\\scripts\\docs-a-classer-report-électronique.json"

# ── Sommaires extraits visuellement depuis PNG (pages de couverture/sommaire) ─

TOC = {
    "elektor-elektor-magazine-issue-1-may-june-1978": {
        "en": (
            "\n\nContents:\n"
            "- 5-13 Selektor\n"
            "- 5-16 Introduction aux microprocesseurs\n"
            "- 5-22 Mini-récepteur ondes courtes\n"
            "- 5-23 Générateur de fonctions\n"
            "- 5-30 Préco (préampli et régulateur télécommandé)\n"
            "- 5-41 Mini-phasing\n"
            "- 5-42 Récepteur BLU\n"
            "- 5-49 Tup-tun\n"
            "- 5-50 Le microprocesseur en jouant\n"
            "- 5-61 Commande automatique de changement de diapositives\n"
            "- 5-69 Magnétiseur\n"
            "- 5-71 Marché"
        ),
        "fr": (
            "\n\nSommaire :\n"
            "- 5-13 Selektor\n"
            "- 5-16 Introduction aux microprocesseurs\n"
            "- 5-22 Mini-récepteur ondes courtes\n"
            "- 5-23 Générateur de fonctions\n"
            "- 5-30 Préco (préampli et régulateur télécommandé)\n"
            "- 5-41 Mini-phasing\n"
            "- 5-42 Récepteur BLU\n"
            "- 5-49 Tup-tun\n"
            "- 5-50 Le microprocesseur en jouant\n"
            "- 5-61 Commande automatique de changement de diapositives\n"
            "- 5-69 Magnétiseur\n"
            "- 5-71 Marché"
        ),
    },
    "elektor-elektor-magazine-july-august-1978-issue-2": {
        "en": (
            "\n\nContents:\n"
            "- 7-13 Selektor\n"
            "- 7-15 Microprofesseur\n"
            "- 7-16 Equin (ampli 40 Watt)\n"
            "- 7-32 Compresseur de modulation\n"
            "- 7-33 Photographie Kirlian\n"
            "- 7-38 Préamplificateur pour microphone à électret\n"
            "- 7-40 Train à vapeur\n"
            "- 7-41 Sifflet à vapeur\n"
            "- 7-43 Pèse-bras imprimé\n"
            "- 7-44 Récepteur FM local\n"
            "- 7-49 Signal-traceur\n"
            "- 7-50 Antenne MF d'intérieur\n"
            "- 7-54 Apprenons à utiliser le SC/MP (2)\n"
            "- 7-68 TUP-TUN-DUG-DUS\n"
            "- 7-71 Marché"
        ),
        "fr": (
            "\n\nSommaire :\n"
            "- 7-13 Selektor\n"
            "- 7-15 Microprofesseur\n"
            "- 7-16 Equin (ampli 40 Watt)\n"
            "- 7-32 Compresseur de modulation\n"
            "- 7-33 Photographie Kirlian\n"
            "- 7-38 Préamplificateur pour microphone à électret\n"
            "- 7-40 Train à vapeur\n"
            "- 7-41 Sifflet à vapeur\n"
            "- 7-43 Pèse-bras imprimé\n"
            "- 7-44 Récepteur FM local\n"
            "- 7-49 Signal-traceur\n"
            "- 7-50 Antenne MF d'intérieur\n"
            "- 7-54 Apprenons à utiliser le SC/MP (2)\n"
            "- 7-68 TUP-TUN-DUG-DUS\n"
            "- 7-71 Marché"
        ),
    },
    "elektor-elektor-magazine-september-october-1978-issue-3": {
        "en": (
            "\n\nContents:\n"
            "- 9-14 Selektor\n"
            "- 9-18 Voltmètre à LEDs (UAA 180)\n"
            "- 9-22 Indicateur de défaut d'éclairage\n"
            "- 9-23 Table de mixage stéréo\n"
            "- 9-29 Voltmètre de crête BF\n"
            "- 9-32 Générateur de notes universel\n"
            "- 9-35 Elektor Software Service\n"
            "- 9-35 Un piano intégré\n"
            "- 9-36 Piano électronique\n"
            "- 9-48 Testeur logique universel\n"
            "- 9-49 Convertisseur signaux carrés / marches d'escalier\n"
            "- 9-50 Stylo émetteur FM\n"
            "- 9-52 Apprenons à utiliser le SC/MP (3)\n"
            "- 9-68 TUP-TUN testeur\n"
            "- 9-77 Présentation de semiconducteurs"
        ),
        "fr": (
            "\n\nSommaire :\n"
            "- 9-14 Selektor\n"
            "- 9-18 Voltmètre à LEDs (UAA 180)\n"
            "- 9-22 Indicateur de défaut d'éclairage\n"
            "- 9-23 Table de mixage stéréo\n"
            "- 9-29 Voltmètre de crête BF\n"
            "- 9-32 Générateur de notes universel\n"
            "- 9-35 Elektor Software Service\n"
            "- 9-35 Un piano intégré\n"
            "- 9-36 Piano électronique\n"
            "- 9-48 Testeur logique universel\n"
            "- 9-49 Convertisseur signaux carrés / marches d'escalier\n"
            "- 9-50 Stylo émetteur FM\n"
            "- 9-52 Apprenons à utiliser le SC/MP (3)\n"
            "- 9-68 TUP-TUN testeur\n"
            "- 9-77 Présentation de semiconducteurs"
        ),
    },
    "elektor-elektor-electronics-magazine-november-december-1978-issue-4": {
        "en": (
            "\n\nContents:\n"
            "- 11-12 Selektor\n"
            "- 11-16 Circuit imprimé et soudage\n"
            "- 11-20 Petite expérience avec une RAM\n"
            "- 11-21 Carte RAM 4 k\n"
            "- 11-24 Compteur de vitesse pour bicyclette\n"
            "- 11-28 Alimentation pour systèmes à microprocesseur\n"
            "- 11-29 Introduction au TV-scope\n"
            "- 11-34 Serrure à combinaison optique\n"
            "- 11-36 TV-scope, version de base\n"
            "- 11-48 Chambre de réverbération digitale\n"
            "- 11-57 Apprenons à utiliser le SC/MP\n"
            "- 11-62 Compte pose logarithmique\n"
            "- 11-66 Jeu de billes\n"
            "- 11-69 Mini fréquencemètre\n"
            "- 11-72 Modulateur TV VHF/UHF"
        ),
        "fr": (
            "\n\nSommaire :\n"
            "- 11-12 Selektor\n"
            "- 11-16 Circuit imprimé et soudage\n"
            "- 11-20 Petite expérience avec une RAM\n"
            "- 11-21 Carte RAM 4 k\n"
            "- 11-24 Compteur de vitesse pour bicyclette\n"
            "- 11-28 Alimentation pour systèmes à microprocesseur\n"
            "- 11-29 Introduction au TV-scope\n"
            "- 11-34 Serrure à combinaison optique\n"
            "- 11-36 TV-scope, version de base\n"
            "- 11-48 Chambre de réverbération digitale\n"
            "- 11-57 Apprenons à utiliser le SC/MP\n"
            "- 11-62 Compte pose logarithmique\n"
            "- 11-66 Jeu de billes\n"
            "- 11-69 Mini fréquencemètre\n"
            "- 11-72 Modulateur TV VHF/UHF"
        ),
    },
}

# Ordre chronologique souhaité dans le JSON (= ordre d'import en base)
CHRONO_ORDER = [
    "elektor-elektor-magazine-issue-1-may-june-1978",
    "elektor-elektor-magazine-july-august-1978-issue-2",
    "elektor-elektor-magazine-september-october-1978-issue-3",
    "elektor-elektor-electronics-magazine-november-december-1978-issue-4",
]

# ── Chargement JSON ───────────────────────────────────────────────────────────
with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

docs = data["docs"]

# Séparer les entrées Elektor 1978 des autres
elektor78 = {d["slug"]: d for d in docs if d.get("slug") in TOC}
others    = [d for d in docs if d.get("slug") not in TOC]

if len(elektor78) != 4:
    print(f"ERREUR : {len(elektor78)} entrées trouvées, 4 attendues.")
    sys.exit(1)

# ── Mise à jour des descriptions ──────────────────────────────────────────────
for slug, toc in TOC.items():
    doc = elektor78[slug]
    # Éviter double-ajout
    if "Contents:" not in doc["description_en"]:
        doc["description_en"] = doc["description_en"].rstrip() + toc["en"]
    if "Sommaire :" not in doc["description_fr"]:
        doc["description_fr"] = doc["description_fr"].rstrip() + toc["fr"]
    print(f"  ✓ {slug}")

# ── Réordonnancement chronologique ───────────────────────────────────────────
ordered_78 = [elektor78[s] for s in CHRONO_ORDER]
data["docs"] = others + ordered_78

# ── Sauvegarde ────────────────────────────────────────────────────────────────
with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nJSON mis à jour.")
print("Ordre en fin de fichier : N°1 → N°2 → N°3 → N°4 ✓")
