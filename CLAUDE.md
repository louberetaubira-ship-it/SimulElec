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
- Panneau : coordonnées logiques `PANEL_W × PANEL_H` (540 × 700), mis à l'échelle par CSS `transform: scale()` selon la largeur disponible ; les positions des bornes viennent de `CatalogueItem.terminals` (fractions) + `Slot`.

## Design
- Palette : fond `#F5F6F8` / surface `#FFFFFF` / ligne `#D3D9E1` / texte `#141A21` / muted `#66717F` / accent `#E39A00` / good `#1E9E63` / warn `#D97706` / crit `#D93A3A`. Fils : L1 `#8B4A2B`, L2 `#2B2F36`, L3 `#8E979F`, N `#2C7BE5`, PE `#37B34A` (pointillé), commande `#E4312B`.
- Typo : titres Barlow Condensed, texte IBM Plex Sans, valeurs IBM Plex Mono (`next/font/google`).
- La platine est blanche, réaliste (rails DIN dégradés, ombres portées sur les photos), les fils sont des courbes de Bézier avec ombre. Toujours se rapprocher de la réalité d'une armoire industrielle : borniers X1 (puissance) / X2 (commande), repérage des bornes, sections.
- Mobile-first : tout doit rester utilisable sur un téléphone Android (colonnes empilées, panneau scalé, cibles tactiles ≥ 40 px).

## Qualité
- `npm run build` doit passer sans erreur ni warning ESLint bloquant. Pas de `any` gratuit. Composants client marqués `'use client'`.
- Aucune clé secrète côté client. Les images sont servies depuis `public/sprites` (pas de data URI dans le code).
