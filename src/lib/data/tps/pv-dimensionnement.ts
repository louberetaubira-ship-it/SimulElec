/**
 * TP 14 · Étude et dimensionnement d'une installation photovoltaïque autonome avec stockage.
 *
 * Parcours de type `dimensionnement` (SPEC-v3 § TP 14) : aucune platine, aucun câblage.
 * Les 11 étapes, les contrôles et la note de calcul sont portés par
 * `src/lib/pv/dimensionnement.ts` ; l'interface est `DimensionnementClient`.
 */
import type { TpDefinition } from '@/lib/types';

export const TP_PV_DIMENSIONNEMENT: TpDefinition = {
  id: 'pv-dimensionnement',
  title: 'Étude et dimensionnement d\'une installation photovoltaïque autonome avec stockage',
  level: 'Tle Bac Pro MELEC · BTS Électrotechnique · CS TER',
  family: 'pv',
  kind: 'dimensionnement',
  scene: 'pv',
  annex: 'roof',
  playable: true,
  competences: ['C3 Définir une installation', 'C8 Dimensionner', 'C10 Outils numériques'],
  summary:
    'Bilan énergétique d\'une habitation isolée, puis dimensionnement complet : ressource solaire du site, tension du parc, champ PV et couplage série / parallèle, batteries, régulateur MPPT, onduleur, câbles, protections, note de calcul et schéma unifilaire.',
  situation:
    'Une habitation isolée, hors réseau, doit être alimentée par une installation photovoltaïque avec batteries. Le client te confie l\'étude : tu établis le bilan des besoins, tu choisis la tension du système, tu dimensionnes le champ, le parc de batteries, le régulateur, l\'onduleur, les câbles et les protections, puis tu remets une note de calcul et un schéma unifilaire.',
  plaque: {
    Site: 'habitation isolée, hors réseau',
    Besoin: '≈ 3,5 kWh/j · 1,2 kW simultanés',
    Autonomie: '2 jours sans soleil',
    Sortie: '230 V · 50 Hz',
    Ressource: 'HSP du site (PVGIS)',
  },
  cahierDesCharges: [
    { k: 'Besoins', v: 'bilan de puissance complet, énergie journalière en Wh/j' },
    { k: 'Ressource solaire', v: 'HSP du site, dimensionnement sur le mois le plus défavorable' },
    { k: 'Tension du parc', v: '12, 24 ou 48 V, justifiée par le courant appelé' },
    { k: 'Champ PV', v: 'couplage série / parallèle, Voc corrigée au froid < Voc max du régulateur' },
    { k: 'Stockage', v: 'autonomie de 2 jours, DoD et rendement de la technologie retenue' },
    { k: 'Conversion', v: 'régulateur MPPT et onduleur 230 V compatibles avec la tension du parc' },
    { k: 'Câbles', v: 'échauffement (I ≤ Iz) ET chute de tension (ΔU ≤ 3 % côté PV, 2 % côté batterie)' },
    { k: 'Protections', v: 'fusibles gPV de string, fusible principal batterie, disjoncteur AC, DDR 30 mA' },
    { k: 'Livrable', v: 'note de calcul et schéma unifilaire de la chaîne complète' },
  ],
  postes: [],
  rails: [],
  slots: [],
  annexItems: [],
  liaisons: [],
  nets: {},
  tests: [],
  mesures: [],
  faults: [],
  quiz: [
    {
      q: 'Pourquoi passer de 12 V à 48 V pour un parc batterie de forte puissance ?',
      options: [
        'Pour diviser le courant par quatre à puissance égale, donc réduire sections et pertes',
        'Pour augmenter l\'énergie stockée sans changer les batteries',
        'Parce que les onduleurs 12 V n\'existent pas',
      ],
      answer: 0,
    },
    {
      q: 'Que vérifie-t-on sur la Voc du champ avant de choisir un régulateur MPPT ?',
      options: [
        'La Voc à 25 °C uniquement',
        'La Voc corrigée à la température minimale du site, qui doit rester sous la Voc max du régulateur',
        'La Voc divisée par le nombre de strings',
      ],
      answer: 1,
    },
    {
      q: 'Un câble est dimensionné pour deux contraintes. Lesquelles ?',
      options: [
        'La couleur et la longueur',
        'Le prix et la section commerciale',
        'L\'échauffement (I ≤ Iz) et la chute de tension (ΔU maxi)',
      ],
      answer: 2,
    },
  ],
  motor: null,
  station: false,
  hasMotor: false,
};
