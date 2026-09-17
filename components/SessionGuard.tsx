'use client';

/**
 * Session ÉLÈVE éphémère, pour les postes partagés de la salle.
 *
 * Un compte élève ne doit pas rester connecté d'une séance à l'autre : sinon un
 * élève reprendrait la session du précédent. On ne touche pas au stockage interne
 * de Supabase ; on pose un marqueur dans `sessionStorage` (effacé à la fermeture
 * de l'onglet) :
 *  - à l'ouverture, un élève authentifié SANS marqueur = réouverture → on le
 *    déconnecte et on renvoie vers la connexion ;
 *  - après connexion, on pose le marqueur et on arme une déconnexion automatique
 *    au bout de 20 min d'inactivité.
 *
 * Les comptes professeur / administrateur ne sont pas concernés (rôle ≠ eleve).
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const IDLE_MS = 20 * 60 * 1000; // 20 minutes sans activité
const KEY = 'se.eleve.alive';

type MaybeUser = { user_metadata?: { role?: string } } | null | undefined;
const isEleve = (u: MaybeUser): boolean => u?.user_metadata?.role === 'eleve';

export default function SessionGuard() {
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopActivity: () => void = () => {};
    let alive = true;

    const mark = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* privé */ } };
    const hasMark = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

    const logout = async () => {
      try { sessionStorage.removeItem(KEY); } catch { /* privé */ }
      try { await supabase.auth.signOut(); } catch { /* déjà déconnecté */ }
      // ?expired=1 : l'écran de connexion affiche « session fermée ».
      window.location.replace('/login?expired=1');
    };

    const startIdle = () => {
      stopActivity();
      const reset = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void logout(); }, IDLE_MS);
      };
      const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
      const onAct = () => reset();
      events.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
      stopActivity = () => {
        events.forEach((e) => window.removeEventListener(e, onAct));
        if (timer) { clearTimeout(timer); timer = null; }
      };
      reset();
    };

    const onLogin = '/login';

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user || !isEleve(user)) return; // prof/admin ou non connecté : rien
      const onLoginPage = window.location.pathname.startsWith(onLogin);
      if (!hasMark()) {
        if (!onLoginPage) { void logout(); return; }
        return;
      }
      startIdle();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && isEleve(session?.user)) { mark(); startIdle(); }
      if (event === 'SIGNED_OUT') { stopActivity(); }
    });

    return () => {
      alive = false;
      stopActivity();
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
