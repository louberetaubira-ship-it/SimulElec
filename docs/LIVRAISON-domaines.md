# Livraison — Classement des TP par domaine professionnel (2026-09-22)

Zip des seuls fichiers modifiés ou ajoutés, chemins d'origine conservés. À déposer tels quels sur GitHub (branche main) : Vercel redéploie.

## Base de données
La migration `supabase/migrations/0015_domaines.sql` a DÉJÀ été appliquée sur le projet Supabase `simulelec` (mlbbzkjttloqaptkvamp) le 2026-09-22 : colonnes `domaine`, `domaines_sec`, `sous_domaine`, `activites`, `mots_cles` sur `tps`, les 3 TP en base reçoivent `domaine = IND`. Rien à faire.

## Fichier supprimé (à supprimer aussi sur GitHub)
- `src/app/tp/TpsProfesseur.tsx` (fusionné dans `src/app/tp/CatalogueClient.tsx`)

## Lots livrés
- A — `src/lib/taxonomy/domaines.ts` (11 domaines, 71 sous-domaines, 5 activités, helpers), `src/lib/taxonomy/classement.ts`
- B — migration 0015, `src/lib/types.ts`, `src/lib/db/tps.ts`, classement des 11 TP fournis, import/export JSON
- C — catalogue élève (`/tp` : puces de domaines, sous-domaines, recherche, sections par domaine, domaines vides masqués), catalogue prof (`/prof/tp` : colonne et filtre Domaine, vides en pointillé + création), hub `/ressources`, composants `src/components/catalogue/*`
- D — studio (bloc « Classement », domaine obligatoire pour publier, `/prof/tp/nouveau?domaine=CODE`), générateur (le brief accepte un domaine ; l'IA propose un classement contraint à la taxonomie, validé par le prof)
- E — couverture des domaines : `/moi` et fiche élève (« Domaines travaillés » + « À découvrir »), `/prof` (barres par classe), `src/lib/prof/couverture.ts`, `src/components/prof/CouvertureDomaines.tsx`

## Vérifications
`npx tsc --noEmit` OK · `npm run build` OK (ESLint : 2 avertissements préexistants) · relecture indépendante (3 corrections : domaine non pré-rempli à la sauvegarde auto, bouton Publier du tableau contrôle le domaine, libellé « Tous les sous-domaines »).

## Fichiers
- M	CLAUDE.md
- A	docs/SPEC-domaines.md
- M	src/app/api/generateur/pedagogie/route.ts
- M	src/app/moi/page.tsx
- M	src/app/prof/eleve/[id]/page.tsx
- M	src/app/prof/page.tsx
- M	src/app/prof/tp/nouveau/page.tsx
- M	src/app/prof/tp/page.tsx
- M	src/app/ressources/RessourcesHub.tsx
- A	src/app/tp/CatalogueClient.tsx
- D	src/app/tp/TpsProfesseur.tsx
- M	src/app/tp/page.tsx
- A	src/components/catalogue/DomaineBadge.tsx
- A	src/components/catalogue/DomaineChips.tsx
- A	src/components/prof/CouvertureDomaines.tsx
- M	src/components/studio/Brief.tsx
- M	src/components/studio/Inspector.tsx
- M	src/components/studio/StudioClient.tsx
- M	src/components/studio/generation.ts
- M	src/components/studio/store.ts
- M	src/components/studio/studio.css
- M	src/lib/data/tps/automate-m221.ts
- M	src/lib/data/tps/ecobike-knx.ts
- M	src/lib/data/tps/ecobike-portail.ts
- M	src/lib/data/tps/ecobike-pv.ts
- M	src/lib/data/tps/ecobike-reseau.ts
- M	src/lib/data/tps/knx-tertiaire.ts
- M	src/lib/data/tps/perceuse-radiale.ts
- M	src/lib/data/tps/portail.ts
- M	src/lib/data/tps/solaire-autonome.ts
- M	src/lib/data/tps/station-relevage.ts
- M	src/lib/data/tps/variateur.ts
- M	src/lib/db/tps.ts
- M	src/lib/generateur/prompt.ts
- M	src/lib/generateur/schema.ts
- M	src/lib/generateur/serveur.ts
- M	src/lib/generateur/verifier.ts
- A	src/lib/prof/couverture.ts
- A	src/lib/taxonomy/classement.ts
- A	src/lib/taxonomy/domaines.ts
- M	src/lib/types.ts
- A	supabase/migrations/0015_domaines.sql

## Correctif du 2026-09-22 (soir) — fusion avec le « sujet numérique »
Entre le téléchargement du dépôt et le dépôt du zip, une autre session avait publié le sujet numérique CGM 2021 (commits b3f0997 → e1dc576 : `src/lib/sujet/*`, `src/components/sujet/*`, `/sujet/[id]`, TP cachés `hidden`, migration `0014_sujet_numerique.sql`). Le zip a écrasé 6 fichiers communs → build Vercel en erreur (`scripts/seed-tps.ts` : `hidden` inconnu).
Ce correctif refusionne les deux travaux :
- `src/lib/types.ts`, `src/lib/db/tps.ts`, `src/lib/data/tps/index.ts` (via GitHub), `src/app/moi/page.tsx`, `src/app/prof/tp/page.tsx`, `src/app/tp/page.tsx` : les deux lots réunis (TP `hidden` exclus du catalogue, des compteurs et de « À découvrir » ; sujets numériques en tête du catalogue via `CatalogueClient`).
- `supabase/migrations/0014_domaines.sql` renommée **`0015_domaines.sql`** (le 0014 est pris par le sujet numérique) : supprimer `0014_domaines.sql` sur GitHub. La migration reste appliquée en base.
