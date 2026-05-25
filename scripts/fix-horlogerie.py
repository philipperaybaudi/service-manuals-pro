import json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/docs-a-classer-report-horlogerie.json', encoding='utf-8') as f:
    data = json.load(f)

fixes = {
    # Prix
    '1033_Miyota 6W50 $19.pdf':                       {'price': 1900},
    '1369_IWC 851, 2, 8521, 3 $10.pdf':               {'price': 1000},
    'Marshall 1 $7.pdf':                               {'price': 700},
    'Marshall 2 $7.pdf':                               {'price': 700},
    'Marshall 3 $7.pdf':                               {'price': 700},
    'Marshall 4 $7.pdf':                               {'price': 700},
    'Marshall 5 $7.pdf':                               {'price': 700},
    'Rolex Casing Guide $15.pdf':                      {'price': 1500},
    '1852_Hattori,SeikoY432B $1.pdf':                  {'price': 100},
    '239_tissot 2400,2401,2403,2404 $4.pdf':           {'price': 400},
    '287_Zenith405,408 $2.pdf':                        {'price': 200},
    '608_Zenith Elite 660, 661, 670 $10.pdf':          {'price': 1000},
    '653_Zenith 3019PHC $8.pdf':                       {'price': 800},
    '674_Zenith40.0,3029PHC,41.0,3029PHF $2.pdf':     {'price': 200},

    # Titres trop longs
    '1858_Enicar 160.pdf': {
        'title_en': 'Enicar Calibre 160-167 AR Parts List',
        'title_fr': 'Enicar Calibre 160-167 AR Liste des pièces',
    },
    '31_UT6497.1,6498.1.pdf': {
        'title_fr': 'Manuel technique ETA 6497-1 / 6498-1 montre de poche',
    },
    '924_Felsa 4007, 4007N.pdf': {
        'title_fr': 'Felsa Cal. 4007/4007N Caractéristiques techniques',
    },
    '1473_Landeron 149, 189.pdf': {
        'title_fr': 'Landeron Cal. 149 et 189 Spécifications techniques',
    },
    '775_fhf905.pdf': {
        'title_en': 'Caliber 905 Technical Specifications and Parts List',
        'title_fr': 'Calibre 905 Caractéristiques Techniques et Liste de Pièces',
    },
    '1234_Incabloc Upper Blocks Pages 1-5.pdf': {
        'title_fr': 'Incabloc Blocs Supérieurs - Liste de pièces et assemblage',
    },
    '1244_Incabloc By Factory - Cupillard.pdf': {
        'title_fr': 'Cupillard Incabloc - Liste de pièces et spécifications',
    },
    '1248_Incabloc By Factory - Ebel.pdf': {
        'title_en': 'Ebel Incabloc Parts List and Specifications',
        'title_fr': 'Ebel Incabloc - Liste de pièces et spécifications',
    },
    '1254_Incabloc By Factory - FE.pdf': {
        'title_en': 'FE France Ebauches Watch Calibers Technical Data',
        'title_fr': 'FE France Ebauches Calibres de Base et Dérivés',
    },
    '1268_Incabloc By Factory - Lanco.pdf': {
        'title_fr': 'Lanco Langendorf Mouvements - Caractéristiques techniques',
    },
    '1269_Incabloc By Factory - Landeron, Lavina.pdf': {
        'title_fr': 'Landeron Lavina Incabloc Données Techniques',
    },
    '1276_Incabloc By Factory - Moeris.pdf': {
        'title_fr': 'Moeris Mouvements - Données techniques et spécifications',
    },
    '1300_Incabloc By Factory - Ronda.pdf': {
        'title_fr': 'Calibres Ronda Incabloc pour mouvements horlogers',
    },
    '1302_Incabloc By Factory - Sefea.pdf': {
        'title_en': 'SEFEA Incabloc Parts List and Technical Specifications',
    },
    '1308_Incabloc By Factory - Tissot.pdf': {
        'title_fr': 'Pièces de rechange Incabloc Tissot - Interchangeabilité',
    },
    '1314_Incabloc By Factory - Wittnauer.pdf': {
        'title_fr': 'Wittnauer Mouvements - Liste de pièces et données techn.',
    },
    '1316_Incabloc By Factory - Zodiac.pdf': {
        'title_fr': 'Calibres Zodiac - Liste de pièces et caractéristiques',
    },
    '648_Inca PDF.pdf': {
        'title_fr': "INCA Liste d'interchangeabilité et référence des pièces",
    },
    '1379_Kif Eta.pdf': {
        'title_fr': 'ETA KIF Mouvements - Liste de pièces et données techniques',
    },
    '1404_Allermann, Amida, BFG.pdf': {
        'title_fr': 'Allermann, Amida et BFG - Listes de pièces',
    },
    '1407_Kif Complication, Cortebert.pdf': {
        'title_fr': 'Cortebert KIF 2 Complication - Liste de pièces',
    },
    '1412_Kif Hamilton, IWC.pdf': {
        'title_fr': 'Hamilton KIF et IWC - Spécifications de Pièces',
    },
    '1414_Kif Lemania, Liengme, Longines, Looping.pdf': {
        'title_en': 'KIF Lemania Liengme Longines Looping Parts List',
        'title_fr': 'KIF Lemania Liengme Longines Looping - Liste de pièces',
    },
    '1426_Wittnauer, Zenith.pdf': {
        'title_fr': 'Wittnauer et Zenith - Liste de pièces mouvements',
    },
    '1428_Kif Bayard, Cupillard, Femga.pdf': {
        'title_fr': 'KIF Bayard, Cupillard, Femga - Liste de pièces',
    },
    '1432_Kif Hanhart, Hirsch.pdf': {
        'title_fr': 'KIF Hanhart et Hirsch - Liste de pièces et références',
    },
    'Marshall 1 $7.pdf': {
        'title_en': "Professional Watchmakers Practical Manual - Import Parts",
        'title_fr': "Manuel des Horlogers Professionnels - Pièces d'Import",
    },
    'Marshall 3 $7.pdf': {
        'title_fr': 'Catalogue pièces pour mouvements de montres automatiques',
    },
    'Marshall 4 $7.pdf': {
        'title_fr': 'Elgin - Vis de joaillerie, tiges et roues',
    },
    '1845_Molnia 3602.pdf': {
        'title_fr': 'Molnia 3602 - Liste de pièces et spécifications',
    },
    '1875_Oris 391, 392, 394.pdf': {
        'title_en': 'Oris Caliber 391-392-394 Parts List and Drawings',
        'title_fr': 'Oris Calibre 391-392-394 - Liste de pièces et schémas',
    },
    '244_peseux 7040,7050.pdf': {
        'title_fr': 'Peseux 7040/7050 - Caractéristiques techniques',
    },
    'Rolex_1166.pdf': {
        'title_en': 'Rolex Calibre 1166 Parts and Technical Specifications',
        'title_fr': 'Rolex Calibre 1166 Catalogue de pièces et spécifications',
    },
    'Rolex_1530.pdf': {
        'title_fr': 'Rolex Calibre 1530 Liste de pièces et assemblage',
    },
    'Rolex_1555.pdf': {
        'title_fr': 'Rolex Calibre 1555 Liste des Pièces et Spécifications',
    },
    'Rolex_3035.pdf': {
        'title_fr': 'Rolex Calibre 3035 - Liste de pièces et spécifications',
    },
    'Rolex_310.pdf': {
        'title_fr': 'Rolex Calibre 310 - Pièces Seconde au Centre',
    },
    'Rolex_350.pdf': {
        'title_fr': 'Rolex Calibre 350 Heures Sautantes - Liste de Pièces',
    },
    'Rolex_4030.pdf': {
        'title_fr': 'Rolex Calibre 4030 - Liste de pièces et assemblage',
    },
    'Rolex_530.pdf': {
        'title_fr': 'Rolex Calibre 530 Automatique - Pièces Spéciales',
    },
    'Rolex_620.pdf': {
        'title_fr': 'Rolex Calibre 620 Automatique - Catalogue de pièces',
    },
    'Rolex_700.pdf': {
        'title_fr': "Rolex Cal. 10½\" Seconde habituelle - Catalogue pièces",
    },
    'Rolex_710.pdf': {
        'title_fr': 'Rolex Calibre 710 Seconde au Centre - Pièces Spéciales',
    },
    'Rolex_730.pdf': {
        'title_fr': 'Rolex Calibre 730 Automatique Seconde au Centre',
    },
    'Rolex_740.pdf': {
        'title_en': 'Rolex Caliber 740 Selfwinding Calendar Parts List',
        'title_fr': 'Rolex Calibre 740 Automatique Calendrier - Liste de pièces',
    },
    'Rolex_850.pdf': {
        'title_fr': 'Rolex Calibre 850 Seconde Habituelle - Pièces Spéciales',
    },
    'Rolex_Crowns.pdf': {
        'title_fr': 'Rolex Oyster - Tubes et Couronnes Spécifications',
    },
    'Rolex_Fancy Crowns.pdf': {
        'title_fr': 'Rolex Couronnes Fantaisie - Liste de Pièces',
    },
    'Rolex_Oyster case.pdf': {
        'title_en': 'Rolex Oyster Case Submariner GMT-Master Parts List',
        'title_fr': 'Rolex Oyster Submariner GMT-Master - Pièces de rechange',
    },
    '1910_Venus 180.pdf': {
        'title_fr': 'Vénus 180 Caractéristiques techniques et liste de pièces',
    },
    '912_venus 188.pdf': {
        'title_fr': 'Chronographe Enregistreur Vénus 188 - Guide Technique',
    },
    '923_Venus 170.pdf': {
        'title_en': 'Venus Caliber 170 Chronograph Technical Specifications',
        'title_fr': 'Chronographe Vénus Calibre 170 - Caractéristiques',
    },
    '1927_Zaria 2009A.pdf': {
        'title_en': 'Zaria 2009A Watch Movement Parts List',
        'title_fr': 'Zaria 2009A - Liste des pièces et schéma technique',
    },
    '1928_Zaria 2009B.pdf': {
        'title_en': 'Zaria 2009B Watch Movement Parts List',
        'title_fr': 'Zaria 2009B - Liste de pièces et schémas mécaniques',
    },
    '674_Zenith40.0,3029PHC,41.0,3029PHF $2.pdf': {
        'title_en': 'Zenith Cal. 40.0/41.0 (3029 PHC/PHF) Spare Parts List',
        'title_fr': 'Zenith Cal. 40.0/41.0 (3029 PHC/PHF) Liste de Pièces',
    },
}

applied = 0
for d in data['docs']:
    fn = d.get('original_filename', '')
    if fn in fixes:
        for field, val in fixes[fn].items():
            d[field] = val
        applied += 1

with open('scripts/docs-a-classer-report-horlogerie.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'Applied fixes to {applied} docs')
print('Re-validating...')

# Re-validate
import re
docs_done = [d for d in data['docs'] if d.get('status') == 'done']
errors = []
for d in docs_done:
    fn = d.get('original_filename', '')
    title_en = d.get('title_en', '')
    title_fr = d.get('title_fr', '')
    price = d.get('price', 0)
    m = re.search(r'\$(\d+)', fn)
    if m:
        expected = int(m.group(1)) * 100
        if price != expected:
            errors.append(f'PRICE [{fn}]: {price} != {expected}')
    if len(title_en) > 60:
        errors.append(f'TITLE_EN [{len(title_en)}] {fn}: {title_en}')
    if len(title_fr) > 60:
        errors.append(f'TITLE_FR [{len(title_fr)}] {fn}: {title_fr}')

if errors:
    print(f'{len(errors)} remaining errors:')
    for e in errors:
        print(' ', e)
else:
    print('All clear - no more errors!')
