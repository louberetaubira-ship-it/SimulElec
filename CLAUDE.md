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
- Panneau : coordonnées logiques `PANEL_W × PANEL_H` (560 × 920 : armoire 0..720 + bloc récepteurs 734..920), mis à l'échelle par le `<Workspace>` zoomable (`src/components/panel/Workspace.tsx`) ou, à défaut, par le `<Panel>` lui-même ; les positions des bornes viennent de `CatalogueItem.terminals` (fractions) + `Slot`.

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
- `npx tsx scripts/audit-mesures.ts` — table de référence de la plaque à bornes (2 R en étoile, ⅔ R en triangle, OL barrettes retirées), puis : chaque mesure attendue est-elle *atteignable* ? La valeur rendue par le simulateur doit tomber dans `[min, max]`, sinon l'élève ne peut pas valider l'étape. À lancer après toute modification d'un TP ou du moteur de mesure.

## Repères
- Le **repère** est ce qui est écrit sur l'appareil ; il change d'un TP à l'autre (F2 sur le démarrage direct, Q2 sur la perceuse) et n'est jamais l'identifiant interne (`f2`). Aucune phrase destinée à l'élève n'écrit un repère en dur : on demande `repereSlot(tp, 'f2')`, `listeMiseSousTension(tp)`, `startButtons(tp)`.
- `npx tsx scripts/audit-reperes.ts` vérifie les deux choses : que les repères cités dans un TP existent sur sa platine, et qu'aucun fichier partagé n'en écrit en dur.

## Transformateur de commande
- Le TP déclare son transformateur (`trafo` : prises du primaire, prises du secondaire, tension du réseau, tension de la bobine). `src/lib/sim/trafo.ts` en déduit la tension du secondaire par le rapport de transformation — jamais une constante.
- Se tromper de prise **n'est pas refusé au câblage** : sur une vraie platine rien n'empêche de serrer le fil sur la 230 au lieu de la 400. La faute se découvre à la mesure ou à l'essai. Trois conséquences distinctes, à ne pas confondre : prise du primaire trop haute → tension trop faible, le contacteur ne colle pas (85 %, CEI 60947-4-1) ; prise du primaire trop basse → le fer sature, la protection du primaire déclenche ; prise du secondaire trop haute → le fer va bien, c'est la bobine qui grille.
- `npx tsx scripts/audit-trafo.ts` — table de référence des prises, substitutions acceptées/refusées, et prises réellement câblées dans chaque TP du catalogue.

## Plaque à bornes du moteur
- Un enroulement se mesure entre **U1–U2, V1–V2 ou W1–W2** ; toute autre paire ne conduit que par une barrette. `src/lib/sim/plaque.ts` résout le réseau réel (union-find sur les barrettes posées + méthode des nœuds sur la seule composante connexe des deux pointes) : jamais de constante.
- Ordre normalisé : rangée haute **W2 U2 V2**, rangée basse **U1 V1 W1**. Étoile = barrettes W2–U2 et U2–V2 ; triangle = W2–U1, U2–V1, V2–W1.

## Qualité
- `npm run build` doit passer sans erreur ni warning ESLint bloquant. Pas de `any` gratuit. Composants client marqués `'use client'`.
- Aucune clé secrète côté client. Les images sont servies depuis `public/sprites` (pas de data URI dans le code).
