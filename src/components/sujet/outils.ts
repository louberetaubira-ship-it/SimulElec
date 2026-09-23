/**
 * Contrat commun des renderers d'outils de réponse (`Q*.tsx`) et petites classes partagées.
 */
import type { CorrectionQuestion, ReponseSujet, SujetQuestionType } from '@/lib/sujet/types';
import type { QPubliqueDe } from '@/lib/sujet/public';

/** Question PUBLIQUE d'un outil (sans corrigé : les renderers ne voient jamais la réponse attendue). */
export type QDe<T extends SujetQuestionType> = QPubliqueDe<T>;
export type RDe<T extends SujetQuestionType> = Extract<ReponseSujet, { type: T }>;

export interface OutilProps<T extends SujetQuestionType> {
  q: QDe<T>;
  r: RDe<T> | undefined;
  onChange: (r: RDe<T>) => void;
  /** Copie remise ou vue professeur : aucune modification. */
  readOnly: boolean;
  /**
   * Colorer juste / faux. Côté élève le corrigé n'est plus dans le navigateur : toujours `false`
   * (le verdict vient de `POST /api/sujet/corriger`). Conservé pour compatibilité.
   */
  montrer: boolean;
  /**
   * Correction SERVEUR de la question (facultative) : ses verdicts par élément
   * (`CorrectionQuestion.champs`) colorent les champs juste / faux sans corrigé dans le navigateur.
   * À ne passer que lorsqu'elle correspond à la réponse affichée (après « Vérifier », copie remise).
   */
  correction?: CorrectionQuestion | null;
}

/** Verdict d'un élément répondu (`null` : pas de correction, ou élément non jugé). */
export function verdict(c: CorrectionQuestion | null | undefined, id: string): boolean | null {
  const v = c?.champs?.[id];
  return v == null ? null : v;
}

/** Champ de saisie standard. */
export const CHAMP =
  'min-h-[36px] rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-[13.5px] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-90';

/** Classe d'état juste / faux d'un champ. */
export function etatChamp(montrer: boolean, juste: boolean | null): string {
  if (!montrer || juste == null) return '';
  return juste ? ' !border-good bg-good/10' : ' !border-crit bg-crit/10';
}

/** Petit bouton neutre. */
export const BOUTON =
  'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50';

/** Bouton principal (sombre). */
export const BOUTON_FORT =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#1B222C] px-4 text-[13.5px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50';

/** Rendu minimal du gras « **ainsi** » des énoncés. */
export function morceauxGras(s: string): { t: string; b: boolean }[] {
  const out: { t: string; b: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push({ t: s.slice(i, m.index), b: false });
    out.push({ t: m[1], b: true });
    i = m.index + m[0].length;
  }
  if (i < s.length) out.push({ t: s.slice(i), b: false });
  return out;
}
