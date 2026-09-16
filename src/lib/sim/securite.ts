/**
 * Sécurité des mesures sous tension (NF C 18-510) — module pur (sans React).
 *
 * Avant tout relevé sur une installation SOUS TENSION, l'élève doit :
 *   1. choisir les EPI / EIS adaptés à l'opération BT (et écarter le matériel
 *      inadapté : un mauvais choix bloque la mesure) ;
 *   2. confirmer l'état du matériel — un EPI usagé ou hors validité d'essai
 *      protège mal : on ne mesure pas avec un gant fissuré.
 *
 * Tant que l'équipement n'est pas bon, la mesure est bloquée.
 */

/* --------------------------------------------------------------- équipements */

export type SecuWrong = 'hard' | 'soft';

export interface SecuEquip {
  id: string;
  icon: string;
  name: string;
  /** À quoi il sert / pourquoi on le prend (ou pas). */
  desc: string;
  /** Équipement nécessaire à l'opération : doit être coché. */
  req?: boolean;
  /** Équipement inadapté : le cocher bloque et déclenche l'explication. */
  wrong?: SecuWrong;
  /** Pourquoi ce choix est inadapté (affiché quand il est coché). */
  why?: string;
}

/** EPI + EIS proposés pour un relevé sous tension en BT. */
export const SECU_EQUIP: SecuEquip[] = [
  { id: 'gants0', icon: '🧤', name: 'Gants isolants classe 0 (1000 V)', desc: 'adaptés à la BT, vérifiés', req: true },
  { id: 'ecran', icon: '🥽', name: 'Écran facial anti-arc', desc: 'risque de court-circuit / arc', req: true },
  { id: 'tapis', icon: '🟫', name: 'Tapis / tabouret isolant', desc: 's\'isoler du sol', req: true },
  { id: 'multi', icon: '🎛️', name: 'Multimètre CAT III/IV + pointes à capuchon', desc: 'cordons sains, protège-doigts', req: true },
  { id: 'vetements', icon: '🦺', name: 'Vêtements couvrants + chaussures de sécurité', desc: 'manches longues, non synthétique', req: true },

  { id: 'vat', icon: '🟡', name: 'VAT (vérificateur d\'absence de tension)', desc: 'sert pour le HORS tension', wrong: 'soft', why: 'Le VAT vérifie l\'ABSENCE de tension : inutile pour une mesure où la tension est présente.' },
  { id: 'cuir', icon: '🧤', name: 'Gants de manutention en cuir', desc: 'non isolants', wrong: 'hard', why: 'Des gants de manutention n\'isolent pas : danger d\'électrisation.' },
  { id: 'casque', icon: '⛑️', name: 'Casque de chantier non isolant', desc: 'protection mécanique seule', wrong: 'soft', why: 'Casque non isolant : n\'apporte pas la protection électrique attendue.' },
  { id: 'classe4', icon: '🧤', name: 'Gants isolants classe 4 (36 kV)', desc: 'pour la HT', wrong: 'soft', why: 'Surdimensionnés pour la BT : épais, peu de dextérité — on prend la classe adaptée (00 ou 0).' },
];

export const SECU_REQUIRED: string[] = SECU_EQUIP.filter((e) => e.req).map((e) => e.id);

/* ------------------------------------------------------ contrôle de l'état */

export interface SecuCheck { id: string; title: string; hint: string }

/**
 * Contrôle avant emploi : repérer un équipement usagé. Les gants et le tapis
 * isolants n'ont PAS de date de péremption, mais une validité d'essai/de
 * vérification à respecter (source : NF C 18-510, notices REGELTEX / EN 61111).
 */
export const SECU_CHECKS: SecuCheck[] = [
  { id: 'c1', title: 'Gants : contrôle visuel', hint: 'aucune coupure, déchirure, craquelure ni brûlure' },
  { id: 'c2', title: 'Gants : test d\'étanchéité à l\'air', hint: 'rouler la manchette, aucune fuite' },
  { id: 'c3', title: 'Gants : dernier essai électrique < 6 mois', hint: 'pas de péremption, mais validité de l\'essai à respecter' },
  { id: 'c4', title: 'Écran facial propre et non fissuré', hint: '' },
  { id: 'c5', title: 'Tapis : sec, propre, non percé', hint: 'et vérification diélectrique < 12 mois' },
  { id: 'c6', title: 'Multimètre CAT III/IV, cordons et capuchons sains', hint: '' },
];

/* ------------------------------------------------------------------- état */

export interface SecuState {
  /** Équipements sélectionnés (id → coché). */
  equip: Record<string, boolean>;
  /** Contrôles d'état confirmés (id → coché). */
  checks: Record<string, boolean>;
}

export const initialSecu = (): SecuState => ({ equip: {}, checks: {} });

/* --------------------------------------------------------------- verdicts */

export interface SecuVerdict {
  ok: boolean;
  /** Équipements requis pas encore cochés. */
  missing: string[];
  /** Choix inadaptés cochés (bloquants). */
  bad: SecuEquip[];
  /** Contrôles d'état pas encore confirmés. */
  pending: string[];
}

/** Le matériel est-il complet, adapté et contrôlé ? */
export function secuVerdict(secu: SecuState): SecuVerdict {
  const equip = secu.equip ?? {};
  const checks = secu.checks ?? {};
  const missing = SECU_REQUIRED.filter((id) => !equip[id]);
  const bad = SECU_EQUIP.filter((e) => e.wrong && equip[e.id]);
  const pending = SECU_CHECKS.filter((k) => !checks[k.id]).map((k) => k.id);
  return { ok: missing.length === 0 && bad.length === 0 && pending.length === 0, missing, bad, pending };
}

/** Raccourci : peut-on lever le verrou et mesurer ? */
export const secuComplete = (secu: SecuState | undefined | null): boolean =>
  !!secu && secuVerdict(secu).ok;
