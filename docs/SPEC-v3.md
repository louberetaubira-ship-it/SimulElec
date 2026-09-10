# SimulElec v3 — spécification d'implémentation (validée par le client le 2026-09-10)

Référence interactive validée : `docs/reference/illustration-v3.tpl.html` (page HTML autonome ; la logique JS
qu'elle contient — géométrie, cheminement, TP, mesures/consignation, atelier libre — est LA source de vérité
à porter en TypeScript. Les `__SPRITES__`, `__LIBSPR__`, `__LIB__` y sont des placeholders de données).

## 1. Ce qui change par rapport à l'app actuelle

| Sujet | v2 (prod) | v3 (à livrer) |
|---|---|---|
| Platine | 540×700, rails gris, fils Bézier libres | **560×720**, scènes (`ind`/`hab`/`ter`/`pv`), goulottes avec couvercles, rails orange (ind) / gris, **cheminement orthogonal en peigne** dans les goulottes, nappes sans croisement, côté le plus court, longueur de câble calculée |
| Bornes | 9 X1 + 3 X2 | X1 (9) + X2 (6) compacts (16 px) sur le dernier rail, repères sous chaque borne, étiquette de groupe |
| Commande | 230 V, H1/H2 sur rail | **T1 400/24 V** (photo `public/sprites/trafo.png`, bornes 0·230·400 / 0V·24·48), F2 2P, F3 1P, voyants H1/H2 **dans le coffret de porte XALD** avec S1/S2 |
| Moteur | dessin | moteur + **boîte à bornes** (W2 U2 V2 / U1 V1 W1 / PE) avec barrettes étoile/triangle cliquables |
| TP | 1 | **13** (voir §4), 4 scènes visuelles |
| Bibliothèque | 31 sprites | **1 381 éléments** (`public/lib/*.json`, index `src/lib/data/library-index.json`) + 7 éléments PV vectoriels + T1 + M221 (code) |
| Atelier libre | — | page `/atelier` : poser des appareils, tirer des fils, sauvegarder dans `projects` |
| Mesures | 4 points prédéfinis | **EPI → consignation → mesures hors tension → déconsignation → mesures sous tension**, appareils réels interactifs (multimètre, pince, contrôleur, VAT, tachymètre), pointes posées sur n'importe quelle borne |

## 2. Géométrie et scènes (`src/lib/scene/`)

Reprendre exactement de la référence :

```
PANEL 560×720 ; RAILS=[150,346,542] (y haut du rail, hauteur 28, centre = y+14)
DUCTS_H=[[46,74],[242,270],[438,466],[634,662]] ; DUCT_L=[12,38] ; DUCT_R=[392,418] ; RAIL_X=[48,384]
Porte / annexe : colonne x ∈ [432,550]
Station XALD (ind) : ST={x:452,y:100,w:78,h:190}, bornes STERM sur le bord droit (SR=ST.x+ST.w+2)
Moteur : MOTOR={x:436,y:462} ; boîte à bornes TB={x:436,y:592,w:112,h:112} ; MTERM/MT2
Arrivée réseau RES : L1(70,704) L2(98) L3(126) N(154) PE(182)  (mono : L, N, PE)
PLC (TP M221) : PLC={x:96,y:304,w:200,h:112}, PLC_IN / PLC_OUT (voir référence)
```

Scènes (`SceneKind = 'ind'|'hab'|'ter'|'pv'`) : même géométrie, style différent (CSS de la référence :
`.panel`, `.panel.hab`, `.panel.ter`, `.panel.pv`, grille Lina en fond pour `ind`, goulottes bleues
perforées pour `ind`, blanches pour `hab`, grises pour `ter`, ciel/toiture pour `pv`). Étiquettes de rangée
par scène (`ROWL`). Annexe de droite (`AnnexKind = 'door'|'room'|'local'|'roof'`) : coffret XALD + moteur
pour `door`, sinon décor SVG + éléments de la bibliothèque (`ANNEX` dans la référence).

## 3. Cheminement (`src/lib/scene/route.ts`) — porter `route0raw`, `simplify`, `planLanes`, `route`, `pathD`, `stubs`

Règles : sortie de borne verticale → goulotte la plus proche (haut du rail → goulotte du dessus, bas → dessous) ;
changement de rangée par la goulotte verticale **la plus courte** ; dans chaque goulotte, nappes ordonnées par
**profondeur d'imbrication** (fils courts près du bord d'entrée, longs au fond, aucun croisement dans le groupe) ;
points redondants supprimés ; `wireLen` en mètres (1 px ≈ 1,1 mm). Fils extérieurs : porte (trunk `SR+20`),
moteur (presse-étoupe), réseau (goulotte 4). Couvercles fermés : on ne dessine que les brins (`stubs`) et les
tronçons hors goulotte ; ouverts : tout.

Signature :
```ts
planLanes(scene: SceneGeom, wires: [a:string,b:string][]): LanePlan
route(scene, plan, a, b, idx): Point[] | null
wireLength(plan, idx): number // m
```

## 4. TP (`src/lib/data/tps/*.ts`, un fichier par TP, index `src/lib/data/tps/index.ts`)

Porter `TPS`, `LIAIS` (dd), `PLC_IO` (plc), `EPI`, `MSTEPS`, `INSTS`, `ANNEX` depuis la référence. Ids
définitifs : `demarrage-direct`, `inversion`, `etoile-triangle`, `pompe-relevage`, `automate-m221`,
`tableau-logement`, `tableau-repartition`, `va-et-vient`, `chauffe-eau`, `eclairage-tertiaire`,
`eclairage-baes`, `pv-reseau`, `pv-batterie`. Chaque TP porte `scene`, `annex`, `slots` (x/rail/rep/mark/sub/group),
`liaisons` (obligatoire pour `demarrage-direct` et `automate-m221`, souhaitable pour `inversion`, `va-et-vient`,
`tableau-logement`, `pv-reseau` ; sinon `liaisons: []` et `playable:false` → catalogue « prévu »), `postes`
(choix du matériel avec bonne référence), `tests`, `mesures` (voir §6), `faults`, `quiz`, `motor` ou `null`.

Le TP `demarrage-direct` existant (`tp-demarrage-direct.ts`) est **remplacé** par la version v3 (T1 24 V, X2 6
bornes, voyants en porte, liaisons de la référence). Conserver `postes/tests/faults/quiz` existants en les
adaptant (bobine 24 V, F2 2P, F3, T1).

Le catalogue (`catalogue.ts`) s'étend : `trafo`, `plc`, `pvpanel`, `onduleur`, `dcswitch`, `dcfuse`, `dcspd`,
`battery`, `agcp` (rendus SVG en code, `svg:true`), et **tout élément de la bibliothèque** est utilisable
comme appareil de TP via `libraryItem(key)` (chargement lazy du JSON de sa famille — `src/lib/data/library.ts`).

## 5. Rendu (`src/components/panel/`)

`<Panel tp scene wires cover marks sim overlay onTerminal onWire onDevice highlight probes clamp lock />` :
DOM absolu (comme la référence) mis à l'échelle CSS. Terminaux avec `data-t`, fils avec `data-w`. Sprites :
`<img>` (`public/sprites/<key>.png|-on|-off`) ou bibliothèque (data URI) ou composants SVG (`Trafo` = photo,
`Plc`, `PvPanel`, `Onduleur`, `DcMod`, `Battery`, `Agcp`, `Motor`, `TerminalBox`, `Station`). Mobile : le
panneau est scalé à la largeur disponible (`transform: scale`), cibles tactiles ≥ 40 px via un halo invisible
autour des bornes.

## 6. Mesures, EPI, consignation (`src/lib/sim/mesures.ts`, `src/components/mesures/`)

Porter `netOf`, `voltage`, `ohms`, `mesRead`, `mesCheck`, `instSvg` (multimètre, pince, contrôleur, VAT,
tachymètre), `EPI`, `MSTEPS`. Les 5 étapes s'insèrent dans le parcours élève :

```
1 Choix TP · 2 Énoncé · 3 Matériel · 4 Pose · 5 Câblage · 6 Tests hors tension
7 EPI & consignation (EPI, séparation Q1, cadenas/étiquette, identification, VAT ×3)
8 Mesures hors tension (RPE, Riso 500 V, R enroulement)
9 Déconsignation & mise en service (retrait cadenas, Q1/F2/F3, essai S2)
10 Mesures sous tension (U, U cde, I pince, n tachy) · 11 Validation / maintenance · bot professeur
```
`AttemptState` s'étend (`epi`, `cons`, `decons`, `readings` avec `instrument`, `dial`, `a`, `b`, `value`).
Chaque lecture est persistée (`addMeasurement`) et envoyée au bot dans `context`.

Généralisation par TP : `netOf` s'appuie sur une table `nets` fournie par le TP (`terminal → {net, liveWhen}`)
plutôt que sur des `if` codés en dur ; pour `demarrage-direct` reproduire exactement la référence.

## 7. Atelier libre (`src/app/atelier/`, `src/lib/db/projects.ts`, migration `0002_projects.sql`)

Table `projects(id uuid pk, owner uuid → profiles, title text, scene text, data jsonb, class_id uuid null,
shared bool default false, created_at, updated_at)` + RLS (owner CRUD ; lecture classe si `shared`).
UI : familles (41) + recherche, clic rail/porte puis élément (repères automatiques Q1/KM1/F1/T1/X1:n/H/S/A/E),
clic appareil = retirer, fil borne à borne avec conducteur choisi, compteur appareils/fils/longueur, enregistrer,
liste « mes montages », réouverture. Les boutons/voyants/prises/modules PV vont automatiquement en annexe.

## 8. Contraintes

- Next.js 14 App Router, TS strict, `npm run build` sans erreur. Pas de `any`. `'use client'` où nécessaire.
- Aucun secret côté client. Sprites de bibliothèque servis en JSON statique (`public/lib`), chargés à la demande.
- Mobile-first (Android) : colonnes empilées < 900 px, panneau scalé, boutons ≥ 40 px.
- Français, tutoiement, vocabulaire NF C 18-510 / NF C 15-100.
- Ne pas casser : auth Google, `attempts`, `/api/prof`, dashboard prof.
