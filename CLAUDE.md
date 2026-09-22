# SimulElec — conventions du projet

Simulateur web (PWA) de montages électrotechniques pour Bac Pro MELEC / BTS. Next.js 14 App Router + TypeScript + Tailwind, Supabase (Auth Google, Postgres + RLS), Vercel. Langue de l'interface : français (tutoiement pour l'élève).

## Arborescence et propriété des fichiers
- `src/lib/types.ts` — types de domaine (ne pas casser, étendre seulement).
- `src/lib/data/catalogue.ts` — appareillages (sprites photo dans `public/sprites/<key>.png`, `<key>-on.png`, `<key>-off.png`), `spriteUrl()`.
- `src/lib/data/tp-demarrage-direct.ts` — définition du TP 4 (`TpDefinition`), `PANEL_W/H`, `EXTERNAL_POINTS`, `MOTOR_BOX`, `TPS`.
- `src/lib/sim/` — moteur de simulation pur (sans React) : état électrique, courants, instruments, pannes, validation des étapes.
- `src/components/panel/` — rendu de la platine (rails, appareils photo, bornes, fils SVG, moteur, boîte à boutons).
- `src/components/parcours/` — les 8 étapes : Choix, Énoncé, Matériel, Pose, Câblage, Tests, MiseEnService, Validation ; `Stepper`, `ProfBot`.
- `src/app/tp/page.tsx` catalogue ; `src/app/tp/[id]/page.tsx` parcours.
- `src/lib/supabase/` — clients browser/server/middleware ; `src/middleware.ts` rafraîchit la session.
- `src/lib/db/` — helpers de persistance typés (attempts, measurements, messages, profiles, classes).
- `src/app/api/prof/route.ts` — professeur virtuel (Anthropic SDK, clé serveur `ANTHROPIC_API_KEY`).
- `src/app/prof/` — tableau de bord professeur ; `src/app/login/`, `src/app/auth/callback/route.ts`.

## Contrat entre les modules
- Le parcours (client) persiste via `src/lib/db/attempts.ts` : `getOrCreateAttempt(tpId)`, `saveAttemptState(id, state, stage, status?)`, `addMeasurement(id, m)`, `addMessage(id, stage, role, content)`, `finishAttempt(id, report, score)`.
- Le bot : `POST /api/prof` body `{ attemptId, stage, context, turns:[{role,content}] }` → `{ text }`. Le client construit `context` (cahier des charges + état du montage, panne secrète incluse) ; le serveur ajoute les règles pédagogiques et archive les deux messages.
- Panneau : coordonnées logiques `PANEL_W × PANEL_H` (560 × 920 par défaut : armoire 0..720 + bloc récepteurs 734..920). **La hauteur est variable par TP** : `TpDefinition.armoire` et `rails` définissent la scène, `sceneOf(tp)` la calcule (`cabH`, `recvY`, `panelH`, goulottes déduites des rails) et `Panel` la distribue. Un appareil book (variateur) se décale sous son rail par `Slot.dy` au lieu d'y être centré. **Tout ce qui est hors armoire suit la scène** : moteur, plaque à bornes, presse-étoupes et arrivée réseau se calculent par `motorOf` / `tbOf` / `mtermOf` / `mt2Of` / `glandOf` / `resOf` / `recvBoxOf`, jamais par les constantes `MOTOR` / `TB` / `RES` — celles-ci ne valent que pour l'armoire de référence. Le cheminement (`route.ts`) lit les goulottes et les rails dans `ctx.geo`, pas dans `DUCTS_H` / `RAILS`, mis à l'échelle par le `<Workspace>` zoomable (`src/components/panel/Workspace.tsx`) ou, à défaut, par le `<Panel>` lui-même ; les positions des bornes viennent de `CatalogueItem.terminals` (fractions) + `Slot`.

## Design
- Palette : fond `#F5F6F8` / surface `#FFFFFF` / ligne `#D3D9E1` / texte `#141A21` / muted `#66717F` / accent `#E39A00` / good `#1E9E63` / warn `#D97706` / crit `#D93A3A`. Fils : L1 `#8B4A2B`, L2 `#2B2F36`, L3 `#8E979F`, N `#2C7BE5`, PE `#37B34A` (pointillé), commande `#E4312B`.
- Typo : titres Barlow Condensed, texte IBM Plex Sans, valeurs IBM Plex Mono (`next/font/google`).
- La platine est blanche, réaliste (rails DIN dégradés, ombres portées sur les photos), les fils sont des courbes de Bézier avec ombre. Toujours se rapprocher de la réalité d'une armoire industrielle : borniers X1 (puissance) / X2 (commande), repérage des bornes, sections.
- Mobile-first : tout doit rester utilisable sur un téléphone Android (colonnes empilées, panneau scalé, cibles tactiles ≥ 40 px).

## Bibliothèque simulable
- Si un TP a besoin d'un appareillage qui n'existe pas encore, on le **crée** : entrée dans `src/lib/data/catalogue.ts` (bornes nommées comme sur l'appareil réel) + dessin vectoriel dans `src/components/panel/svg.tsx` quand il n'y a pas de photo dans le pack. On ne remplace jamais un appareil par un approchant « qui fera l'affaire » : l'élève doit voir et manipuler le bon organe.
- Avant de dessiner quoi que ce soit, chercher dans `public/lib/*.json` (1 381 références) : la plupart du temps l'appareil y est déjà en photo. On l'extrait alors vers `public/sprites/<clé>.png`, on l'inscrit dans `sprites.json` au pas modulaire, et on le renomme et le décrit selon les caractéristiques voulues.

## Contrôles automatiques
- `npx tsx scripts/audit-tps.ts` — cohérence électrique des liaisons attendues (bornes inexistantes, boucles, doublons, réseaux différents, repères en double).
- `npx tsx scripts/audit-reperes.ts` — repères cités dans les TP et repères écrits en dur dans les textes partagés.
- `npx tsx scripts/audit-trafo.ts` — prises du transformateur de commande et tension du secondaire.
- `npx tsx scripts/audit-diagnostic.ts` — chaque panne est-elle *trouvable* à l'instrument, et *distincte* des autres ?
- `npx tsx scripts/audit-folio.ts` — le folio est-il complet (toute borne de commande mesurable), fidèle (rien de rouge sur une platine saine, chaque panne visible) et cohérent avec les repères de la platine ?
- `npx tsx scripts/audit-encombrement.ts` — deux appareils qui se chevauchent, un appareil qui mord une goulotte, un appareil qui déborde de l'armoire. À lancer après tout changement de `rails`, d'`armoire` ou de taille de sprite.
- `npx tsx scripts/audit-mesures.ts` — table de référence de la plaque à bornes (2 R en étoile, ⅔ R en triangle, OL barrettes retirées), puis : chaque mesure attendue est-elle *atteignable* ? La valeur rendue par le simulateur doit tomber dans `[min, max]`, sinon l'élève ne peut pas valider l'étape. À lancer après toute modification d'un TP ou du moteur de mesure.

## Repères
- Le **repère** est ce qui est écrit sur l'appareil ; il change d'un TP à l'autre (F2 sur le démarrage direct, Q2 sur la perceuse) et n'est jamais l'identifiant interne (`f2`). Aucune phrase destinée à l'élève n'écrit un repère en dur : on demande `repereSlot(tp, 'f2')`, `listeMiseSousTension(tp)`, `startButtons(tp)`.
- `npx tsx scripts/audit-reperes.ts` vérifie les deux choses : que les repères cités dans un TP existent sur sa platine, et qu'aucun fichier partagé n'en écrit en dur.

## Transformateur de commande
- Le TP déclare son transformateur (`trafo` : prises du primaire, prises du secondaire, tension du réseau, tension de la bobine). `src/lib/sim/trafo.ts` en déduit la tension du secondaire par le rapport de transformation — jamais une constante.
- Se tromper de prise **n'est pas refusé au câblage** : sur une vraie platine rien n'empêche de serrer le fil sur la 230 au lieu de la 400. La faute se découvre à la mesure ou à l'essai. Trois conséquences distinctes, à ne pas confondre : prise du primaire trop haute → tension trop faible, le contacteur ne colle pas (85 %, CEI 60947-4-1) ; prise du primaire trop basse → le fer sature, la protection du primaire déclenche ; prise du secondaire trop haute → le fer va bien, c'est la bobine qui grille.
- `npx tsx scripts/audit-trafo.ts` — table de référence des prises, substitutions acceptées/refusées, et prises réellement câblées dans chaque TP du catalogue.

## Circuit de commande et dépannage
- `src/lib/sim/commande.ts` monte le réseau réel (fils posés, contacts dans leur état, bobine et voyant avec leur résistance) et le résout par la méthode des nœuds. Une mesure de commande ne compare plus deux étiquettes de réseau : sa valeur dépend de l'endroit exact des pointes.
- Le voltmètre est modélisé par ses 10 MΩ d'impédance d'entrée : sans elle, une borne que rien n'alimente n'a pas de potentiel défini et la matrice est singulière — alors qu'un vrai appareil affiche bien quelque chose. L'ohmmètre, lui, refuse dès que le circuit est sous tension, même entre deux points au même potentiel.
- Les branches de puissance entrent dans la continuité mais jamais dans le calcul des potentiels : le secondaire 24 V ne les alimente pas.
- Une panne déclare ce qu'elle fait au réseau (`coupe` une liaison, `ouvre` un contact) et l'`action` de remise en état attendue. Sans ça elle est invisible à l'instrument — et `audit-diagnostic` la refuse.
- À l'étape de dépannage, le simulateur ne souffle aucune hypothèse : l'élève mesure où il veut, note ses lectures, puis conclut **cause + action**, jugées ensemble.

## Schéma développé
- `src/lib/schema/symboles.ts` est la **source unique** des symboles CEI 60617, pour l'application comme pour les maquettes (`sh scripts/symboles.sh` intègre le paquet dans la page). On ne redessine jamais un symbole ailleurs : l'élève doit retrouver le même tracé partout.
- Ce qui distingue un appareil, ce n'est pas le contact mais son **actionneur** : bilame, came, galet, champignon, poussoir. Et ce qui distingue un contact à ouverture d'un contact à fermeture, c'est **la barre** du contact fixe — un audit le vérifie.
- Un TP décrit son folio par l'**ordre** des organes sur chaque colonne (`folio`), jamais par des coordonnées ; `src/lib/schema/folio.ts` place les ordonnées. Une dérivation doit être déclarée **après** la colonne d'où elle part.
- L'état de chaque contact vient du **réseau** de `commande.ts`, jamais d'une déclaration : le schéma ne peut donc pas dire autre chose que ce que mesure l'élève. Un conducteur coupé se détecte sur les seules arêtes de nature `fil` — suivre aussi les contacts et les récepteurs laisserait une branche parallèle refermer le circuit.

## Plaque à bornes du moteur
- Un enroulement se mesure entre **U1–U2, V1–V2 ou W1–W2** ; toute autre paire ne conduit que par une barrette. `src/lib/sim/plaque.ts` résout le réseau réel (union-find sur les barrettes posées + méthode des nœuds sur la seule composante connexe des deux pointes) : jamais de constante.
- Ordre normalisé : rangée haute **W2 U2 V2**, rangée basse **U1 V1 W1**. Étoile = barrettes W2–U2 et U2–V2 ; triangle = W2–U1, U2–V1, V2–W1.

## Échelle et photos des appareils
- **Une seule règle : 1 mm réel = 1,45 px de platine** (`ECHELLE_PX_PAR_MM`). Elle vient du pas déjà en place — 3 modules sur 78 px, soit 26 px pour un module de 18 mm. Ce sont les **millimètres qui font foi, jamais le nombre de modules** : un GV2ME de 45 mm fait 65 px qu'on le compte 2,5 modules ou non. `modules` ne sert plus qu'à l'inventaire.
- Chaque `CatalogueItem` déclare ses cotes constructeur dans `dims`, avec leur **provenance** : `fiche` (lue sur la fiche technique), `norme` (déduite du pas modulaire — 18 mm par module, 85 mm de hauteur, relevé sur la fiche iC60N), `arelever`. On n'invente jamais une cote pour faire taire l'audit : une ligne « à relever » est une ligne de la liste de travail.
- `npx tsx scripts/audit-echelle.ts` — chaque sprite respecte-t-il l'échelle à 4 % près, et quelles cotes restent à relever ? Un appareil volontairement hors échelle doit figurer dans `EXCEPTIONS` **avec sa raison écrite**.
- **Photo de l'appareil** : on part du site du constructeur (se.com pour Schneider). L'image par défaut d'une page produit est un rendu **de trois quarts** — inutilisable sur la platine, ses bornes ne tombant pas en face des points de raccordement. C'est le **visualiseur 360°** de la page qui donne la vue de face. La capture se fait ensuite au ras de l'appareil, bornes comprises, sans le fond ni les annotations.
- Un appareil **arrêté** garde sa place s'il est sur le plateau, mais son remplaçant figure en option à l'étape matériel, avec la mention de l'arrêt de gamme — et réciproquement.

## Qualité
- `npm run build` doit passer sans erreur ni warning ESLint bloquant. Pas de `any` gratuit. Composants client marqués `'use client'`.
- Aucune clé secrète côté client. Les images sont servies depuis `public/sprites` (pas de data URI dans le code).

## Domaines professionnels (classement des TP)
- `src/lib/taxonomy/domaines.ts` est la **source unique** des 11 domaines (HAB, TER, IND, DOM, ENR, RES, INF, SEC, COM, CVC, EAU), de leurs sous-domaines, couleurs et scène par défaut, et des 5 activités du référentiel. « Mesures & maintenance » n'est pas un domaine : c'est une activité. Ne pas confondre avec `Domain` de `competences.ts` (domaines d'activité → compétences).
- Chaque TP porte `classement` (`domaine`, `domainesSecondaires`, `sousDomaine`, `activites`, `motsCles`) ; `classementDe(tp)` complète les absents (domaine déduit de `family`, activités déduites du parcours). En base : colonnes `domaine`, `domaines_sec`, `sous_domaine`, `activites`, `mots_cles` (migration 0014) + copie dans `definition.classement` ; `classementOfRow(row)` les relit.
- Règles d'affichage : un domaine sans TP publié est masqué côté élève, visible en pointillé côté professeur ; publier un TP du studio exige un domaine choisi. Le générateur reçoit `taxonomiePourPrompt()` et propose un classement que le professeur valide.
