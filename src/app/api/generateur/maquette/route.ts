/**
 * Générateur de TP — étape 3 sur 4 : la maquette jouable.
 *
 * POST /api/generateur/maquette
 *   entrée  : { …brief, resumePedagogie, materiel: [{ key, rep }] }  — un RÉSUMÉ court du
 *             dossier, jamais les documents joints, et le matériel retenu à l'étape « choix
 *             du matériel » : seul le DÉTAIL de ces appareils (bornes, encombrement, pose)
 *             part au modèle, pas la bibliothèque entière.
 *   sortie  : flux NDJSON → { maquette, cout: { tokens, euros, secondes } }
 *
 * Un seul appel au modèle, `max_tokens` borné. Le vérificateur tourne ensuite côté
 * navigateur : aucun long aller-retour serveur ici.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { fail } from '@/lib/api/auth';
import { cout } from '@/lib/generateur/limites';
import { construireContexte } from '@/lib/generateur/contexte';
import { SYSTEME_MAQUETTE, construirePromptMaquette } from '@/lib/generateur/prompt';
import { OUTIL_MAQUETTE, lireMaquetteOutil } from '@/lib/generateur/schema';
import {
  ErreurGeneration, appelModele, fluxReponse, journaliser, lireBrief, ouvrirAcces,
  sceneEffective, texte, type CorpsBrief,
} from '@/lib/generateur/serveur';
import { lireMaterielRetenu, retenusPourContexte } from '@/lib/generateur/retenus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Un seul appel au modèle : une minute suffit très largement. */
export const maxDuration = 60;

/** Plafond de sortie : une platine complète (slots, liaisons, mesures, postes) tient dans 10 000 jetons. */
const MAX_TOKENS = 10000;

/** Longueur maximale du résumé pédagogique accepté : au-delà, le contexte n'est plus léger. */
const RESUME_MAX = 12000;

interface Corps extends CorpsBrief { resumePedagogie?: string; materiel?: unknown }

/** En dessous, la platine ne peut pas être jouable : le choix du matériel est à refaire. */
const RETENUS_MIN = 3;

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
  const resume = texte(corps.resumePedagogie).slice(0, RESUME_MAX);
  if (!resume) return fail('Le résumé du dossier pédagogique manque : relance l’étape précédente.', 400);

  const retenus = lireMaterielRetenu(corps.materiel);
  if (retenus.length < RETENUS_MIN) {
    return fail('Le matériel retenu manque ou est trop court : relance l’étape « choix du matériel ».', 400);
  }

  const acces = await ouvrirAcces(false);
  if (acces instanceof NextResponse) return acces;
  const { caller, apiKey } = acces;
  const scene = sceneEffective(brief);

  return fluxReponse('Détail des appareils retenus, géométrie de la platine…', async (e) => {
    const appareils = await retenusPourContexte(retenus);
    if (appareils.length < RETENUS_MIN) {
      throw new ErreurGeneration(
        'Les appareils retenus n’existent pas dans la bibliothèque : relance l’étape « choix du matériel ».',
        502,
      );
    }
    const contexte = construireContexte({ diploma: brief.diplomaId, scene, retenus: appareils });
    e.progres(`Construction de la maquette jouable avec ${appareils.length} appareil(s) retenu(s)…`);

    let journalise = false;
    try {
      const { entree, jetonsEntree, jetonsSortie } = await appelModele({
        apiKey,
        systeme: SYSTEME_MAQUETTE,
        outil: OUTIL_MAQUETTE,
        maxTokens: MAX_TOKENS,
        messages: [{ role: 'user', content: construirePromptMaquette(brief, contexte, resume) }],
      });

      const maquette = lireMaquetteOutil(entree);
      if (!maquette) {
        await journaliser(caller, {
          brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0,
          statut: `maquette:refus ${JSON.stringify(entree).slice(0, 200)}`,
        });
        journalise = true;
        throw new ErreurGeneration(
          'La maquette rendue par le modèle ne respecte pas le format attendu. Relance cette étape.',
          502,
        );
      }

      await journaliser(caller, {
        brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0, statut: 'maquette:ok',
      });

      return {
        maquette,
        cout: {
          tokens: jetonsEntree + jetonsSortie,
          euros: cout(jetonsEntree, jetonsSortie),
          secondes: Math.round((Date.now() - debut) / 100) / 10,
        },
      };
    } catch (err) {
      if (!journalise && err instanceof ErreurGeneration) {
        await journaliser(caller, {
          brief, debut, jetonsEntree: 0, jetonsSortie: 0, passes: 1, anomalies: 0,
          statut: `maquette:erreur ${err.trace || err.message}`,
        });
      }
      throw err;
    }
  });
}
