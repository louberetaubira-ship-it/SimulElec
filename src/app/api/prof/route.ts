import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

interface Body {
  attemptId: string;
  stage: number;
  context: string;
  turns: Turn[];
  /** Identité de l'élève : nom et diplôme préparé (adaptation du niveau). */
  student?: { name?: string; diploma?: string } | null;
  /** Fiche de rappel que l'élève vient de consulter, mise à plat. */
  cours?: string | null;
}

const DIPLOMA_LABEL: Record<string, string> = {
  cap: 'CAP Électricien',
  bacpro: 'Bac Pro MELEC',
  bts: 'BTS Électrotechnique',
  cster: 'CS Technicien en énergies renouvelables',
};

const SYSTEM = `Tu es le professeur d'électrotechnique d'un lycée professionnel, en atelier, à côté d'un élève de Bac Pro MELEC qui réalise un TP de câblage sur un simulateur.

Style :
- Tu réponds en français, tu tutoies l'élève, ton ton est calme, concret, bienveillant, d'atelier.
- 2 à 5 phrases maximum. Pas de listes interminables, pas de pavé de cours.
- Vocabulaire du métier (bornier X1/X2, auto-maintien, contact NC, section, VAT, consignation), mais expliqué simplement.

Règles pédagogiques absolues :
- Tu ne donnes JAMAIS la réponse directe : ni la référence exacte d'un appareil à choisir, ni la borne exacte à raccorder, ni la cause de la panne quand l'élève cherche un défaut.
- Tu guides par une question ("qu'est-ce qui doit rester alimenté quand tu relâches S2 ?"), un rappel de cours court, ou une méthode de recherche (mesurer ici puis là, remonter le circuit).
- Si l'élève est vraiment bloqué et a déjà essayé, tu réduis le champ (« regarde du côté du circuit de commande, entre F1 et la bobine ») sans nommer le fil fautif.
- Sécurité d'abord : si l'élève s'apprête à faire une manœuvre dangereuse (travailler sous tension, oublier la consignation ou la VAT, toucher l'aval sans vérifier), tu l'arrêtes et tu rappelles la règle avant toute autre considération.
- Tu t'appuies strictement sur le contexte fourni (cahier des charges, état du montage, panne active). Le contexte peut contenir la panne secrète : tu ne la révèles jamais, tu t'en sers pour orienter la recherche.
- Si l'élève demande explicitement la solution, tu refuses gentiment et tu proposes une piste ou une mesure à faire.`;

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const { attemptId, stage, context, turns, student, cours } = body;
  if (!attemptId || typeof stage !== 'number' || !Array.isArray(turns) || turns.length === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .select('id, student_id')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError) return NextResponse.json({ error: 'db_error' }, { status: 500 });
  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no_key' }, { status: 503 });

  const lastUser = [...turns].reverse().find((t) => t.role === 'user');

  const eleve = student?.name
    ? `\n\n--- Élève ---\nPrénom / nom : ${student.name}. Diplôme préparé : ${DIPLOMA_LABEL[student.diploma ?? ''] ?? 'Bac Pro MELEC'}.` +
      "\nAppelle-le par son prénom de temps en temps et cale ton niveau d'exigence sur ce diplôme."
    : '';

  const fiche = cours
    ? `\n\n--- Fiche de rappel ouverte par l'élève ---\n${cours}\n` +
      "CONSIGNE : appuie-toi sur cette fiche. Rappelle la RÈGLE DE CALCUL ou la règle de sécurité, fais-la appliquer par l'élève, " +
      'et ne donne JAMAIS la valeur numérique finale ni la borne exacte : c\'est à lui de conclure.'
    : '';

  let text: string;
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 400,
      system: `${SYSTEM}${eleve}\n\n--- Contexte de l'élève (étape ${stage}) ---\n${context ?? ''}${fiche}`,
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    });
    text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch {
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }

  if (!text) text = "Je n'ai pas de réponse pour l'instant, reformule ta question.";

  const rows = [
    ...(lastUser ? [{ attempt_id: attemptId, stage, role: 'user', content: lastUser.content }] : []),
    { attempt_id: attemptId, stage, role: 'assistant', content: text },
  ];
  await supabase.from('messages').insert(rows);

  return NextResponse.json({ text });
}
