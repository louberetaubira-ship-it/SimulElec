/**
 * Vérification d'un TP produit par le modèle, AVANT de le rendre au professeur.
 *
 * Module PUR (sans React, sans réseau) : il reconstruit une `TpDefinition` à partir de la
 * maquette, puis la confronte au moteur de simulation.
 *
 * Il tourne CÔTÉ NAVIGATEUR, entre l'appel « maquette » et l'appel « réparer » : c'est ce
 * qui permet de garder chaque requête serveur courte. Le catalogue d'appareils lui est
 * fourni par `bibliotheque-client.ts` (jamais par `bibliotheque.ts`, qui lit le disque).
 *
 * Garanties :
 *  - `nets` est TOUJOURS déduite par `deriveNets` : la table du modèle n'est jamais reprise ;
 *  - toute borne, clé d'appareil, code de compétence et panne est vérifiée contre les listes réelles ;
 *  - RÈGLE R1 : la valeur de chaque mesure est CALCULÉE par `read()` dans l'état de simulation
 *    correspondant, et c'est le vérificateur qui écrit `min` / `max` ;
 *  - toute valeur numérique suivie d'une unité électrique dans une correction qui ne correspond
 *    à aucune mesure calculée est signalée « valeur non vérifiée ».
 */
import type {
  CatalogueItem, ExpectedMeasure, Fault, Liaison, Poste, Slot, TpDefinition,
} from '@/lib/types';
import type { DiplomaId } from '@/lib/data/competences';
import { COMPETENCES } from '@/lib/data/competences';
import { checkTp, deriveNets, emptyTp, isPlayable, terminalsOf } from '@/components/studio/model';
import { initialSim, motorOf, type SimState } from '@/lib/sim/engine';
import { read, type ClampWire } from '@/lib/sim/mesures';
import { PANNES, panneConnue, panneParId } from './contexte';
import type { MesureGeneree, ResultatGeneration } from './schema';

/* ------------------------------------------------------------- anomalies */

export interface Anomalie {
  /** Chemin dans la réponse du modèle : « maquette.liaisons[3].a ». */
  chemin: string;
  /** Message en français, exploitable tel quel par l'interface. */
  message: string;
  gravite: 'bloquante' | 'avertissement';
}

export interface ResultatVerification {
  /** Définition reconstruite, corrigée, prête pour le studio et le parcours élève. */
  def: TpDefinition;
  anomalies: Anomalie[];
  /** Ce que le vérificateur a corrigé de lui-même, en français. */
  corrections: string[];
}

export interface OptionsVerification {
  /** Diplôme visé : contrôle des codes de compétences. */
  diploma?: DiplomaId;
}

/* ------------------------------------------------------------ utilitaires */

const slug = (texte: string): string =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const arrondi = (v: number, d = 2): number => Math.round(v * 10 ** d) / 10 ** d;

/* --------------------------------------------- états de simulation des mesures */

/** État de la platine dans lequel la mesure attendue doit être réalisable. */
export function simPourMesure(mesure: MesureGeneree, def: TpDefinition): SimState {
  const base = initialSim();
  const { In, n } = motorOf(def);
  if (mesure.stage === 'horsTension' || mesure.when === 'off') return base;
  const sous: SimState = { ...base, q1: true, f2: true, f3: true };
  if (mesure.when === 'run') {
    return { ...sous, km1: true, load: 1, I: In, peak: In, n };
  }
  return sous;
}

/** Fourchette d'acceptation autour de la valeur calculée. */
export function fourchette(valeur: number, unite: string, dial: string): [number, number] {
  if (dial === 'RISO 500 V' && valeur >= 100) return [0.5, 9999];
  if (unite === 'MΩ') return [arrondi(valeur * 0.5), arrondi(valeur * 2)];
  if (unite === 'Ω') {
    if (valeur < 1) return [0, arrondi(valeur + 1)];
    return [arrondi(valeur * 0.75), arrondi(valeur * 1.25)];
  }
  if (unite === 'V') {
    if (valeur === 0) return [0, 2];
    return [arrondi(valeur * 0.95), arrondi(valeur * 1.05)];
  }
  if (unite === 'A') {
    if (valeur === 0) return [0, 0.2];
    return [arrondi(valeur * 0.75), arrondi(valeur * 1.25)];
  }
  if (unite === 'tr/min') return [Math.round(valeur * 0.9), Math.round(valeur * 1.1)];
  if (valeur === 0) return [0, 1];
  return [arrondi(valeur * 0.9), arrondi(valeur * 1.1)];
}

/** Liaison serrée par la pince, d'après « a>b ». */
function pinceDe(wire: string, liaisons: Liaison[]): ClampWire | null {
  const [a, b] = wire.split('>');
  if (!a || !b) return null;
  const l = liaisons.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return l ? { a: l.a, b: l.b, net: l.net } : null;
}

/* ------------------------------------------------------ valeurs des corrections */

/** Unités électriques surveillées dans les textes de correction. */
const UNITES = ['MΩ', 'kW', 'Ω', 'V', 'A'];
const RE_VALEUR = /(\d+(?:[.,]\d+)?)\s?(MΩ|kW|Ω|V|A)(?![\wÀ-ÿ])/g;

interface ValeurCalculee { unit: string; min: number; max: number }

/** La valeur citée correspond-elle à une mesure réellement calculée ? */
function valeurVerifiee(valeur: number, unite: string, calculees: ValeurCalculee[]): boolean {
  return calculees.some((c) => c.unit === unite && valeur >= c.min && valeur <= c.max);
}

/* ---------------------------------------------------------------- vérification */

/**
 * Reconstruit, corrige et contrôle le TP produit par le modèle.
 * @param resultat dossier et maquette relus (`lirePedagogieOutil` + `lireMaquetteOutil`)
 * @param items appareils disponibles, par clé (catalogue de base + bibliothèque chargée)
 */
export function verifier(
  resultat: ResultatGeneration,
  items: Record<string, CatalogueItem>,
  options: OptionsVerification = {},
): ResultatVerification {
  const anomalies: Anomalie[] = [];
  const corrections: string[] = [];
  const signale = (chemin: string, message: string, gravite: Anomalie['gravite'] = 'bloquante') => {
    anomalies.push({ chemin, message, gravite });
  };

  const { maquette, pedagogie } = resultat;

  /* ---------------------------------------------------------- 1. appareils posés */
  const vus = new Set<string>();
  const slots: Slot[] = [];
  maquette.slots.forEach((s, i) => {
    if (!items[s.key]) {
      signale(`maquette.slots[${i}].key`, `L’appareil « ${s.rep ?? s.id} » utilise une clé inconnue du catalogue : « ${s.key} ». Choisis une clé de la liste fournie.`);
      return;
    }
    if (vus.has(s.id)) {
      signale(`maquette.slots[${i}].id`, `Deux appareils portent le même identifiant « ${s.id} ».`);
      return;
    }
    vus.add(s.id);
    slots.push(s);
  });
  if (slots.length < maquette.slots.length) {
    corrections.push(`${maquette.slots.length - slots.length} appareil(s) retiré(s) de la platine : clé inconnue ou identifiant en double.`);
  }

  /* ---------------------------------------------------------- 2. squelette du TP */
  const titre = (maquette.titre ?? pedagogie.activites[0]?.titre ?? '').trim();
  const situation = (maquette.situation ?? pedagogie.activites[0]?.contexte ?? '').trim();
  const base = emptyTp(slug(titre) || 'tp-genere', maquette.scene);

  const def: TpDefinition = {
    ...base,
    title: titre,
    level: '',
    family: maquette.scene,
    scene: maquette.scene,
    annex: maquette.annex,
    summary: (maquette.resume ?? pedagogie.objectifs.join(' ')).trim(),
    situation,
    plaque: maquette.plaque ?? {},
    cahierDesCharges: maquette.cahierDesCharges ?? [],
    slots,
    postes: [],
    liaisons: [],
    nets: {},
    mesures: [],
    faults: [],
    quiz: pedagogie.quiz,
    motor: maquette.motor,
    station: maquette.scene === 'ind',
    hasMotor: maquette.motor !== null,
    playable: false,
    ...(options.diploma ? { diplomas: [options.diploma] } : {}),
  };

  /* ------------------------------------------------------------ 3. liaisons */
  const bornes = new Set(terminalsOf(def, items).map((t) => t.id));
  const liaisons: Liaison[] = [];
  maquette.liaisons.forEach((l, i) => {
    const manquantes = [l.a, l.b].filter((end) => !bornes.has(end));
    if (manquantes.length) {
      signale(
        `maquette.liaisons[${i}]`,
        `La liaison ${l.a} → ${l.b} pointe vers une borne qui n’existe pas : ${manquantes.join(', ')}. Vérifie le repère de l’appareil et le numéro de borne.`,
      );
      return;
    }
    liaisons.push(l);
  });
  def.liaisons = liaisons;
  if (liaisons.length < maquette.liaisons.length) {
    corrections.push(`${maquette.liaisons.length - liaisons.length} liaison(s) retirée(s) : extrémité inexistante.`);
  }

  /* ------------------------------------------------- 4. table des réseaux (toujours déduite) */
  def.nets = deriveNets(def);
  corrections.push('Table des réseaux (`nets`) recalculée à partir des liaisons par le moteur.');

  /* ------------------------------------------------------------- 5. postes */
  const postes: Poste[] = [];
  maquette.postes.forEach((p, i) => {
    const bonnes = p.options.filter((o) => o.ok === true).length;
    if (bonnes !== 1) {
      signale(`maquette.postes[${i}]`, `Le poste « ${p.name} » doit avoir exactement une bonne référence (il en a ${bonnes}).`);
      return;
    }
    if (p.options.some((o) => !o.why.trim())) {
      signale(`maquette.postes[${i}]`, `Le poste « ${p.name} » a une option sans justification.`, 'avertissement');
    }
    const slotDuPoste = slots.find((s) => s.id === p.id);
    const options = p.options.map((o) => {
      if (items[o.key]) return o;
      if (slotDuPoste) {
        corrections.push(`Poste « ${p.name} » : clé d’illustration « ${o.key} » remplacée par celle de l’appareil posé (« ${slotDuPoste.key} »).`);
        return { ...o, key: slotDuPoste.key };
      }
      signale(`maquette.postes[${i}]`, `Le poste « ${p.name} » propose une clé d’appareil inconnue : « ${o.key} ».`);
      return o;
    });
    postes.push({ ...p, options });
  });
  def.postes = postes;

  /* ------------------------------------------------------------- 6. pannes */
  const faults: Fault[] = [];
  maquette.pannes.forEach((id, i) => {
    if (!panneConnue(id)) {
      signale(
        `maquette.pannes[${i}]`,
        `La panne « ${id} » n’existe pas dans le simulateur. Pannes disponibles : ${PANNES.map((p) => p.id).join(', ')}.`,
      );
      return;
    }
    const p = panneParId(id);
    if (p && !faults.some((f) => f.id === p.id)) faults.push({ id: p.id, title: p.titre, symptom: p.symptome, fix: p.fix });
  });
  def.faults = faults;
  if (faults.length < maquette.pannes.length) {
    corrections.push(`${maquette.pannes.length - faults.length} panne(s) retirée(s) : identifiant hors de la liste du simulateur.`);
  }

  /* ---------------------------------------------- 7. mesures : RÈGLE R1, valeurs calculées */
  const mesures: ExpectedMeasure[] = [];
  const calculees: ValeurCalculee[] = [];
  maquette.mesures.forEach((m, i) => {
    for (const end of [m.a, m.b]) {
      if (end && !bornes.has(end)) {
        signale(`maquette.mesures[${i}]`, `La mesure « ${m.title} » pointe vers une borne inexistante : ${end}.`);
        return;
      }
    }
    let pince: ClampWire | null = null;
    if (m.wire) {
      pince = pinceDe(m.wire, def.liaisons);
      if (!pince) {
        signale(`maquette.mesures[${i}]`, `La mesure « ${m.title} » demande de serrer la pince sur une liaison qui n’existe pas : ${m.wire}.`);
        return;
      }
    } else if (m.instrument !== 'tach' && (!m.a || !m.b)) {
      signale(`maquette.mesures[${i}]`, `La mesure « ${m.title} » n’indique pas ses deux bornes.`);
      return;
    }

    const sim = simPourMesure(m, def);
    const lecture = read(def, sim, m.instrument, m.dial, { r: m.a ?? null, k: m.b ?? null }, pince);
    if (lecture.value === null || !Number.isFinite(lecture.value)) {
      signale(
        `maquette.mesures[${i}]`,
        `La mesure « ${m.title} » n’est pas calculable par le simulateur (${lecture.display || 'aucune lecture'}) : elle a été retirée. Choisis d’autres bornes ou un autre calibre.`,
      );
      return;
    }
    const [min, max] = fourchette(lecture.value, m.unit, m.dial);
    mesures.push({ ...m, min, max });
    calculees.push({ unit: m.unit, min, max });
  });
  def.mesures = mesures;
  if (mesures.length) {
    corrections.push(`Fourchettes min / max écrites par le simulateur pour ${mesures.length} mesure(s).`);
  }

  /* ------------------------------------------------- 8. codes de compétences */
  const referentiel = options.diploma ? COMPETENCES[options.diploma] ?? [] : [];
  const connus = new Set(
    referentiel.length
      ? referentiel.map((c) => c.code)
      : Object.values(COMPETENCES).flat().map((c) => c.code),
  );
  const codesRetenus: string[] = [];
  pedagogie.criteres.forEach((c, i) => {
    if (!connus.has(c.code)) {
      signale(
        `pedagogie.criteres[${i}].code`,
        `Le code de compétence « ${c.code} » n’existe pas dans le référentiel${options.diploma ? ' du diplôme visé' : ''}. Utilise un code de la liste fournie.`,
      );
      return;
    }
    if (c.etape < 0 || c.etape > 10) {
      signale(`pedagogie.criteres[${i}].etape`, `Le critère « ${c.critere} » vise une étape hors du parcours (0 à 10).`, 'avertissement');
    }
    if (!codesRetenus.includes(c.code)) codesRetenus.push(c.code);
  });
  def.competences = codesRetenus.map((code) => {
    const c = referentiel.find((x) => x.code === code) ?? Object.values(COMPETENCES).flat().find((x) => x.code === code);
    return c ? `${c.code} ${c.label}` : code;
  });

  /* ------------------------------------ 9. valeurs numériques des corrections */
  pedagogie.activites.forEach((a, i) => {
    for (const [champ, texte] of [['correction', a.correction], ['securite', a.securite ?? '']] as const) {
      RE_VALEUR.lastIndex = 0;
      let trouve: RegExpExecArray | null = RE_VALEUR.exec(texte);
      while (trouve !== null) {
        const valeur = Number(trouve[1].replace(',', '.'));
        const unite = trouve[2];
        if (!valeurVerifiee(valeur, unite, calculees)) {
          signale(
            `pedagogie.activites[${i}].${champ}`,
            `Valeur non vérifiée : « ${trouve[0]} » ne correspond à aucune mesure calculée par le simulateur. Décris le geste de mesure, pas la valeur.`,
          );
        }
        trouve = RE_VALEUR.exec(texte);
      }
    }
  });

  /* ------------------------------------------- 10. contrôles du studio (réutilisés) */
  const dejaDit = new Set(anomalies.map((a) => a.message));
  for (const message of checkTp(def, items)) {
    if (!dejaDit.has(message)) signale('maquette', message);
  }
  def.playable = isPlayable(def, items) && !aDesBloquantes(anomalies);
  if (!def.playable) {
    signale('maquette', 'Le TP n’est pas jouable en l’état : corrige les anomalies bloquantes avant de le proposer aux élèves.', 'avertissement');
  }

  return { def, anomalies, corrections };
}

/* ------------------------------------------------ portions fautives (relance) */

/** Valeur pointée par un chemin « maquette.liaisons[3].a », ou `undefined`. */
function valeurAuChemin(racine: unknown, chemin: string): unknown {
  let courant: unknown = racine;
  for (const partie of chemin.split('.')) {
    const m = /^([A-Za-zÀ-ÿ]+)(?:\[(\d+)\])?$/.exec(partie);
    if (!m || courant === null || typeof courant !== 'object') return undefined;
    courant = (courant as Record<string, unknown>)[m[1]];
    if (m[2] !== undefined) {
      if (!Array.isArray(courant)) return undefined;
      courant = courant[Number(m[2])];
    }
  }
  return courant;
}

/** Extraits de la réponse du modèle correspondant aux anomalies, pour la relance. */
export function portionsFautives(
  resultat: ResultatGeneration,
  anomalies: Anomalie[],
  limite = 12,
): { chemin: string; extrait: string }[] {
  const vus = new Set<string>();
  const out: { chemin: string; extrait: string }[] = [];
  for (const a of anomalies) {
    if (a.gravite !== 'bloquante') continue;
    const chemin = a.chemin;
    if (vus.has(chemin) || out.length >= limite) continue;
    vus.add(chemin);
    const valeur = valeurAuChemin(resultat, chemin);
    if (valeur === undefined) continue;
    const extrait = JSON.stringify(valeur);
    out.push({ chemin, extrait: extrait.length > 400 ? `${extrait.slice(0, 400)}…` : extrait });
  }
  return out;
}

/** Y a-t-il de quoi refuser la génération ? */
export const aDesBloquantes = (anomalies: Anomalie[]): boolean =>
  anomalies.some((a) => a.gravite === 'bloquante');

export { UNITES as UNITES_SURVEILLEES };
