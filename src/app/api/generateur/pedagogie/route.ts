/**
 * Générateur de TP — étape 1 sur 3 : le dossier pédagogique.
 *
 * POST /api/generateur/pedagogie
 *   entrée  : { diplomaId, classId?, theme, resume, duration, sequenceType, activities[],
 *               materielDisponible[], scene?, docs: [{ name, mime, dataBase64 }] }
 *   sortie  : flux NDJSON → { pedagogie, cout: { tokens, euros, secondes } }
 *
 * C'est la SEULE route qui reçoit le dossier technique joint, et la seule qui consomme le
 * quota mensuel : elle ouvre la génération. Un seul appel au modèle, `max_tokens` borné,
 * réponse en flux pour que la connexion ne coupe jamais.
 */
import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fail } from '@/lib/api/auth';
import { TAILLE_DOCS_MAX, cout } from '@/lib/generateur/limites';
import { contexteReferentiel } from '@/lib/generateur/contexte';
import { SYSTEME_PEDAGOGIE, construirePromptPedagogie } from '@/lib/generateur/prompt';
import { OUTIL_PEDAGOGIE, lirePedagogieOutil } from '@/lib/generateur/schema';
import {
  ErreurGeneration, appelModele, fluxReponse, journaliser, lireBrief, ouvrirAcces, rapporteur,
  type CorpsBrief,
} from '@/lib/generateur/serveur';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/**
 * Un dossier pédagogique dense fait plusieurs milliers de jetons : l'écriture demande
 * couramment deux à trois minutes. La fonction doit vivre plus longtemps que cette écriture,
 * sinon elle est coupée en plein milieu (« le serveur a interrompu la réponse »).
 */
export const maxDuration = 300;

/** Plafond de sortie : un dossier pédagogique dense tient dans 8 000 jetons. */
const MAX_TOKENS = 8000;

interface DocEntrant { name: string; mime: string; dataBase64: string }
interface Corps extends CorpsBrief { docs?: DocEntrant[] }

/** Taille réelle d'un contenu base64 (octets). */
const tailleBase64 = (data: string): number => Math.floor((data.replace(/=+$/, '').length * 3) / 4);

type BlocEntrant = Anthropic.Messages.ContentBlockParam;

/** Documents du professeur convertis en blocs de contenu Anthropic. */
function blocsDocuments(docs: DocEntrant[]): BlocEntrant[] {
  const out: BlocEntrant[] = [];
  for (const d of docs) {
    const mime = (d.mime || '').toLowerCase();
    if (mime === 'application/pdf') {
      out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.dataBase64 }, title: d.name });
      continue;
    }
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime)) {
      out.push({
        type: 'image',
        source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: d.dataBase64 },
      });
      continue;
    }
    try {
      const contenu = Buffer.from(d.dataBase64, 'base64').toString('utf8');
      if (contenu.trim()) {
        out.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: contenu }, title: d.name });
      }
    } catch {
      // document illisible : ignoré, le brief reste exploitable
    }
  }
  return out;
}

export async function POST(request: NextRequest) {
  const debut = Date.now();

  let corps: Corps;
  try {
    corps = (await request.json()) as Corps;
  } catch {
    return fail('Requête illisible : le corps n’est pas du JSON.', 400);
  }

  const docs = Array.isArray(corps.docs) ? corps.docs.filter((d) => d && typeof d.dataBase64 === 'string') : [];
  const poids = docs.reduce((s, d) => s + tailleBase64(d.dataBase64), 0);
  if (poids > TAILLE_DOCS_MAX) {
    return fail('Le dossier technique dépasse 10 Mo. Retire ou allège des documents avant de relancer la génération.', 413);
  }

  const brief = lireBrief(corps, docs.map((d) => d.name).filter(Boolean));
  if (!brief) return fail('Indique le thème du TP et choisis un diplôme valide.', 400);

  const acces = await ouvrirAcces(true);
  if (acces instanceof NextResponse) return acces;
  const { caller, apiKey } = acces;

  // Le libellé dit la vérité : sans document joint, rien n'est « lu », le modèle écrit.
  const libelle = docs.length
    ? `Lecture de ${docs.length} document${docs.length > 1 ? 's' : ''} puis rédaction du dossier…`
    : 'Rédaction du dossier pédagogique à partir du thème';

  return fluxReponse(libelle, async (e) => {
    let journalise = false;
    try {
      const { entree, jetonsEntree, jetonsSortie } = await appelModele({
        apiKey,
        systeme: SYSTEME_PEDAGOGIE,
        outil: OUTIL_PEDAGOGIE,
        maxTokens: MAX_TOKENS,
        onEcriture: rapporteur(e, 'Rédaction du dossier pédagogique'),
        messages: [{
          role: 'user',
          content: [
            ...blocsDocuments(docs),
            { type: 'text', text: construirePromptPedagogie(brief, contexteReferentiel(brief.diplomaId)) },
          ],
        }],
      });

      const pedagogie = lirePedagogieOutil(entree);
      if (!pedagogie) {
        await journaliser(caller, {
          brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0,
          statut: `pedagogie:refus ${JSON.stringify(entree).slice(0, 200)}`,
        });
        journalise = true;
        throw new ErreurGeneration(
          'Le dossier pédagogique rendu par le modèle ne respecte pas le format attendu. Relance cette étape.',
          502,
        );
      }

      await journaliser(caller, {
        brief, debut, jetonsEntree, jetonsSortie, passes: 1, anomalies: 0, statut: 'pedagogie:ok',
      });

      return {
        pedagogie,
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
          statut: `pedagogie:erreur ${err.trace || err.message}`,
        });
      }
      throw err;
    }
  });
}
