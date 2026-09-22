/**
 * Mise en forme lisible des réponses et des attendus (copie corrigée, vue professeur).
 * Module pur.
 */

import type { ReponseSujet, SujetQuestion, SujetQuestionType } from './types';
import { fmtNombre } from './normalize';
import { cleCavalier } from './correction';

/** Libellé de l'outil de réponse (badge de la question). */
export const LIBELLE_OUTIL: Record<SujetQuestionType, string> = {
  cocher: 'Cocher',
  relier: 'Relier',
  ordonner: 'Ordonner',
  valeur: 'Valeur / référence',
  calcul: 'Calcul F · A · R',
  tableau: 'Tableau',
  redige: 'Texte rédigé',
  bulles: 'Bulles sur plan',
  cavaliers: 'Cavaliers',
  schema: 'Schéma (2 modes)',
};

const lettre = (i: number) => String.fromCharCode(65 + i);

/** Réponse de l'élève en lignes de texte. */
export function texteReponse(q: SujetQuestion, r: ReponseSujet | undefined): string[] {
  if (!r || r.type !== q.type) return [];
  switch (q.type) {
    case 'cocher': {
      const c = (r as Extract<ReponseSujet, { type: 'cocher' }>).choix;
      return c.map(i => `☒ ${q.options[i] ?? `option ${i + 1}`}`);
    }
    case 'relier': {
      const l = (r as Extract<ReponseSujet, { type: 'relier' }>).liens;
      return q.gauche.map((g, i) => `${g} → ${l[i] != null ? `${lettre(l[i] as number)}. ${q.droite[l[i] as number] ?? ''}` : '—'}`);
    }
    case 'ordonner': {
      const rg = (r as Extract<ReponseSujet, { type: 'ordonner' }>).rangs;
      return q.items.map((it, i) => `${rg[i] ?? '—'} · ${it}`);
    }
    case 'valeur': {
      const v = (r as Extract<ReponseSujet, { type: 'valeur' }>).valeurs;
      return q.champs.map(c => `${c.label} : ${v[c.id]?.trim() || '—'}${c.unite && v[c.id]?.trim() ? ` ${c.unite}` : ''}`);
    }
    case 'calcul': {
      const c = r as Extract<ReponseSujet, { type: 'calcul' }>;
      return [
        `Formule : ${c.formule.trim() || '—'}`,
        `Application : ${c.application.trim() || '—'}`,
        `Résultat : ${q.grandeur} = ${c.resultat.trim() || '—'}${q.unite ? ` ${q.unite}` : ''}`,
      ];
    }
    case 'tableau': {
      const cel = (r as Extract<ReponseSujet, { type: 'tableau' }>).cellules;
      return q.lignes.map(l => l.cellules.map(c => (typeof c === 'string' ? c : cel[c.id]?.trim() || '—')).join(' | '));
    }
    case 'redige':
      return (r as Extract<ReponseSujet, { type: 'redige' }>).texte.split('\n');
    case 'bulles': {
      const v = (r as Extract<ReponseSujet, { type: 'bulles' }>).valeurs;
      return [q.bulles.map((b, i) => `${i + 1}: ${v[b.id]?.trim() || '—'}`).join(' · ')];
    }
    case 'cavaliers': {
      const v = (r as Extract<ReponseSujet, { type: 'cavaliers' }>).valeurs;
      return q.composants.map(c => `${c.label} : ${c.positions.map(p => `${p.label} ${v[cleCavalier(c.id, p.id)]?.trim() || '—'}`).join(' · ')}`);
    }
    case 'schema': {
      const s = r as Extract<ReponseSujet, { type: 'schema' }>;
      const lab = new Map(q.traits.bornes.map(b => [b.id, b.label]));
      const coul = new Map(q.traits.couleurs.map(c => [c.id, c.label]));
      const out = [`${s.traits.length} trait${s.traits.length > 1 ? 's' : ''} posé${s.traits.length > 1 ? 's' : ''}`];
      if (s.traits.length) out.push(s.traits.map(t => `${lab.get(t.a) ?? t.a}–${lab.get(t.b) ?? t.b} (${coul.get(t.couleur) ?? t.couleur})`).join(' · '));
      out.push(s.platine
        ? `Câblage réel : ${s.platine.conformes}/${s.platine.total} liaisons · ${s.platine.sousTension ? 'sous tension ✓' : 'sous tension ✗'} · ${s.platine.essai ? 'essai ✓' : 'essai ✗'}`
        : 'Câblage réel : non validé');
      return out;
    }
  }
}

const nombreOuTexte = (c: { attendu?: number; acceptes?: string[] }, unite?: string) => {
  if (c.acceptes && c.acceptes.length) return c.acceptes[0];
  if (c.attendu != null) return `${fmtNombre(c.attendu)}${unite ? ` ${unite}` : ''}`;
  return '(non noté)';
};

/** Réponse attendue (corrigé officiel) en lignes de texte. */
export function texteAttendu(q: SujetQuestion): string[] {
  switch (q.type) {
    case 'cocher': return q.bonnes.map(i => `☒ ${q.options[i] ?? ''}`);
    case 'relier': return q.gauche.map((g, i) => `${g} → ${lettre(q.liens[i])}. ${q.droite[q.liens[i]] ?? ''}`);
    case 'ordonner': return q.items.map((it, i) => `${q.rangs[i]} · ${it}`);
    case 'valeur': return q.champs.map(c => `${c.label} : ${nombreOuTexte(c, c.unite)}`);
    case 'calcul': return [
      `Formule : ${q.formule}`,
      `Résultat : ${q.grandeur} = ${fmtNombre(q.attendu)}${q.unite ? ` ${q.unite}` : ''}${q.arrondi ? ` (${q.arrondi})` : ''}`,
    ];
    case 'tableau': return q.lignes.map(l => l.cellules.map(c => (typeof c === 'string' ? c : nombreOuTexte(c))).join(' | '));
    case 'redige': return q.corrige.split('\n');
    case 'bulles': return [q.bulles.map((b, i) => `${i + 1}: ${b.attendu}`).join(' · ')];
    case 'cavaliers': return q.composants.map(c => `${c.label} : ${c.positions.map(p => `${p.label} ${p.attendu}`).join(' · ')}`);
    case 'schema': {
      const lab = new Map(q.traits.bornes.map(b => [b.id, b.label]));
      const coul = new Map(q.traits.couleurs.map(c => [c.id, c.label]));
      return [
        `${q.traits.attendues.length} liaisons attendues (voir le schéma corrigé)`,
        q.traits.attendues.map(l => `${lab.get(l.a) ?? l.a}–${lab.get(l.b) ?? l.b}${l.couleur ? ` (${coul.get(l.couleur) ?? l.couleur})` : ''}`).join(' · '),
      ];
    }
  }
}
