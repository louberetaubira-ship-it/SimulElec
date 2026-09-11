'use client';

/**
 * Générateur de TP — côté client : contrat d'échange avec `POST /api/generateur`,
 * préparation des pièces jointes (compression des images, contrôle de la taille totale)
 * et relecture défensive de la réponse.
 *
 * Le serveur est le contrat : il rend un dossier pédagogique, une `TpDefinition` déjà
 * corrigée par le moteur, les anomalies restantes et ce que le vérificateur a réparé.
 */
import type { SceneKind, TpDefinition } from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import type { ActiviteGeneree, CritereGenere, PedagogieGeneree, QuestionGeneree } from '@/lib/generateur/schema';

export type { ActiviteGeneree, CritereGenere, PedagogieGeneree, QuestionGeneree };

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

/** Saisie de l'écran de brief. */
export interface BriefSaisie {
  diplomaId: DiplomaId;
  classId: string | null;
  theme: string;
  resume: string;
  duration: number;
  sequenceType: string;
  activities: string[];
  materielDisponible: string[];
  scene: SceneKind | '';
}

/** Coût estimé d'une génération. */
export interface CoutGeneration {
  tokens: number;
  euros: number;
  secondes: number;
}

/** Réponse complète de `POST /api/generateur`. */
export interface ReponseGeneration {
  pedagogie: PedagogieGeneree;
  maquette: TpDefinition;
  anomalies: AnomalieGeneration[];
  corrections: string[];
  cout: CoutGeneration;
  passes: number;
}

/* ------------------------------------------------------------- étapes du pipeline */

/** Étapes affichées pendant l'attente, avec leur durée indicative (secondes cumulées). */
export const ETAPES_GENERATION: { id: string; label: string; jusqua: number }[] = [
  { id: 'lecture', label: 'Lecture du dossier technique', jusqua: 8 },
  { id: 'contexte', label: 'Contexte imposé : catalogue, référentiel, géométrie', jusqua: 14 },
  { id: 'redaction', label: 'Rédaction du dossier pédagogique', jusqua: 55 },
  { id: 'maquette', label: 'Construction de la maquette jouable', jusqua: 95 },
  { id: 'verif', label: 'Vérification par le moteur de simulation', jusqua: 110 },
  { id: 'reparation', label: 'Réparations et seconde passe si nécessaire', jusqua: 160 },
  { id: 'mesures', label: 'Recalcul des mesures attendues', jusqua: 175 },
  { id: 'pret', label: 'TP prêt à relire', jusqua: Number.POSITIVE_INFINITY },
];

/** Étape estimée au bout de `secondes` d'attente (aucune barre de progression fictive). */
export function etapeEstimee(secondes: number): number {
  const i = ETAPES_GENERATION.findIndex((e) => secondes < e.jusqua);
  return i < 0 ? ETAPES_GENERATION.length - 2 : Math.min(i, ETAPES_GENERATION.length - 2);
}

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
  return { objectifs: listeTexte(o?.objectifs), materiel: listeTexte(o?.materiel), activites, criteres, quiz };
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

/** Appelle le générateur. Les erreurs portent déjà un message en français. */
export async function genererTp(
  brief: BriefSaisie,
  docs: DocumentJoint[],
  signal: AbortSignal,
): Promise<ReponseGeneration> {
  const reponse = await fetch('/api/generateur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      diplomaId: brief.diplomaId,
      classId: brief.classId,
      theme: brief.theme,
      resume: brief.resume,
      duration: brief.duration,
      sequenceType: brief.sequenceType,
      activities: brief.activities,
      materielDisponible: brief.materielDisponible,
      ...(brief.scene ? { scene: brief.scene } : {}),
      docs: docs.map((d) => ({ name: d.name, mime: d.mime, dataBase64: d.dataBase64 })),
    }),
  });

  const brut: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const o = objet(brut);
    throw new Error(texte(o?.error, `La génération a échoué (erreur ${reponse.status}).`));
  }
  const o = objet(brut);
  const maquette = objet(o?.maquette);
  if (!o || !maquette) throw new Error('Réponse du générateur illisible : relancez la génération.');

  return {
    pedagogie: lirePedagogie(o.pedagogie),
    maquette: maquette as unknown as TpDefinition,
    anomalies: lireAnomalies(o.anomalies),
    corrections: listeTexte(o.corrections),
    cout: {
      tokens: nombre(objet(o.cout)?.tokens),
      euros: nombre(objet(o.cout)?.euros),
      secondes: nombre(objet(o.cout)?.secondes),
    },
    passes: nombre(o.passes, 1),
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
