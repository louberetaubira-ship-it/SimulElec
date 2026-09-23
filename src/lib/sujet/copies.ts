'use client';

/**
 * Copies des élèves pour un sujet numérique (vue professeur).
 *
 * Lecture : policy « attempts teacher read » (élèves des classes du professeur).
 * Écriture : fonctions `valider_copie_sujet` / `reactiver_copie_sujet`
 * (migration 0014) — le professeur n'a pas le droit d'UPDATE direct sur `attempts`.
 * Mode démonstration : la seule copie est celle du navigateur (`localStorage`).
 *
 * Publication du corrigé (migration 0016, table `sujet_corriges`) : par classe et par sujet,
 * écrite directement sous RLS (professeur de la classe ou admin). Démonstration : liste des
 * sujets publiés dans ce navigateur (`publierCorrigeDemo`), lue par `GET /api/sujet/solution`
 * via le paramètre `demo=publie`.
 */

import { createClient } from '@/lib/supabase/client';
import { reopenAttempt } from '@/lib/db/attempts';
import type { AttemptRow } from '@/lib/db/types';
import type { CompetenceEval } from '@/lib/data/competences';
import type { SujetAttemptState, SujetNumerique } from './types';
import { corrigesPubliesDemo, isSujetState, lireLocal, ecrireLocal, publierCorrigeDemo } from './store';

export interface CopieSujet {
  id: string;
  /** Sujet de la copie (sujet complet ou thématique). */
  sujetId: string;
  status: AttemptRow['status'];
  /** Nombre de questions répondues (`attempts.stage`, tenu à jour par le store élève). */
  repondues: number;
  score: number | null;
  updated_at: string;
  state: SujetAttemptState | null;
  eleve: { id: string; nom: string; class_id: string | null };
}

export const ID_LOCAL = 'local';

/** Copies (tentatives) des élèves du professeur pour ce sujet, les plus récentes d'abord. */
export async function listCopiesSujet(sujetId: string, demo: boolean): Promise<CopieSujet[]> {
  if (demo) {
    const c = lireLocal(sujetId);
    if (!c) return [];
    return [{
      id: ID_LOCAL, sujetId, status: c.status, score: c.score, updated_at: c.updated_at, state: c.state,
      repondues: Object.keys(c.state.reponses).length,
      eleve: { id: ID_LOCAL, nom: 'Élève (copie de démonstration de ce navigateur)', class_id: null },
    }];
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('attempts')
    .select('id, status, score, stage, updated_at, state, student:profiles!inner(id, full_name, email, class_id)')
    .eq('tp_id', sujetId)
    .neq('status', 'abandonne')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  type Ligne = {
    id: string; status: AttemptRow['status']; score: number | null; stage: number | null; updated_at: string; state: unknown;
    student: { id: string; full_name: string | null; email: string | null; class_id: string | null } | null;
  };
  return ((data ?? []) as unknown as Ligne[]).map(l => ({
    id: l.id,
    sujetId,
    status: l.status,
    repondues: l.stage ?? 0,
    score: l.score,
    updated_at: l.updated_at,
    state: isSujetState(l.state) ? l.state : null,
    eleve: { id: l.student?.id ?? '', nom: l.student?.full_name ?? l.student?.email ?? 'Élève', class_id: l.student?.class_id ?? null },
  }));
}

/** Copies de plusieurs sujets à la fois : le sujet complet d'un dossier et ses sujets thématiques. */
export async function listCopiesSujets(sujetIds: string[], demo: boolean): Promise<CopieSujet[]> {
  const listes = await Promise.all(sujetIds.map(id => listCopiesSujet(id, demo)));
  return listes.flat();
}

/** Enregistre la validation du professeur (corrections, annotations, note /100, grille). */
export async function validerCopie(
  sujetId: string, id: string, state: SujetAttemptState, score: number, evaluation: CompetenceEval[], demo: boolean,
): Promise<void> {
  if (demo || id === ID_LOCAL) {
    const c = lireLocal(sujetId);
    ecrireLocal(sujetId, { status: c?.status ?? 'termine', score, state });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('valider_copie_sujet', {
    p_attempt: id, p_state: state, p_score: score, p_evaluation: evaluation,
  });
  if (error) {
    throw new Error(/function|schema cache/i.test(error.message)
      ? 'Validation impossible : la migration 0014 (sujets numériques) n’est pas appliquée sur la base.'
      : error.message);
  }
}

/** Réactive une copie remise : elle repasse « en cours », l'élève peut la reprendre. */
export async function reactiverCopie(sujetId: string, id: string, demo: boolean): Promise<void> {
  if (demo || id === ID_LOCAL) {
    const c = lireLocal(sujetId);
    if (c) ecrireLocal(sujetId, { status: 'en_cours', score: null, state: { ...c.state, remise: false, remiseAt: null } });
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('reactiver_copie_sujet', { p_attempt: id });
  if (!error) return;
  // Base sans la migration 0014 : réactivation générique des TP (le client élève
  // rouvre alors la copie en lisant `status = 'en_cours'`).
  if (/function|schema cache/i.test(error.message)) {
    await reopenAttempt(id);
    return;
  }
  throw new Error(error.message);
}

/* ───────────────────────────── publication du corrigé ───────────────────────────── */

/** Classe fictive de la démonstration (publication dans ce navigateur). */
export const CLASSE_DEMO = 'demo';

export interface PublicationCorrige {
  class_id: string;
  sujet_id: string;
  publie_le: string;
}

const migration0016 = (m: string) => /relation|schema cache|does not exist/i.test(m)
  ? 'Publication impossible : la migration 0016 (publication du corrigé) n’est pas appliquée sur la base.'
  : m;

/** Publications du corrigé de ces sujets (classes du professeur, RLS). */
export async function listPublications(sujetIds: string[], demo: boolean): Promise<PublicationCorrige[]> {
  if (demo) {
    return corrigesPubliesDemo().filter(id => sujetIds.includes(id))
      .map(id => ({ class_id: CLASSE_DEMO, sujet_id: id, publie_le: '' }));
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sujet_corriges')
    .select('class_id, sujet_id, publie_le')
    .in('sujet_id', sujetIds);
  if (error) throw new Error(migration0016(error.message));
  return (data ?? []) as PublicationCorrige[];
}

/** Publie (ou republie) le corrigé d'un sujet pour une classe. */
export async function publierCorrige(classId: string, sujetId: string, demo: boolean): Promise<void> {
  if (demo || classId === CLASSE_DEMO) { publierCorrigeDemo(sujetId, true); return; }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Session expirée : reconnecte-toi.');
  const { error } = await supabase.from('sujet_corriges').upsert(
    { class_id: classId, sujet_id: sujetId, publie_par: user.id, publie_le: new Date().toISOString() },
    { onConflict: 'class_id,sujet_id' },
  );
  if (error) throw new Error(migration0016(error.message));
}

/** Retire la publication du corrigé d'un sujet pour une classe. */
export async function retirerCorrige(classId: string, sujetId: string, demo: boolean): Promise<void> {
  if (demo || classId === CLASSE_DEMO) { publierCorrigeDemo(sujetId, false); return; }
  const supabase = createClient();
  const { error } = await supabase.from('sujet_corriges').delete().eq('class_id', classId).eq('sujet_id', sujetId);
  if (error) throw new Error(migration0016(error.message));
}

/* ───────────────────────────── statistiques ───────────────────────────── */

export interface StatQuestion {
  num: number;
  /** Copies (élèves distincts) où la question est corrigée (hors « sans réponse »). */
  corrigees: number;
  /** Copies où la réponse est entièrement juste. */
  justes: number;
  /** Taux de réussite 0..1 (moyenne des scores), null sans copie corrigée. */
  taux: number | null;
  /** Erreurs typiques reconnues : nombre d'élèves par erreur (plus fréquentes d'abord). */
  erreurs: { id: string; message: string | null; eleves: number }[];
}

/**
 * Statistiques par question sur les copies d'un sujet : taux de réussite et nombre d'élèves par
 * erreur typique (`state.corrections[num].erreurs`). Une copie par élève (la plus récente).
 */
export function statsQuestions(sujet: SujetNumerique, copies: CopieSujet[]): StatQuestion[] {
  const parEleve = new Map<string, CopieSujet>();
  for (const c of [...copies].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))) {
    if (c.sujetId === sujet.id && c.state && !parEleve.has(c.eleve.id)) parEleve.set(c.eleve.id, c);
  }
  const retenues = Array.from(parEleve.values());
  return sujet.questions.map(q => {
    const messages = new Map((q.erreursTypiques ?? []).map(e => [e.id, e.message]));
    let corrigees = 0;
    let justes = 0;
    let somme = 0;
    const nb = new Map<string, number>();
    for (const c of retenues) {
      const k = c.state?.corrections[q.num];
      if (!k || k.statut === 'sansReponse') continue;
      corrigees += 1;
      somme += k.score;
      if (k.score >= 0.999) justes += 1;
      for (const id of Array.from(new Set(k.erreurs ?? []))) nb.set(id, (nb.get(id) ?? 0) + 1);
    }
    return {
      num: q.num,
      corrigees,
      justes,
      taux: corrigees ? Math.round((somme / corrigees) * 1000) / 1000 : null,
      erreurs: Array.from(nb.entries())
        .map(([id, eleves]) => ({ id, message: messages.get(id) ?? null, eleves }))
        .sort((a, b) => b.eleves - a.eleves || a.id.localeCompare(b.id)),
    };
  });
}
