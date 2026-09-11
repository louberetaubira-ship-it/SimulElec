/**
 * Générateur de TP — étape 2 sur 4 : le CHOIX DU MATÉRIEL.
 *
 * POST /api/generateur/materiel
 *   entrée  : { …brief, resumePedagogie }
 *   sortie  : flux NDJSON → { choix: { scene, annex, materiel[{key,rep,role}], commentaire },
 *                             index: { references, familles, caracteres },
 *                             cout: { tokens, euros, secondes } }
 *
 * C'est ici que la bibliothèque COMPLÈTE part au modèle : les 41 familles et leurs 1 381
 * éléments, plus le catalogue de base — exactement le fonds de l'atelier libre. Rien n'est
 * exclu a priori : pour tenir dans un seul appel court, l'index est COMPRESSÉ (regroupement
 * par famille puis par désignation, clés suivies du seul nombre de bornes, ni image ni
 * géométrie). Le détail des appareils n'est envoyé qu'à l'étape suivante, et seulement pour
 * ceux qui ont été retenus.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { fail } from '@/lib/api/auth';
import { cout } from '@/lib/generateur/limites';
import { contexteIndexComplet } from '@/lib/generateur/contexte';
import { indexComplet } from '@/lib/generateur/index-bibliotheque';
import { SYSTEME_MATERIEL, construirePromptMateriel } from '@/lib/generateur/prompt';
import { OUTIL_MATERIEL, lireChoixMateriel } from '@/lib/generateur/schema';
import {
  ErreurGeneration, appelModele, fluxReponse, journaliser, lireBrief, ouvrirAcces, texte,
  type CorpsBrief,
} from '@/lib/generateur/serveur';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Un seul appel au modèle : une minute suffit très largement. */
export const maxDuration = 60;

/** Plafond de sortie : une liste de matériel, même fournie, tient dans 4 000 jetons. */
const MAX_TOKENS = 4000;

/** Longueur maximale du résumé pédagogique accepté. */
const RESUME_MAX = 12000;

interface Corps extends CorpsBrief { resumePedagogie?: string }

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

  const acces = await ouvrirAcces(false);
  if (acces instanceof NextResponse) return acces;
  const { caller, apiKey } = acces;

  return fluxReponse('Lecture de la bibliothèque complète de l’atelier…', async (e) => {
    const entrees = await indexComplet();
    const index = contexteIndexComplet(entrees);
    const familles = new Set(entrees.map((x) => x.famille)).size;
    e.progres(`Choix du matériel parmi ${entrees.length} appareils (${familles} familles)…`);

    let journalise = false;
    try {
      const { entree, jetonsEntree, jetonsSortie } = await appelModele({
        apiKey,
        systeme: SYSTEME_MATERIEL,
        outil: OUTIL_MATERIEL,
        maxTokens: MAX_TOKENS,
        messages: [{ role: 'user', content: construirePromptMateriel(brief, resume, index) }],
      });

      const choix = lireChoixMateriel(entree);
      if (!choix) {
        await journaliser(caller, {
          brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0,
          statut: `materiel:refus ${JSON.stringify(entree).slice(0, 200)}`,
        });
        journalise = true;
        throw new ErreurGeneration(
          'Le modèle n’a retenu aucun matériel exploitable. Relance cette étape.',
          502,
        );
      }

      await journaliser(caller, {
        brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0, statut: 'materiel:ok',
      });

      return {
        choix,
        index: { references: entrees.length, familles, caracteres: index.length },
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
          statut: `materiel:erreur ${err.trace || err.message}`,
        });
      }
      throw err;
    }
  });
}
