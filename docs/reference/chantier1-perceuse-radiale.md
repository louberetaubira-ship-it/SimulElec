# Chantier 1 · Perceuse radiale — dossier technique

Source : ouvrage « Chantier 1 : Perceuse radiale » (extrait fourni par le professeur, 18 pages :
présentation p. 9, schéma électrique p. 10, implantation du coffret p. 11, préparation p. 20-26,
Fiche 1 « Démarrage direct : un sens de marche » p. 45-50).

## 1. Machine et cahier des charges (p. 9)

La perceuse radiale est une machine-outil destinée à réaliser des trous dans les matériaux à
l'aide d'un foret. Le foret, serré dans le mandrin, est entraîné en rotation par un moteur
électrique. Exigence d'efficacité énergétique : consommation la plus faible possible (moteur IE3).

Caractéristiques des circuits :

- Alimentation : 3 × 400 V + PE, 50 Hz
- Force motrice : moteur asynchrone triphasé 1,1 kW, 1 500 tr/min, 4 pôles (Leroy Somer LSES 90SL)
- Circuit de commande : alimentation en TBT 24 V, 50 Hz

## 2. Fonctionnement attendu (p. 9)

Situation initiale : absence de défaut, aucune commande actionnée, écran de protection en place,
sectionneur ouvert.

Mise en service :

- la fermeture du **sectionneur** met la perceuse sous tension, le voyant « sous tension »
  incolore s'allume ;
- une action sur le **bouton poussoir vert** met le mandrin en rotation ;
- une action sur le **bouton poussoir rouge** arrête la rotation du mandrin ;
- une action sur le **bouton poussoir type coup de poing à verrouillage** arrête la rotation du
  mandrin ; il faudra le déverrouiller pour pouvoir redémarrer.

## 3. Organisation du pupitre de commande (p. 9)

| Repère | Organe | Rôle |
|---|---|---|
| H1 | voyant **incolore** | perceuse sous tension |
| S4 | bouton poussoir **vert** | mise en rotation du mandrin |
| S3 | bouton poussoir **rouge** | arrêt de la rotation en fonctionnement normal |
| S2 | **coup de poing rouge** à verrouillage | arrêt de la rotation en cas de problème |
| S1 | **interrupteur de position** | autorise la rotation si l'écran de protection est en position |

S1 n'est pas sur le pupitre : il est monté sur le carter de l'écran de protection.

## 4. Schéma électrique (p. 10, folio 1/1)

Puissance (colonnes 1-2) :

- L1 L2 L3 → **Q1 sectionneur porte-fusibles** (+ liaison PE) → L4 L5 L6
- L4 L5 L6 → **KM1** (contacteur tripolaire) → L7 L8 L9
- L7 L8 L9 → **F1 relais thermique** → L10 L11 L12
- L10 L11 L12 → **XP** (bornes U V W du bornier) → **M1** moteur 3~, PE à la carcasse

Alimentation TBT (colonnes 3-4) :

- prise entre L5 et L13 (deux phases en aval de Q1) → **Q2** (protection du primaire)
- **T1** transformateur 400 V / 24 V, 63 VA
- secondaire 24 V → **Q3** (protection du secondaire) → conducteurs `1` et `com`

Commande 24 V (colonnes 5-7), de `2` vers `com` :

1. contact **F1 95-96** (défaut thermique)
2. borne **XC-2** → **S1** interrupteur de position (protection capot en position) → **XC-3**
3. **XC-4** → entrée du boîtier de commande
4. **S2** arrêt d'urgence (NC, coup de poing à verrouillage)
5. **S3** arrêt (NC)
6. **S4** marche (NO), en parallèle le contact d'auto-maintien **KM1 13-14**
7. **XC-6** → conducteur `7` → bobine **KM1 A1 / A2** → `com`

Signalisation : **H1** incolore entre **XC-1** (conducteur `2`, présent dès Q1 fermé et Q3 armé)
et **XC-7** → `com`. H1 signale donc la mise **sous tension**, pas la marche.

## 5. Implantation du coffret (p. 11)

- Rail 1 : Q1 · Q2 · Q3 · T1
- Rail 2 : KM1 · F1
- Rail 3 : bornier X1 — X-0, X-1, X-2 (PE), XP-U, XP-V, XP-W, XC-1 à XC-7
- Presse-étoupes : réseau 3 × 400 V, moteur, pupitre (S2 S3 S4 H1), interrupteur de position S1

## 6. Travail demandé à l'élève (p. 20-26)

1. Identifier les fonctions de la chaîne de puissance : Alimenter · Distribuer · Convertir ·
   Transmettre · Agir (appareillages de sectionnement et de consignation, de commutation et de
   protection, moteur, poulies + courroie, mandrin + foret).
2. Calculer les caractéristiques du moteur : U, P, In, Tn, Nn, puis
   `Id = 5 à 8 × In` et `Td = 1,2 à 1,5 × Tn`.
3. Analyser le schéma structurel : démarreur automatique, poste de commande sur boîtier
   extérieur, boutons poussoirs agissant sur le contacteur, sectionnement et consignation
   assurés par le sectionneur porte-fusibles.
4. Risque électrique : repérer la zone de puissance (tension dangereuse) et la zone de commande
   (TBT non dangereuse) ; travaux de mesurage en **voisinage renforcé**.
5. Alimentation triphasée : mesurer les 3 tensions simples (230 V) et les 3 tensions composées
   (400 V), contrôler l'ordre des phases.
6. Moteur asynchrone : choisir la référence IE3, vérifier le couplage (400 V → étoile), mesurer
   les 3 intensités de ligne et la vitesse de rotation au tachymètre.

## 7. Valeurs de référence pour le simulateur

Moteur 1,1 kW · 400 V · 4 pôles · couplage étoile :

- `In` ≈ 2,6 A (LSES 90SL IE3, cos φ ≈ 0,79, η ≈ 0,84)
- `Tn = 9550 × P(kW) / N(tr/min)` ≈ 7,3 N·m
- `Id` : 13 A à 20,8 A · `Td` : 8,8 à 11 N·m
- vitesse nominale ≈ 1 430 tr/min (glissement ≈ 4,7 %)
- tension simple 230 V, tension composée 400 V, commande 24 V

## 8. Écarts assumés dans la maquette virtuelle

- Le catalogue du simulateur n'a pas encore de sectionneur porte-fusibles tripolaire : Q1 est
  posé sur l'emplacement d'un appareil 3 pôles de même encombrement et de mêmes bornes
  (1/3/5 – 2/4/6). Le choix de matériel du poste Q1 porte bien, lui, sur un sectionneur porte-
  fusibles ; c'est uniquement la photo de la platine qui diffère.
- S2 (coup de poing) et S3 (arrêt) sont deux contacts NC en série : dans la maquette ils forment
  une seule chaîne d'arrêt, actionnée par le bouton rouge du pupitre.
