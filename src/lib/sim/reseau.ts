/**
 * Scène « courant faible » — moteur PUR (sans React) des TP `kind: 'reseau'`.
 *
 * Un réseau local ne se mesure pas au voltmètre : il se VÉRIFIE par ce qu'il répond. Ce
 * module rend donc, pour un état donné de l'installation (armoire alimentée ou non, liaisons
 * posées, adresse de l'automate, panne éventuelle), ce que verrait un technicien :
 *   · la réponse d'un `ping` depuis le poste de la loge (4 réponses, délai dépassé, hôte
 *     injoignable, défaillance générale), `ipconfig /all`, `arp -a`, un ping par nom ;
 *   · la LED de débit d'un port du switch (éteinte, 100 Mbit/s, 1 Gbit/s) ;
 *   · la tension PoE aux bornes d'une prise de caméra, paire par paire ;
 *   · le verdict d'un testeur de câble sur un lien (8 brins, droit / croisé / défaut) ;
 *   · l'écran de supervision de la loge (caméras, éclairage KNX, portail, onduleur).
 *
 * Une panne ne raconte pas son symptôme : elle change l'ÉTAT (adresse restée à l'usine,
 * port sans PoE, paire coupée, convertisseur éteint, adresse en doublon, DNS absent) et c'est
 * l'observation qui en découle. `audit-diagnostic` vérifie que chaque panne change au moins
 * une observation et que deux pannes ne se confondent jamais.
 *
 * Topologie (DTR 1) : le switch PoE+ dessert, par ses ports 1 à 8, le panneau de brassage
 * (cordons 0,5 m `SW.n → PP.n`) dont l'arrière (`PPR.n`) repart en câble F/UTP cat. 6 vers la
 * prise RJ45 de chaque équipement ; le port 9 va au routeur, le port 10 au convertisseur
 * fibre de l'armoire, relié par 150 m de fibre monomode au convertisseur de la loge, puis au
 * PC de supervision.
 */
import type { AttemptState, Liaison, ReseauDef, ReseauEquipement, ReseauIp, TpDefinition } from '../types';

/* ------------------------------------------------------------ généralités */

export const aReseau = (tp: Pick<TpDefinition, 'kind' | 'reseau'>): boolean => tp.kind === 'reseau' && !!tp.reseau;

const cle = (a: string, b: string): string => [a, b].sort().join('~');

/** Liaisons que l'élève pose (hors installateur). */
const aPoser = (tp: Pick<TpDefinition, 'liaisons'>): Liaison[] => tp.liaisons.filter(l => !l.prewired);

const posee = (st: Pick<AttemptState, 'wires'>, a: string, b: string): boolean =>
  st.wires.some(w => cle(w.a, w.b) === cle(a, b));

/** Famille d'une liaison : fibre, câble F/UTP (arrière du panneau → prise), cordon de brassage. */
export function familleLiaison(l: { a: string; b: string; net: string }): 'fibre' | 'cable' | 'cordon' {
  if (l.net === 'FO') return 'fibre';
  if (l.a.startsWith('PPR.') || l.b.startsWith('PPR.')) return 'cable';
  return 'cordon';
}

export const LIBELLE_FAMILLE = {
  fibre: 'Fibre monomode 150 m',
  cable: 'Câble F/UTP cat. 6',
  cordon: 'Cordon F/UTP 0,5 m',
} as const;

/* ------------------------------------------------------------ armoire 19" */

/** U occupés par un élément posé à `debut`. */
const us = (debut: number, u: number): number[] => Array.from({ length: u }, (_, i) => debut + i);

/** Élément de l'armoire qui occupe le U `n`, s'il y en a un. */
export function occupant(def: ReseauDef, rack: Record<string, number>, n: number): string | null {
  for (const it of def.rack) {
    const d = rack[it.id];
    if (d != null && us(d, it.u).includes(n)) return it.id;
  }
  return null;
}

/**
 * Pose d'un élément à partir du U `debut` : acceptée, ou refusée AVEC sa raison. L'ordre
 * suit le corrigé D.2.1 ; seules les deux réserves 2 U, identiques, sont interchangeables.
 */
export function placerRack(
  def: ReseauDef, rack: Record<string, number>, id: string, debut: number,
): { ok: boolean; raison: string } {
  const it = def.rack.find(r => r.id === id);
  if (!it) return { ok: false, raison: 'Élément inconnu.' };
  if (rack[id] != null) return { ok: false, raison: `${it.label} est déjà posé.` };
  if (debut < 1 || debut + it.u - 1 > def.rackU) {
    return { ok: false, raison: `${it.label} (${it.u} U) dépasse de l'armoire : il n'y a que ${def.rackU} U.` };
  }
  const pris = us(debut, it.u).map(n => occupant(def, rack, n)).filter(Boolean);
  if (pris.length) return { ok: false, raison: 'Emplacement déjà occupé.' };
  if (!it.debut.includes(debut)) {
    return { ok: false, raison: raisonOrdre(def, it.id) };
  }
  return { ok: true, raison: `${it.label} posé en U${debut}${it.u > 1 ? `–U${debut + it.u - 1}` : ''}.` };
}

/** Pourquoi cet élément va là (message d'erreur de pose, jamais la position toute faite). */
function raisonOrdre(def: ReseauDef, id: string): string {
  switch (id) {
    case 'obt': return 'La plaque obturatrice ferme le haut de l’armoire : c’est le premier U.';
    case 'pdu': return 'Le PDU se place en tête, juste sous l’obturateur : son cordon descend sans croiser les cordons de brassage.';
    case 'pf1':
    case 'pf2': return 'Un passe-fils se pose de part et d’autre du switch : il guide les cordons vers le panneau.';
    case 'sw': return 'Le switch est encadré par deux passe-fils, au-dessus du panneau de brassage.';
    case 'pp': return 'Le panneau de brassage se pose sous le second passe-fils : cordons de 0,5 m jusqu’au switch.';
    case 'tab': return 'La tablette du NAS (2 U) se pose entre les deux réserves, en bas : le poids va en bas de l’armoire.';
    case 'res1':
    case 'res2': return 'Les réserves 2 U encadrent la tablette du NAS : l’une sous le panneau, l’autre en pied d’armoire.';
    default: return `Cet emplacement ne convient pas à cet élément (voir D.2.1, ${def.rackU} U).`;
  }
}

export const rackComplet = (def: ReseauDef, st: Pick<AttemptState, 'reseau'>): boolean =>
  def.rack.every(r => st.reseau?.rack?.[r.id] != null);

/* ------------------------------------------------------------ connecteur T568B */

export const t568Complet = (def: ReseauDef, st: Pick<AttemptState, 'reseau'>): boolean =>
  def.t568b.every((c, i) => st.reseau?.t568?.[String(i + 1)] === c);

/** Câblage complet : toutes les liaisons du synoptique ET le connecteur T568B. */
export function cablageReseauComplet(tp: TpDefinition, st: Pick<AttemptState, 'wires' | 'reseau'>): boolean {
  const req = aPoser(tp);
  return req.length > 0 && req.every(l => posee(st, l.a, l.b)) && !!tp.reseau && t568Complet(tp.reseau, st);
}

/* ------------------------------------------------------------ paramétrage IP */

export const LIBELLE_IP: Record<keyof ReseauIp, string> = {
  ip: 'Adresse IP', masque: 'Masque de sous-réseau', passerelle: 'Passerelle', dns: 'DNS principal',
};

/** Réglages de l'automate : ceux appliqués par l'élève, sinon ceux d'usine. */
export const ipAutomate = (def: ReseauDef, st: Pick<AttemptState, 'reseau'>): ReseauIp => st.reseau?.ip ?? def.automate.defaut;

export function ipErreurs(def: ReseauDef, ip: ReseauIp): (keyof ReseauIp)[] {
  return (Object.keys(LIBELLE_IP) as (keyof ReseauIp)[]).filter(k => ip[k].trim() !== def.automate.attendu[k]);
}

/** Nombre de réglages de mise en service : 4 champs IP + câble de paramétrage + câble de service. */
export const RESEAU_REGLAGES = 6;

/** Réglages non conformes (sur 6), pour la note de l'étape. */
export function reseauErreursMes(tp: TpDefinition, st: Pick<AttemptState, 'reseau'>): number {
  const def = tp.reseau;
  if (!def) return 0;
  const ip = st.reseau?.ip ? ipErreurs(def, st.reseau.ip).length : 4;
  return ip + (st.reseau?.cableParam === 'croise' ? 0 : 1) + (st.reseau?.cableService === 'droit' ? 0 : 1);
}

/** Mise en service réseau conforme (vrai pour tout TP qui n'est pas un TP réseau). */
export function reseauMesConforme(tp: Pick<TpDefinition, 'kind' | 'reseau'>, st: Pick<AttemptState, 'reseau'>): boolean {
  if (!aReseau(tp)) return true;
  return reseauErreursMes(tp as TpDefinition, st) === 0 && st.reseau?.pingOk === true;
}

/* ------------------------------------------------------------ état du réseau */

/** Ce qui détermine toutes les observations. */
export interface EtatReseau {
  /** PDU fermé : switch, NAS et convertisseur de l'armoire alimentés. */
  enService: boolean;
  /** Liaisons posées (clés `cle(a, b)`). */
  poses: Set<string>;
  /** Réglages de l'automate. */
  ipApi: ReseauIp;
  /** Panne active. */
  panne: string | null;
  /**
   * Automate pas encore raccordé à sa prise RJ45 (il est encore relié au PC de paramétrage
   * par le câble croisé) : il ne répond pas depuis la loge.
   */
  apiDebranche?: boolean;
}

/** État de l'installation à partir de la tentative. */
export function etatReseau(tp: TpDefinition, st: Pick<AttemptState, 'wires' | 'reseau' | 'fault' | 'fixed'>, enService: boolean): EtatReseau {
  const def = tp.reseau!;
  const poses = new Set<string>([
    ...tp.liaisons.filter(l => l.prewired).map(l => cle(l.a, l.b)),
    ...st.wires.map(w => cle(w.a, w.b)),
  ]);
  return {
    enService, poses, ipApi: ipAutomate(def, st), panne: st.fixed ? null : st.fault,
    apiDebranche: st.reseau?.cableService !== 'droit',
  };
}

/** Installation de référence (toutes liaisons posées, automate paramétré), avec une panne éventuelle. */
export function etatReference(tp: TpDefinition, panne: string | null): EtatReseau {
  return {
    enService: true,
    poses: new Set(tp.liaisons.map(l => cle(l.a, l.b))),
    ipApi: tp.reseau!.automate.attendu,
    panne,
  };
}

const eqOf = (def: ReseauDef, id: string): ReseauEquipement | undefined => def.equipements.find(e => e.id === id);

/** Adresse EFFECTIVE d'un équipement (l'automate a les réglages appliqués ; la panne peut en changer). */
export function ipEffective(def: ReseauDef, e: EtatReseau, id: string): string | null {
  if (id === def.automate.id) return e.panne === 'api-ip' ? def.automate.defaut.ip : e.ipApi.ip.trim();
  if (id === 'GW' && e.panne === 'ip-doublon') return eqOf(def, 'NAS')?.ip ?? null;
  return eqOf(def, id)?.ip ?? null;
}

const lien = (e: EtatReseau, a: string, b: string) => e.poses.has(cle(a, b));

/** Le lien physique switch ↔ équipement est-il continu (cordon + câble, ou cordon direct) ? */
function lienPhysique(def: ReseauDef, e: EtatReseau, eq: ReseauEquipement): boolean {
  const n = eq.port;
  if (n == null) return false;
  if (eq.id === 'RTR') return lien(e, `SW.${n}`, 'RTR.LAN');
  if (eq.id === 'CVA') return lien(e, `SW.${n}`, 'CVA.RJ');
  if (eq.id === def.automate.id && e.apiDebranche) return false;
  return lien(e, `SW.${n}`, `PP.${n}`) && lien(e, `PPR.${n}`, `${eq.id}.RJ`);
}

/** L'équipement est-il sous tension ? (caméras : par le PoE du switch) */
function alimente(def: ReseauDef, e: EtatReseau, eq: ReseauEquipement): boolean {
  // PDU ouvert : le switch est éteint, plus aucun port ne s'établit (voir `lienActif`)
  if (eq.id === 'CVA' && e.panne === 'fibre') return false;
  if (eq.poe) return lienPhysique(def, e, eq) && !(e.panne === 'poe-cam3' && eq.id === 'CAM3');
  return true;
}

/** Liaison établie entre le switch et l'équipement (LED du port allumée). */
function lienActif(def: ReseauDef, e: EtatReseau, eq: ReseauEquipement): boolean {
  return e.enService && lienPhysique(def, e, eq) && alimente(def, e, eq);
}

/** LED de débit du port `n` du switch : 0 (éteinte), 100 ou 1000 Mbit/s. */
export function ledPort(def: ReseauDef, e: EtatReseau, n: number): 0 | 100 | 1000 {
  const eq = def.equipements.find(x => x.port === n);
  if (!eq || !lienActif(def, e, eq)) return 0;
  // paire marron coupée : le gigabit exige les 4 paires, le port se replie à 100 Mbit/s
  if (e.panne === 'paire-cam2' && eq.id === 'CAM2') return 100;
  return 1000;
}

/** Le poste de la loge atteint-il le switch (cordon, convertisseurs, fibre) ? */
function logeRelie(def: ReseauDef, e: EtatReseau): boolean {
  const cva = eqOf(def, 'CVA');
  return lien(e, `${def.poste.id}.RJ`, 'CVL.RJ') && lien(e, 'CVL.FO', 'CVA.FO') && !!cva && lienActif(def, e, cva);
}

/** Les équipements qui répondent à `ip` sur le réseau (en principe un seul). */
function repondants(def: ReseauDef, e: EtatReseau, ip: string): ReseauEquipement[] {
  return def.equipements.filter(eq => {
    if (eq.id === def.poste.id || eq.ip == null && eq.id !== def.automate.id) return false;
    if (ipEffective(def, e, eq.id) !== ip) return false;
    if (eq.id === def.automate.id) {
      // l'automate ne répond qu'à un poste de SON sous-réseau
      const m = e.panne === 'api-ip' ? def.automate.defaut.masque : e.ipApi.masque.trim();
      if (!memeReseau(ip, '192.168.0.10', m)) return false;
    }
    return lienActif(def, e, eq);
  });
}

const octets = (ip: string): number[] | null => {
  const p = ip.trim().split('.').map(Number);
  return p.length === 4 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
};

/** Deux adresses sont-elles dans le même réseau, pour ce masque ? */
export function memeReseau(a: string, b: string, masque: string): boolean {
  const x = octets(a); const y = octets(b); const m = octets(masque);
  if (!x || !y || !m) return false;
  return x.every((v, i) => (v & m[i]) === (y[i] & m[i]));
}

/* ------------------------------------------------------------ commandes de la loge */

export type ResultatPing = 'ok' | 'timeout' | 'injoignable' | 'echec';

const PROMPT = 'C:\\Users\\loge>';

/** `ping <ip>` depuis le poste de la loge (192.168.0.10 / 255.255.255.0, passerelle .1). */
export function ping(def: ReseauDef, e: EtatReseau, ip: string): { r: ResultatPing; texte: string } {
  const cible = ip.trim();
  const tete = `${PROMPT}ping ${cible}\n\nEnvoi d’une requête 'Ping'  ${cible} avec 32 octets de données :\n`;
  if (!logeRelie(def, e)) {
    return { r: 'echec', texte: `${tete}${'Échec de la transmission. Défaillance générale.\n'.repeat(4)}\nStatistiques Ping pour ${cible}:\n    Paquets : envoyés = 4, reçus = 0, perdus = 4 (perte 100%),\n\n${PROMPT}` };
  }
  if (!memeReseau(cible, '192.168.0.10', '255.255.255.0')) {
    // hors du sous-réseau : le paquet part vers la passerelle, qui ne connaît pas la destination
    const rtr = eqOf(def, 'RTR');
    const via = rtr && lienActif(def, e, rtr) ? '192.168.0.1' : '192.168.0.10';
    return { r: 'injoignable', texte: `${tete}${`Réponse de ${via} : Impossible de joindre l’hôte de destination.\n`.repeat(4)}\nStatistiques Ping pour ${cible}:\n    Paquets : envoyés = 4, reçus = 4, perdus = 0 (perte 0%),\n\n${PROMPT}` };
  }
  const rep = repondants(def, e, cible);
  if (!rep.length) {
    return { r: 'timeout', texte: `${tete}${'Délai d’attente de la demande dépassé.\n'.repeat(4)}\nStatistiques Ping pour ${cible}:\n    Paquets : envoyés = 4, reçus = 0, perdus = 4 (perte 100%),\n\n${PROMPT}` };
  }
  const ttl = rep[0].id === def.automate.id ? 64 : 128;
  return { r: 'ok', texte: `${tete}${`Réponse de ${cible} : octets=32 temps<1ms TTL=${ttl}\n`.repeat(4)}\nStatistiques Ping pour ${cible}:\n    Paquets : envoyés = 4, reçus = 4, perdus = 0 (perte 0%),\nDurée approximative des boucles en millisecondes :\n    Minimum = 0ms, Maximum = 1ms, Moyenne = 0ms\n\n${PROMPT}` };
}

/** Nom d'hôte public utilisé pour tester la résolution de noms (DNS). */
export const HOTE_PUBLIC = 'www.education.gouv.fr';

/** `ping <nom>` : exige le DNS du poste ET une sortie par le routeur. */
export function pingNom(def: ReseauDef, e: EtatReseau): { r: ResultatPing; texte: string } {
  if (e.panne === 'dns') {
    return { r: 'echec', texte: `${PROMPT}ping ${HOTE_PUBLIC}\nLa requête Ping n’a pas pu trouver l’hôte ${HOTE_PUBLIC}. Vérifiez le nom et essayez à nouveau.\n\n${PROMPT}` };
  }
  const rtr = eqOf(def, 'RTR');
  if (!logeRelie(def, e) || !rtr || !lienActif(def, e, rtr)) {
    return { r: 'echec', texte: `${PROMPT}ping ${HOTE_PUBLIC}\nLa requête Ping n’a pas pu trouver l’hôte ${HOTE_PUBLIC}. Vérifiez le nom et essayez à nouveau.\n\n${PROMPT}` };
  }
  const ip = '185.75.143.24';
  return { r: 'ok', texte: `${PROMPT}ping ${HOTE_PUBLIC}\n\nEnvoi d’une requête 'ping' sur ${HOTE_PUBLIC} [${ip}] avec 32 octets de données :\n${`Réponse de ${ip} : octets=32 temps=14 ms TTL=56\n`.repeat(4)}\nStatistiques Ping pour ${ip}:\n    Paquets : envoyés = 4, reçus = 4, perdus = 0 (perte 0%),\n\n${PROMPT}` };
}

/** `ipconfig /all` du poste de la loge (DTR 25). */
export function ipconfig(def: ReseauDef, e: EtatReseau): string {
  const dns = e.panne === 'dns' ? [] : def.poste.dns;
  const lignesDns = dns.length
    ? `   Serveurs DNS. . . . . . . . . . . . . : ${dns[0]}\n${dns.slice(1).map(d => `                                           ${d}\n`).join('')}`
    : '';
  return `${PROMPT}ipconfig /all\n\nConfiguration IP de Windows\n\n   Nom de l’hôte . . . . . . . . . . : ${def.poste.nom}\n   Suffixe DNS principal . . . . . . :\n   Type de nœud. . . . . . . . . . . : Hybride\n   Routage IP activé . . . . . . . . : Non\n   Proxy WINS activé . . . . . . . . : Non\n\nCarte Ethernet Ethernet :\n\n   Description. . . . . . . . . . . . . . : ${def.poste.description}\n   Adresse physique . . . . . . . . . . . : ${def.poste.mac}\n   DHCP activé. . . . . . . . . . . . . . : Non\n   Configuration automatique activée. . . : Oui\n   Adresse IPv4. . . . . . . . . . . . . .: 192.168.0.10\n   Masque de sous-réseau. . . . . . . . . : 255.255.255.0\n   Passerelle par défaut. . . . . . . . . : 192.168.0.1\n${lignesDns}   NetBIOS sur Tcpip. . . . . . . . . . . : Activé\n\n${PROMPT}`;
}

/** `arp -a` après un balayage : adresse IP → adresse physique de l'équipement qui a répondu. */
export function arp(def: ReseauDef, e: EtatReseau): string {
  const lignes: string[] = [];
  if (logeRelie(def, e)) {
    for (const eq of def.equipements) {
      if (!eq.ip || eq.id === def.poste.id) continue;
      const rep = repondants(def, e, eq.ip);
      // doublon : la table garde la DERNIÈRE réponse reçue, celle de l'intrus
      const qui = rep[rep.length - 1];
      if (qui) lignes.push(`  ${eq.ip.padEnd(22)}${(qui.mac ?? '—').padEnd(22)}dynamique`);
    }
  }
  return `${PROMPT}arp -a\n\nInterface : 192.168.0.10 --- 0x7\n  Adresse Internet      Adresse physique      Type\n${lignes.join('\n')}${lignes.length ? '\n' : '  (aucune entrée)\n'}\n${PROMPT}`;
}

/* ------------------------------------------------------------ PoE, testeur */

/** Paires mesurables à la prise d'une caméra. */
export const PAIRES_POE = [
  { id: '12-36', label: 'paire 1-2 (+) / paire 3-6 (−)' },
  { id: '45-78', label: 'paire 4-5 / paire 7-8' },
  { id: '12-45', label: 'paire 1-2 / paire 4-5' },
] as const;

/** Tension continue lue à la prise d'une caméra (PoE mode A : paires 1-2 et 3-6). */
export function tensionPoe(def: ReseauDef, e: EtatReseau, cam: string, paires: string): number {
  const eq = eqOf(def, cam);
  if (!eq?.poe || !e.enService || !lienPhysique(def, e, eq)) return 0;
  if (e.panne === 'poe-cam3' && cam === 'CAM3') return 0;
  return paires === '12-36' ? 48.3 : 0;
}

/** Verdict du testeur de câble sur un lien : état de chacun des 8 brins. */
export interface VerdictTesteur { brins: ('ok' | 'ouvert')[]; verdict: 'droit' | 'défaut' | 'absent'; continus: number }

/** Liens que le testeur peut contrôler : cordons et câbles cuivre posés. */
export function liensTestables(tp: TpDefinition): Liaison[] {
  return tp.liaisons.filter(l => l.net === 'ETH');
}

export function testeur(tp: TpDefinition, e: EtatReseau, a: string, b: string): VerdictTesteur {
  if (!e.poses.has(cle(a, b))) return { brins: Array(8).fill('ouvert'), verdict: 'absent', continus: 0 };
  const brins: ('ok' | 'ouvert')[] = Array(8).fill('ok');
  if (e.panne === 'paire-cam2' && cle(a, b) === cle('PPR.6', 'CAM2.RJ')) { brins[6] = 'ouvert'; brins[7] = 'ouvert'; }
  const continus = brins.filter(x => x === 'ok').length;
  return { brins, verdict: continus === 8 ? 'droit' : 'défaut', continus };
}

/* ------------------------------------------------------------ supervision */

export interface VueSupervision {
  enLigne: boolean;
  cameras: { id: string; nom: string; visible: boolean }[];
  nas: boolean;
  knx: boolean;
  portail: boolean;
  onduleur: boolean;
}

/** Ce que l'écran de supervision de la loge affiche. */
export function supervision(def: ReseauDef, e: EtatReseau): VueSupervision {
  const relie = logeRelie(def, e);
  const vu = (id: string) => {
    const ip = eqOf(def, id)?.ip;
    // la supervision contacte chaque équipement à son adresse du DTR 1 et vérifie son identité
    return relie && !!ip && repondants(def, e, ip).some(x => x.id === id);
  };
  const cameras = def.equipements.filter(x => x.poe).map(c => ({ id: c.id, nom: c.nom, visible: vu(c.id) }));
  return {
    enLigne: relie,
    cameras,
    nas: vu('NAS'),
    knx: vu('GW'),
    portail: vu(def.automate.id),
    onduleur: vu('IMEON'),
  };
}

/* ------------------------------------------------------------ observations (dépannage) */

export interface Observation {
  id: string;
  /** Libellé de la vérification : « ping 192.168.0.4 », « LED du port 6 ». */
  label: string;
  groupe: 'Terminal de la loge' | 'Switch' | 'Multimètre' | 'Testeur de câble' | 'Supervision';
}

/** Toutes les vérifications proposées à l'étape de dépannage. */
export function observations(tp: TpDefinition): Observation[] {
  const def = tp.reseau!;
  const o: Observation[] = [];
  for (const eq of def.equipements) {
    if (eq.ip && eq.id !== def.poste.id) o.push({ id: `ping:${eq.id}`, label: `ping ${eq.ip} (${eq.nom})`, groupe: 'Terminal de la loge' });
  }
  o.push({ id: 'ping-nom', label: `ping ${HOTE_PUBLIC}`, groupe: 'Terminal de la loge' });
  o.push({ id: 'ipconfig', label: 'ipconfig /all', groupe: 'Terminal de la loge' });
  o.push({ id: 'arp', label: 'arp -a (après un ping de chaque équipement)', groupe: 'Terminal de la loge' });
  for (const eq of def.equipements) {
    if (eq.port != null) o.push({ id: `led:${eq.port}`, label: `LED du port ${eq.port} (${eq.nom})`, groupe: 'Switch' });
  }
  for (const eq of def.equipements.filter(x => x.poe)) {
    o.push({ id: `poe:${eq.id}`, label: `V⎓ PoE à la prise de ${eq.nom} (paires 1-2 / 3-6)`, groupe: 'Multimètre' });
  }
  for (const eq of def.equipements) {
    if (eq.port != null && eq.port <= 8) o.push({ id: `lan:${eq.port}`, label: `Lien permanent du port ${eq.port} → ${eq.nom}`, groupe: 'Testeur de câble' });
  }
  o.push({ id: 'sup', label: 'Écran de supervision de la loge', groupe: 'Supervision' });
  return o;
}

/** Résultat d'une vérification : texte complet, résumé court (celui qu'on compare), conformité. */
export interface ResultatObs { texte: string; court: string }

export function observer(tp: TpDefinition, e: EtatReseau, id: string): ResultatObs {
  const def = tp.reseau!;
  const [k, arg] = id.split(':');
  if (k === 'ping') {
    const eq = eqOf(def, arg);
    const p = ping(def, e, eq?.ip ?? '');
    const court = { ok: '4 reçus, 0 perdu', timeout: 'délai d’attente dépassé', injoignable: 'hôte injoignable', echec: 'défaillance générale' }[p.r];
    return { texte: p.texte, court };
  }
  if (k === 'ping-nom') {
    const p = pingNom(def, e);
    return { texte: p.texte, court: p.r === 'ok' ? 'nom résolu, 4 reçus' : 'hôte introuvable' };
  }
  if (k === 'ipconfig') {
    const t = ipconfig(def, e);
    return { texte: t, court: /Serveurs DNS/.test(t) ? `IPv4 192.168.0.10 · DNS ${def.poste.dns.join(', ')}` : 'IPv4 192.168.0.10 · aucun serveur DNS' };
  }
  if (k === 'arp') {
    const t = arp(def, e);
    const lignes = t.split('\n').filter(l => /^\s+192\.168/.test(l)).map(l => l.trim().split(/\s+/).slice(0, 2).join(' '));
    return { texte: t, court: lignes.join(' · ') || 'aucune entrée' };
  }
  if (k === 'led') {
    const v = ledPort(def, e, Number(arg));
    const court = v === 0 ? 'LED éteinte' : v === 100 ? 'LED 100 Mbit/s (orange)' : 'LED 1 Gbit/s (verte)';
    return { texte: `Port ${arg} du switch : ${court}.`, court };
  }
  if (k === 'poe') {
    const u = tensionPoe(def, e, arg, '12-36');
    const court = `${u.toFixed(1).replace('.', ',')} V⎓`;
    return { texte: `Multimètre V⎓ à la prise de ${eqOf(def, arg)?.nom ?? arg}, paires 1-2 / 3-6 : ${court}.`, court };
  }
  if (k === 'lan') {
    const n = Number(arg);
    const eq = def.equipements.find(x => x.port === n);
    const v = testeur(tp, e, `PPR.${n}`, `${eq?.id ?? ''}.RJ`);
    const brins = v.brins.map((b, i) => `${i + 1}${b === 'ok' ? '✓' : '✗'}`).join(' ');
    const court = v.verdict === 'droit' ? '8/8 · droit' : v.verdict === 'absent' ? 'aucun lien' : `${v.continus}/8 · brins ${v.brins.map((b, i) => (b === 'ok' ? null : i + 1)).filter(Boolean).join('-')} ouverts`;
    return { texte: `Testeur sur le lien du port ${n} : ${brins} → ${court}.`, court };
  }
  // supervision
  const s = supervision(def, e);
  if (!s.enLigne) return { texte: 'Supervision : HORS LIGNE — aucun équipement joignable.', court: 'hors ligne' };
  const cams = s.cameras.map(c => `${c.nom.replace('Caméra ', 'cam ')} ${c.visible ? '✓' : '✗'}`).join(', ');
  const court = `${cams} · NAS ${s.nas ? '✓' : '✗'} · éclairage ${s.knx ? '✓' : '✗'} · portail ${s.portail ? '✓' : '✗'} · onduleur ${s.onduleur ? '✓' : '✗'}`;
  return { texte: `Supervision en ligne : ${court}.`, court };
}

/** Résultat de l'observation dans l'installation réparée, pour dire « conforme / anomalie ». */
export const conforme = (tp: TpDefinition, id: string, r: ResultatObs): boolean =>
  observer(tp, etatReference(tp, null), id).court === r.court;

/**
 * Verdict qu'impose une observation sur une hypothèse : si, avec cette panne-là, on aurait
 * lu la même chose que ce qu'on lit, l'hypothèse reste debout ; sinon elle tombe.
 */
export function verdictReseau(tp: TpDefinition, panneReelle: string | null, hypothese: string, obs: string): 'out' | 'keep' {
  const lu = observer(tp, etatReference(tp, panneReelle), obs).court;
  const prevu = observer(tp, etatReference(tp, hypothese), obs).court;
  return lu === prevu ? 'keep' : 'out';
}

/** Nombre d'hypothèses qu'une observation élimine. */
export function departageReseau(tp: TpDefinition, panneReelle: string | null, hypotheses: string[], obs: string): number {
  return hypotheses.filter(h => verdictReseau(tp, panneReelle, h, obs) === 'out').length;
}

/* ------------------------------------------------------------ mesures attendues */

/** Valeur qu'une mesure attendue du TP rend sur l'installation (audit : atteignable ?). */
export function valeurMesure(tp: TpDefinition, e: EtatReseau, m: { id: string; a?: string; b?: string; instrument: string; dial: string }): number | null {
  const def = tp.reseau!;
  if (m.instrument === 'lan' && m.a && m.b) return testeur(tp, e, m.a, m.b).continus;
  if (m.instrument === 'mm' && m.a) return tensionPoe(def, e, m.a.split('.')[0], '12-36');
  if (m.instrument === 'net' && m.dial === 'LED' && m.a) return ledPort(def, e, Number(m.a.split('.')[1]));
  if (m.instrument === 'net' && m.dial === 'ping') {
    return def.equipements.filter(x => x.ip && x.id !== def.poste.id && ping(def, e, x.ip).r === 'ok').length;
  }
  return null;
}

/* ------------------------------------------------------------ professeur virtuel */

/** Lignes de contexte propres au TP réseau, pour le professeur virtuel. */
export function contexteReseau(tp: TpDefinition, st: AttemptState): string[] {
  const def = tp.reseau;
  if (!def) return [];
  const rack = st.reseau?.rack ?? {};
  const t = st.reseau?.t568 ?? {};
  const ip = ipAutomate(def, st);
  return [
    `Armoire : ${def.rack.filter(r => rack[r.id] != null).length}/${def.rack.length} éléments posés.`,
    `Connecteur T568B (port ${def.portT568b}) : ${def.t568b.filter((c, i) => t[String(i + 1)] === c).length}/8 broches justes.`,
    `Automate (${def.automate.ref}) : IP ${ip.ip}, masque ${ip.masque}, passerelle ${ip.passerelle || '—'}, DNS ${ip.dns || '—'} ; attendu : à NE PAS donner tel quel.`,
    `Ping de l'automate depuis la loge : ${st.reseau?.pingOk ? 'réussi' : 'pas encore réussi'}.`,
  ];
}
