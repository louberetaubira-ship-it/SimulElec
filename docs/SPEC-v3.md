# SimulElec v3 — spécification d'implémentation (validée par le client le 2026-09-10)

Référence interactive validée : `docs/reference/illustration-v4.tpl.html` (la v3 est conservée pour
l'historique ; page HTML autonome ; la logique JS
qu'elle contient — géométrie, cheminement, TP, mesures/consignation, atelier libre — est LA source de vérité
à porter en TypeScript. Les `__SPRITES__`, `__LIBSPR__`, `__LIB__` y sont des placeholders de données).

## 1. Ce qui change par rapport à l'app actuelle

| Sujet | v2 (prod) | v3 (à livrer) |
|---|---|---|
| Platine | 540×700, rails gris, fils Bézier libres | **560×920** (armoire 560×720 + bloc récepteurs sous la platine), zone de travail zoomable, scènes (`ind`/`hab`/`ter`/`pv`), goulottes avec couvercles, rails orange (ind) / gris, **cheminement orthogonal en peigne** dans les goulottes, nappes sans croisement, côté le plus court, longueur de câble calculée |
| Bornes | 9 X1 + 3 X2 | X1 (9) + X2 (6) compacts (16 px) sur le dernier rail, repères sous chaque borne, étiquette de groupe |
| Commande | 230 V, H1/H2 sur rail | **T1 400/24 V** (photo `public/sprites/trafo.png`, bornes 0·230·400 / 0V·24·48), F2 2P, F3 1P, voyants H1/H2 **dans le coffret de porte XALD** avec S1/S2 |
| Moteur | dessin | moteur + **boîte à bornes** (W2 U2 V2 / U1 V1 W1 / PE) avec barrettes étoile/triangle cliquables |
| TP | 1 | **13** (voir §4), 4 scènes visuelles |
| Bibliothèque | 31 sprites | **1 381 éléments** (`public/lib/*.json`, index `src/lib/data/library-index.json`) + 7 éléments PV vectoriels + T1 + M221 (code) |
| Atelier libre | — | page `/atelier` : poser des appareils, tirer des fils, sauvegarder dans `projects` |
| Mesures | 4 points prédéfinis | **EPI → consignation → mesures hors tension → déconsignation → mesures sous tension**, appareils réels interactifs (multimètre, pince, contrôleur, VAT, tachymètre), pointes posées sur n'importe quelle borne |

## 2. Géométrie et scènes (`src/lib/scene/`)

La scène logique fait **560 × 920** : l'armoire (`.se-cab`) occupe 0..720, le **bloc récepteurs**
(`.se-recv`, pointillés) 734..920. Reprendre exactement de la référence v4 :

```
PANEL_W=560 ; PANEL_H=920 ; CAB_H=720 ; RECV_Y=734 ; RECV_H=186
RAILS=[150,346,542] (y haut du rail, hauteur 28, centre = y+14)
DUCTS_H=[[46,74],[242,270],[438,466],[634,662]] ; DUCT_L=[12,38] ; DUCT_R=[392,418] ; RAIL_X=[48,384]
Porte / annexe : colonne x ∈ [432,550]
Station XALD (ind) : ST={x:452,y:100,w:78,h:190}, bornes STERM sur le bord droit (SR=ST.x+ST.w+2)
Moteur (bloc récepteurs) : MOTOR={x:40,y:760} ; boîte à bornes TB={x:200,y:770,w:112,h:112} ; MTERM/MT2
Presse-étoupe du câble moteur : PE_GLAND={x:TB.x-30, y:712} (bas de l'armoire)
Arrivée réseau RES : L1(70,704) L2(98) L3(126) N(154) PE(182)  (mono : L, N, PE)
PLC (TP M221) : PLC={x:96,y:304,w:200,h:112}, PLC_IN / PLC_OUT (voir référence)
```

**Bloc récepteurs** — `TpDefinition.recvItems: AnnexItem[]` (optionnel, `recv: true`, x / y **relatifs**
au bloc, cf. `recvBox`). Titre par scène (`RECV_TITLE` : moteur M1 hors armoire / pièce / local /
charges du logement). Les récepteurs (hublot DCL, chauffe-eau, VMC, convecteur, réglettes, BAES) sont
descendus de `annexItems` vers `recvItems` : la colonne de droite ne garde que interrupteurs, prises,
détecteurs, déclencheur manuel, coffret de porte et modules de toiture. Chaque récepteur porte deux
bornes `data-t` sur son bord haut (`E1.X1` / `E1.X2`, `M.U1`… pour le moteur), utilisables par les
sondes de mesure comme par le câblage.

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
tronçons hors goulotte ; ouverts : tout. **Moteur et récepteurs** (`ext: 'motor' | 'recv'`) : borne → goulotte la plus proche →
goulotte verticale droite → goulotte 4 → descente verticale par un presse-étoupe en bas de l'armoire →
borne du récepteur. Un `.se-gland` est dessiné à chaque descente.

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

`<Panel tp scene wires cover marks sim overlay onTerminal onWire onDevice highlight probes clamp lock fixedScale />` :
DOM absolu 560 × 920 (comme la référence). Sans `fixedScale`, le composant se met lui-même à l'échelle de la
largeur disponible ; avec `fixedScale`, c'est le `<Workspace>` qui pilote le zoom.
Terminaux avec `data-t`, fils avec `data-w`. Sprites :
`<img>` (`public/sprites/<key>.png|-on|-off`) ou bibliothèque (data URI) ou composants SVG (`Trafo` = photo,
`Plc`, `PvPanel`, `Onduleur`, `DcMod`, `Battery`, `Agcp`, `Motor`, `TerminalBox`, `Station`).
Mobile : cibles tactiles ≥ 40 px via un halo invisible autour des bornes.

### Zone de travail zoomable (`src/components/panel/Workspace.tsx`)

`<Workspace storageKey contentHeight>` enveloppe `<Panel fixedScale>` et fournit :

- une barre d'outils **−  %  +  « Ajuster »  « 100 % »** (boutons ≥ 34 px) ;
- zoom **30 % → 300 %** : boutons (pas ×1,2), **Ctrl + molette** (écouteur non passif, `preventDefault`),
  **pincement à deux doigts** (pointer events, ratio des distances) ;
- **déplacement par glisser** (souris et doigt) quand le contenu déborde ; le `pointerdown` est ignoré sur
  `button, a, input, select, textarea, [data-t], [data-w], [data-btn], .se-term, .se-hit, .se-dev, .se-tbox,
  .se-wires, .at-zone` pour ne jamais voler un clic de borne, d'appareil ou de fil ;
- **« Ajuster »** = `min((w − 40)/560, (h − 40)/920)` borné à [0,3 ; 3] : la platine **et** le bloc récepteurs
  tiennent dans le conteneur ;
- zoom mémorisé dans `localStorage` sous `simulelec.zoom.<storageKey>` (lecture et écriture en `try/catch`).

Zones de travail : `tp` (parcours, via `<TpPanel>`), `atelier`, `demo` (`/platine-demo`). En atelier libre,
les zones de pose (`.at-zone`) vivent dans le calque zoomé, en coordonnées logiques de la platine.

## 6. Mesures, EPI, consignation (`src/lib/sim/mesures.ts`, `src/components/mesures/`)

Porter `netOf`, `voltage`, `ohms`, `mesRead`, `mesCheck`, `instSvg` (multimètre, pince, contrôleur, VAT,
tachymètre), `EPI`, `MSTEPS`.

### Étagère des appareils de mesure (`src/components/mesures/InstrumentTray.tsx`)

Bandeau `<InstrumentTray value onSelect disabled disabledHint />` affiché **au-dessus de la zone de travail à
toutes les étapes** (rendu par `<TpPanel>`, donc pose, câblage, tests, EPI, mesures, validation). Photos de
bibliothèque `l_appareil_multimetre_rms`, `l_appareil_pince_ac`, `l_appareil_controleur_d_installation_1`
(`libraryItemSync` / `loadLibraryItem`), icônes pour le VAT et le tachymètre. Un clic appelle
`setInstrument` du store `src/app/tp/[id]/store.ts`. Hors des étapes de mesure (`trayEnabled=false`),
l'étagère reste visible mais **grisée** (`filter: grayscale`, boutons `disabled`) avec l'info-bulle et la
mention « disponible aux étapes mesures ». Sur mobile (< 520 px) seules les photos restent visibles, le nom
passe en libellé accessible. En **atelier libre**, l'étagère est présente mais toujours grisée : un montage
libre n'a pas de table `nets`, donc aucune valeur ne peut être calculée (voir §7). Les 5 étapes s'insèrent dans le parcours élève :

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
