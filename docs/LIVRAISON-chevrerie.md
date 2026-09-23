# Livraison — Sujet numérique « Chèvrerie — diversification d’une exploitation agricole » (2026-09-23)

Zip des seuls fichiers ajoutés ou modifiés, chemins d'origine conservés. À déposer tels quels sur GitHub (branche main) : Vercel redéploie. Aucune migration de base : les sujets numériques s'imposent déjà à une classe par `assignments` (migration 0015) et le corrigé se publie par `sujet_corriges` (0016).

## Le sujet
- Identifiant `chevrerie` (`/sujet/chevrerie`) : Bac Pro MELEC, 7 parties indépendantes, 125 questions, 5 h, 304 points. Titre et textes anonymisés (commune, exploitation, entreprise d'électricité → « DURAND », code du dossier) ; contrôle par `scripts/audit-sujet.ts` (empreintes ajoutées dans `scripts/anonymisation/empreintes.json`).
- 7 sujets thématiques (une partie chacun, durée au prorata du barème) : `chevrerie-incendie` (24 pts, 25 min), `-intrusion` (51,5 pts, 50 min), `-alimentation` (51 pts, 50 min), `-parafoudre` (24 pts, 25 min), `-eolienne` (60 pts, 60 min), `-ecs` (41 pts, 40 min), `-portail` (52,5 pts, 50 min).
- 4 nouveaux thèmes de catalogue : `incendie`, `intrusion`, `eolien`, `ecs` (`src/lib/sujet/themes.ts`).
- Barème : le corrigé officiel ne donne que les totaux par partie ; la répartition par question est celle de la transcription (commentée en tête de chaque `partie-x.ts`), modifiable par le professeur.
- Écarts du corrigé signalés en commentaire `// Corrigé officiel : …` ; notamment A.1.7 (erreur d'addition du corrigé : 65,2 m² imprimé, 84,47 m² attendu, 65,2 reconnu comme erreur typique), A.2.2 (« 203 V »), B.2.3 (référence du contact NFa2p), E.1.3 (plage 3,7–4 kW), E.3.3.1.3 (mΩ), F.4.1/F.4.2 (blancs au corrigé, calculés).

## Données
- `src/lib/data/sujets/chevrerie/` : `commun.ts` (helpers, 48 documents DTR sur 74 pages, 45 pages du sujet), `partie-a.ts` … `partie-g.ts` (questions, aides graduées, erreurs typiques, `formuleSpec` pour tous les calculs), `index.ts` (assemblage, numérotation, déclinaisons, sujet).
- Images : `public/tp/chevrerie/` — `sujet-02…46.jpg`, `dtr-04…77.jpg` (anonymisées, contrôle OCR), `plan-site.jpg` (plan de masse redessiné, remplace la vue aérienne), recadrages `q-*.jpg` ; corrigés des 4 schémas dans `private/corriges/chevrerie/` (route gardée).
- `scripts/anonymisation/chevrerie.args` : reproduction des pages (`python3 scripts/anonymisation/anonymiser-pages.py <sujet.pdf> @scripts/anonymisation/chevrerie.args`).

## Câblage réel des 4 schémas (TP platine cachés)
- `chevrerie-a4-ssi` — alarme incendie de type 4 : tableau T4 2 boucles, 3 DM, diffuseur, résistances de fin de ligne ; essai : déclenchement d'un DM par boucle, dérangement ligne ouverte.
- `chevrerie-b4-intrusion` — centrale intrusion, clavier, sirène auto-alimentée, batterie, contacts magnétiques et détecteurs IR à boucles résistives ; essai : mise en service, ouverture, autoprotection.
- `chevrerie-e222-eolien` — éolienne, WBP-Box, 3 Windy Boy, résistance de charge, sectionneur, différentiels type F, répartiteur, parafoudre ; essai : vent 10 m/s → injection, pas de vent → veille, vent destructeur → résistance de charge.
- `chevrerie-g5-portail` — carte de motorisation, GSM, cellules TX/RX, flash, moteur 24 V ; essai : ouverture totale / piéton, test des cellules, faisceau coupé.
- 26 appareils créés au catalogue (tous dessinés dans `svg.tsx` : aucune photo exploitable dans `public/lib`) ; cotes « à relever » listées par `audit-echelle` (WBP-Box, Windy Boy, BW 155, répartiteur, parafoudre, barrette, résistances, diffuseur, carte de motorisation, motoréducteur) ; exception d'échelle déclarée pour l'éolienne.
- Modèles de fonctionnement dans `src/components/sujet/CablageReelModeles.ts` (blocs délimités `chevrerie-*`).

## Vérifications
`npx tsc --noEmit` OK · ESLint OK · `npm run build` OK · `audit-sujet` (125 questions, 304 points, anonymat : aucun terme d'origine, corrigé côté serveur, meta à jour) · `audit-tps`, `audit-encombrement`, `audit-echelle`, `audit-reperes`, `audit-mesures` OK sur les 4 platines · test des 4 modèles (câblage complet → sous tension et essai réussi ; chaque liaison retirée → échec) · `test-sujet-correction.ts` (19 sujets) OK.

## À relire par le professeur
- Positions des bornes serrées sur les schémas en traits (DM de A.4, borniers de B.4 et E.2.2.2, module GSM de G.5) : à tester au doigt sur téléphone.
- G.3.4 / G.3.5 (bornes 12 V et position du cavalier du flash) : lecture « miroir » du corrigé, à confirmer.
- E.2.2.1.4 : seul le différentiel type F du corrigé est accepté (le type AC admis par la notice est signalé en erreur typique).

## Fichiers
- M	CLAUDE.md
- A	docs/LIVRAISON-chevrerie.md
- A	private/corriges/chevrerie/q-a4-corrige.jpg, q-b4-corrige.jpg, q-e222-corrige.jpg, q-g5-corrige.jpg
- A	public/tp/chevrerie/*.jpg (137 images)
- A	scripts/anonymisation/chevrerie.args
- M	scripts/anonymisation/empreintes.json
- M	scripts/audit-echelle.ts
- M	scripts/audit-sujet.ts
- M	scripts/test-sujet-correction.ts
- M	src/components/panel/svg.tsx
- M	src/components/sujet/CablageReelModeles.ts
- M	src/lib/data/catalogue.ts
- A	src/lib/data/sujets/chevrerie/ (commun.ts, index.ts, partie-a.ts … partie-g.ts)
- M	src/lib/data/sujets/index.ts
- A	src/lib/data/tps/chevrerie-a4-ssi.ts, chevrerie-b4-intrusion.ts, chevrerie-e222-eolien.ts, chevrerie-g5-portail.ts
- M	src/lib/data/tps/index.ts
- M	src/lib/sujet/meta.ts
- M	src/lib/sujet/themes.ts
- M	src/lib/sujet/types.ts
