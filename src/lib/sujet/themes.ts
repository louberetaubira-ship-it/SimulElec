/**
 * Thèmes normalisés des sujets numériques : libellé, icône et couleurs (catalogue, cartes,
 * filtres, vue professeur). Un futur sujet se range dans ces thèmes : le filtre « Éclairage »
 * du catalogue réunit alors tous les sujets d'éclairage, quel que soit leur dossier.
 * Module pur.
 */
import type { ThemeSujet } from './types';

export interface ThemeInfo {
  id: ThemeSujet;
  /** Libellé long (filtre, carte). */
  label: string;
  /** Libellé court (colonne d'un tableau). */
  court: string;
  icone: string;
  /** Couleur du thème (bordure, texte) et fond pâle (pastille). */
  couleur: string;
  fond: string;
}

export const THEMES: Record<ThemeSujet, ThemeInfo> = {
  securite: { id: 'securite', label: 'Sécurité · habilitations', court: 'Hab.', icone: '🛡', couleur: '#2F6FD1', fond: '#E6EEFF' },
  eclairage: { id: 'eclairage', label: 'Éclairage', court: 'Écl.', icone: '💡', couleur: '#B87800', fond: '#FFF3D6' },
  domotique: { id: 'domotique', label: 'Domotique', court: 'Dom.', icone: '🏠', couleur: '#1E9E5A', fond: '#E1F5E9' },
  acces: { id: 'acces', label: 'Contrôle d’accès', court: 'Accès', icone: '🔑', couleur: '#8E44AD', fond: '#F1E4F8' },
  reseau: { id: 'reseau', label: 'Réseaux', court: 'Rés.', icone: '🌐', couleur: '#0E7C86', fond: '#DFF4F5' },
  pv: { id: 'pv', label: 'Photovoltaïque', court: 'PV', icone: '☀', couleur: '#C2410C', fond: '#FFEDD5' },
  automatisme: { id: 'automatisme', label: 'Automatisme', court: 'Auto.', icone: '⚙', couleur: '#475569', fond: '#E2E8F0' },
  moteur: { id: 'moteur', label: 'Moteurs', court: 'Mot.', icone: '🌀', couleur: '#B91C1C', fond: '#FDE8E6' },
  distribution: { id: 'distribution', label: 'Distribution', court: 'Distr.', icone: '⚡', couleur: '#4338CA', fond: '#E0E7FF' },
  incendie: { id: 'incendie', label: 'Sécurité incendie', court: 'SSI', icone: '🔥', couleur: '#C2410C', fond: '#FFE4D6' },
  intrusion: { id: 'intrusion', label: 'Alarme intrusion', court: 'Intr.', icone: '🚨', couleur: '#9F1239', fond: '#FCE7F3' },
  eolien: { id: 'eolien', label: 'Éolien', court: 'Éol.', icone: '🌬', couleur: '#0F766E', fond: '#D9F2EE' },
  ecs: { id: 'ecs', label: 'Eau chaude sanitaire', court: 'ECS', icone: '🚿', couleur: '#B45309', fond: '#FEF3C7' },
};

/** Ordre d'affichage des thèmes (filtres du catalogue). */
export const ORDRE_THEMES: ThemeSujet[] = [
  'securite', 'incendie', 'intrusion', 'eclairage', 'domotique', 'acces', 'reseau', 'pv', 'eolien', 'ecs', 'automatisme', 'moteur', 'distribution',
];

/** Style « sujet complet » (carte large, colonne du suivi). */
export const THEME_COMPLET = { label: 'Sujet complet', court: 'Complet', icone: '📄', couleur: '#1B222C', fond: '#E9EEF5' } as const;
