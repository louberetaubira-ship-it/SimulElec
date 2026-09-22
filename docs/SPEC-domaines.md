# SPEC — Classement des TP par domaine professionnel (validé le 2026-09-22)

Contexte : SimulElec (Next.js 14 App Router, TS strict, Tailwind, Supabase). Lire `CLAUDE.md` avant toute
modification. Interface en français, tutoiement pour l'élève. `npx tsc --noEmit -p .` doit passer.
Ne PAS toucher `src/lib/supabase/env.ts` (copie locale de travail).

## Décision produit
- **11 domaines professionnels** (niveau 1) avec codes : HAB, TER, IND, DOM, ENR, RES, INF, SEC, COM, CVC, EAU.
  « Mesures & maintenance » (MCM) n'est PAS un domaine : c'est une activité.
- **Sous-domaine** (niveau 2) pris dans une liste fermée par domaine (ci-dessous).
- **Activités** (niveau 3) = les 5 activités du référentiel : `preparation`, `realisation`, `mise_en_service`,
  `maintenance`, `communication`. Déduites automatiquement du TP (kind/phases), modifiables par le prof.
- **Niveau 4** (diplômes, niveau de classe, compétences) EXISTE DÉJÀ (`tps.diplomas`, `tps.level`, `tps.competences`,
  `src/lib/data/competences.ts`). Ne pas dupliquer.
- Chaque TP : `domaine` (1, obligatoire pour publier), `domainesSecondaires` (0..n), `sousDomaine` (0..1),
  `activites` (0..5), `motsCles` (0..n, libres).
- Le champ existant `family` ('ind'|'hab'|'ter'|'pv') RESTE (il pilote la scène/annexe). Il est désormais dérivé :
  `family = DOMAINES[domaine].scene` par défaut ; on ne le supprime pas.
- Côté ÉLÈVE : un domaine sans TP publié n'apparaît pas. Côté PROF : tous les domaines sont visibles, les vides en
  pointillé, avec un lien « créer un TP dans ce domaine ».
- Attention : le type `Domain` de `src/lib/data/competences.ts` (analyse, pose, cablage…) est un autre concept
  (domaines d'activité → compétences). Ne pas le confondre : le nouveau type s'appelle **`DomainePro`**.

## Module source unique : `src/lib/taxonomy/domaines.ts` (module PUR, importable serveur + client)
```ts
export type DomainePro = 'HAB'|'TER'|'IND'|'DOM'|'ENR'|'RES'|'INF'|'SEC'|'COM'|'CVC'|'EAU';
export type ActivitePro = 'preparation'|'realisation'|'mise_en_service'|'maintenance'|'communication';
export interface SousDomaine { id: string; label: string }          // id = `${code}.${slug}` ex. 'IND.demarrage'
export interface DomaineDef {
  code: DomainePro; label: string; court: string; description: string;
  couleur: string;                       // hex (voir palette ci-dessous)
  scene: 'ind'|'hab'|'ter'|'pv';         // scène / family par défaut
  sous: SousDomaine[];
}
export const DOMAINES: DomaineDef[];                       // ordre d'affichage = ordre ci-dessous
export const DOMAINE_BY_CODE: Record<DomainePro, DomaineDef>;
export const ACTIVITES: { id: ActivitePro; label: string }[];
export interface Classement { domaine: DomainePro | null; domainesSecondaires: DomainePro[]; sousDomaine: string | null; activites: ActivitePro[]; motsCles: string[] }
export const CLASSEMENT_VIDE: Classement;
export function isDomainePro(x: unknown): x is DomainePro;
export function isActivitePro(x: unknown): x is ActivitePro;
export function sousDomainesDe(code: DomainePro): SousDomaine[];
export function labelSousDomaine(id: string | null | undefined): string;   // '' si inconnu
export function domaineParFamily(family: 'ind'|'hab'|'ter'|'pv'): DomainePro;   // ind→IND, hab→HAB, ter→TER, pv→ENR
export function normaliserClassement(x: unknown): Classement;  // relecture défensive (jsonb, import json)
export function activitesDeduites(tp: { kind?: string; playable?: boolean; faults?: unknown[]; mesures?: unknown[] }): ActivitePro[];
export function taxonomiePourPrompt(): string;   // texte compact pour le générateur (codes + libellés + sous-domaines)
```
Palette (clair) : HAB #2F80ED · TER #7B61C9 · IND #E0701A · DOM #0E9F8E · ENR #2E9E4B · RES #3D5A80 · INF #8D6E63 ·
SEC #C0392B · COM #1E88A8 · CVC #5C9BD1 · EAU #1565C0.

### Les 11 domaines et leurs sous-domaines (libellés définitifs)
- **HAB** Habitat et installations résidentielles (court « Habitat », scene hab) : eclairage « Éclairage résidentiel » ;
  prises « Prises et circuits spécialisés » ; tableau « Tableaux électriques et protections » ; chauffage « Chauffage et
  production d'eau chaude » ; ventilation « Ventilation résidentielle » ; terre « Mise à la terre et liaison
  équipotentielle » ; collectif « Installations électriques collectives ».
- **TER** Tertiaire et bâtiments professionnels (« Tertiaire », ter) : eclairage « Éclairage des locaux professionnels » ;
  distribution « Distribution électrique et TGBT » ; securite « Éclairage de sécurité » ; erp « Installations
  électriques des ERP » ; gtb « Gestion technique du bâtiment » ; secours « Alimentations secourues et onduleurs » ;
  commerces « Équipements électriques des commerces et bureaux ».
- **IND** Industrie et systèmes automatisés (« Industrie », ind) : demarrage « Démarrage et commande des moteurs » ;
  variation « Variation de vitesse » ; api « Automates programmables industriels » ; capteurs « Capteurs et
  actionneurs » ; pneumatique « Électropneumatique » ; machines « Machines et systèmes de production » ; convoyage
  « Convoyage, manutention et levage » ; armoires « Armoires électriques industrielles ».
- **DOM** Domotique et bâtiments intelligents (« Domotique », ter) : knx « Bus KNX » ; eclairage « Éclairage
  intelligent » ; volets « Automatisation des volets roulants » ; scenarios « Scénarios domotiques » ; energie
  « Gestion énergétique » ; supervision « Supervision des bâtiments » ; iot « Objets connectés ».
- **ENR** Énergies renouvelables et stockage (« Énergies renouvelables », pv) : pv-autonome « Photovoltaïque
  autonome » ; pv-reseau « Photovoltaïque raccordé au réseau » ; dimensionnement « Dimensionnement des panneaux
  solaires » ; batteries « Stockage par batteries » ; onduleurs « Onduleurs et régulateurs » ; autoconsommation
  « Autoconsommation et gestion énergétique » ; hybride « Production éolienne et systèmes hybrides ».
- **RES** Réseaux électriques et distribution d'énergie (« Réseaux électriques », ter) : hta-bt « Distribution
  HTA/BT » ; postes « Transformateurs et postes de distribution » ; bt « Réseaux basse tension » ; comptage
  « Branchements et comptage » ; protections « Protections des réseaux » ; triphase « Distribution triphasée et
  équilibrage ».
- **INF** Infrastructures et équipements extérieurs (« Infrastructures », ind) : eclairage-public « Éclairage
  public » ; signalisation « Feux de signalisation » ; irve « Bornes de recharge IRVE » ; exterieur « Équipements
  électriques extérieurs » ; commande « Commande et programmation de l'éclairage public ».
- **SEC** Sécurité et sûreté des installations (« Sécurité et sûreté », ter) : incendie « Sécurité incendie et
  SSI » ; intrusion « Alarmes intrusion » ; video « Vidéosurveillance » ; acces « Contrôle d'accès » ; eclairage
  « Éclairage de sécurité » ; alimentation « Alimentations électriques de sécurité ».
- **COM** Réseaux de communication et systèmes connectés (« Réseaux de communication », ter) : vdi « Réseaux VDI » ;
  ethernet « Câblage Ethernet » ; ip « Réseaux IP » ; industriel « Communication industrielle » ; fibre « Fibre
  optique » ; interphonie « Interphonie et systèmes connectés ».
- **CVC** Génie climatique et équipements thermiques (« Génie climatique », hab) : clim « Climatisation » ; pac
  « Pompes à chaleur » ; vmc « Ventilation mécanique » ; chauffage « Chauffage électrique » ; ecs « Production
  d'eau chaude » ; regulation « Régulation et commande thermique ».
- **EAU** Pompage et traitement des eaux (« Pompage et eaux », ind) : stations « Stations de pompage » ; commande
  « Commande des pompes » ; capteurs « Capteurs de niveau et de pression » ; alternance « Alternance de pompes » ;
  surpression « Surpression et distribution d'eau » ; traitement « Traitement et assainissement ».

## Données
### `TpDefinition` (src/lib/types.ts) — étendre seulement
Ajouter un champ optionnel `classement?: Classement` (import type depuis `@/lib/taxonomy/domaines`).
### TP fournis (src/lib/data/tps/*.ts) — ajouter `classement` à chacun
| id | domaine | sousDomaine | secondaires | motsCles |
|---|---|---|---|---|
| perceuse-radiale | IND | IND.demarrage | — | contacteur, relais thermique, démarrage direct |
| variateur | IND | IND.variation | — | ATV320, paramétrage |
| automate-m221 | IND | IND.api | COM | M221, entrées/sorties, 24 V |
| portail | IND | IND.demarrage | INF | KM1/KM2, verrouillage, fins de course, 2 sens |
| solaire-autonome | ENR | ENR.pv-autonome | HAB | MPPT, LiFePO4, 48 V, note de calcul |
| knx-tertiaire | DOM | DOM.knx | TER | KNX, ETS5, Langlois |
| station-relevage | EAU | EAU.stations | IND | mise en service, station de relevage |
| ecobike-portail | IND | IND.api | INF | M221, portail, CGM 2023, Écobike |
| ecobike-knx | DOM | DOM.eclairage | TER | KNX, CGM 2023, Écobike |
| ecobike-pv | ENR | ENR.autoconsommation | TER | IMEON, autoconsommation, CGM 2023, Écobike |
| ecobike-reseau | COM | COM.ip | TER, DOM | Ethernet, supervision, CGM 2023, Écobike |
`activites` : laisser `activitesDeduites(tp)` faire le travail (ne pas écrire à la main) via un helper
`classementDe(tp: TpDefinition): Classement` (dans `src/lib/taxonomy/classement.ts`) qui complète les champs absents :
domaine ← `domaineParFamily(tp.family)`, activites ← déduites si vides.

### Migration `supabase/migrations/0014_domaines.sql` (additive, idempotente `if not exists`)
```sql
alter table public.tps
  add column if not exists domaine text,
  add column if not exists domaines_sec text[] not null default '{}',
  add column if not exists sous_domaine text,
  add column if not exists activites text[] not null default '{}',
  add column if not exists mots_cles text[] not null default '{}';
alter table public.tps drop constraint if exists tps_domaine_check;
alter table public.tps add constraint tps_domaine_check
  check (domaine is null or domaine in ('HAB','TER','IND','DOM','ENR','RES','INF','SEC','COM','CVC','EAU'));
update public.tps set domaine = case family when 'ind' then 'IND' when 'hab' then 'HAB' when 'ter' then 'TER' when 'pv' then 'ENR' end
  where domaine is null and family is not null;
create index if not exists tps_domaine_idx on public.tps (domaine);
```
Les policies RLS existantes couvrent les nouvelles colonnes (même table). Pas de trigger.

### `src/lib/db/tps.ts`
- `TpRow` : + `domaine: DomainePro | null; domaines_sec: DomainePro[]; sous_domaine: string | null; activites: ActivitePro[]; mots_cles: string[]` (colonnes ajoutées à `TP_COLS`).
- `TpSummary` : + `domaine`, `sous_domaine`, `mots_cles` (et `listTps` les sélectionne ; `fromCode` les prend dans `classementDe(tp)`).
- `TpSavePayload` : + `classement: Classement` → `row()` écrit les 5 colonnes ET `definition.classement`.
- `rowToDefinition` : relit `definition.classement` via `normaliserClassement`, sinon compose depuis les colonnes.
- Nouveau : `classementOfRow(row: TpRow): Classement` (colonnes d'abord, sinon definition, sinon family).
- Import/export JSON du catalogue (`src/app/prof/tp/page.tsx`) : le fichier exporté contient `classement` ; l'import le relit (`normaliserClassement`) et le passe au payload.

## Lot C — Catalogue
- `src/app/tp/page.tsx` (serveur) devient un shell qui charge `images`, la liste des TP fournis (`TPS`) et rend un
  composant client `src/app/tp/CatalogueClient.tsx` qui fusionne TP fournis + TP du prof (`listTeacherTps`) en une
  seule liste, puis : barre de **puces de domaines** (couleur du domaine, code, libellé court, compteur ; « Tous » en
  tête ; domaines vides masqués côté élève), **puces de sous-domaines** quand un domaine est choisi, **recherche**
  (titre, mots-clés, sous-domaine), cartes groupées **par domaine** (section par domaine dans l'ordre de `DOMAINES`),
  chaque carte garde son visuel actuel + badge de domaine (bordure haute colorée) + sous-domaine + mots-clés (max 4)
  + badges « +COM » pour les secondaires. Le lien « cycle complet solaire » reste (dans la section ENR).
  Filtre mémorisé dans `localStorage` (try/catch). `TpsProfesseur.tsx` est supprimé/intégré (les TP prof entrent dans
  la même liste, avec leur badge « TP du professeur » conservé).
- `src/app/prof/tp/page.tsx` : colonne « Domaine » (pastille couleur + code, sous-domaine en dessous), filtre par
  domaine au-dessus du tableau (tous les domaines visibles, vides en pointillé avec compteur 0 et lien vers
  `/prof/tp/nouveau?domaine=CODE`), tri par domaine.
- `src/app/ressources/RessourcesHub.tsx` : filtre par domaine (même barre de puces, composant partagé
  `src/components/catalogue/DomaineChips.tsx`) appliqué aux cartes (`TP_RESSOURCES` reçoit le domaine via `classementDe(tpById(...))`).
- Composants partagés : `src/components/catalogue/DomaineChips.tsx` (props : counts, value, onChange, montrerVides),
  `src/components/catalogue/DomaineBadge.tsx` (pastille code + couleur, tailles sm/md).

## Lot D — Studio + générateur
- Studio `src/components/studio/Inspector.tsx` (section méta, près de « Famille et scène ») : bloc **« Classement »** :
  select Domaine (obligatoire, DOMAINES), select Sous-domaine (dépend du domaine), cases Domaines secondaires,
  cases Activités (pré-cochées par `activitesDeduites`), champ Mots-clés (saisie séparée par virgules → tableau).
  Changer le domaine propose la scène par défaut (`DOMAINES[code].scene`) si la scène n'a pas été touchée.
  Store `src/components/studio/store.ts` : `def.classement` fait partie de `def` (TpDefinition) ; la sauvegarde
  (`TpSavePayload.classement`) l'envoie. **Publier exige un domaine** (message clair sinon).
- `/prof/tp/nouveau?domaine=CODE` pré-remplit le domaine.
- Générateur : `src/lib/generateur/schema.ts` `PedagogieGeneree` + `classement?: { domaine, sousDomaine, domainesSecondaires, activites, motsCles }` ;
  `src/lib/generateur/prompt.ts` : le prompt de l'appel « pédagogie » reçoit `taxonomiePourPrompt()` et demande le
  classement (codes uniquement, sous-domaine = id existant) ; `serveur.ts`/`verifier.ts` : normaliser via
  `normaliserClassement` (rejeter un code inconnu → null). `src/components/studio/generation.ts` : le brief accepte un
  `domaine` facultatif (select dans `Brief.tsx`, à côté du type d'installation) ; s'il est donné il contraint la
  scène par défaut ; le TP assemblé reçoit `classement` (brief > IA > family). `deductions` signale `classement`
  quand l'IA l'a choisi (pastille IA existante).

## Lot E — Suivi (couverture des domaines)
- Nouveau module pur `src/lib/prof/couverture.ts` : `couvertureDomaines(attempts: AttemptRow[], resoudre: (tpId) => Classement | null)` →
  `Record<DomainePro, { tps: string[]; termines: number; enCours: number }>` (un TP compte dans son domaine
  principal ; secondaires comptés dans `secondaires: number`).
- `src/app/moi/page.tsx` (élève) : bloc « Domaines travaillés » : 11 lignes max mais seules celles > 0 + une ligne
  « à découvrir » listant les domaines avec TP publiés non commencés.
- `src/app/prof/page.tsx` : par classe, une barre par domaine (proportion d'élèves ayant terminé ≥ 1 TP du
  domaine) ; `src/app/prof/eleve/[id]/page.tsx` : même bloc que /moi pour l'élève consulté. Composant partagé
  `src/components/prof/CouvertureDomaines.tsx` (barres horizontales colorées, mono tabular).
- La résolution `tpId → Classement` : TP fournis via `classementDe(tpById(id))`, TP du prof via `classementOfRow`
  (une seule requête `listMyTps`/`listTeacherTps` déjà faite dans ces pages — réutiliser, pas de N+1).

## Livraison
Zip des seuls fichiers modifiés/ajoutés, chemins d'origine conservés, + `docs/SPEC-domaines.md` + note de
livraison (`docs/LIVRAISON-domaines.md`) listant les fichiers et la migration à appliquer.
