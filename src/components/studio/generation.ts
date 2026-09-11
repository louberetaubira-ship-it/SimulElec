'use client';

/**
 * Générateur de TP — côté client : ORCHESTRATION de la génération.
 *
 * Une génération complète dépassait la durée maximale d'une fonction serverless : la
 * passerelle coupait à 504 sans qu'aucune étape ne s'allume. Elle est maintenant découpée
 * en appels courts, enchaînés ici, dans le navigateur :
 *
 *   1. `POST /api/generateur/pedagogie`  (un appel au modèle, flux)  → dossier pédagogique
 *   2. `POST /api/generateur/materiel`   (un appel au modèle, flux)  → matériel retenu dans
 *      la bibliothèque COMPLÈTE (index compact : tout l'atelier, rien d'exclu a priori)
 *   3. `POST /api/generateur/maquette`   (un appel au modèle, flux)  → maquette jouable, à
 *      partir du seul DÉTAIL des appareils retenus
 *   4. vérification LOCALE par `verifier()` — pur TypeScript, aucun aller-retour serveur
 *   5. `POST /api/generateur/reparer`    (deux passes au plus, flux) → sections corrigées
 *   6. recalcul local des mesures attendues (min / max écrits par le simulateur)
 *
 * Chaque appel a un délai d'attente explicite ; ce qui est déjà produit est conservé pour
 * pouvoir reprendre à l'étape fautive sans tout recommencer.
 */
import type { SceneKind, TpDefinition } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import type {
  ActiviteGeneree, ChampDeduit, ChoixMateriel, CritereGenere, MaquetteGeneree, PedagogieGeneree,
  QuestionGeneree, ResultatGeneration,
} from '@/lib/generateur/schema';
import {
  appliquerReparation, estChampDeduit, lireChoixMateriel, lireMaquetteOutil as lireMaquette,
  lireReparation,
} from '@/lib/generateur/schema';
import { resumePedagogie } from '@/lib/generateur/prompt';
import { aDesBloquantes, portionsFautives, verifier } from '@/lib/generateur/verifier';
import { itemsPourCles } from '@/lib/generateur/bibliotheque-client';
import { emptyTp } from './model';

export type {
  ActiviteGeneree, ChampDeduit, ChoixMateriel, CritereGenere, MaquetteGeneree, PedagogieGeneree,
  QuestionGeneree,
};

/** Taille cumulée maximale du dossier technique joint (10 Mo, contrôle serveur identique). */
export const TAILLE_DOCS_MAX = 10 * 1024 * 1024;

/** Anomalie relevée par le moteur sur la réponse du modèle. */
export interface AnomalieGeneration {
  /** Chemin dans la réponse : « maquette.liaisons[3].a ». */
  chemin: string;
  message: string;
  gravite: 'bloquante' | 'avertissement';
}

/** Une pièce jointe prête à partir (le serveur attend du base64 sans en-tête). */
export interface DocumentJoint {
  name: string;
  mime: string;
  dataBase64: string;
  /** Taille réelle du contenu encodé, en octets. */
  octets: number;
}

/**
 * Saisie de l'écran de brief.
 *
 * Seul le thème est obligatoire. `duration: null`, `scene: ''` et les listes vides
 * signifient « laisser l'IA choisir » : le modèle complète et propose, le professeur relit.
 */
export interface BriefSaisie {
  diplomaId: DiplomaId;
  classId: string | null;
  theme: string;
  resume: string;
  /** `null` = durée laissée au modèle. */
  duration: number | null;
  sequenceType: string;
  /** Vide = compétences et activités du référentiel laissées au modèle. */
  activities: string[];
  /** Vide = toute la bibliothèque est ouverte au modèle. */
  materielDisponible: string[];
  /** `''` = type d'installation déduit du thème par le modèle. */
  scene: SceneKind | '';
}

/** Coût estimé d'une génération. */
export interface CoutGeneration {
  tokens: number;
  euros: number;
  secondes: number;
}

/** Résultat complet d'une génération, tel que le studio l'importe. */
export interface ReponseGeneration {
  pedagogie: PedagogieGeneree;
  maquette: TpDefinition;
  anomalies: AnomalieGeneration[];
  corrections: string[];
  cout: CoutGeneration;
  passes: number;
  /** Champs que le modèle a choisis lui-même : pastilles « proposé par l'IA » du studio. */
  deductions: ChampDeduit[];
}

/* ------------------------------------------------------------- étapes du pipeline */

/** Étapes réelles de la génération, dans l'ordre d'exécution. */
export type EtapeId = 'pedagogie' | 'materiel' | 'maquette' | 'verif' | 'reparation' | 'mesures';

export const ETAPES_GENERATION: { id: EtapeId; label: string }[] = [
  { id: 'pedagogie', label: 'Rédaction du dossier pédagogique' },
  { id: 'materiel', label: 'Choix du matériel dans toute la bibliothèque' },
  { id: 'maquette', label: 'Construction de la maquette jouable' },
  { id: 'verif', label: 'Vérification par le moteur de simulation' },
  { id: 'reparation', label: 'Réparations ciblées (deux passes au plus)' },
  { id: 'mesures', label: 'Recalcul des mesures attendues' },
];

/** Rang d'une étape dans le pipeline (−1 si inconnue). */
export const rangEtape = (id: EtapeId): number => ETAPES_GENERATION.findIndex((e) => e.id === id);

/** État d'une étape dans l'écran d'attente. */
export type EtatEtape = 'attente' | 'encours' | 'fait' | 'echec';

/** Ce que l'orchestration rapporte à l'interface à chaque changement. */
export interface AvanceeEtape {
  etape: EtapeId;
  etat: EtatEtape;
  /** Message en français affiché sous l'étape (progression du serveur, résumé, erreur). */
  message?: string;
}

/**
 * Délai d'attente par appel serveur (ms). Chaque route ne fait qu'un appel au modèle, mais
 * ce modèle ÉCRIT plusieurs milliers de jetons : deux à trois minutes sont normales. Le
 * serveur envoie un battement de cœur chaque seconde, donc une étape vraiment bloquée se
 * voit tout de suite ; ce délai n'est que le garde-fou ultime.
 */
export const DELAI_ETAPE_MS = 300_000;

/* ------------------------------------------------------------- pièces jointes */

const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Base64 d'un fichier, sans l'en-tête `data:` */
function base64De(fichier: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('Document illisible.'));
    lecteur.onload = () => {
      const brut = String(lecteur.result ?? '');
      const virgule = brut.indexOf(',');
      resolve(virgule >= 0 ? brut.slice(virgule + 1) : brut);
    };
    lecteur.readAsDataURL(fichier);
  });
}

/** Taille réelle d'un contenu base64, en octets. */
export const octetsBase64 = (data: string): number => Math.floor((data.replace(/=+$/, '').length * 3) / 4);

/** Poids lisible : « 1,4 Mo ». */
export function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  return `${(Math.round((octets / (1024 * 1024)) * 10) / 10).toString().replace('.', ',')} Mo`;
}

/** Redimensionne et recomprime une image en JPEG (1 600 px au plus grand côté). */
async function compresserImage(fichier: File): Promise<Blob> {
  const url = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible.'));
      img.src = url;
    });
    const cote = Math.max(image.width, image.height);
    const k = cote > 1600 ? 1600 / cote : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * k));
    canvas.height = Math.max(1, Math.round(image.height * k));
    const ctx = canvas.getContext('2d');
    if (!ctx) return fichier;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
    return blob && blob.size < fichier.size ? blob : fichier;
  } catch {
    return fichier;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Prépare un document : les images sont compressées, le reste part tel quel. */
export async function preparerDocument(fichier: File): Promise<DocumentJoint> {
  const image = IMAGES.includes(fichier.type);
  const contenu = image ? await compresserImage(fichier) : fichier;
  const mime = image ? (contenu === fichier ? fichier.type : 'image/jpeg') : fichier.type || 'text/plain';
  const dataBase64 = await base64De(contenu);
  return { name: fichier.name, mime, dataBase64, octets: octetsBase64(dataBase64) };
}

/* ---------------------------------------------------------------- appel serveur */

const texte = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const nombre = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const listeTexte = (v: unknown): string[] => liste(v).filter((x): x is string => typeof x === 'string');
const objet = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Relecture défensive du dossier pédagogique renvoyé par le serveur. */
export function lirePedagogie(v: unknown): PedagogieGeneree {
  const o = objet(v);
  const activites: ActiviteGeneree[] = liste(o?.activites).flatMap((a) => {
    const x = objet(a);
    if (!x) return [];
    return [{
      titre: texte(x.titre, 'Activité'),
      duree: nombre(x.duree, 60),
      contexte: texte(x.contexte),
      consignes: listeTexte(x.consignes),
      correction: texte(x.correction),
      ...(typeof x.securite === 'string' ? { securite: x.securite } : {}),
    }];
  });
  const criteres: CritereGenere[] = liste(o?.criteres).flatMap((c) => {
    const x = objet(c);
    if (!x) return [];
    return [{
      code: texte(x.code),
      critere: texte(x.critere),
      source: x.source === 'professeur' ? 'professeur' : 'simulateur',
      etape: Math.max(0, Math.min(10, Math.round(nombre(x.etape, 0)))),
    }];
  });
  const quiz: QuestionGeneree[] = liste(o?.quiz).flatMap((q) => {
    const x = objet(q);
    if (!x || typeof x.q !== 'string') return [];
    const options = listeTexte(x.options);
    if (options.length < 2) return [];
    return [{ q: x.q, options, answer: Math.max(0, Math.min(options.length - 1, Math.round(nombre(x.answer, 0)))) }];
  });
  const scenes: SceneKind[] = ['ind', 'hab', 'ter', 'pv'];
  const annexes = ['door', 'room', 'local', 'roof'];
  const deductions = liste(o?.deductions).filter(estChampDeduit);
  return {
    objectifs: listeTexte(o?.objectifs),
    materiel: listeTexte(o?.materiel),
    activites,
    criteres,
    quiz,
    ...(scenes.includes(o?.scene as SceneKind) ? { scene: o?.scene as SceneKind } : {}),
    ...(annexes.includes(texte(o?.annex)) ? { annex: texte(o?.annex) as PedagogieGeneree['annex'] } : {}),
    ...(nombre(o?.duree) > 0 ? { duree: Math.round(nombre(o?.duree)) } : {}),
    ...(deductions.length ? { deductions: Array.from(new Set(deductions)) } : {}),
  };
}

/** Relecture défensive des anomalies. */
export function lireAnomalies(v: unknown): AnomalieGeneration[] {
  return liste(v).flatMap((a) => {
    const x = objet(a);
    if (!x) return [];
    return [{
      chemin: texte(x.chemin),
      message: texte(x.message, 'Anomalie sans message.'),
      gravite: x.gravite === 'avertissement' ? 'avertissement' : 'bloquante',
    }];
  });
}

/* ---------------------------------------------------------------- appels serveur */

/** Échec d'une étape : l'interface sait laquelle reprendre. */
export class EchecEtape extends Error {
  readonly etape: EtapeId;

  constructor(etape: EtapeId, message: string) {
    super(message);
    this.name = 'EchecEtape';
    this.etape = etape;
  }
}

/** Message en français pour un statut HTTP d'échec. */
export function messageStatut(statut: number, defaut?: string): string {
  if (statut === 504) {
    return 'Le serveur a coupé l’appel avant la fin (504). Cette étape est trop longue : relancez-la, elle repart seule.';
  }
  if (statut === 429) return 'Quota de génération atteint (429) : réessayez plus tard ou demandez une extension.';
  if (statut === 503) return 'La clé du modèle n’est pas configurée sur le serveur (503) : la génération est indisponible.';
  if (statut === 502) return defaut || 'Le modèle a rendu une réponse inexploitable (502). Relancez cette étape.';
  if (statut === 413) return defaut || 'Le dossier technique joint est trop lourd (413) : allégez-le.';
  if (statut === 401 || statut === 403) return 'Session expirée ou compte non professeur : reconnectez-vous.';
  return defaut || `La génération a échoué (erreur ${statut}).`;
}

/** Un événement du flux NDJSON rendu par les routes du générateur. */
interface EvenementFlux {
  type?: string;
  message?: string;
  code?: number;
  data?: unknown;
}

/** Lit le flux NDJSON et rend la charge utile finale. */
async function lireFlux(reponse: Response, onProgres: (m: string) => void): Promise<Record<string, unknown>> {
  const corps = reponse.body;
  if (!corps) throw new Error('Réponse du générateur vide : relancez cette étape.');
  const lecteur = corps.getReader();
  const decodeur = new TextDecoder();
  let tampon = '';
  let resultat: Record<string, unknown> | null = null;
  let echec: { message: string; code: number } | null = null;

  const traiter = (ligne: string) => {
    const brut = ligne.trim();
    if (!brut) return;
    let ev: EvenementFlux;
    try {
      ev = JSON.parse(brut) as EvenementFlux;
    } catch {
      return;
    }
    if (ev.type === 'progres' && typeof ev.message === 'string') onProgres(ev.message);
    else if (ev.type === 'resultat') resultat = objet(ev.data) ?? {};
    else if (ev.type === 'erreur') {
      echec = { message: texte(ev.message, 'La génération a échoué.'), code: nombre(ev.code, 500) };
    }
  };

  for (;;) {
    const { done, value } = await lecteur.read();
    if (value) {
      tampon += decodeur.decode(value, { stream: true });
      const lignes = tampon.split('\n');
      tampon = lignes.pop() ?? '';
      for (const l of lignes) traiter(l);
    }
    if (done) break;
  }
  traiter(tampon);

  if (echec) throw new Error(messageStatut((echec as { code: number }).code, (echec as { message: string }).message));
  if (!resultat) throw new Error('Le serveur a interrompu la réponse avant la fin. Relancez cette étape.');
  return resultat;
}

/**
 * Un appel d'étape : POST JSON, réponse en flux, délai d'attente explicite.
 * L'annulation du professeur (`signal`) et l'expiration donnent deux messages distincts.
 */
export async function appelEtape(
  url: string,
  corps: unknown,
  signal: AbortSignal,
  onProgres: (m: string) => void,
  delaiMs = DELAI_ETAPE_MS,
): Promise<Record<string, unknown>> {
  const controleur = new AbortController();
  let expire = false;
  const minuterie = setTimeout(() => { expire = true; controleur.abort(); }, delaiMs);
  const relais = () => controleur.abort();
  signal.addEventListener('abort', relais);

  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controleur.signal,
      body: JSON.stringify(corps),
    });
    if (!reponse.ok) {
      const brut: unknown = await reponse.json().catch(() => null);
      throw new Error(messageStatut(reponse.status, texte(objet(brut)?.error) || undefined));
    }
    return await lireFlux(reponse, onProgres);
  } catch (e) {
    if (signal.aborted) throw e;
    if (expire) {
      throw new Error(
        `Le serveur n’a rien renvoyé en ${Math.round(delaiMs / 1000)} secondes : cette étape a été interrompue. Relancez-la.`,
      );
    }
    if (e instanceof TypeError) throw new Error('Serveur injoignable : vérifiez la connexion, puis relancez cette étape.');
    throw e;
  } finally {
    clearTimeout(minuterie);
    signal.removeEventListener('abort', relais);
  }
}

/** Corps commun aux trois routes : le brief du professeur. */
function corpsBrief(brief: BriefSaisie): Record<string, unknown> {
  return {
    diplomaId: brief.diplomaId,
    classId: brief.classId,
    theme: brief.theme,
    resume: brief.resume,
    ...(brief.duration === null ? {} : { duration: brief.duration }),
    sequenceType: brief.sequenceType,
    activities: brief.activities,
    materielDisponible: brief.materielDisponible,
    ...(brief.scene ? { scene: brief.scene } : {}),
  };
}

/* ------------------------------------------------- matériel et déductions */

/**
 * Clés d'appareils que le vérificateur doit connaître : celles retenues au premier temps,
 * plus celles réellement employées par la maquette (slots et options de postes).
 *
 * Une clé absente de la bibliothèque réelle ne sera pas trouvée par `itemsPourCles` : le
 * vérificateur la refusera, exactement comme avant.
 */
export function clesUtiles(choix: ChoixMateriel | null, maquette: MaquetteGeneree): string[] {
  return Array.from(new Set([
    ...(choix?.materiel ?? []).map((m) => m.key),
    ...maquette.slots.map((s) => s.key),
    ...maquette.postes.flatMap((p) => p.options.map((opt) => opt.key)),
  ].filter(Boolean)));
}

/**
 * Champs que l'IA a choisis elle-même : ce que le modèle déclare, complété par ce que le
 * brief a effectivement laissé vide. Le studio en fait des pastilles « proposé par l'IA ».
 */
export function deductionsDe(brief: BriefSaisie, pedagogie: PedagogieGeneree): ChampDeduit[] {
  const out = new Set<ChampDeduit>(pedagogie.deductions ?? []);
  if (!brief.activities.length) { out.add('competences'); out.add('activites'); }
  if (!brief.materielDisponible.length) out.add('materiel');
  if (!brief.scene) { out.add('scene'); out.add('annexe'); }
  if (brief.duration === null) out.add('duree');
  return Array.from(out);
}

/* ------------------------------------------------------------- orchestration */

/** Ce qui est déjà produit : conservé d'un essai à l'autre pour reprendre sans tout refaire. */
export interface AcquisGeneration {
  pedagogie: PedagogieGeneree | null;
  /** Matériel retenu dans la bibliothèque complète (premier temps de la sélection). */
  choix: ChoixMateriel | null;
  maquette: MaquetteGeneree | null;
  tokens: number;
  euros: number;
  passes: number;
}

/** Acquis vierge. */
export const acquisVide = (): AcquisGeneration => ({
  pedagogie: null, choix: null, maquette: null, tokens: 0, euros: 0, passes: 0,
});

/** Coût lu dans la réponse d'une étape, cumulé dans les acquis. */
function cumuler(acquis: AcquisGeneration, brut: unknown): void {
  const c = objet(brut);
  acquis.tokens += nombre(c?.tokens);
  acquis.euros = Math.round((acquis.euros + nombre(c?.euros)) * 100) / 100;
}

export interface OptionsOrchestration {
  brief: BriefSaisie;
  docs: DocumentJoint[];
  signal: AbortSignal;
  /** Acquis conservés entre deux essais : l'objet est complété au fil des étapes. */
  acquis: AcquisGeneration;
  /** Rapport d'avancement, étape par étape. */
  onEtape: (a: AvanceeEtape) => void;
  /** Première étape à exécuter (reprise après échec). Par défaut : la première manquante. */
  depuis?: EtapeId;
  delaiMs?: number;
}

/** Nombre maximal de passes de réparation. */
export const PASSES_REPARATION_MAX = 2;

/**
 * Enchaîne les étapes. Chaque étape échouée lève une `EchecEtape` : ce qui précède reste
 * dans `acquis`, l'interface propose de reprendre à cette étape.
 */
export async function orchestrerGeneration(o: OptionsOrchestration): Promise<ReponseGeneration> {
  const { brief, docs, signal, acquis, onEtape } = o;
  const debut = Date.now();
  const rangDepart = o.depuis ? rangEtape(o.depuis) : 0;
  const secondes = () => Math.round((Date.now() - debut) / 100) / 10;

  const lancer = async <T>(etape: EtapeId, travail: () => Promise<T>, resume: (v: T) => string): Promise<T> => {
    onEtape({ etape, etat: 'encours' });
    try {
      const v = await travail();
      onEtape({ etape, etat: 'fait', message: resume(v) });
      return v;
    } catch (e) {
      if (signal.aborted) throw e;
      const message = e instanceof Error ? e.message : 'Étape interrompue.';
      onEtape({ etape, etat: 'echec', message });
      throw new EchecEtape(etape, message);
    }
  };

  /* ------------------------------------------------------- 1. dossier pédagogique */
  if (!acquis.pedagogie || rangDepart <= rangEtape('pedagogie')) {
    acquis.pedagogie = await lancer(
      'pedagogie',
      async () => {
        const res = await appelEtape(
          '/api/generateur/pedagogie',
          {
            ...corpsBrief(brief),
            docs: docs.map((d) => ({ name: d.name, mime: d.mime, dataBase64: d.dataBase64 })),
          },
          signal,
          (m) => onEtape({ etape: 'pedagogie', etat: 'encours', message: m }),
          o.delaiMs,
        );
        cumuler(acquis, res.cout);
        return lirePedagogie(res.pedagogie);
      },
      (p) => `${p.activites.length} activité(s), ${p.criteres.length} critère(s), ${p.quiz.length} question(s).`,
    );
  } else {
    onEtape({ etape: 'pedagogie', etat: 'fait', message: 'Dossier déjà produit : conservé.' });
  }
  const pedagogie = acquis.pedagogie;

  /* ------------------------------------------ 2. choix du matériel (bibliothèque complète) */
  if (!acquis.choix || rangDepart <= rangEtape('materiel')) {
    acquis.choix = await lancer(
      'materiel',
      async () => {
        const res = await appelEtape(
          '/api/generateur/materiel',
          { ...corpsBrief(brief), resumePedagogie: resumePedagogie(pedagogie) },
          signal,
          (m) => onEtape({ etape: 'materiel', etat: 'encours', message: m }),
          o.delaiMs,
        );
        cumuler(acquis, res.cout);
        const c = lireChoixMateriel(res.choix);
        if (!c) throw new Error('Le matériel retenu est illisible : relancez cette étape.');
        const index = objet(res.index);
        const refs = nombre(index?.references);
        return { ...c, references: refs };
      },
      (c) => `${c.materiel.length} appareil(s) retenu(s)${c.references ? ` parmi ${c.references}` : ''}.`,
    );
  } else {
    onEtape({ etape: 'materiel', etat: 'fait', message: 'Matériel déjà choisi : conservé.' });
  }
  const choix = acquis.choix;

  /* --------------------------------------------------------------- 3. maquette */
  if (!acquis.maquette || rangDepart <= rangEtape('maquette')) {
    acquis.maquette = await lancer(
      'maquette',
      async () => {
        const res = await appelEtape(
          '/api/generateur/maquette',
          {
            ...corpsBrief(brief),
            scene: brief.scene || choix.scene,
            resumePedagogie: resumePedagogie(pedagogie),
            materiel: choix.materiel.map((m) => ({ key: m.key, rep: m.rep })),
          },
          signal,
          (m) => onEtape({ etape: 'maquette', etat: 'encours', message: m }),
          o.delaiMs,
        );
        cumuler(acquis, res.cout);
        const m = lireMaquette(res.maquette);
        if (!m) throw new Error('La maquette reçue est illisible : relancez cette étape.');
        return m;
      },
      (m) => `${m.slots.length} appareil(s), ${m.liaisons.length} liaison(s), ${m.mesures.length} mesure(s).`,
    );
  } else {
    onEtape({ etape: 'maquette', etat: 'fait', message: 'Maquette déjà produite : conservée.' });
  }

  /* ------------------------------- 4. vérification LOCALE (aucun aller-retour serveur) */
  let resultat: ResultatGeneration = { pedagogie, maquette: acquis.maquette };
  const { items, premiere } = await lancer(
    'verif',
    async () => {
      onEtape({ etape: 'verif', etat: 'encours', message: 'Chargement des appareils retenus…' });
      const cat = await itemsPourCles(clesUtiles(choix, resultat.maquette));
      onEtape({ etape: 'verif', etat: 'encours', message: 'Confrontation de la maquette au moteur de simulation…' });
      return { items: cat, premiere: verifier(resultat, cat, { diploma: brief.diplomaId }) };
    },
    ({ premiere: v }) => (v.anomalies.length
      ? `${v.anomalies.length} anomalie(s) relevée(s).`
      : 'Aucune anomalie : la maquette passe le moteur.'),
  );
  let verification = premiere;
  const corrections = [...verification.corrections];

  /* --------------------------------------------------------------- 5. réparations */
  if (!aDesBloquantes(verification.anomalies)) {
    onEtape({ etape: 'reparation', etat: 'fait', message: 'Rien à réparer.' });
  } else {
    await lancer(
      'reparation',
      async () => {
        let passe = 0;
        while (aDesBloquantes(verification.anomalies) && passe < PASSES_REPARATION_MAX) {
          passe += 1;
          acquis.passes = passe;
          onEtape({
            etape: 'reparation',
            etat: 'encours',
            message: `Passe ${passe} sur ${PASSES_REPARATION_MAX} : ${verification.anomalies.filter((a) => a.gravite === 'bloquante').length} anomalie(s) bloquante(s).`,
          });
          const res = await appelEtape(
            '/api/generateur/reparer',
            {
              ...corpsBrief(brief),
              scene: brief.scene || choix.scene,
              materiel: choix.materiel.map((m) => ({ key: m.key, rep: m.rep })),
              maquette: resultat.maquette,
              anomalies: verification.anomalies,
              portions: portionsFautives(resultat, verification.anomalies),
              passe,
            },
            signal,
            (m) => onEtape({ etape: 'reparation', etat: 'encours', message: m }),
            o.delaiMs,
          );
          cumuler(acquis, res.cout);
          const rep = lireReparation(res.reparation);
          if (!rep) break;
          resultat = appliquerReparation(resultat, rep);
          acquis.maquette = resultat.maquette;
          corrections.push(...rep.corrections);
          verification = verifier(resultat, items, { diploma: brief.diplomaId });
        }
        return passe;
      },
      (passe) => `${passe} passe(s) ; ${verification.anomalies.length} anomalie(s) restante(s).`,
    );
  }

  /* ------------------------------------------- 6. recalcul local des mesures attendues */
  const finale = await lancer(
    'mesures',
    async () => verifier(resultat, items, { diploma: brief.diplomaId }),
    (v) => `${v.def.mesures.length} mesure(s) calculée(s) par le simulateur.`,
  );

  return {
    pedagogie: resultat.pedagogie,
    maquette: finale.def,
    anomalies: finale.anomalies,
    corrections: Array.from(new Set([...corrections, ...finale.corrections])),
    cout: { tokens: acquis.tokens, euros: acquis.euros, secondes: secondes() },
    passes: Math.max(1, acquis.passes),
    deductions: deductionsDe(brief, resultat.pedagogie),
  };
}

/**
 * Sortie de secours : la maquette a échoué, mais le dossier pédagogique est là.
 * Le professeur complétera la platine à la main dans le studio.
 */
export function dossierSeul(pedagogie: PedagogieGeneree, brief: BriefSaisie, acquis: AcquisGeneration): ReponseGeneration {
  const scene: SceneKind = brief.scene || pedagogie.scene || 'ind';
  const def = emptyTp('', scene);
  def.title = pedagogie.activites[0]?.titre ?? brief.theme;
  def.summary = pedagogie.objectifs.join(' ');
  def.situation = pedagogie.activites[0]?.contexte ?? '';
  def.quiz = pedagogie.quiz;
  def.diplomas = [brief.diplomaId];
  return {
    pedagogie,
    maquette: def,
    anomalies: [{
      chemin: 'maquette',
      message: 'La maquette n’a pas été générée : posez les appareils et tirez les liaisons dans le studio avant de valider le TP.',
      gravite: 'bloquante',
    }],
    corrections: ['Platine vide : la génération de la maquette a échoué, le dossier pédagogique est conservé.'],
    cout: { tokens: acquis.tokens, euros: acquis.euros, secondes: 0 },
    passes: Math.max(1, acquis.passes),
    deductions: deductionsDe(brief, pedagogie),
  };
}

/* ------------------------------------------------------------------ navigation */

/** Onglet de l'inspecteur concerné par une anomalie, d'après son chemin. */
export function cibleAnomalie(chemin: string): { tab: string; index: number | null } {
  const index = /\[(\d+)\]/.exec(chemin);
  const i = index ? Number(index[1]) : null;
  if (chemin.startsWith('pedagogie.criteres')) return { tab: 'criteres', index: i };
  if (chemin.startsWith('pedagogie')) return { tab: 'dossier', index: i };
  if (chemin.startsWith('maquette.liaisons')) return { tab: 'liaisons', index: i };
  if (chemin.startsWith('maquette.postes')) return { tab: 'postes', index: i };
  if (chemin.startsWith('maquette.mesures')) return { tab: 'mesures', index: i };
  if (chemin.startsWith('maquette.pannes')) return { tab: 'reglages', index: i };
  return { tab: 'materiel', index: i };
}
