/**
 * Logique des routes `/api/sujet/*` (module serveur, testable sans Next : les handlers
 * `route.ts` ne font que l'appeler). Chaque fonction rend `{ status, body }`.
 *
 *  - `POST /api/sujet/corriger` { sujetId, num, reponse } → `CorrectionQuestion` ;
 *  - `POST /api/sujet/aide` { sujetId, num, niveau } → `{ niveau, total, texte }` ;
 *  - `POST /api/sujet/remettre` { sujetId, reponses } → `{ corrections }` (le client
 *    conserve les notes du professeur, calcule le bilan et enregistre la copie) ;
 *  - `GET /api/sujet/solution?sujetId=…` → `CorrigeSujet` si l'utilisateur est professeur /
 *    administrateur ou si le corrigé est publié pour sa classe, sinon 403.
 *    Démonstration : 403 sauf `&demo=publie` ;
 *  - `GET /api/sujet/image?sujetId=…&num=…` → image du schéma corrigé (dossier privé `private/`),
 *    mêmes droits que le corrigé.
 */
import { readFile } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { corriger, corrigerCopie } from '../correction';
import type { ReponseAide, ReponseRemettre } from '../public';
import type { CorrectionQuestion, ReponseSujet, SujetAttemptState, SujetNumerique } from '../types';
import { aideNiveau } from './aides';
import { DEMO_SERVEUR, corrigePublie, estProf, lireSession, verificationBloquee, type SessionSujet } from './acces';
import { corrigeSujet, idsPublication, questionComplete, sujetComplet } from './sujets';
import { NB_AIDES } from '../public';

export interface Resultat<T = unknown> {
  status: number;
  body: T | { erreur: string };
}

const erreur = (status: number, e: string): Resultat<never> => ({ status, body: { erreur: e } });

/** Session injectable (tests) : par défaut, celle de la requête. */
export interface Contexte {
  session?: () => Promise<SessionSujet | null>;
  demo?: boolean;
}

const TYPES = new Set(['cocher', 'relier', 'ordonner', 'valeur', 'calcul', 'tableau', 'redige', 'bulles', 'placement', 'cavaliers', 'schema']);

const estReponse = (r: unknown): r is ReponseSujet =>
  !!r && typeof r === 'object' && TYPES.has(String((r as { type?: unknown }).type));

const objet = (b: unknown): Record<string, unknown> | null => (b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : null);

/** Authentification commune : session obligatoire hors démonstration. */
async function authentifier(ctx: Contexte): Promise<{ session: SessionSujet | null } | Resultat<never>> {
  const session = await (ctx.session ?? lireSession)();
  const demo = ctx.demo ?? DEMO_SERVEUR();
  if (!session && !demo) return erreur(401, 'Session expirée : reconnecte-toi.');
  return { session };
}

export async function routeCorriger(body: unknown, ctx: Contexte = {}): Promise<Resultat<CorrectionQuestion>> {
  const b = objet(body);
  if (!b || typeof b.sujetId !== 'string' || typeof b.num !== 'number') return erreur(400, 'Requête invalide : sujetId et num attendus.');
  const sujet = sujetComplet(b.sujetId);
  if (!sujet) return erreur(404, 'Sujet introuvable.');
  const q = questionComplete(sujet, b.num);
  if (!q) return erreur(404, 'Question introuvable.');
  const a = await authentifier(ctx);
  if ('status' in a) return a;
  if (a.session) {
    const bloque = await verificationBloquee(a.session, sujet.id);
    if (bloque) return erreur(403, bloque);
  }
  try {
    return { status: 200, body: corriger(q, estReponse(b.reponse) ? b.reponse : undefined) };
  } catch {
    return erreur(400, 'Réponse illisible.');
  }
}

export async function routeAide(body: unknown, ctx: Contexte = {}): Promise<Resultat<ReponseAide>> {
  const b = objet(body);
  if (!b || typeof b.sujetId !== 'string' || typeof b.num !== 'number' || typeof b.niveau !== 'number') {
    return erreur(400, 'Requête invalide : sujetId, num et niveau attendus.');
  }
  const sujet = sujetComplet(b.sujetId);
  if (!sujet) return erreur(404, 'Sujet introuvable.');
  const q = questionComplete(sujet, b.num);
  if (!q) return erreur(404, 'Question introuvable.');
  const texte = aideNiveau(sujet, q, b.niveau);
  if (texte == null) return erreur(400, `Niveau d’aide attendu : 1 à ${NB_AIDES}.`);
  const a = await authentifier(ctx);
  if ('status' in a) return a;
  if (a.session) {
    const bloque = await verificationBloquee(a.session, sujet.id);
    if (bloque) return erreur(403, bloque);
  }
  return { status: 200, body: { niveau: b.niveau, total: NB_AIDES, texte } };
}

export async function routeRemettre(body: unknown, ctx: Contexte = {}): Promise<Resultat<ReponseRemettre>> {
  const b = objet(body);
  const rep = objet(b?.reponses);
  if (!b || typeof b.sujetId !== 'string' || !rep) return erreur(400, 'Requête invalide : sujetId et reponses attendus.');
  const sujet = sujetComplet(b.sujetId);
  if (!sujet) return erreur(404, 'Sujet introuvable.');
  const a = await authentifier(ctx);
  if ('status' in a) return a;
  const reponses: Record<number, ReponseSujet> = {};
  for (const [k, v] of Object.entries(rep)) if (estReponse(v)) reponses[Number(k)] = v;
  try {
    const st = { reponses, corrections: {} } as unknown as SujetAttemptState;
    return { status: 200, body: { corrections: corrigerCopie(sujet, st) } };
  } catch {
    // Une réponse malformée : correction question par question, les illisibles sans réponse.
    const corrections: Record<number, CorrectionQuestion> = {};
    for (const q of sujet.questions) {
      try { corrections[q.num] = corriger(q, reponses[q.num]); } catch { corrections[q.num] = corriger(q, undefined); }
    }
    return { status: 200, body: { corrections } };
  }
}

/** Droit de lire le corrigé d'un sujet : 200 (autorisé), 401 ou 403 ; `demo` : accès démo posé. */
async function accesCorrige(sujet: SujetNumerique, params: URLSearchParams, ctx: Contexte): Promise<{ status: number; demo: boolean }> {
  const demo = ctx.demo ?? DEMO_SERVEUR();
  if (demo && params.get('demo') === 'publie') return { status: 200, demo: true };
  const session = await (ctx.session ?? lireSession)();
  if (!session) return { status: demo ? 403 : 401, demo: false };
  if (estProf(session) || await corrigePublie(session, idsPublication(sujet))) return { status: 200, demo: false };
  return { status: 403, demo: false };
}

const MESSAGES: Record<number, string> = {
  401: 'Session expirée : reconnecte-toi.',
  403: 'Corrigé non publié par ton professeur.',
};

export async function routeCorrige(params: URLSearchParams, ctx: Contexte = {}): Promise<Resultat> {
  const id = params.get('sujetId');
  if (!id) return erreur(400, 'Paramètre sujetId attendu.');
  const sujet = sujetComplet(id);
  if (!sujet) return erreur(404, 'Sujet introuvable.');
  const a = await accesCorrige(sujet, params, ctx);
  if (a.status !== 200) return erreur(a.status, MESSAGES[a.status]);
  return { status: 200, body: corrigeSujet(sujet, a.demo) };
}

/** Dossier privé des images de corrigé (hors `public/`, inclus dans le build serveur). */
export const DOSSIER_PRIVE = join(process.cwd(), 'private');

/** Image du schéma corrigé d'une question : `GET /api/sujet/image?sujetId=…&num=…` (mêmes droits que le corrigé). */
export async function routeImage(params: URLSearchParams, ctx: Contexte = {}): Promise<Resultat<{ octets: Buffer; type: string }>> {
  const id = params.get('sujetId');
  const num = Number(params.get('num'));
  if (!id || !Number.isInteger(num)) return erreur(400, 'Paramètres sujetId et num attendus.');
  const sujet = sujetComplet(id);
  const q = sujet ? questionComplete(sujet, num) : undefined;
  if (!sujet || !q || q.type !== 'schema') return erreur(404, 'Image introuvable.');
  const a = await accesCorrige(sujet, params, ctx);
  if (a.status !== 200) return erreur(a.status, MESSAGES[a.status]);
  const chemin = normalize(join(DOSSIER_PRIVE, q.corrigeImage.src));
  if (!chemin.startsWith(DOSSIER_PRIVE + sep)) return erreur(404, 'Image introuvable.');
  try {
    const octets = await readFile(chemin);
    const type = /\.png$/i.test(chemin) ? 'image/png' : /\.webp$/i.test(chemin) ? 'image/webp' : 'image/jpeg';
    return { status: 200, body: { octets, type } };
  } catch {
    return erreur(404, 'Image introuvable.');
  }
}
