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

## 9. Élève, aide et évaluation (v3.1)

### 9.1 Identité de l'élève et diplôme préparé

- `src/lib/data/competences.ts` (architecte) : `DIPLOMAS` (`cap` | `bacpro` | `bts` | `cster`),
  `COMPETENCES`, `DOMAIN_TO_COMPETENCES`, `PLATINE_STAGE_DOMAINS`, `evaluate()`.
- Migration `0004_diploma_evaluation.sql` : `profiles.diploma`, `profiles.onboarded`,
  `attempts.evaluation` (jsonb), `attempts.diploma`.
- `ProfileRow` / `ProfilePatch` (`src/lib/db/types.ts`, `src/lib/db/profiles.ts`) portent
  `diploma` et `onboarded`.
- **`/bienvenue`** (`src/app/bienvenue/page.tsx`) : nom et prénom pré-remplis depuis Google,
  une carte par diplôme, établissement facultatif. Enregistrement via `updateProfile`
  (`onboarded: true`) puis retour sur `?next=`.
- `src/lib/supabase/middleware.ts` : `/bienvenue` rejoint les routes protégées ; tout utilisateur
  connecté dont le profil n'a pas `onboarded` **et** `diploma` est redirigé vers `/bienvenue`
  (sauf `/login`, `/auth`, `/compte`, `/bienvenue`).
- **Mode démonstration** (`NEXT_PUBLIC_DEMO_MODE=1`) : pas de Supabase, le même formulaire écrit
  `{ name, diploma, etablissement }` dans `localStorage` sous **`simulelec.eleve`**
  (`src/lib/student.ts`) ; `useStudent()` (`src/lib/useStudent.ts`) relit cette clé et redirige
  vers `/bienvenue` si elle manque.
- `/compte` permet de modifier nom, diplôme et établissement.
- Le store du parcours porte `student: { name, diploma, etablissement }` ; le nom et le diplôme
  s'affichent dans l'en-tête de `ParcoursClient`, dans le contexte du professeur virtuel et sur
  tous les rapports (`buildReport(tp, st, student)`).

### 9.2 Aide « rappel de cours » (élève bloqué)

- **`src/lib/data/cours.ts`** : 25 fiches (`CoursId`) — plaque moteur et calibre GV2/LRD,
  contacteur et auto-maintien, transformateur 400/24 V et F2/F3, borniers X1/X2, règles de
  câblage, tests hors tension (VAT, PE, 500 V), EPI et habilitation, consignation en 5 étapes,
  déconsignation et essais, mesure de tension, mesure de courant à la pince, vitesse et
  glissement, couplage, diagnostic, automate M221, loi d'Ohm et puissance, énergie,
  série/parallèle, tension du système PV, Voc corrigée en température, capacité batterie, chute
  de tension et section, calibre des protections, DC ≠ AC, tableau de logement NF C 15-100.
  Chaque fiche : `title`, `summary` (2 à 4 phrases), `rules[]` (rendues en `--font-mono`),
  `example`, `pieges[]`, `levels` (une phrase de cadrage par diplôme).
- Mapping étape → fiches : `STAGE_COURS` (valeur par défaut, 11 étapes) et `TP_COURS`
  (précisions par TP) dans `src/lib/sim/progress.ts`, lus par `coursForStage(tpId, stage)`.
- **`src/components/parcours/AideCours.tsx`** : bouton « J'ai besoin d'aide » rendu par
  `StageLayout` (`Side`, en tête de colonne, `sticky`) donc présent à toutes les étapes ; panneau
  modal avec onglets de thèmes, règles, exemple, pièges, cadrage par diplôme, puis
  « Demander au professeur ».
- **Ouverture automatique, une fois par étape** (store `autoAide`) : 3 erreurs de câblage,
  2 mauvais choix de matériel, une mesure erronée (hors cible ou ERR) ou un diagnostic faux.
- « Demander au professeur » envoie une question pré-remplie au `ProfBot` (`store.askProf`) ;
  `POST /api/prof` reçoit `student` (nom, diplôme) et `cours` (fiche mise à plat) en plus du
  `context`, avec la consigne : rappeler la règle de calcul, jamais la valeur.
- Compteur d'ouvertures : `AttemptState.helpUsed: Record<number, number>` (ajout compatible,
  complété par `normalizeState`).

### 9.3 Évaluation par compétences

- `stageScores(tp, st)` (`progress.ts`) : score 0..1 par étape — matériel = bonnes références /
  postes ; pose = 1 − erreurs / appareils ; câblage = liaisons justes / total − 0,05 par refus ;
  tests = tests faits ; EPI/consignation = étapes dans l'ordre + EPI, pénalité par manœuvre ERR ;
  mesures = mesures attendues validées, −0,15 par ERR ; mise en service = essai concluant ;
  validation = diagnostic (1er / 2e essai) et quiz. **Chaque ouverture d'aide sur l'étape retire
  0,1, plancher 0,3 si l'étape est réussie.**
- `buildEvaluation(tp, st, diploma)` appelle `evaluate(diploma, PLATINE_STAGE_DOMAINS, stageScores)`
  et renvoie `null` pour un TP non jouable (aucune évaluation produite).
- **`src/components/parcours/Evaluation.tsx`** : en-tête élève (nom, diplôme, établissement, TP,
  date), grille des compétences (code, intitulé, domaines, barre, niveau *acquis / en cours
  d'acquisition / non acquis / non évalué*), critères du référentiel dépliables, détail par étape,
  bouton « Imprimer / PDF » (feuille de style `@media print` dans `globals.css`, les critères sont
  dépliés le temps de l'impression) et « Envoyer au professeur ».
- Persistance : `finishAttempt(id, report, score, evaluation?, diploma?)` écrit `attempts.evaluation`
  et `attempts.diploma` ; le rapport contient `student`, `evaluation`, `stageScores`, `helpUsed`.
- **`/prof`** : filtre par diplôme et grille compacte (code + score + couleur du niveau) sous le nom
  de l'élève pour chaque tentative terminée.

## 10. TP 14 dimensionnement (v3.2)

Référence validée par le client : **`docs/reference/illustration-pv-dimensionnement.html`** (page HTML
autonome ; son JS — `LOC`, `PANELS`, `BATS`, `MPPTS`, `INVS`, `SECT`, `FUSES`, `RECV0`, `calc`, `checks`,
`panelSvg`, `batSvg`, `report`, chaîne `CHAIN`, 11 étapes — est LA logique portée en TypeScript).

### 10.1 Un nouveau type de parcours

- `TpDefinition.kind?: 'platine' | 'dimensionnement'` (`src/lib/types.ts`), **défaut `'platine'`** :
  les 13 TP existants ne changent pas.
- `src/app/tp/[id]/page.tsx` rend `DimensionnementClient` quand `tp.kind === 'dimensionnement'`,
  `ParcoursClient` sinon.
- Le catalogue `/tp` affiche un badge **« dimensionnement »** (`[data-kind]`) à côté de « jouable ».
- TP 14 : `id: 'pv-dimensionnement'`, famille `pv`, `scene: 'pv'`, `annex: 'roof'`, `playable: true`,
  niveaux « Tle Bac Pro MELEC · BTS Électrotechnique · CS TER ». Définition minimale compatible
  (`slots: []`, `liaisons: []`, `nets: {}`, `mesures: []`, `postes: []`, `motor: null`) : énoncé,
  situation, cahier des charges, quiz de 3 questions et `competences`.
  Fichier `src/lib/data/tps/pv-dimensionnement.ts`, ajouté à `TPS` (donc au seed `scripts/seed-tps.ts`,
  qui reste générique).

### 10.2 Données — `src/lib/data/pv/catalogue.ts`

`LOCALITES` (18 villes : Guyane, Antilles, océan Indien, métropole, Pacifique — HSP annuelle, mois le
plus défavorable, inclinaison, Tmin/Tmax **et `lat`/`lon`**), `PANELS` (4 modules), `BATTERIES` (5, plomb
AGM et LiFePO₄ avec DoD, rendement, cycles, BMS), `MPPTS` (1 PWM + 6 MPPT, `vocmax`, `ich`, `ubat`,
`pmax` par tension), `INVERTERS` (5 onduleurs), `SECTIONS` (mm² → Iz), `FUSES`, `AC_CALIBRES`, `RHO_CU`,
`RECEPTEURS_DEFAUT`. Helpers : `localityById`, `nearestLocality`, `izOf`, `panelById`…

### 10.3 Moteur pur — `src/lib/pv/dimensionnement.ts`

- `PvState` : récepteurs éditables, réponses de l'élève (`ans`), localité, η, mois retenu, `ubat`,
  module + Ns/Np, batterie + Bns/Bnp, autonomie, MPPT, onduleur, câbles, protections, étapes validées,
  `solar` (PVGIS), `badTries`, `helpUsed`, `wrongAns`. `initialPvState()` / `normalizePvState()`.
- `calc(state)` → `PvCalc` (Ejour, Psim, Pstart, HSP, Ppv, Ppv réel, Vmp/Imp/Voc/Isc, **Voc corrigée au
  froid**, Cbat/Cah, parc, Ich, Iinv, Ipvmax, sections mini, Iac).
- `checks(state, step)` → `PvMessage[] {kind:'bad'|'warn'|'ok', title, detail}` — **messages identiques à
  la référence** : tolérances des réponses (3 % / 5 % / 2 %), Voc froid > Voc max MPPT, Vmp < Ubat + 20 %,
  PWM sans conversion, BMS et parc en parallèle, plomb DoD 50 %, fusibles de string entre 1,25 × Isc et
  2,4 × Isc (et ≤ Iz), Iu ≤ In ≤ Iz, VA ≠ W, DDR obligatoire, parafoudre DC, DC ≠ AC.
- `stepOk`, `chainState` (8 blocs de la chaîne énergétique), `expectedAnswer` / `answerOk`,
  `report(state)` (note de calcul texte) et `unifilaire(state)` (**SVG**, deux rangées de quatre blocs :
  PV → coffret DC → MPPT → batteries → protection DC → onduleur → protection AC → tableau, valeurs clés
  sous chaque bloc, DC en rouge / AC en bleu / terre en vert).
- Pédagogie : `PV_STEPS` (11 étapes), `PV_STEP_SHORT`, `PV_CHAIN`, `PV_STAGE_COURS` (mapping étape →
  fiches de `cours.ts` : `energie`, `serie-parallele`, `pv-tension-systeme`, `pv-voc-temperature`,
  `pv-batterie`, `chute-tension`, `calibre-protection`, `dc-ac`, `loi-ohm-puissance`).
- Évaluation : `pvStageScores` = **1 − 0,15 × mauvaise tentative − 0,1 × ouverture d'aide**, plancher 0,3
  si l'étape est validée ; `buildPvEvaluation(state, diploma)` appelle
  `evaluate(diploma, PV_STAGE_DOMAINS, pvStageScores)` ; `pvScore` (note / 100).
- `src/lib/pv/context.ts` : `buildPvContext` (état complet du dimensionnement + fiche ouverte +
  consigne « rappelle la règle, jamais la valeur »), `PV_QUICK`, `PV_HELLO`, `pvFallbackAnswer`.

### 10.4 Ressource solaire réelle — `src/app/api/pvgis/route.ts`

`GET /api/pvgis?lat=&lon=` interroge PVGIS
(`https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?…&peakpower=1&loss=14&outputformat=json`) **côté serveur**,
cache mémoire 24 h (les replis ne sont pas mis en cache), délai de garde 6 s. Réponse :
`{ source:'pvgis'|'table', hsp, min, worstMonth, monthly[{month,em,ed,hsp}], loss, locality }` avec
**HSP ≈ E_d / (1 − pertes)**. Si l'API est injoignable, **repli silencieux** sur la localité la plus proche
du catalogue (`source: 'table'`). L'étape « Localisation » affiche la production mensuelle (E_m et HSP par
mois, mois le plus faible en rouge), la source, et bascule sur la mention « valeurs indicatives » en repli.

### 10.5 Interface — `src/app/tp/[id]/DimensionnementClient.tsx` et `src/components/pv/`

- Store dédié `src/app/tp/[id]/pvStore.ts` (zustand, distinct de `store.ts`) : persistance de `PvState`
  dans `attempts.state` par `saveAttemptState` (signature élargie : `AttemptState | PvState`),
  `finishAttempt(report, score, evaluation, diploma)` avec la note de calcul et le schéma unifilaire.
- Mise en page : en-tête élève, **stepper commun** (`Stepper` accepte `labels` / `shortLabels`),
  **chaîne énergétique** (`ChainBar`, blocs verts / rouges / en cours), colonne des étapes verrouillées
  (masquée < 1024 px : le stepper suffit), contenu de l'étape, colonne « Résumé en direct » + bot.
- Contenu par étape (`src/components/pv/steps.tsx`) : tableau des récepteurs éditable **total masqué**,
  cases « simultané » / « démarrage », champs « réponse élève » (`[data-ans]`) vérifiés à la sortie du
  champ, sélection région → ville, boutons 12 / 24 / 48 V, cartes de fiches techniques, **couplage
  série/parallèle dessiné en SVG** (`PanelCoupling`, `BatCoupling` — ports React de `panelSvg` / `batSvg`,
  avec Ns/Np ±), tableaux câbles et protections, note de calcul + schéma unifilaire + impression.
- Aide : `AidePv` réutilise `AideModal` (extrait de `AideCours.tsx`, désormais partagé) ;
  **ouverture automatique après deux réponses fausses à la même question** (`wrongAns`) ou deux
  tentatives de validation refusées ; chaque ouverture est comptée dans `helpUsed`.
- Bot : `ProfBotPv` (même contrat `POST /api/prof`, contexte de dimensionnement + fiche de l'étape).
- Évaluation finale : le composant `Evaluation` accepte désormais une grille déjà calculée
  (`evaluation`, `scores`, `stageLabels`, `helpUsed`, `score`) — le parcours platine est inchangé.
- Mobile-first vérifié à 400 px : aucun débordement horizontal, tableaux dans des conteneurs défilants,
  SVG `max-width: 100%`, cibles ≥ 40 px.
