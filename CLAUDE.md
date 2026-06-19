# 🛑 CLAUDE.md — PRODUCTION SAFE MODE (SERVICE-MANUALS-PRO)

## 🔴 RÈGLE ZÉRO — LIRE AVANT DE FAIRE (NON-NÉGOCIABLE, PRIORITÉ ABSOLUE)

**AVANT de répondre à n'importe quelle demande, sans exception :**

> **Lire CLAUDE.md en entier. Du début à la fin. Maintenant.**

❌ Ne jamais supposer qu'on se souvient d'une règle.
❌ Ne jamais commencer à agir avant d'avoir fini de lire.
❌ Ne jamais réinventer ce qui est déjà défini ici.
❌ Ne jamais improviser une solution sans avoir vérifié qu'elle n'est pas déjà documentée.

✅ Lire → comprendre → vérifier → agir.

**Cette règle s'applique :**
- Au début de chaque session
- À chaque nouvelle demande dans une session en cours
- Quelle que soit la longueur de la session
- Même si la session est reprise plusieurs jours ou semaines plus tard
- SANS EXCEPTION, SANS JAMAIS DÉROGER

**Pourquoi :** Les mêmes erreurs sont répétées depuis 3 mois parce que cette étape est sautée. Chaque erreur coûte du temps, des tokens et de la confiance.

---

# 🏗️ SYSTEM ARCHITECTURE

## Platforms

* service-manuals-pro.com (EN)
* service-manuels-pro.fr (FR)

Shared:

* database
* PDFs
* catalog

---

## Stack

* Next.js (App Router, edge)
* Cloudflare Pages (⚠️ 3 MiB limit)
* Supabase (PostgreSQL + Storage)
* Cloudflare R2 (private PDFs)
* Stripe (payments)

---

# 🗄️ DATABASE

## Table: documents

Fields:

* slug (unique)
* title
* title_fr
* description
* description_fr
* brand_id
* category_id
* price (integer, cents)
* file_path (R2)
* preview_url
* page_count
* active
* featured
* language (fr-only | en-only)

---

## Table: brands

Rules:

* slug unique globally
* names in UPPERCASE
* can exist across categories
* ⚠️ Une même marque (même nom) peut avoir plusieurs entrées dans la table brands (une par catégorie) → toujours utiliser `IN` et non `=` dans les sous-requêtes SQL sur `brands.name`

---

## Table: categories

* ~22 categories
* ordered via display_order
* ⚠️ Les slugs sont EN ANGLAIS — exemples : `home-appliances` (électroménager), `machine-tools` (machines-outils), `audio-hifi`, `photography`, `electronics`, `watchmaking` (horlogerie)
* Ne JAMAIS utiliser des slugs français dans les requêtes SQL

## Correspondance catégorie — valeurs exactes (CRITIQUE)

⚠️ Le champ `category_fr` dans le JSON doit contenir la **clé exacte** du CATEGORY_MAP de `import-from-report.mjs` — ni le slug EN, ni une variante minuscule. Toute divergence → "Catégorie inconnue" et import bloqué.

| Valeur exacte `category_fr` (clé CATEGORY_MAP) | Slug EN |
|---|---|
| `Alarme & Surveillance` | `alarm-security` |
| `Animaux & Soins` | `pet-care` |
| `Audio & HiFi` | `audio-hifi` |
| `Automobile` | `automotive` |
| `Autonomie` | `autonomy` |
| `Biomédical` | `biomedical` |
| `Bricolage & DIY` | `diy-home-improvement` |
| `Camping & Caravaning` | `camping-rv` |
| `Chauffage & Clim` | `heating-cooling` |
| `Cinéma & Vidéo` | `cinema-video` |
| `Drones` | `drones` |
| `Électroménager` | `home-appliances` |
| `Électronique` | `electronics` |
| `Équipements Sportifs` | `sports-equipment` |
| `Horlogerie` | `watchmaking` |
| `Informatique` | `computers-it` |
| `Machines-Outils` | `machine-tools` |
| `Marine` | `marine` |
| `Motoculture` | `outdoor-power` |
| `Nature` | `nature` |
| `Photographie` | `photography` |
| `Radio & Communications` | `radio-communications` |
| `Société & Soi` | `society-culture` |
| `Téléphonie & Télécom` | `phones-telecom` |
| `Télévision` | `television` |
| `Usinage` | `machining` |

---

# 📦 STORAGE

## PDFs (R2)

* bucket: service-manuals-documents
* path: documents/{slug}.pdf
* private access only
* download via signed URL after Stripe payment

---

## Previews

* bucket: logos
* path: previews/{slug}.jpg

---

# 🖥️ LOCAL STRUCTURE

SHEMATHEQUE/

* DOSSIER SOURCE → input PDFs
* DOCS EN LIGNE → validated archive

---

# 🌍 LANGUAGE SYSTEM & RÈGLES FONDAMENTALES

## Language display logic

* Controlled ONLY via Cloudflare header: `x-locale`

Display logic:

* title = title_fr if locale=fr else title
* description = description_fr if locale=fr else description

NO other localization system exists.

---

## 🌍 RÈGLE BILINGUE FONDAMENTALE (NON-NÉGOCIABLE)

**Chaque document = UN PDF source (une seule langue).
Les deux sites (EN et FR) partagent la MÊME base de données.**

**Display logic:**
- Site EN affiche: `title`, `description`
- Site FR affiche: `title_fr`, `description_fr`

**RÈGLE ABSOLUE:**
- Site EN doit TOUJOURS être en **ANGLAIS** (titre + description)
- Site FR doit TOUJOURS être en **FRANÇAIS** (titre_fr + description_fr)

**Peu importe la langue du PDF source.**
**Peu importe si le document est un PDF anglais ou français.**

Cette règle s'applique depuis 10.000+ PDFs importés. C'est la fondation du système.

---

## Visibility

### Règle par défaut (NON-NÉGOCIABLE)

* `language = null` → document visible sur les DEUX sites (FR et EN)
* C'est le comportement par défaut pour TOUS les documents, TOUTES marques confondues

### Exceptions (UNIQUEMENT sur demande explicite)

* `language = "fr-only"` → uniquement si l'utilisateur le demande expressément pour un document précis
* `language = "en-only"` → uniquement si l'utilisateur le demande expressément pour un document précis

⚠️ Ne JAMAIS appliquer fr-only ou en-only de sa propre initiative

---

# ⛔ RÈGLES ABSOLUES (NON-NEGOTIABLE)

## SOURCE OF TRUTH

This file is the ONLY valid source of information.

* NEVER use external knowledge
* NEVER assume architecture
* NEVER guess missing information

If something is not defined:
→ reply exactly: **"NOT DEFINED IN CLAUDE.md"**

---

## 🔐 ACTION CONTROL (CRITICAL)

The codebase MAY contain additional information.

However:

- You are allowed to READ code
- You are NOT allowed to ACT on anything not defined in CLAUDE.md

This means:

- You may mention external services (e.g. Resend) if found in code
- BUT you must NOT modify, depend on, or extend them unless defined here

## 🚫 WRITE RESTRICTIONS

You are NOT allowed to:

- modify database structure
- insert data without validation pipeline
- delete data without confirmation
- bypass import pipeline

Even if the code suggests it is possible

## 🚨 SYSTEM MODE: SECURE IMPORT OPERATOR

You are not a general assistant.

You are a **STRICT, SAFE, PRODUCTION OPERATOR** for a live e-commerce system.

Your role is to:

* assist with PDF import pipeline
* enforce data integrity
* prevent any corruption of database or storage
* NEVER improvise or assume anything

---

## 🚫 CODEBASE ACCESS RESTRICTION

You MUST NOT use the codebase to infer missing information.

Forbidden:
- reading .env files
- scanning source code to discover services
- extracting architecture from implementation

Even if the code contains information:
→ IGNORE IT if not defined in CLAUDE.md

The codebase is NOT a source of truth.
Only CLAUDE.md is.

---

## 🛑 NO RUNTIME DISCOVERY

You are NOT allowed to:

- inspect environment variables
- infer services from API routes
- deduce architecture from code structure

If user asks something not defined:
→ reply EXACTLY: "NOT DEFINED IN CLAUDE.md"

---

## ❌ STRICTLY FORBIDDEN

* Inventing tools, APIs, services (Resend, DeepL, etc.)
* Inventing scripts or counts
* Modifying architecture assumptions
* Bypassing validation steps
* Writing directly to database without validation
* Deleting data without explicit confirmation
* Modifying protected documents
* Generating fake descriptions

---

## 🛑 DANGEROUS ACTIONS REQUIRE CONFIRMATION

Before executing ANY of these:

* delete document
* modify database
* overwrite files
* bulk operations

You MUST ask:
→ "CONFIRM OPERATION"

And WAIT for explicit confirmation.

---

# 🚦 AVANT D'AGIR — RÈGLES ESSENTIELLES

## 📖 RÈGLE LECTURE PDF (NON-NÉGOCIABLE)

Avant de modifier description, description_fr, ou TOC:

1. **Lis les PDFs réels** (pages 1-3 minimum)
2. **Vois le contenu exactement** comme il apparaît
3. **Ne suppose RIEN** sur la structure ou le contenu
4. **Copie/adapte le contenu réel** (pas invente, pas déduis, pas traduit si c'est du copie-colle)

Ne JAMAIS:
- Coder un script avant de lire le PDF
- Supposer qu'une traduction automatique suffira
- Inventer une structure sans vérifier le PDF

Coût d'une erreur "je pensais que...": heures de debugging.

---

## 🛑 CHECKLIST — AVANT D'ÉCRIRE TOUT SCRIPT DE MODIFICATION

Avant de toucher à la base ou créer un script pour modifier les descriptions:

1. ☐ As-tu LU CLAUDE.md EN ENTIER ?
2. ☐ As-tu LU les PDFs (pages 1-3 minimum) pour voir le contenu RÉEL ?
3. ☐ As-tu présenté un PLAN DÉTAILLÉ avec les textes EXACTS (entre guillemets) que tu vas publier ?
4. ☐ L'utilisateur a-t-il dit OUI explicitement au plan ?
5. ☐ Tu vas exécuter EXACTEMENT ce plan sans déviation, sans ajout, sans "amélioration" ?

Si la réponse à L'UNE de ces questions est NON → STOP. Ne code pas.

---

## 🧠 RÈGLE ANTICIPATION — SOLUTION ROBUSTE D'ABORD (NON-NÉGOCIABLE)

Avant de proposer ou créer TOUT script de traitement en masse :

1. **Identifier les cas limites** : quels types de données peuvent poser problème ?
2. **Évaluer la fiabilité des outils** : l'outil proposé est-il adapté à TOUS les cas ?
3. **Proposer la solution la plus robuste**, pas la plus rapide à écrire

### Exemples de cas limites à anticiper systématiquement

| Situation | Risque | Solution robuste |
|---|---|---|
| Détection de langue | Scripts CJK, arabe, hébreu, thaï | Unicode ranges avant langdetect |
| Génération de previews | Polices manquantes (CJK, arabe) | PyMuPDF avec fonts système |
| Import en masse | Conflits de slug | Vérification unicité avant import |
| Renommage R2/Supabase | Fichier source absent | Fallback upload local |

### Interdiction absolue

❌ Ne JAMAIS proposer un outil/script dont les limites connues peuvent affecter des données en production, en espérant que le problème ne se manifeste pas.

✅ Identifier le problème **avant** qu'il apparaisse sur les données du client.
✅ Si un outil a des limites connues → le dire explicitement et proposer l'alternative robuste.

**Coût d'une erreur non anticipée = heures de correction + tokens gaspillés + données clients incorrectes.**

---

## 🚦 RÈGLE FEU VERT — SCRIPTS (NON-NÉGOCIABLE)

Ne JAMAIS créer ni lancer un script avant que :

1. La discussion soit complète et tous les détails calés
2. L'utilisateur ait dit explicitement "vas-y" (feu vert)

Même si la solution est évidente → ATTENDRE le feu vert.
Même si un script ad hoc semble nécessaire → DISCUTER D'ABORD, ne rien créer.

---

## 🚦 RÈGLE FEU VERT — PLANS DÉTAILLÉS (NON-NÉGOCIABLE)

Avant toute modification de données (descriptions, titles, TOCs):

1. **Présenter un plan avec textes EXACTS** (entre guillemets)
   - Exemple MAUVAIS: "description: ajouter la TOC"
   - Exemple BON: `description: "Complete user manual IN ENGLISH for the Widelux 35mm..."`

2. **Attendre validation EXPLICITE** de l'utilisateur

3. **Exécuter EXACTEMENT** ce qui a été validé
   - Pas d'amélioration spontanée
   - Pas d'ajout non prévu
   - Pas de "petite correction"

Si tu improvises → ERREUR DE PRODUCTION.
Si tu dévies du plan → ERREUR DE PRODUCTION.

---

## 🧨 RÈGLE VÉRIFICATION AVANT AFFIRMATION (NON-NÉGOCIABLE)

### Interdiction d'affirmer sans preuve

**TOUTE affirmation dans une réponse doit être le résultat d'une investigation réelle et vérifiable.**

### ❌ STRICTEMENT INTERDIT

* Affirmer une cause sans l'avoir vérifiée (ex : "les PDFs ne sont pas en local" sans avoir listé le dossier)
* Inventer une explication pour justifier un échec ou une erreur
* Utiliser des formulations du type "probablement", "certainement", "c'est normal" sans preuve
* Proposer une hypothèse non vérifiée comme si c'était un fait établi
* Masquer une ignorance derrière une justification technique inventée

### ✅ COMPORTEMENT OBLIGATOIRE

Avant toute affirmation sur :
- l'existence ou l'absence d'un fichier → **utiliser Glob ou Bash pour vérifier**
- la cause d'un échec → **lire les logs, le code, ou les données réelles**
- l'état d'une donnée en base → **interroger Supabase**
- le comportement d'un script → **lire le script**

Si la vérification est impossible dans le contexte actuel :
→ Dire exactement : **"Je ne peux pas vérifier — à confirmer par l'utilisateur."**

### Coût d'une affirmation non vérifiée

* Tokens gaspillés sur des corrections d'erreurs inventées
* Crédits Anthropic consommés inutilement
* Perte de confiance
* Travail de correction supplémentaire pour l'utilisateur

**Une réponse incorrecte mais assurée est pire qu'un "je ne sais pas".**

---

# 🧠 OPERATING MODE

You must behave as:

✔ Data integrity validator
✔ Import pipeline controller
✔ Risk prevention system

NOT as:
❌ Creative assistant
❌ Full-stack developer
❌ Architect

---

# ⚙️ IMPORT PIPELINE (MANDATORY)

## Phase 0 — Déverrouillage PDF (OBLIGATOIRE, avant classify)

### 🔐 RÈGLE ABSOLUE : TOUT PDF IMPORTÉ DOIT ÊTRE DÉVERROUILLÉ

Avant toute classification, vérifier et lever les protections PDF du dossier source.

**Pourquoi :** Les PDFs avec owner password (restrictions d'impression/copie) sont techniquement lisibles mais leur contenu est partiellement bloqué. Un client qui achète un tel document ne peut pas l'imprimer ni le copier → plainte garantie.

**Commande à exécuter sur le dossier source AVANT classify :**

```
python -X utf8 "C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\hp-unlock-pdfs.py"
```

⚠️ Adapter le chemin `SOURCE_DIR` dans le script selon la marque/dossier en cours.

Ou utiliser le script générique sur DOCS EN LIGNE :

```
python -X utf8 "C:\Users\adm\Claude Doc GB test\service-manuals-pro\scripts\scan-unlock-docs-en-ligne.py"
```

**Résultat attendu :**
* `MDP requis : 0` — idéal, tous déverrouillables sans mot de passe
* Si `MDP requis > 0` → signaler à l'utilisateur, ne pas importer ces fichiers

**Outil :** `pikepdf` (`pip install pikepdf`)
Lève les owner passwords sans connaître le mot de passe.
Ne peut PAS lever un user password (verrou à l'ouverture) → nécessite le MDP.

---

## Phase 1 — Classification

Command:

node scripts/classify-docs.mjs {Category}

### ⚠️ RÈGLE classify-single.mjs — SOUS-DOSSIER MARQUE OBLIGATOIRE

Pour classifier un seul fichier avec `classify-single.mjs`, le fichier DOIT être placé dans un sous-dossier portant le nom de la marque à l'intérieur du dossier catégorie :

```
DOSSIER SOURCE\Catégories\{Catégorie}\{NOM_MARQUE}\fichier.pdf
```

❌ Ne JAMAIS placer le fichier directement dans `DOSSIER SOURCE\Catégories\{Catégorie}\`
→ Sans sous-dossier marque, Claude Vision ne détecte pas la marque et utilise la catégorie à la place → import avec la mauvaise marque garanti.

✅ Exemple correct :
```
DOSSIER SOURCE\Catégories\Photographie\NIKON\Nikon F Manuel emploi FR $12.pdf
node scripts/classify-single.mjs "Photographie" "Nikon F Manuel emploi FR $12.pdf"
```

⚠️ Le 2e argument de classify-single.mjs est le nom du fichier seul (sans le sous-dossier marque).

Output:

* JSON report
* previews generated

### ⚙️ Réglage coût API (NON-NÉGOCIABLE)

`MAX_PAGES_CLAUDE = 3` dans `classify-docs.mjs` — NE PAS augmenter.

3 pages suffisent pour identifier le modèle et générer une description correcte.
Passer à 10 pages multiplie le coût par ~3 sans gain significatif de qualité.

---

## 🚨 VALIDATION STEP (MANDATORY)

Before Phase 2, you MUST verify:

* slug uniqueness
* no duplicates
* price consistency
* correct language fields
* description quality

IF ANY ERROR:
→ STOP PROCESS

---

## 🚨 RÈGLE BUNDLE seo_tags (OBLIGATOIRE — AVANT PHASE 2 ET À CHAQUE MODIFICATION)

Le système de téléchargement fonctionne ainsi :
- Si `seo_tags` contient **≥ 2 entrées `file:`** → le client télécharge CES fichiers (pas `file_path`)
- Si `seo_tags` contient **0 ou 1 entrée `file:`** → le client télécharge `file_path` directement
- La **preview** est toujours générée depuis `file_path` — indépendamment des `file:` entries

⚠️ Ces deux chemins peuvent pointer vers des contenus DIFFÉRENTS → incohérence invisible sans vérification.

### Avant toute validation Phase 2 OU modification de seo_tags :

1. **Vérifier que chaque fichier `file:` existe dans R2** (ne pas supposer)
2. **Vérifier que le contenu de chaque `file:` correspond au produit** (même appareil, même document, pas un autre modèle)
3. **Vérifier la cohérence preview ↔ téléchargement** :
   - Si le produit a des `file:` entries → la preview doit correspondre au contenu de CES fichiers
   - Si le produit n'a pas de `file:` entries → la preview correspond à `file_path` ✓
4. **Ne JAMAIS laisser des `file:` entries pointant vers un contenu différent du titre/description**

### ❌ Erreur type à ne jamais reproduire

Preview = PHOT ARGUS Nikon F4s (correct, depuis `file_path`)
`file:` entries = Repair Manual 200p + Notice 111p (mauvais contenu)
→ Le client paie pour le PHOT ARGUS et reçoit autre chose → litige garanti

### ✅ État correct d'un bundle

`file_path` → preview générée ici (couverture du produit)
`file:` entries → contenu IDENTIQUE au titre/description, vérifié visuellement avant validation

---

## Phase 2 — Import

Commands:

node scripts/import-from-report.mjs {Cat} --dry-run
node scripts/import-from-report.mjs {Cat}

Actions:

* check duplicate slug
* create brand if needed
* upload preview
* upload PDF to R2
* insert into database
* move file to DOCS EN LIGNE
* update JSON status

### ⚠️ LIMITE IO SUPABASE (NON-NÉGOCIABLE)

Ne jamais importer plus de **400-500 documents par session**.
Au-delà, le quota Disk IO Supabase est épuisé → ralentissements ou indisponibilité.
Si un lot dépasse 500 docs → le découper en sous-lots sur plusieurs jours.

---

# ❌ DELETE

Command:

node scripts/delete-doc.mjs {slug}

⚠️ ALWAYS REQUIRE CONFIRMATION

---

# 📝 CONTENT RULES

## Titles

* max 60 chars
* never translate brand/model
* use correct translation patterns

---

## Descriptions

STRICT:

* ONLY describe actual PDF content
* NEVER invent
* NO HTML
* plain text only
* NEVER mention language

Special case:

* schema → short factual description only

### ⚠️ EXCEPTION — Documents multilingues (OBLIGATOIRE)

La règle "NEVER mention language" s'applique à la langue du document lui-même (ne jamais dire "this document is in English/French").

Elle NE s'applique PAS quand le PDF source mentionne explicitement "multilingue" / "multilingual" / "multi-language" (ex: notice imprimée en plusieurs langues par le fabricant) :

→ **Conserver** cette information dans la description (EN et FR) — c'est une caractéristique factuelle réelle du document, pas une mention de langue interdite.

Exemple à conserver : "Multilingual documentation in English, German, French, Spanish and Japanese." / "Documentation multilingue en anglais, allemand, français, espagnol et japonais."

---

## Descriptions bilingues — Structure exacte

Chaque document a deux champs de description:

**`description` (affiché site EN):**
- Doit OBLIGATOIREMENT être EN ANGLAIS
- Si PDF source est EN: contenu direct du PDF
- Si PDF source est FR: traduire le contenu du PDF EN ANGLAIS

**`description_fr` (affiché site FR):**
- Doit OBLIGATOIREMENT être EN FRANÇAIS
- Si PDF source est EN: traduire le contenu EN FRANÇAIS
- Si PDF source est FR: contenu direct du PDF

⚠️ JAMAIS mélanger les langues.
⚠️ JAMAIS supposer qu'une langue "fera l'affaire" pour les deux sites.

---

## 📑 RÈGLE FICHIERS PDF AVEC AROBASE « @ » (OBLIGATOIRE)

Si le nom du fichier PDF se termine par ` @` (ex : `ManuelPhoto1899 @.pdf`) :

→ Chercher la table des matières dans le PDF.

Si elle est présente :

* L'ajouter à la fin de la description (description et description_fr)
* Format : liste à puces, séparée de la description par un saut de ligne
* Une entrée par ligne, préfixée par `- `
* Plain text uniquement — pas de HTML

Si aucune table des matières n'est trouvée → description normale sans ajout.

---

## 📑 RÈGLE TABLE DES MATIÈRES — DOCUMENTS ≥ $20 (OBLIGATOIRE)

Pour **tout document dont le prix est ≥ $20**, après la génération de la description :

1. Chercher la page TOC dans le PDF (pages 1 à 25 maximum) — détection par mot-clé seulement.
2. Si une page TOC est trouvée → extraire via **Claude Vision** (voir ci-dessous).
3. Si aucune TOC n'est trouvée → description normale sans ajout.

### 🚫 INTERDICTION ABSOLUE — `get_text()` pour l'extraction TOC

**NE JAMAIS extraire le contenu d'une TOC avec `page.get_text()` seul.**

L'OCR brute ramasse indifféremment : emails, tampons de version, doublons, en-têtes, pieds de page, numéros de modèles — le résultat est inutilisable sur tout PDF scanné ou remasterisé.

### ✅ MÉTHODE OBLIGATOIRE : Claude Vision

```python
import base64, requests

# 1. Trouver la page (détection par mot-clé — get_text() OK pour ça)
# 2. Convertir en image
mat = fitz.Matrix(150/72, 150/72)
pix = doc[toc_page_idx].get_pixmap(matrix=mat, colorspace=fitz.csRGB)
page_b64 = base64.b64encode(pix.tobytes('png')).decode()

# 3. Envoyer à Claude Vision
PROMPT = ("Extract ONLY the table of contents entries from this page. "
          "Return a clean list of chapter/section titles, one per line. "
          "Exclude: page numbers, headers, footers, version stamps, dates, "
          "email addresses, URLs, standalone model numbers. No commentary.")

r = requests.post('https://api.anthropic.com/v1/messages',
    headers={'x-api-key': ANTHROPIC_KEY,
             'anthropic-version': '2023-06-01',
             'content-type': 'application/json'},
    json={'model': 'claude-haiku-4-5-20251001', 'max_tokens': 2048,
          'messages': [{'role': 'user', 'content': [
              {'type': 'image', 'source': {'type': 'base64',
               'media_type': 'image/png', 'data': page_b64}},
              {'type': 'text', 'text': PROMPT}
          ]}]})
toc_lines = [l.strip().lstrip('•-–—*').strip()
             for l in r.json()['content'][0]['text'].splitlines()
             if len(l.strip()) >= 4]
```

⚠️ **`max_tokens` TOUJOURS à 2048 minimum** pour les appels TOC et traduction.
1024 est insuffisant pour 30+ lignes et tronque le dernier item silencieusement.

### PDFs image-only ou OCR trop bruité

Si `get_text()` ne détecte pas de page TOC (PDF scanné sans couche texte) :
→ Essayer Claude Vision sur les **5 premières pages** une par une.
→ Claude Vision lit les images directement et extrait les titres même sans OCR.
→ Script de référence : `scripts/cincinnati-fix-missing-toc-vision.py`

### Documents volumineux (> 1000 pages)

Pour les manuels très épais (ex : 5564 pages), la TOC peut s'étendre sur 30-50 pages.
→ Scanner jusqu'à **150 pages** (équilibre qualité/coût).
→ Extraire chaque page TOC via Claude Vision → collecter tous les titres bruts.
→ Synthétiser en **50 lignes** via Claude (prompt explicite couvrant TOUS les systèmes proportionnellement).
→ **NE PAS dépasser 400 pages** : les pages de TOC de section gonflent un seul système de façon disproportionnée.
→ Script de référence : `scripts/ford-explorer-write-toc.py`

### PDFs multi-sections (TOC distribuées dans tout le document)

Certains PDFs volumineux (manuels de service automobile, industriels, etc.) ont **une TOC par section**, réparties tout au long du document (ex : Isuzu D-Max 6020 pages, 86 sections).

#### Quand appliquer cette règle

- PDF avec de nombreuses sections indépendantes, chacune ayant sa propre page TOC
- Les pages TOC ne sont **pas** regroupées au début du document
- Le document couvre plusieurs systèmes/domaines distincts (ex : moteur, transmission, électrique, carrosserie…)

#### ✅ MÉTHODE OBLIGATOIRE — Pré-extraction en 3 phases

**Phase 1 — Scan rapide (sans API) :**
→ Parcourir TOUTES les pages via `get_text()` pour détecter les pages TOC (mots-clés + présence de numéros de page).
→ Aucun appel API — rapide même sur 6000+ pages.

**Phase 2 — Extraction Vision section par section :**
→ Pour chaque page TOC détectée, envoyer à Claude Vision (claude-haiku).
→ Prompt : extraire UNIQUEMENT les titres de niveau 1 (pas les sous-chapitres).
→ DPI = 120 (compromis qualité/taille image).

**Phase 3 — TOC global en .txt :**
→ Assembler toutes les sections dans un fichier `.txt` structuré.
→ Ce fichier est la **source de vérité** pour l'import.

#### Workflow d'import avec pré-extraction

1. Lancer le script d'extraction → `{Nom-Manuel}-Global-TOC.txt` sur le Bureau
2. Valider/corriger le `.txt` manuellement si besoin
3. Phase 1+2 classify/import normales (description courte générée par classify)
4. Après Phase 2 : script ciblé lit le `.txt` et met à jour `description` + `description_fr` (traduit) en DB

**Avantages :**
- TOC validée avant import → qualité garantie
- Pas de Vision calls redondants en Phase 3
- Le `.txt` sert de source de vérité réutilisable

#### ⚠️ RÈGLE BILINGUE (identique aux autres cas)

- `description` (EN) → TOC dans la langue du PDF
- `description_fr` (FR) → TOC traduite en français via `deep_translator`

#### Script de référence

`scripts/isuzu-dmax-extract-global-toc.py`

Paramètres clés à adapter :
- `PDF_PATH` → chemin du PDF source
- `OUTPUT_PATH` → chemin du fichier `.txt` de sortie
- `TOC_KEYWORDS` → mots-clés de détection (adapter selon la langue du manuel)
- `MIN_PAGE_NUMBERS` → seuil de détection (défaut : 4)

### Remplacement de preview par une photo personnalisée

Si l'utilisateur fournit une photo (couverture physique, scan, etc.) :
1. Enregistrer le JPG sous `{slug}.jpg`
2. Upload direct vers Supabase avec un script dédié (pas `fix-missing-preview.mjs`)
3. Script de référence : `scripts/upload-ford-explorer-preview.mjs`

### ⚠️ RÈGLE BILINGUE ABSOLUE (NON-NÉGOCIABLE)

* `description` (site EN) → TOC items **dans la langue du PDF**
* `description_fr` (site FR) → TOC items **en français** (traduits si PDF en anglais)

⛔ **TOUTE modification de TOC (insertion, correction, casse, nettoyage) doit TOUJOURS être appliquée simultanément sur `description` ET `description_fr`. Sans exception. Modifier un seul champ = erreur de production.**

Outil : `deep_translator` (Google Translate, gratuit)
```python
from deep_translator import GoogleTranslator
translated = GoogleTranslator(source='en', target='fr').translate(line)
```

### 📑 RÈGLE TOC — Placement et langue

Les TOCs doivent être DANS LA MÊME LANGUE que le champ où elles s'affichent:

- `description` (site EN): TOC EN ANGLAIS
- `description_fr` (site FR): TOC EN FRANÇAIS

Si un document contient un PDF anglais ET un PDF français (cas Widelux exception):
- Document PDF EN: 
  - description: TOC du PDF EN (anglais)
  - description_fr: PAS de TOC (ou description sans TOC)
  
- Document PDF FR:
  - description: PAS de TOC (ou description sans TOC)
  - description_fr: TOC du PDF FR (français)

⚠️ JAMAIS mettre une TOC EN ANGLAIS dans description_fr.
⚠️ JAMAIS mettre une TOC EN FRANÇAIS dans description.

### Format d'insertion

```
[Description commerciale]

Table of Contents:
SECTION TITLE (majuscules — titre de section/paragraphe)
- Titre du chapitre en casse normale
- Autre chapitre en casse normale
```
(EN dans `description`, FR traduit dans `description_fr` avec header `Table des matières :`)

### ⚠️ RÈGLE DE CASSE ET GRAS DES TOC (OBLIGATOIRE)

**Rendu automatique par `formatDescription()` dans `page.tsx` :**
* `Table of Contents:` / `Table des matières :` → **gras** (`font-bold`)
* Lignes entièrement en **MAJUSCULES** (sans `- `) → **gras** (`font-bold`) — titres de section/groupe
* Lignes en **casse normale** (sans `- `) → poids normal — sous-titres/items sans puce
* Lignes `- item` → liste à puces `<li>` — poids normal

**Règle de saisie dans description / description_fr :**
- Titres de section/groupe → **MAJUSCULES** (ex : `GROUPE 11A MÉCANIQUE MOTEUR`, `SECTION ENGINE`)
- Items de chapitre avec puce → `- Casse normale` (première lettre majuscule, reste minuscules)
- Items sans puce (sous-sections) → `Casse normale` (première lettre majuscule, reste minuscules)
- NE PAS utiliser de HTML ou markdown — le rendu est géré entièrement par `formatDescription()`

**Script de correction de casse existant :** `scripts/fix-toc-case.py`
→ Convertit automatiquement les lignes `- MAJUSCULES` en `- Capitalize` sur tous les docs en base.

### ⚠️ RÈGLE TOC COURTE — PAS DE MENU DÉROULANT (OBLIGATOIRE)

Pour toute TOC de **moins de 10 lignes** (`- item`) :

→ **Pas de menu déroulant** (`<details>`/`<summary>`)
→ **Intégrée directement à la suite du descriptif**, affichée en permanence (titre en gras + liste)

Pour toute TOC de **10 lignes ou plus** : comportement standard (menu déroulant `<details>`).

Implémenté dans `formatDescription()` (`src/app/docs/[slug]/page.tsx`) — comptage automatique du nombre de lignes `- item` dans la TOC.
→ À relancer après chaque import de lot si des items en majuscules sont détectés.

### Description commerciale

La description qui précède la TOC doit être **vendeuse** : mettre en avant le nombre de pages,
les variantes couvertes, la valeur pour le mécanicien. Ne pas laisser une description
générique minimale sur un document premium.

### Idempotence

Avant d'ajouter, vérifier que `Table of Contents:` ou `Table des matières` ne sont pas déjà présents → si oui, ne rien faire (sauf correction explicite).

### Outillage — scripts de référence

| Cas | Script |
|---|---|
| Import standard (lot) | `automobile-fix-toc-vision.py` |
| PDF image-only / OCR bruité | `cincinnati-fix-missing-toc-vision.py` |
| Manuel > 1000 pages (TOC multi-pages) | `ford-explorer-write-toc.py` |
| PDF multi-sections (TOC réparties dans le doc) | `isuzu-dmax-extract-global-toc.py` |
| Preview personnalisée (photo utilisateur) | `upload-ford-explorer-preview.mjs` |

---

## 📰 RÈGLE REVUES PÉRIODIQUES (OBLIGATOIRE)

Les marques suivantes sont des **revues périodiques anciennes** :

* **ÉLECTRONIQUE PRATIQUE** (catégorie Électronique)
* **ELEKTOR** (catégorie Électronique)

Pour tout document de ces marques, la description DOIT inclure le **sommaire complet** à la fin (après la description générale).

### Procédure :

1. Lire le PDF pour identifier la page du sommaire (chercher "sommaire", "contents", "inhalt" ou équivalent)
2. Extraire le sommaire tel qu'il apparaît (titres des articles + numéros de page)
3. Ajouter à la fin de `description_en` : `Contents: [liste des articles avec pages]`
4. Ajouter à la fin de `description_fr` : `Sommaire : [liste des articles avec pages]`

### Format sommaire :

Le sommaire doit être une liste, séparé de la description par un saut de ligne :

```
[Description générale du numéro.]

Sommaire :
Section (si présente) :
- p.XX Titre de l'article
- p.XX Titre suivant
```

* Conserver les numéros de page tels qu'ils apparaissent dans la revue (ex: `10-19` pour Elektor)
* Respecter les sections si présentes (ex: "Réalisez vous-mêmes", "Expérimentez", etc.)
* Un article par ligne, préfixé par `- `
* Plain text uniquement — pas de HTML

### Si le PDF est scanné (pas de texte extractable) :

→ Utiliser PyMuPDF (`fitz`) pour exporter la page en PNG, puis lire l'image visuellement.

---

## 📅 RÈGLE ORDRE CHRONOLOGIQUE DES REVUES (OBLIGATOIRE)

Pour toute marque de **revue périodique** (ELEKTOR, ÉLECTRONIQUE PRATIQUE, etc.) :

* Les numéros doivent s'afficher sur le site **du plus ancien au plus récent**.
* L'ordre d'affichage est déterminé par l'ordre d'insertion en base (created_at).

### Règle d'import :

1. **Toujours trier les PDFs par date/numéro croissant AVANT de lancer classify.**
2. Classify et import doivent traiter les fichiers dans cet ordre (N°1 → N°2 → N°3 → …).
3. Le nom de fichier contient généralement la date ou le numéro — s'en servir pour trier.

### Si des numéros anciens arrivent après des numéros déjà importés :

→ Mettre à jour la colonne `created_at` des nouveaux documents pour les placer avant les existants.
→ Utiliser le script `update-price.mjs` comme modèle pour un script `update-created-at.mjs` si nécessaire.
→ Signaler à l'utilisateur que l'ordre en base a été ajusté.

---

# 💰 PRICING

* stored in cents
* if filename contains $X → price = X * 100

---

## 🚗 RÈGLES SPÉCIFIQUES CATÉGORIE AUTOMOBILE (automotive)

### Prix par défaut

* **$15** pour tout PDF Automobile dont le nom de fichier ne contient pas de tarif `$X`
* Si le nom contient un tarif explicite → appliquer ce tarif (règle générale)

### Workshop Service Manuals (manuels complets — plusieurs milliers de pages)

Certains PDFs Automobile sont des manuels d'atelier complets de plusieurs milliers de pages.

#### Identification

Un PDF est un **Workshop Service Manual complet** si :
- Il fait **plusieurs milliers de pages** (typiquement > 1 000 pages)
- Il s'agit d'un manuel d'atelier officiel couvrant l'intégralité des systèmes du véhicule

#### Prix

* **$45** (au lieu de $15)

#### Table des matières — OBLIGATOIRE (méthode Isuzu)

Ces manuels ont une TOC par section, réparties dans tout le document (pas regroupées au début).
→ Appliquer **obligatoirement** la méthode PDFs multi-sections définie plus bas dans ce fichier.

**Résumé de la méthode (détail complet dans la section "PDFs multi-sections") :**
1. Scan toutes les pages via `get_text()` → détecter les pages TOC (mots-clés + numéros)
2. Extraction Claude Vision (haiku, DPI=120) section par section → titres niveau 1 uniquement
3. Assembler en fichier `.txt` global → valider manuellement si besoin
4. Après import Phase 2 : script ciblé lit le `.txt` → met à jour `description` + `description_fr` en DB

Script de référence : `scripts/isuzu-dmax-extract-global-toc.py`

#### Description obligatoire

Ajouter **avant la table des matières** le bloc suivant, en adaptant le **nombre de pages réel** du PDF :

**`description` (EN) :**
```
Complete Official Workshop, Repair and Service Manual (Workshop Service Manual) for professional mechanics of the brand.
This exhaustive {N}-page document compiles what would correspond, in paper form, to about ten separate technical binders. It is the absolute encyclopedia of the vehicle, indispensable for disassembling and reassembling every component down to the smallest screw while respecting factory specifications.
```

**`description_fr` (FR) :**
```
Manuel complet d'Atelier Officiel de Réparation et de Service (Workshop Service Manual) destiné aux mécaniciens professionnels de la marque.
Ce document exhaustif de {N} pages compile ce qui correspondrait, en version papier, à une dizaine de classeurs techniques distincts. C'est l'encyclopédie absolue du véhicule, indispensable pour pouvoir démonter et remonter chaque élément jusqu'à la moindre vis en respectant les normes d'usine.
```

Remplacer `{N}` par le **nombre de pages réel du PDF** (`fitz.open(pdf).page_count`).

⚠️ Mettre à jour **les deux champs simultanément** (`description` + `description_fr`).

**Document de référence :** `isuzu-isuzu-d-max-factory-service-manual-2007-2010` (6 020 pages)

---

## ⌚ RÈGLES SPÉCIFIQUES CATÉGORIE HORLOGERIE (watchmaking)

### Previews
* Beaucoup de PDFs d'une seule page → appliquer la même règle que les schémas : **crop top-left 55%**

### Prix
* Distinguer deux types de documents :
  * **Fiche courte** (1 à ~5 pages) : prix bas (généralement 2,00 € à 5,00 €)
  * **Manuel de service complet** (>5 pages) : prix selon notoriété de la marque
* Ajuster les prix en fonction de la **notoriété de la marque** et des tarifs déjà pratiqués sur le site (visiter service-manuals-pro.com / service-manuels-pro.fr pour comparer les docs similaires déjà en ligne)
* Marques prestigieuses (ROLEX, PATEK PHILIPPE, OMEGA, etc.) → tarifs plus élevés
* Marques courantes → tarifs standards

---

# 🌐 DÉTECTION DE LANGUE — RÈGLE ABSOLUE DU PIPELINE

## Module obligatoire : `scripts/detect_language_robust.py`

**TOUJOURS** utiliser ce module pour toute détection de langue dans les scripts Python.
**JAMAIS** utiliser `langdetect` directement dans un script d'import.

```python
from detect_language_robust import detect_language_page1
lang_code = detect_language_page1("/chemin/vers/fichier.pdf")
```

## Pourquoi cette règle est non-négociable

`langdetect` est **fondamentalement peu fiable** pour les scripts non-latins :
- Confond régulièrement **chinois ↔ russe**, japonais ↔ autres, etc.
- Un seul doc mal étiqueté = preview incorrecte = plainte client = coût de correction élevé

## Stratégie du module (infaillible pour les scripts non-latins)

1. **Détection Unicode (prioritaire)** — déterministe, aucune ambiguïté :
   - Japonais : présence de hiragana/katakana (U+3040–U+309F / U+30A0–U+30FF)
   - Coréen : présence de hangul (U+AC00–U+D7AF)
   - Chinois : caractères CJK (U+4E00–U+9FFF) sans kana ni hangul
   - Arabe : U+0600–U+06FF
   - Hébreu : U+0590–U+05FF
   - Thaï : U+0E00–U+0E7F
2. **langdetect en fallback** — uniquement pour latin et cyrillique

## Règle PAGE 1 UNIQUEMENT

Analyser **seulement la page 1** (couverture) du PDF.
Le corps d'un manuel peut être multilingue → résultat erroné garanti si plusieurs pages analysées.

---

# 🖼️ PREVIEWS

Priority:

1. existing JPG
2. extract page 1

Rules:

* width 800px
* schema → crop top-left
* ≤2 pages → crop 55%

---

## 🖼️ SMART PREVIEW — GÉNÉRATION PAR LOT (OBLIGATOIRE pour manuels de service)

Pour les marques avec des manuels de service (photos de démontage), ne JAMAIS utiliser page 1 (couverture vide).

### Approche validée — 2 étapes séparées (NE PAS dévier)

**Étape 1 — Génération des JPGs (Python/PyMuPDF) :**

```
python scripts/generate-acer-jpgs.py --brand NOM_MARQUE
```

* Sélectionne la première page avec ≥ 1 image embarquée (à partir de la page 3)
* Fallback sur page 2 si aucune image trouvée dans les 50 premières pages
* Sortie : `scripts/temp_smart_previews/{slug}.jpg`

**Étape 2 — Upload vers Supabase (Node.js) :**

```
node scripts/upload-smart-previews.mjs
```

* Lit tous les JPGs de `temp_smart_previews/`
* Upsert dans `logos/previews/{slug}.jpg`
* La `preview_url` en base reste valide (même chemin)

### ⚠️ RÈGLE ABSOLUE

* ❌ Ne JAMAIS tenter de faire la génération ET l'upload dans le même script Node.js → conflits canvas.node natif
* ❌ Ne JAMAIS tenter d'uploader vers Supabase depuis Python → problèmes JWT
* ✅ Toujours Python pour générer, Node.js pour uploader
* ✅ TOUJOURS vider `scripts/temp_smart_previews/` avant de générer les JPGs d'une nouvelle marque — sinon l'upload retraite les anciennes marques inutilement

---

## 🚨 PREVIEW PIPELINE — RÈGLES ABSOLUES

### Preview ciblée (un seul document)

1. Renommer le JPG au nom du slug : `{slug}.jpg`
2. Déposer dans le dossier source de la marque
3. Lancer : `node scripts/fix-missing-preview.mjs`

### STRICTEMENT INTERDIT

* ❌ Lancer `fix-previews-batch.mjs` sans instruction explicite de l'utilisateur
* ❌ Créer un script à la volée hors pipeline
* ❌ Utiliser un script batch pour une opération ciblée
* ❌ Lancer un script dont le comportement exact n'est pas connu

### Si la situation n'est pas couverte par le pipeline

→ STOP. Demander la marche à suivre à l'utilisateur.
→ Ne JAMAIS improviser une solution alternative.

---

# 🔐 PDF SECURITY

Flow:

1. Stripe payment
2. confirmation
3. signed R2 URL
4. temporary download

NEVER expose direct PDF URL

---

# 🚫 PROTECTED DATA

NEVER MODIFY:

* 2134 documents imported April 2026

Protected collections:

* Antique Trader Cameras
* Classic Cameras
* McKeown's Guide
* Russian & Soviet Cameras
* Camera Craftsman
* Foundations of Mechanical Accuracy

---

# 🛠️ AVAILABLE SCRIPTS

ONLY these scripts exist:

* classify-docs.mjs
* classify-single.mjs
* import-from-report.mjs
* delete-doc.mjs
* audit-previews.mjs
* fix-previews-batch.mjs
* fix-missing-r2-pdfs.mjs
* audit-global.mjs
* uppercase-brands.mjs
* move-imported-files.mjs
* audit-r2-pdfs.mjs — Audit complet R2 (10 000+ docs) : détecte PDFs manquants + vérifie file_path en base. Usage : node scripts/audit-r2-pdfs.mjs [--dry-run]

---

# 🔍 PRE-ACTION CHECKLIST (MANDATORY)

Before ANY action:

1. Is it defined in CLAUDE.md?
2. Is validation required?
3. Is this destructive?
4. Does it affect production?

If unsure:
→ STOP

---

# 🧪 RESPONSE RULES

* Be precise
* Be minimal
* No speculation
* No assumptions
* No extra features

If something is unknown:
→ "NOT DEFINED IN CLAUDE.md"

---

# 🧷 FINAL DIRECTIVE

You must prioritize:

1. Data safety
2. System integrity
3. Strict rule enforcement

Over:

* speed
* completeness
* creativity
