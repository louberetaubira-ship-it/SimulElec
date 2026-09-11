/**
 * Générateur de TP (Lot 8, partie serveur).
 *
 * POST /api/generateur
 *   entrée  : { diplomaId, classId?, theme, resume, duration, sequenceType,
 *               activities[], materielDisponible[], scene?, docs: [{ name, mime, dataBase64 }] }
 *   sortie  : { pedagogie, maquette: TpDefinition, anomalies, cout: { tokens, euros, secondes }, passes }
 *
 * Un seul appel structuré au modèle (outil `rediger_tp`), puis vérification par le moteur ;
 * au plus DEUX passes. Aucune donnée personnelle d'élève n'est envoyée au modèle : le
 * `classId` sert uniquement à la traçabilité côté base, ni nom ni liste de classe ne partent.
 */
import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { CatalogueItem, SceneKind } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { DIPLOMAS } from '@/lib/data/competences';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { fail, requireTeacher, type Caller } from '@/lib/api/auth';
import { PASSES_MAX, QUOTA_MENSUEL, TAILLE_DOCS_MAX, cout } from '@/lib/generateur/limites';
import { bibliothequePourScene } from '@/lib/generateur/bibliotheque';
import { construireContexte } from '@/lib/generateur/contexte';
import { SYSTEME, construirePromptUtilisateur, construireRelance, type Brief } from '@/lib/generateur/prompt';
import { OUTIL_TP, lireResultat, type ResultatGeneration } from '@/lib/generateur/schema';
import { aDesBloquantes, portionsFautives, verifier, type Anomalie } from '@/lib/generateur/verifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Durée maximale autorisée par la plateforme (s). */
export const maxDuration = 300;

/* ------------------------------------------------------------- constantes */

/** Modèle utilisé, avec repli sur celui du professeur virtuel. */
const MODELE = process.env.ANTHROPIC_MODEL_GENERATEUR || 'claude-sonnet-4-5';
const MODELE_REPLI = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

/* ------------------------------------------------------------------ entrée */

interface DocEntrant { name: string; mime: string; dataBase64: string }

interface Corps {
  diplomaId?: string;
  classId?: string | null;
  theme?: string;
  resume?: string;
  duration?: number;
  sequenceType?: string;
  activities?: string[];
  materielDisponible?: string[];
  scene?: string;
  docs?: DocEntrant[];
}

const SCENES: SceneKind[] = ['ind', 'hab', 'ter', 'pv'];
const estDiplome = (v: unknown): v is DiplomaId => DIPLOMAS.some((d) => d.id === v);
const texte = (v: unknown, d = ''): string => (typeof v === 'string' ? v.trim() : d);
const listeTexte = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : [];

/** Type d'installation déduit du thème quand le professeur ne l'impose pas. */
function sceneDeduite(theme: string, resume: string): SceneKind {
  const t = `${theme} ${resume}`.toLowerCase();
  if (/photovolta|panneau|onduleur|batterie|autoconsom/.test(t)) return 'pv';
  if (/logement|habitat|appartement|maison|tableau de r[ée]partition/.test(t)) return 'hab';
  if (/tertiaire|bureau|magasin|baes|éclairage de s[ée]curit|ecole|hôtel/.test(t)) return 'ter';
  return 'ind';
}

/** Taille réelle d'un contenu base64 (octets). */
const tailleBase64 = (data: string): number => Math.floor((data.replace(/=+$/, '').length * 3) / 4);

/* ------------------------------------------------------- pièces jointes */

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

/* ------------------------------------------------------------------ route */

export async function POST(request: NextRequest) {
  const debut = Date.now();

  const caller = await requireTeacher();
  if (caller instanceof NextResponse) return caller;

  let corps: Corps;
  try {
    corps = (await request.json()) as Corps;
  } catch {
    return fail('Requête illisible : le corps n’est pas du JSON.', 400);
  }

  const theme = texte(corps.theme);
  if (!theme) return fail('Indique le thème du TP à générer.', 400);
  if (!estDiplome(corps.diplomaId)) return fail('Choisis un diplôme valide (CAP, Bac Pro MELEC, BTS ou CS TER).', 400);
  const diplomaId: DiplomaId = corps.diplomaId;

  const docs = Array.isArray(corps.docs) ? corps.docs.filter((d) => d && typeof d.dataBase64 === 'string') : [];
  const poids = docs.reduce((s, d) => s + tailleBase64(d.dataBase64), 0);
  if (poids > TAILLE_DOCS_MAX) {
    return fail('Le dossier technique dépasse 10 Mo. Retire ou allège des documents avant de relancer la génération.', 413);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail('La clé du modèle n’est pas configurée sur le serveur : la génération est indisponible.', 503);

  // -------------------------------------------------------------- quota
  const { data: quotaData, error: quotaError } = await caller.supabase.rpc('generation_quota', { uid: caller.id });
  if (quotaError) return fail('Lecture du quota impossible : ' + quotaError.message, 500);
  const consommees = typeof quotaData === 'number' ? quotaData : 0;
  if (consommees >= QUOTA_MENSUEL) {
    return fail(`Quota atteint : ${QUOTA_MENSUEL} générations par mois. Reviens le mois prochain ou demande une extension à l’administrateur.`, 429);
  }

  // ------------------------------------------------------------ contexte
  const resume = texte(corps.resume);
  const scene: SceneKind = SCENES.includes(corps.scene as SceneKind)
    ? (corps.scene as SceneKind)
    : sceneDeduite(theme, resume);

  const bibliotheque = await bibliothequePourScene(scene);
  const items: Record<string, CatalogueItem> = { ...CATALOGUE_BY_KEY };
  for (const it of bibliotheque) items[it.key] = it;

  const brief: Brief = {
    diplomaId,
    theme,
    resume,
    duration: typeof corps.duration === 'number' && corps.duration > 0 ? Math.round(corps.duration) : 240,
    sequenceType: texte(corps.sequenceType, 'séance de travaux pratiques'),
    activities: listeTexte(corps.activities),
    materielDisponible: listeTexte(corps.materielDisponible),
    scene,
    documents: docs.map((d) => d.name).filter(Boolean),
  };

  const contexte = construireContexte({
    diploma: diplomaId,
    scene,
    bibliotheque,
    materielDisponible: brief.materielDisponible,
  });

  // -------------------------------------------------------------- appel
  const anthropic = new Anthropic({ apiKey });
  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: [...blocsDocuments(docs), { type: 'text', text: construirePromptUtilisateur(brief, contexte) }],
    },
  ];

  let jetonsEntree = 0;
  let jetonsSortie = 0;
  let passes = 0;
  let resultat: ResultatGeneration | null = null;
  let verification: ReturnType<typeof verifier> | null = null;
  let anomalies: Anomalie[] = [];

  while (passes < PASSES_MAX) {
    passes += 1;
    let reponse: Anthropic.Messages.Message;
    try {
      reponse = await appelModele(anthropic, messages);
    } catch (e) {
      await journaliser(caller, { brief, debut, jetonsEntree, jetonsSortie, passes, anomalies: 0, statut: 'erreur' });
      const detail = e instanceof Error ? e.message : 'erreur inconnue';
      return fail(`Le modèle n’a pas répondu (${detail}). Réessaie dans un instant.`, 502);
    }
    jetonsEntree += reponse.usage.input_tokens;
    jetonsSortie += reponse.usage.output_tokens;

    const appel = reponse.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === OUTIL_TP.name,
    );
    if (!appel) {
      await journaliser(caller, { brief, debut, jetonsEntree, jetonsSortie, passes, anomalies: 0, statut: 'refus' });
      return fail('Le modèle n’a pas rendu de TP exploitable. Précise le thème ou le dossier technique, puis relance.', 502);
    }

    const lu = lireResultat(appel.input);
    if (!lu) {
      await journaliser(caller, { brief, debut, jetonsEntree, jetonsSortie, passes, anomalies: 0, statut: 'refus' });
      return fail('La réponse du modèle ne respecte pas le format attendu. Relance la génération.', 502);
    }

    resultat = lu;
    verification = verifier(lu, items, { diploma: diplomaId });
    anomalies = verification.anomalies;

    if (!aDesBloquantes(anomalies) || passes >= PASSES_MAX) break;

    messages.push(
      { role: 'assistant', content: reponse.content },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: appel.id, content: 'Le moteur de simulation a refusé cette version.', is_error: true },
          { type: 'text', text: construireRelance(anomalies, portionsFautives(lu, anomalies)) },
        ],
      },
    );
  }

  if (!resultat || !verification) {
    await journaliser(caller, { brief, debut, jetonsEntree, jetonsSortie, passes, anomalies: 0, statut: 'erreur' });
    return fail('La génération a échoué. Relance-la dans un instant.', 502);
  }

  const secondes = Math.round((Date.now() - debut) / 100) / 10;
  const euros = cout(jetonsEntree, jetonsSortie);
  const bloquantes = anomalies.filter((a) => a.gravite === 'bloquante').length;

  await journaliser(caller, {
    brief,
    debut,
    jetonsEntree,
    jetonsSortie,
    passes,
    anomalies: anomalies.length,
    statut: bloquantes ? 'anomalies' : 'ok',
  });

  return NextResponse.json({
    pedagogie: resultat.pedagogie,
    maquette: verification.def,
    anomalies,
    corrections: verification.corrections,
    cout: { tokens: jetonsEntree + jetonsSortie, euros, secondes },
    passes,
  });
}

/* --------------------------------------------------------------- helpers */

/** Un appel au modèle, outil forcé ; repli sur le modèle du professeur virtuel. */
async function appelModele(
  anthropic: Anthropic,
  messages: Anthropic.Messages.MessageParam[],
): Promise<Anthropic.Messages.Message> {
  const requete = {
    max_tokens: 16000,
    temperature: 0.2,
    system: SYSTEME,
    tools: [OUTIL_TP as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool' as const, name: OUTIL_TP.name },
    messages,
  };
  try {
    return await anthropic.messages.create({ model: MODELE, ...requete });
  } catch (e) {
    if (MODELE_REPLI === MODELE) throw e;
    return anthropic.messages.create({ model: MODELE_REPLI, ...requete });
  }
}

interface Journal {
  brief: Brief;
  debut: number;
  jetonsEntree: number;
  jetonsSortie: number;
  passes: number;
  anomalies: number;
  statut: string;
}

/** Journalise la génération (durée, jetons, coût, passes, anomalies restantes). */
async function journaliser(caller: Caller, j: Journal): Promise<void> {
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
      statut: j.statut,
    });
  } catch {
    // le journal ne doit jamais faire échouer la génération
  }
}
