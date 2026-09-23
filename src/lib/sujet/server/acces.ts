/**
 * Droits côté serveur sur les sujets numériques (Route Handlers, Server Components).
 *
 *  - session : utilisateur Supabase (cookies de la requête) + rôle + classe ;
 *  - corrigé publié : ligne `sujet_corriges` (migration 0016) pour la classe de l'élève et le
 *    sujet OU son sujet parent (un sujet thématique suit la publication du sujet complet, ou
 *    la sienne propre) ;
 *  - vérification bloquée : copie en mode examen non remise (choisi par l'élève ou imposé par
 *    le professeur) → ni correction ni aide avant la remise.
 *
 * Mode démonstration (`NEXT_PUBLIC_DEMO_MODE=1`, sans session) : pas d'authentification pour
 * corriger / aide / remettre ; le corrigé reste fermé sauf paramètre `?demo=publie`
 * (posé par l'interface quand le « professeur » de la démonstration a publié le corrigé dans
 * ce navigateur).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const DEMO_SERVEUR = () => process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export type Role = 'eleve' | 'professeur' | 'admin';

export interface SessionSujet {
  supabase: SupabaseClient;
  userId: string;
  role: Role | null;
  classId: string | null;
}

/** Session de la requête (null : pas de session, ou appelé hors requête Next — scripts). */
export async function lireSession(): Promise<SessionSujet | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('role, class_id').eq('id', user.id).maybeSingle();
    const p = data as { role?: Role | null; class_id?: string | null } | null;
    return { supabase, userId: user.id, role: p?.role ?? null, classId: p?.class_id ?? null };
  } catch {
    return null;
  }
}

export const estProf = (s: SessionSujet | null): boolean => s?.role === 'professeur' || s?.role === 'admin';

/** Le corrigé d'un de ces sujets est-il publié pour la classe de l'élève ? */
export async function corrigePublie(s: SessionSujet, ids: string[]): Promise<boolean> {
  if (!s.classId) return false;
  try {
    const { data, error } = await s.supabase
      .from('sujet_corriges')
      .select('sujet_id')
      .eq('class_id', s.classId)
      .in('sujet_id', ids)
      .limit(1);
    if (error) return false;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}

/**
 * Raison pour laquelle l'élève ne peut pas encore faire vérifier une réponse ni recevoir une
 * aide sur ce sujet (épreuve d'examen en cours), ou null.
 */
export async function verificationBloquee(s: SessionSujet, sujetId: string): Promise<string | null> {
  if (estProf(s)) return null;
  try {
    const { data } = await s.supabase
      .from('attempts')
      .select('status, state')
      .eq('student_id', s.userId)
      .eq('tp_id', sujetId)
      .neq('status', 'abandonne')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const a = data as { status?: string; state?: { kind?: string; mode?: string; remise?: boolean } | null } | null;
    const enCours = !a || a.status === 'en_cours';
    const remise = !!a?.state?.remise || !enCours;
    if (remise) return null;
    if (a?.state?.kind === 'sujet' && a.state.mode === 'examen') return 'Mode examen : pas de vérification ni d’aide avant la remise de la copie.';
    if (s.classId) {
      const { data: asg } = await s.supabase
        .from('assignments')
        .select('mode')
        .eq('class_id', s.classId)
        .eq('tp_id', sujetId)
        .not('mode', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if ((asg as { mode?: string } | null)?.mode === 'evaluation') {
        return 'Évaluation imposée par ton professeur : pas de vérification ni d’aide avant la remise de la copie.';
      }
    }
    return null;
  } catch {
    return null;
  }
}
