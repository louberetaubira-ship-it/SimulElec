/**
 * Plomberie commune aux trois routes du générateur (serveur uniquement).
 *
 * Pourquoi : une génération complète dépassait la durée maximale d'une fonction serverless
 * et la passerelle coupait à 504. Elle est désormais découpée en TROIS appels courts
 * (`/pedagogie`, `/maquette`, `/reparer`), un seul appel au modèle chacun, et chaque route
 * répond en FLUX : des événements de progression partent immédiatement, la connexion ne
 * reste jamais silencieuse, et le client voit l'avancement réel.
 *
 * Protocole du flux : une ligne JSON par événement (NDJSON), terminée par « \n ».
 *   { "type": "progres",  "message": "…", "secondes": 12 }
 *   { "type": "resultat", "data": { … } }
 *   { "type": "erreur",   "message": "…", "code": 502 }
 * Les refus d'accès (401/403), de quota (429), de clé (503) ou de corps (400/413) partent
 * AVANT le flux, en JSON classique avec le bon statut HTTP.
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { DIPLOMAS } from '@/lib/data/competences';
import { fail, requireTeacher, type Caller } from '@/lib/api/auth';
import { QUOTA_MENSUEL, cout } from './limites';
import type { Brief } from './prompt';

/** Modèle utilisé, avec repli sur celui du professeur virtuel. */
const MODELE = process.env.ANTHROPIC_MODEL_GENERATEUR || 'claude-sonnet-4-5';
const MODELE_REPLI = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

/** Période entre deux battements de cœur du flux (ms) : la connexion ne dort jamais. */
const BATTEMENT_MS = 4000;

/* ------------------------------------------------------------------ lecture du corps */

export const texte = (v: unknown, d = ''): string => (typeof v === 'string' ? v.trim() : d);
export const listeTexte = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : [];
export const objet = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export const SCENES: SceneKind[] = ['ind', 'hab', 'ter', 'pv'];
export const estDiplome = (v: unknown): v is DiplomaId => DIPLOMAS.some((d) => d.id === v);

/** Type d'installation déduit du thème quand le professeur ne l'impose pas. */
export function sceneDeduite(theme: string, resume: string): SceneKind {
  const t = `${theme} ${resume}`.toLowerCase();
  if (/photovolta|panneau|onduleur|batterie|autoconsom/.test(t)) return 'pv';
  if (/logement|habitat|appartement|maison|tableau de r[ée]partition/.test(t)) return 'hab';
  if (/tertiaire|bureau|magasin|baes|éclairage de s[ée]curit|ecole|hôtel/.test(t)) return 'ter';
  return 'ind';
}

/** Corps commun aux trois routes : le brief du professeur. */
export interface CorpsBrief {
  diplomaId?: string;
  classId?: string | null;
  theme?: string;
  resume?: string;
  duration?: number;
  sequenceType?: string;
  activities?: string[];
  materielDisponible?: string[];
  scene?: string;
}

/**
 * Construit le brief à partir du corps reçu ; `null` si le corps est inexploitable.
 *
 * Seuls le thème et le diplôme sont exigés. La durée et la scène restent à `null` quand
 * le professeur ne les a pas fixées : c'est le modèle qui les propose.
 */
export function lireBrief(corps: CorpsBrief, documents: string[] = []): Brief | null {
  const theme = texte(corps.theme);
  if (!theme || !estDiplome(corps.diplomaId)) return null;
  return {
    diplomaId: corps.diplomaId,
    theme,
    resume: texte(corps.resume),
    duration: typeof corps.duration === 'number' && corps.duration > 0 ? Math.round(corps.duration) : null,
    sequenceType: texte(corps.sequenceType, 'séance de travaux pratiques'),
    activities: listeTexte(corps.activities),
    materielDisponible: listeTexte(corps.materielDisponible),
    scene: SCENES.includes(corps.scene as SceneKind) ? (corps.scene as SceneKind) : null,
    documents,
  };
}

/** Scène effective : celle imposée par le professeur, sinon celle déduite du thème. */
export const sceneEffective = (brief: Brief): SceneKind =>
  brief.scene ?? sceneDeduite(brief.theme, brief.resume);

/* ------------------------------------------------------------------ garde-fous */

export interface Acces {
  caller: Caller;
  apiKey: string;
}

/**
 * Contrôles préalables au flux : professeur connecté, clé du modèle présente et, pour la
 * première étape seulement, quota mensuel.
 *
 * Le quota compte les générations, pas les appels : seule l'étape « pedagogie » ouvre une
 * génération, et c'est elle qui journalise le statut compté (`pedagogie:*`).
 */
export async function ouvrirAcces(compteQuota: boolean): Promise<Acces | NextResponse> {
  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail('La clé du modèle n’est pas configurée sur le serveur : la génération est indisponible.', 503);

  if (compteQuota) {
    const debutMois = new Date();
    debutMois.setUTCDate(1);
    debutMois.setUTCHours(0, 0, 0, 0);
    const { count, error } = await caller.supabase
      .from('generation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', caller.id)
      .like('statut', 'pedagogie%')
      .gte('created_at', debutMois.toISOString());
    if (error) return fail('Lecture du quota impossible : ' + error.message, 500);
    if ((count ?? 0) >= QUOTA_MENSUEL) {
      return fail(
        `Quota atteint : ${QUOTA_MENSUEL} générations par mois. Reviens le mois prochain ou demande une extension à l’administrateur.`,
        429,
      );
    }
  }

  return { caller, apiKey };
}

/* ------------------------------------------------------------------ appel du modèle */

export interface OptionsAppel {
  apiKey: string;
  systeme: string;
  outil: { name: string; description: string; input_schema: unknown };
  messages: Anthropic.Messages.MessageParam[];
  /** Borné pour que la réponse tienne largement dans la durée de la fonction. */
  maxTokens: number;
}

export interface RetourModele {
  /** Entrée de l'outil, telle que rendue par le modèle. */
  entree: unknown;
  jetonsEntree: number;
  jetonsSortie: number;
}

/** Échec exploitable côté client : message en français et statut HTTP. */
export class ErreurGeneration extends Error {
  readonly code: number;
  /** Extrait de la réponse du modèle, pour la trace serveur. */
  readonly trace: string;

  constructor(message: string, code: number, trace = '') {
    super(message);
    this.name = 'ErreurGeneration';
    this.code = code;
    this.trace = trace;
  }
}

/** Contenu textuel tronqué d'une réponse, pour la colonne `statut` du journal. */
export function extraitReponse(reponse: Anthropic.Messages.Message, limite = 160): string {
  const brut = reponse.content
    .map((b) => (b.type === 'text' ? b.text : b.type === 'tool_use' ? JSON.stringify(b.input) : `[${b.type}]`))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return brut.length > limite ? `${brut.slice(0, limite)}…` : brut;
}

/** UN appel au modèle, outil forcé, avec repli sur le modèle du professeur virtuel. */
export async function appelModele(o: OptionsAppel): Promise<RetourModele> {
  const anthropic = new Anthropic({ apiKey: o.apiKey });
  const requete = {
    max_tokens: o.maxTokens,
    temperature: 0.2,
    system: o.systeme,
    tools: [o.outil as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool' as const, name: o.outil.name },
    messages: o.messages,
  };

  let reponse: Anthropic.Messages.Message;
  try {
    reponse = await anthropic.messages.create({ model: MODELE, ...requete });
  } catch (e) {
    if (MODELE_REPLI === MODELE) {
      const detail = e instanceof Error ? e.message : 'erreur inconnue';
      throw new ErreurGeneration(`Le modèle n’a pas répondu (${detail}). Réessaie dans un instant.`, 502, detail);
    }
    try {
      reponse = await anthropic.messages.create({ model: MODELE_REPLI, ...requete });
    } catch (e2) {
      const detail = e2 instanceof Error ? e2.message : 'erreur inconnue';
      throw new ErreurGeneration(`Le modèle n’a pas répondu (${detail}). Réessaie dans un instant.`, 502, detail);
    }
  }

  const appel = reponse.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === o.outil.name,
  );
  if (!appel) {
    throw new ErreurGeneration(
      'Le modèle n’a pas rendu de résultat exploitable. Précise le thème ou le dossier technique, puis relance.',
      502,
      extraitReponse(reponse),
    );
  }
  if (reponse.stop_reason === 'max_tokens') {
    throw new ErreurGeneration(
      'La réponse du modèle a été coupée avant la fin. Réduis le nombre d’activités demandées, puis relance cette étape.',
      502,
      `max_tokens ${extraitReponse(reponse)}`,
    );
  }

  return {
    entree: appel.input,
    jetonsEntree: reponse.usage.input_tokens,
    jetonsSortie: reponse.usage.output_tokens,
  };
}

/* ------------------------------------------------------------------ journal */

export interface Journal {
  brief: Brief;
  debut: number;
  jetonsEntree: number;
  jetonsSortie: number;
  passes: number;
  anomalies: number;
  /** « pedagogie:ok », « maquette:erreur », « reparer:refus »… */
  statut: string;
}

/** Journalise la part d'une étape (durée, jetons, coût, statut). Jamais bloquant. */
export async function journaliser(caller: Caller, j: Journal): Promise<void> {
  try {
    await caller.supabase.from('generation_logs').insert({
      teacher_id: caller.id,
      theme: j.brief.theme.slice(0, 300),
      diploma: j.brief.diplomaId,
      duree_ms: Date.now() - j.debut,
      input_tokens: j.jetonsEntree,
      output_tokens: j.jetonsSortie,
      cout_estime: cout(j.jetonsEntree, j.jetonsSortie),
      passes: j.passes,
      anomalies: j.anomalies,
      statut: j.statut.slice(0, 300),
    });
  } catch {
    // le journal ne doit jamais faire échouer la génération
  }
}

/* ------------------------------------------------------------------ flux NDJSON */

/** Ce qu'une étape peut émettre pendant son travail. */
export interface Emetteur {
  /** Message de progression affiché tel quel dans l'écran d'attente. */
  progres: (message: string) => void;
}

/**
 * Réponse en flux : `travail` reçoit un émetteur de progression et rend la charge utile
 * finale. Un battement de cœur part toutes les 4 s tant que le travail dure, pour qu'aucune
 * passerelle ne considère la connexion inactive.
 */
export function fluxReponse(
  premierMessage: string,
  travail: (e: Emetteur) => Promise<unknown>,
): Response {
  const encodeur = new TextEncoder();
  const debut = Date.now();
  const secondes = () => Math.round((Date.now() - debut) / 1000);

  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      let ouvert = true;
      const envoyer = (evenement: Record<string, unknown>) => {
        if (!ouvert) return;
        try {
          controleur.enqueue(encodeur.encode(`${JSON.stringify(evenement)}\n`));
        } catch {
          ouvert = false;
        }
      };

      envoyer({ type: 'progres', message: premierMessage, secondes: 0 });
      const battement = setInterval(() => {
        envoyer({ type: 'progres', message: premierMessage, secondes: secondes() });
      }, BATTEMENT_MS);

      try {
        const data = await travail({
          progres: (message) => envoyer({ type: 'progres', message, secondes: secondes() }),
        });
        envoyer({ type: 'resultat', data });
      } catch (e) {
        if (e instanceof ErreurGeneration) {
          envoyer({ type: 'erreur', message: e.message, code: e.code });
        } else {
          const detail = e instanceof Error ? e.message : 'erreur inconnue';
          envoyer({ type: 'erreur', message: `La génération a échoué (${detail}). Relance cette étape.`, code: 500 });
        }
      } finally {
        clearInterval(battement);
        ouvert = false;
        controleur.close();
      }
    },
  });

  return new Response(flux, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
