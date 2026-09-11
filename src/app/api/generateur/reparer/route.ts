/**
 * Générateur de TP — étape 4 sur 4 : la réparation ciblée.
 *
 * POST /api/generateur/reparer
 *   entrée  : { …brief, maquette, anomalies[], portions[] }  — la maquette refusée par le
 *             moteur de simulation (qui tourne côté navigateur) et ce qu'il lui reproche.
 *   sortie  : flux NDJSON → { reparation, cout }  — SEULES les sections corrigées reviennent ;
 *             c'est le client qui les applique (`appliquerReparation`).
 *
 * Un seul appel au modèle, `max_tokens` borné : la réponse ne porte que les corrections.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { fail } from '@/lib/api/auth';
import { cout } from '@/lib/generateur/limites';
import { construireContexte } from '@/lib/generateur/contexte';
import { SYSTEME_REPARATION, construireRelance } from '@/lib/generateur/prompt';
import { OUTIL_REPARATION, lireMaquetteOutil, lireReparation } from '@/lib/generateur/schema';
import type { Anomalie } from '@/lib/generateur/verifier';
import {
  ErreurGeneration, appelModele, fluxReponse, journaliser, lireBrief, objet, ouvrirAcces, rapporteur,
  sceneEffective, texte, type CorpsBrief,
} from '@/lib/generateur/serveur';
import { lireMaterielRetenu, retenusPourContexte } from '@/lib/generateur/retenus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** L'écriture du modèle peut dépasser la minute : la fonction doit vivre plus longtemps. */
export const maxDuration = 300;

/** Plafond de sortie : une réparation ne renvoie que les sections fautives. */
const MAX_TOKENS = 8000;

/** Anomalies transmises au modèle, au plus : au-delà, c'est la maquette entière qui est à refaire. */
const ANOMALIES_MAX = 30;

interface Corps extends CorpsBrief {
  maquette?: unknown;
  /** Matériel retenu au premier temps : seul son détail repart au modèle. */
  materiel?: unknown;
  anomalies?: unknown;
  portions?: unknown;
  /** Numéro de passe (1 ou 2), pour le journal. */
  passe?: number;
}

const lireAnomalies = (v: unknown): Anomalie[] =>
  (Array.isArray(v) ? v : []).flatMap((a) => {
    const o = objet(a);
    if (!o || typeof o.message !== 'string') return [];
    return [{
      chemin: texte(o.chemin),
      message: o.message,
      gravite: o.gravite === 'avertissement' ? ('avertissement' as const) : ('bloquante' as const),
    }];
  }).slice(0, ANOMALIES_MAX);

const lirePortions = (v: unknown): { chemin: string; extrait: string }[] =>
  (Array.isArray(v) ? v : []).flatMap((p) => {
    const o = objet(p);
    if (!o || typeof o.chemin !== 'string' || typeof o.extrait !== 'string') return [];
    return [{ chemin: o.chemin, extrait: o.extrait.slice(0, 400) }];
  }).slice(0, ANOMALIES_MAX);

export async function POST(request: NextRequest) {
  const debut = Date.now();

  let corps: Corps;
  try {
    corps = (await request.json()) as Corps;
  } catch {
    return fail('Requête illisible : le corps n’est pas du JSON.', 400);
  }

  const brief = lireBrief(corps);
  if (!brief) return fail('Indique le thème du TP et choisis un diplôme valide.', 400);

  const maquette = lireMaquetteOutil(corps.maquette);
  if (!maquette) return fail('La maquette à réparer est illisible : relance l’étape « maquette ».', 400);

  const anomalies = lireAnomalies(corps.anomalies);
  if (!anomalies.length) return fail('Aucune anomalie à réparer n’a été transmise.', 400);
  const portions = lirePortions(corps.portions);
  const passe = typeof corps.passe === 'number' && corps.passe > 0 ? Math.round(corps.passe) : 1;

  const acces = await ouvrirAcces(false);
  if (acces instanceof NextResponse) return acces;
  const { caller, apiKey } = acces;

  // Les appareils déjà posés restent utilisables même si le choix du matériel n'est pas transmis.
  const retenus = lireMaterielRetenu([
    ...(Array.isArray(corps.materiel) ? corps.materiel : []),
    ...maquette.slots.map((s) => ({ key: s.key, rep: s.rep ?? '' })),
  ]);
  const scene = sceneEffective(brief);

  return fluxReponse(`Réparation ciblée : ${anomalies.length} anomalie(s) à corriger…`, async (e) => {
    const appareils = await retenusPourContexte(retenus);
    const contexte = construireContexte({ diploma: brief.diplomaId, scene, retenus: appareils });

    let journalise = false;
    try {
      const { entree, jetonsEntree, jetonsSortie } = await appelModele({
        apiKey,
        systeme: SYSTEME_REPARATION,
        outil: OUTIL_REPARATION,
        maxTokens: MAX_TOKENS,
        onEcriture: rapporteur(e, 'Réparation de la maquette'),
        messages: [{
          role: 'user',
          content: [
            construireRelance(anomalies, portions, JSON.stringify(maquette)),
            '',
            contexte,
          ].join('\n'),
        }],
      });

      const reparation = lireReparation(entree);
      if (!reparation) {
        await journaliser(caller, {
          brief, debut, jetonsEntree, jetonsSortie, passes: passe, anomalies: anomalies.length,
          statut: `reparer:refus ${JSON.stringify(entree).slice(0, 200)}`,
        });
        journalise = true;
        throw new ErreurGeneration(
          'Le modèle n’a corrigé aucune section exploitable. Corrige les anomalies à la main dans le studio.',
          502,
        );
      }

      await journaliser(caller, {
        brief, debut, jetonsEntree, jetonsSortie, passes: passe, anomalies: anomalies.length,
        statut: 'reparer:ok',
      });

      return {
        reparation,
        cout: {
          tokens: jetonsEntree + jetonsSortie,
          euros: cout(jetonsEntree, jetonsSortie),
          secondes: Math.round((Date.now() - debut) / 100) / 10,
        },
      };
    } catch (err) {
      if (!journalise && err instanceof ErreurGeneration) {
        await journaliser(caller, {
          brief, debut, jetonsEntree: 0, jetonsSortie: 0, passes: passe, anomalies: anomalies.length,
          statut: `reparer:erreur ${err.trace || err.message}`,
        });
      }
      throw err;
    }
  });
}
