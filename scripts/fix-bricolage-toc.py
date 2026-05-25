"""
Ajoute les tables des matières aux descriptions des 20 docs
"done" dans docs-a-classer-report-bricolage & diy.json.

Sources :
- TOC visuelles (PDFs scannés) : lues directement sur images PNG
- TOC natives (PDFs texte) : extraites via extract-toc-native.py
"""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')

REPORT = 'scripts/docs-a-classer-report-bricolage & diy.json'

with open(REPORT, encoding='utf-8') as f:
    data = json.load(f)

def get_doc(filename):
    for d in data['docs']:
        if d.get('original_filename') == filename and d.get('status') == 'done':
            return d
    return None

def append_toc(doc, toc_en, toc_fr, label=''):
    if toc_en:
        doc['description_en'] = doc.get('description_en', '').rstrip() + '\n\n' + toc_en
    if toc_fr:
        doc['description_fr'] = doc.get('description_fr', '').rstrip() + '\n\n' + toc_fr
    print(f'  ✓ {label}')

updated = 0

# ═══════════════════════════════════════════════════════════════════════════════
# 1. 500 PANNES 3e ÉDITION  (TOC visuelle — page 241 du PDF)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('500 Pannes 3e édition $20.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "- Récepteur muet même en P.U. (alternatif) (p. 7)\n"
        "- Récepteur muet même en P.U. (basse-constante) (p. 34)\n"
        "- Récepteurs fonctionnant mal en P.U. : Ronflement (p. 40)\n"
        "- Récepteurs fonctionnant mal en P.U. : Accrochages (p. 54)\n"
        "- Récepteurs fonctionnant mal en P.U. : Moto-Boating (p. 58)\n"
        "- Récepteurs fonctionnant mal en P.U. : Manque de puissance (p. 61)\n"
        "- Récepteurs fonctionnant mal en P.U. : Déformation et distorsion (p. 83)\n"
        "- Pannes diverses en B.F. (p. 104)\n"
        "- Récepteurs fonctionnant en P.U., mais muets en radio (p. 112)\n"
        "- Manque de sensibilité (p. 140)\n"
        "- Ronflement sur émetteurs (p. 168)\n"
        "- Non fonctionnement sur certaines gammes (p. 176)\n"
        "- Mauvais fonctionnement en O.C. (p. 198)\n"
        "- Accrochages et sifflements (p. 208)\n"
        "- Stations décalées (p. 220)\n"
        "- Pannes diverses en H.F. (p. 224)"
    )
    toc_en = (
        "Table of contents:\n"
        "- Receiver silent even on pick-up (alternating current) (p. 7)\n"
        "- Receiver silent even on pick-up (low-drain) (p. 34)\n"
        "- Receiver works poorly on pick-up: Hum (p. 40)\n"
        "- Receiver works poorly on pick-up: Oscillation feedback (p. 54)\n"
        "- Receiver works poorly on pick-up: Motor-Boating (p. 58)\n"
        "- Receiver works poorly on pick-up: Lack of power (p. 61)\n"
        "- Receiver works poorly on pick-up: Distortion (p. 83)\n"
        "- Various audio frequency faults (p. 104)\n"
        "- Receiver works on pick-up but silent on radio (p. 112)\n"
        "- Lack of sensitivity (p. 140)\n"
        "- Hum on transmitter stations (p. 168)\n"
        "- Non-functioning on certain wavebands (p. 176)\n"
        "- Poor performance on short wave (p. 198)\n"
        "- Oscillation and whistling (p. 208)\n"
        "- Station frequency shift (p. 220)\n"
        "- Various HF faults (p. 224)"
    )
    append_toc(doc, toc_en, toc_fr, '500 Pannes 3e')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 2. 500 PANNES 4e ÉDITION  (TOC visuelle — page 244 du PDF, même structure)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('500 Pannes 4e édition $25.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "- Récepteur muet même en P.U. (alternatif) (p. 7)\n"
        "- Récepteur muet même en P.U. (basse-constante) (p. 34)\n"
        "- Récepteurs fonctionnant mal en P.U. : Ronflement (p. 40)\n"
        "- Récepteurs fonctionnant mal en P.U. : Accrochages (p. 54)\n"
        "- Récepteurs fonctionnant mal en P.U. : Moto-Boating (p. 58)\n"
        "- Récepteurs fonctionnant mal en P.U. : Manque de puissance (p. 61)\n"
        "- Récepteurs fonctionnant mal en P.U. : Déformation et distorsion (p. 83)\n"
        "- Pannes diverses en B.F. (p. 104)\n"
        "- Récepteurs fonctionnant en P.U., mais muets en radio (p. 112)\n"
        "- Manque de sensibilité (p. 140)\n"
        "- Ronflement sur émetteurs (p. 168)\n"
        "- Non fonctionnement sur certaines gammes (p. 176)\n"
        "- Mauvais fonctionnement en O.C. (p. 198)\n"
        "- Accrochages et sifflements (p. 208)\n"
        "- Stations décalées (p. 220)\n"
        "- Pannes diverses en H.F. (p. 224)"
    )
    toc_en = (
        "Table of contents:\n"
        "- Receiver silent even on pick-up (alternating current) (p. 7)\n"
        "- Receiver silent even on pick-up (low-drain) (p. 34)\n"
        "- Receiver works poorly on pick-up: Hum (p. 40)\n"
        "- Receiver works poorly on pick-up: Oscillation feedback (p. 54)\n"
        "- Receiver works poorly on pick-up: Motor-Boating (p. 58)\n"
        "- Receiver works poorly on pick-up: Lack of power (p. 61)\n"
        "- Receiver works poorly on pick-up: Distortion (p. 83)\n"
        "- Various audio frequency faults (p. 104)\n"
        "- Receiver works on pick-up but silent on radio (p. 112)\n"
        "- Lack of sensitivity (p. 140)\n"
        "- Hum on transmitter stations (p. 168)\n"
        "- Non-functioning on certain wavebands (p. 176)\n"
        "- Poor performance on short wave (p. 198)\n"
        "- Oscillation and whistling (p. 208)\n"
        "- Station frequency shift (p. 220)\n"
        "- Various HF faults (p. 224)"
    )
    append_toc(doc, toc_en, toc_fr, '500 Pannes 4e')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 3. AIDE MÉMOIRE DU DÉPANNEUR  (TOC visuelle — pages 87-89)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('Aide mémoire du dépanneur $10.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "- Résistances : marquage, code couleurs, puissance dissipée, combinaisons série/parallèle (p. 7)\n"
        "- Condensateurs : marquage, codes couleurs, combinaisons série/parallèle (p. 27)\n"
        "- Transformateurs d'alimentation : pannes, essais, calcul et bobinage (p. 41)\n"
        "- Bobines d'inductance : caractéristiques, construction, tableaux de réalisation (p. 66)\n"
        "- Transformateurs de haut-parleurs : rôle, remplacement, tableaux de réalisation (p. 77)"
    )
    toc_en = (
        "Table of contents:\n"
        "- Resistors: color coding, power dissipation, precision, series/parallel combinations (p. 7)\n"
        "- Capacitors: marking, color codes, series/parallel combinations (p. 27)\n"
        "- Power supply transformers: faults, testing, design and winding calculations (p. 41)\n"
        "- Inductance coils: characteristics, construction, winding tables (p. 66)\n"
        "- Audio output transformers: function, replacement, construction tables (p. 77)"
    )
    append_toc(doc, toc_en, toc_fr, 'Aide mémoire du dépanneur')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 4. DÉPANNAGE DES RADIORÉCEPTEURS À TRANSISTORS  (TOC native — pages 7-9)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('Dépannage des Radiorécepteurs à Transistors $15.pdf')
if doc:
    toc_fr = (
        "Sommaire :\n"
        "- Chapitre I : Les éléments constitutifs d'un récepteur superhétérodyne à transistors (p. 13)\n"
        "- Chapitre II : Les instruments de mesures nécessaires — vérificateurs et transistormètres (p. 17)\n"
        "- Chapitre III : Précautions à observer au cours du dépannage des postes à transistors (p. 89)\n"
        "- Chapitre IV : Méthodes générales de recherche des pannes et de la mise au point (p. 99)\n"
        "- Chapitre V : Réglages et mesures sur récepteurs superhétérodynes AM et FM (p. 150)"
    )
    toc_en = (
        "Table of contents:\n"
        "- Chapter I: Components of a transistor superheterodyne receiver (p. 13)\n"
        "- Chapter II: Required test instruments — transistor testers and meters (p. 17)\n"
        "- Chapter III: Precautions during transistor radio troubleshooting (p. 89)\n"
        "- Chapter IV: General fault-finding methods and receiver alignment procedures (p. 99)\n"
        "- Chapter V: Measurements and alignment of AM and FM superheterodyne receivers (p. 150)"
    )
    append_toc(doc, toc_en, toc_fr, 'Dépannage Radiorécepteurs à Transistors')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 5. MEMENTO TUNGSRAM VOL. 3  (TOC native — pages 409-410)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('Memento Tungsram 3ème volume Guide Radio Dépannage $20.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "- Optique électronique : lampes, tubes cathodiques, iconoscope, multiplicateurs (p. 5)\n"
        "- Les premiers pas : mesures et bon sens (p. 27)\n"
        "- Valeurs courantes des résistances et condensateurs (p. 43)\n"
        "- Les mesures systématiques (p. 48)\n"
        "- La chasse aux ronflements (p. 53)\n"
        "- Les oscillations parasites (p. 65)\n"
        "- Grognements et silences (p. 73)\n"
        "- L'alignement des récepteurs : amplification directe, superhétérodyne (p. 80)\n"
        "- Transformateurs, selfs : calcul, bobinages, survolteur, transfo HP (p. 145)\n"
        "- Les appareils du débrouillard : hétérodyne, oscillateur BF, wattmètre, ohmmètre (p. 160)\n"
        "- Le pick-up : magnétique, à cristal, sans fil, filtres (p. 175)\n"
        "- Les filtres électriques, mesures radio (suite)"
    )
    toc_en = (
        "Table of contents:\n"
        "- Electronic optics: electron tubes, cathode ray tubes, iconoscope, multipliers (p. 5)\n"
        "- First steps: measurements and practical sense (p. 27)\n"
        "- Common resistor and capacitor values (p. 43)\n"
        "- Systematic measurements (p. 48)\n"
        "- Hunting hum interference (p. 53)\n"
        "- Parasitic oscillations (p. 65)\n"
        "- Distortion and silence faults (p. 73)\n"
        "- Receiver alignment: direct amplification and superheterodyne (p. 80)\n"
        "- Transformers and coils: design, winding tables, boosters, speaker transformers (p. 145)\n"
        "- Service instruments: modulated heterodyne, BF oscillator, wattmeter, ohmmeter (p. 160)\n"
        "- Pick-up systems: magnetic, crystal, wireless, filters (p. 175)\n"
        "- Electrical filters and radio measurements (continued)"
    )
    append_toc(doc, toc_en, toc_fr, 'Memento Tungsram Vol. 3')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 6. PANNES RADIO  (TOC native — page 348)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('Pannes Radio $18.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "Première partie — Récepteurs à tubes :\n"
        "- Récepteur muet même en P.U. (alternatif) (p. 8)\n"
        "- Récepteur muet même en P.U. (tous-courants) (p. 32)\n"
        "- Récepteur fonctionnant mal en P.U. : Ronflement (p. 42)\n"
        "- Récepteur fonctionnant mal en P.U. : Accrochages (p. 61)\n"
        "- Récepteur fonctionnant mal en P.U. : Motor-Boating (p. 67)\n"
        "- Récepteur fonctionnant mal en P.U. : Manque de puissance (p. 71)\n"
        "- Récepteur fonctionnant mal en P.U. : Déformation, distorsion (p. 94)\n"
        "- Pannes diverses en B.F. (p. 119)\n"
        "- Récepteur fonctionnant en P.U., mais muet en radio (p. 128)\n"
        "- Manque de sensibilité (p. 147)\n"
        "- Ronflement sur émissions (p. 170)\n"
        "- Mauvais fonctionnement en O.C. (p. 184)\n"
        "- Accrochages et sifflements (p. 195)\n"
        "- Pannes diverses (p. 204)\n"
        "Deuxième partie — Récepteurs à transistors :\n"
        "- Dépannage des récepteurs à transistors (p. 216)\n"
        "- Précautions lors des mesures (p. 232)\n"
        "- Procédés de localisation de pannes (p. 238)\n"
        "- Contrôle des diodes et transistors (p. 258)\n"
        "- Vérification du gain d'un amplificateur B.F. (p. 281)\n"
        "Troisième partie — Alignement des récepteurs AM et FM"
    )
    toc_en = (
        "Table of contents:\n"
        "Part One — Tube receivers:\n"
        "- Receiver silent even on pick-up (alternating current) (p. 8)\n"
        "- Receiver silent even on pick-up (universal current) (p. 32)\n"
        "- Receiver works poorly on pick-up: Hum (p. 42)\n"
        "- Receiver works poorly on pick-up: Oscillation (p. 61)\n"
        "- Receiver works poorly on pick-up: Motor-Boating (p. 67)\n"
        "- Receiver works poorly on pick-up: Lack of power (p. 71)\n"
        "- Receiver works poorly on pick-up: Distortion (p. 94)\n"
        "- Various audio faults (p. 119)\n"
        "- Receiver works on pick-up but silent on radio (p. 128)\n"
        "- Lack of sensitivity (p. 147)\n"
        "- Hum on transmitter stations (p. 170)\n"
        "- Poor short-wave performance (p. 184)\n"
        "- Oscillation and whistling (p. 195)\n"
        "- Various faults (p. 204)\n"
        "Part Two — Transistor receivers:\n"
        "- Transistor receiver troubleshooting (p. 216)\n"
        "- Measurement precautions (p. 232)\n"
        "- Fault location methods (p. 238)\n"
        "- Testing diodes and transistors (p. 258)\n"
        "- Checking amplifier gain (p. 281)\n"
        "Part Three — AM and FM receiver alignment"
    )
    append_toc(doc, toc_en, toc_fr, 'Pannes Radio')
    updated += 1

# ═══════════════════════════════════════════════════════════════════════════════
# 7. RÉPARATION DES RÉCEPTEURS À TRANSISTORS  (TOC native — pages 230, 232)
# ═══════════════════════════════════════════════════════════════════════════════
doc = get_doc('Réparation des Récepteurs à Transistors $17.pdf')
if doc:
    toc_fr = (
        "Table des matières :\n"
        "1. Le transistor : fonctionnement, caractéristiques, étage d'amplification, polarisation (p. 8)\n"
        "2. Le récepteur à transistors : étages HF, FI, détection, amplification BF (p. 50)\n"
        "3. L'outillage du dépanneur : contrôleur universel, voltmètre électronique, générateurs, accessoires (p. 76)\n"
        "4. La pratique du dépannage : signal-tracer, localisation de l'étage défaillant, réparation (p. 138)"
    )
    toc_en = (
        "Table of contents:\n"
        "1. The transistor: operation, characteristics, amplification stage, biasing (p. 8)\n"
        "2. The transistor receiver: HF, IF, detection, and audio amplifier stages (p. 50)\n"
        "3. Technician's equipment: universal meter, electronic voltmeter, generators, accessories (p. 76)\n"
        "4. Practical troubleshooting: signal tracer, faulty stage location, repair techniques (p. 138)"
    )
    append_toc(doc, toc_en, toc_fr, 'Réparation des Récepteurs à Transistors')
    updated += 1

# ───────────────────────────────────────────────────────────────────────────────
# Docs sans table des matières trouvée (pas d'ajout) :
# - Alignement des récepteurs radio        → pas de TDM (colophon en dernière page)
# - Amélioration et modernisation          → pas de TDM trouvée
# - Bases du dépannage Vol 1              → TDM illisible (scan 4 pages, trop dégradé)
# - Bases du dépannage Vol 2              → pas de TDM (bibliographie en dernière page)
# - Cent problèmes de l'agent technique   → TDM partielle, illisible avec certitude
# - Dépanneur en TSF                      → pas de TDM (pub éditeur en dernière page)
# - Formation du Dépanneur Radio          → pas de TDM trouvée
# - L'art du Dépannage des TSF           → pas de TDM (catalogue éditeur en dernière page)
# - La Clef des Dépannages               → pas de TDM (liste livres radio en dernière page)
# - Le dépannage par l'image             → pas de TDM (pub Recta en dernière page)
# - Le Dépannage à la Portée de Tous     → pas de TDM (illustrations outillage en dernière page)
# - Manuel de dépannage Ecole Moderne    → pas de TDM trouvée
# - Technique nouvelle du dépannage      → pas de TDM trouvée
# ───────────────────────────────────────────────────────────────────────────────

with open(REPORT, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'\nTotal : {updated} documents mis à jour avec table des matières')

# Vérification longueur descriptions
print('\nVérification longueur descriptions (>2000 chars = ok, informatif seulement) :')
for d in data['docs']:
    if d.get('status') == 'done':
        en = d.get('description_en', '')
        fr = d.get('description_fr', '')
        fn = d.get('original_filename', '')[:40]
        print(f'  {fn}: EN={len(en)} FR={len(fr)}')
