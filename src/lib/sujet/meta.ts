/**
 * Métadonnées des sujets numériques pour les pages CLIENTES (catalogue élève, espace élève,
 * tableau de bord et bilans professeur) : titre, parent, durée, nombre de questions, barème.
 * Aucun corrigé : les données complètes (`src/lib/data/sujets`) restent côté serveur.
 *
 * FICHIER GÉNÉRÉ — ne pas modifier à la main : `npx tsx scripts/audit-sujet.ts --meta`
 * (l'audit vérifie qu'il est à jour).
 */

export interface SujetMeta {
  id: string;
  titre: string;
  /** Sujet complet dont un sujet thématique est tiré. */
  parent: string | null;
  dureeMin: number;
  questions: number;
  points: number;
}

export const META_SUJETS: SujetMeta[] = [
  {
    id: 'eip',
    titre: 'Espace d’innovation partagé (EIP) — rénovation électrique',
    parent: null,
    dureeMin: 300,
    questions: 72,
    points: 98
  },
  {
    id: 'eip-habilitations',
    titre: 'EIP · Habilitations & sécurité',
    parent: 'eip',
    dureeMin: 60,
    questions: 13,
    points: 20
  },
  {
    id: 'eip-eclairage',
    titre: 'EIP · Éclairage LED de l’atelier',
    parent: 'eip',
    dureeMin: 95,
    questions: 25,
    points: 31
  },
  {
    id: 'eip-myhome',
    titre: 'EIP · Domotique MyHOME (bus SCS)',
    parent: 'eip',
    dureeMin: 85,
    questions: 20,
    points: 28
  },
  {
    id: 'eip-vigik',
    titre: 'EIP · Contrôle d’accès VIGIK',
    parent: 'eip',
    dureeMin: 60,
    questions: 14,
    points: 19
  },
  {
    id: 'scierie',
    titre: 'Scierie — nouvel atelier d’usinage',
    parent: null,
    dureeMin: 300,
    questions: 76,
    points: 112
  },
  {
    id: 'scierie-alimentation',
    titre: 'Scierie · Alimentation HTA/BT & compensation',
    parent: 'scierie',
    dureeMin: 55,
    questions: 13,
    points: 20
  },
  {
    id: 'scierie-eclairage',
    titre: 'Scierie · Éclairage LED & gestion KNX',
    parent: 'scierie',
    dureeMin: 85,
    questions: 25,
    points: 32
  },
  {
    id: 'scierie-habilitations',
    titre: 'Scierie · Habilitations & consignation',
    parent: 'scierie',
    dureeMin: 30,
    questions: 5,
    points: 7
  },
  {
    id: 'scierie-aspiration',
    titre: 'Scierie · Aspiration & variateur ATV340',
    parent: 'scierie',
    dureeMin: 60,
    questions: 14,
    points: 20
  },
  {
    id: 'scierie-pv',
    titre: 'Scierie · Photovoltaïque',
    parent: 'scierie',
    dureeMin: 70,
    questions: 18,
    points: 31
  },
  {
    id: 'chevrerie',
    titre: 'Chèvrerie — diversification d’une exploitation agricole',
    parent: null,
    dureeMin: 300,
    questions: 125,
    points: 304
  },
  {
    id: 'chevrerie-incendie',
    titre: 'Chèvrerie · Sécurité incendie (SSI type 4)',
    parent: 'chevrerie',
    dureeMin: 25,
    questions: 17,
    points: 24
  },
  {
    id: 'chevrerie-intrusion',
    titre: 'Chèvrerie · Alarme intrusion',
    parent: 'chevrerie',
    dureeMin: 50,
    questions: 15,
    points: 51.5
  },
  {
    id: 'chevrerie-alimentation',
    titre: 'Chèvrerie · Alimentation du hangar',
    parent: 'chevrerie',
    dureeMin: 50,
    questions: 20,
    points: 51
  },
  {
    id: 'chevrerie-parafoudre',
    titre: 'Chèvrerie · Choix du parafoudre',
    parent: 'chevrerie',
    dureeMin: 25,
    questions: 7,
    points: 24
  },
  {
    id: 'chevrerie-eolienne',
    titre: 'Chèvrerie · Installation d’une éolienne',
    parent: 'chevrerie',
    dureeMin: 60,
    questions: 34,
    points: 60
  },
  {
    id: 'chevrerie-ecs',
    titre: 'Chèvrerie · Eau chaude sanitaire & préparation des travaux',
    parent: 'chevrerie',
    dureeMin: 40,
    questions: 14,
    points: 41
  },
  {
    id: 'chevrerie-portail',
    titre: 'Chèvrerie · Le portail',
    parent: 'chevrerie',
    dureeMin: 50,
    questions: 18,
    points: 52.5
  }
];

const PAR_ID = new Map(META_SUJETS.map(s => [s.id, s]));

/** Métadonnées d'un sujet numérique (complet ou thématique), ou undefined (TP). */
export const metaSujet = (id: string): SujetMeta | undefined => PAR_ID.get(id);
