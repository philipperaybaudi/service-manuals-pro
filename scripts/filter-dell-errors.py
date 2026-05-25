"""
filter-dell-errors.py
Filtre comprehensive-dell-errors.json pour supprimer les faux positifs
causés par la collision de base slug (plusieurs slugs → même PDF).

Règle : si le même pdf_path est utilisé pour plusieurs slugs ayant la même base,
c'est une collision → ces slugs sont incertains, pas des vraies erreurs.

Sortie : comprehensive-dell-errors-filtered.json (seules vraies erreurs définitives)
"""
import json, re
from pathlib import Path
from collections import defaultdict

SCRIPT_DIR = Path(__file__).parent
INPUT  = SCRIPT_DIR / "comprehensive-dell-errors.json"
OUTPUT = SCRIPT_DIR / "comprehensive-dell-errors-filtered.json"


def compute_base(slug):
    return re.sub(r'-[a-z]{2,3}(-[a-z]{2,3})?(-\d+)?$', '', slug)


with open(INPUT, encoding='utf-8') as f:
    data = json.load(f)

errors = data.get("true_error", [])

# ── 1. Identifier les collisions de base slug ─────────────────────────────────
# Pour chaque pdf_path, quels slugs y pointent ?
pdf_to_entries = defaultdict(list)
for e in errors:
    pdf_to_entries[e["pdf_path"]].append(e)

collision_slugs = set()
for pdf, entries in pdf_to_entries.items():
    if len(entries) <= 1:
        continue
    # Plusieurs slugs → même PDF
    bases = set(compute_base(e["slug"]) for e in entries)
    if len(bases) == 1:
        # Tous la même base → collision certaine (base fallback)
        for e in entries:
            collision_slugs.add(e["slug"])
        print(f"  COLLISION (base={next(iter(bases))})")
        for e in entries:
            print(f"    - {e['slug']} → {e['slug_lang']}→{e['char_detected']}")

# ── 2. Filtrer : garder seulement les erreurs définitives sans collision ───────
real_errors = [
    e for e in errors
    if e["confidence"] == "definitive"
    and e["slug"] not in collision_slugs
]

# ── 3. Rapport ────────────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
print(f"  FILTRE FAUX POSITIFS")
print(f"{'═'*60}")
print(f"  Total errors (JSON) : {len(errors)}")
print(f"  Collisions base slug supprimées : {len(collision_slugs)}")
print(f"  Erreurs probables supprimées    : {sum(1 for e in errors if e['confidence'] == 'probable')}")
print(f"  → Vraies erreurs définitives    : {len(real_errors)}")

if real_errors:
    print(f"\n  — ERREURS À CORRIGER —")
    for e in real_errors:
        print(f"    {e['slug']}")
        print(f"      slug={e['slug_lang']} | réel={e['char_detected']} | {e['reason']}")

# Format compatible fix-dell-true-errors.mjs
output = {"true_error": real_errors}
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n  Sauvegardé : {OUTPUT}")
print(f"{'═'*60}\n")
