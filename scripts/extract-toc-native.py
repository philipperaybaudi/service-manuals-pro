"""
Extrait le texte des pages de table des matières
pour les 4 PDFs natifs (texte extractable).
Résultats : affichage console pour vérification.
"""
import sys, fitz
sys.stdout.reconfigure(encoding='utf-8')

BASE = "C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOSSIER SOURCE\\Catégories\\Bricolage & DIY\\ELECTRONIQUE\\"

TARGETS = [
    {
        'label': 'Dépannage Transistors',
        'file': 'Dépannage des Radiorécepteurs à Transistors $15.pdf',
        'pages': [6, 7, 8],   # 0-indexed → pages 7-9 du PDF
    },
    {
        'label': 'Memento Tungsram Vol.3',
        'file': 'Memento Tungsram 3ème volume Guide Radio Dépannage $20.pdf',
        'pages': [408, 409],  # 0-indexed → pages 409-410
    },
    {
        'label': 'Pannes Radio',
        'file': 'Pannes Radio $18.pdf',
        'pages': [347],       # 0-indexed → page 348
    },
    {
        'label': 'Réparation Transistors',
        'file': 'Réparation des Récepteurs à Transistors $17.pdf',
        'pages': [229, 230, 231],  # 0-indexed → pages 230-232
    },
]

for t in TARGETS:
    print(f"\n{'='*60}")
    print(f"  {t['label']}  —  pages {[p+1 for p in t['pages']]}")
    print('='*60)
    try:
        doc = fitz.open(BASE + t['file'])
        for p in t['pages']:
            if 0 <= p < len(doc):
                text = doc[p].get_text().strip()
                print(f"\n--- Page {p+1} ---")
                print(text[:2000])
            else:
                print(f"  ⚠️  Page {p+1} hors limites (total: {len(doc)})")
        doc.close()
    except Exception as e:
        print(f"  ❌ ERREUR: {e}")
