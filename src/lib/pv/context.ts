/**
 * Contexte envoyé au professeur virtuel pour le parcours de dimensionnement (TP 14).
 * Il décrit l'état complet du dimensionnement et la fiche de cours ouverte par l'élève,
 * avec la consigne pédagogique : rappeler la règle, jamais la valeur.
 */

import { coursPrompt, type CoursFiche } from '../data/cours';
import { diplomaName, type Student } from '../student';
import type { TpDefinition } from '../types';
import {
  calc, checks, expectedAnswer, fr, picksOf, PV_STEPS, solarOf, type PvAnswerKey, type PvState,
} from './dimensionnement';

const ANSWER_LABEL: Record<PvAnswerKey, string> = {
  ej: 'énergie journalière Ejour (Wh/j)',
  ps: 'puissance simultanée (W)',
  ppv: 'puissance PV nécessaire (Wc)',
  i: 'courant côté batterie (A)',
  vmp: 'Vmp du champ (V)',
  imp: 'Imp du champ (A)',
  cb: 'capacité du parc (Ah)',
  ich: 'courant de charge (A)',
  pinv: 'puissance onduleur avec marge (W)',
  iinv: 'courant onduleur → batterie (A)',
};

export function buildPvContext(
  tp: TpDefinition,
  s: PvState,
  extra?: { student?: Student | null; fiche?: CoursFiche | null },
): string {
  const C = calc(s);
  const { loc, panel, bat, mppt, inv } = picksOf(s);
  const sol = solarOf(s);
  const lines: string[] = [];
  const student = extra?.student ?? null;

  if (student) {
    lines.push(`Élève : ${student.name}, prépare le ${diplomaName(student.diploma)}${student.etablissement ? ` (${student.etablissement})` : ''}.`);
    lines.push('Adapte le niveau d\'exigence et le vocabulaire à ce diplôme.');
  }
  lines.push(`TP d'ÉTUDE ET DE DIMENSIONNEMENT (pas de câblage) : ${tp.title} (${tp.level}).`);
  lines.push(`Étape en cours : ${s.step + 1}/${PV_STEPS.length} — ${PV_STEPS[s.step].title} (${PV_STEPS[s.step].sub}).`);
  lines.push(`Cahier des charges : ${tp.cahierDesCharges.map(c => `${c.k} = ${c.v}`).join(' ; ')}.`);

  lines.push(
    `Site : ${loc.ville} (${loc.region}), HSP ${fr(sol.hsp, 1)} h/j en moyenne et ${fr(sol.min, 1)} h/j au mois le plus défavorable ` +
    `(source ${sol.source === 'pvgis' ? 'PVGIS' : 'table locale'}), Tmin ${loc.tmin} °C, inclinaison conseillée ${loc.tilt}°. ` +
    `Dimensionnement sur ${s.worst ? 'le mois le plus défavorable' : 'la moyenne annuelle'}, η global ${s.eta}.`,
  );
  lines.push(
    `Besoins : ${s.recv.length} récepteurs, Ejour = ${fr(C.Ejour, 0)} Wh/j, Psimultanée = ${fr(C.Psim, 0)} W, ` +
    `pointe au démarrage ≈ ${fr(C.Pstart, 0)} W.`,
  );
  lines.push(
    `Architecture retenue : parc ${s.ubat} V. Champ ${s.ns}S${s.np}P de ${panel.name} → ${fr(C.PpvReal, 0)} Wc ` +
    `(besoin ${fr(C.Ppv, 0)} Wc), Vmp ${fr(C.Vmp, 0)} V, Imp ${fr(C.Imp, 1)} A, Voc ${fr(C.Voc, 0)} V, ` +
    `Voc au froid ${fr(C.VocCold, 0)} V, Isc ${fr(C.Isc, 1)} A.`,
  );
  lines.push(
    `Parc : ${s.bns}S${s.bnp}P de ${bat.name} → ${fr(C.Ubat, 1)} V / ${fr(C.Ah, 0)} Ah (besoin ${fr(C.Cah, 0)} Ah ` +
    `pour ${s.auto} jour(s) d'autonomie, DoD ${bat.dod * 100} %, η ${bat.eta}).`,
  );
  lines.push(
    `Conversion : ${mppt.name} (Voc max ${mppt.vocmax} V, ${mppt.ich} A) avec Ich ≈ ${fr(C.Ich, 0)} A ; ` +
    `${inv.name} avec I DC ${fr(C.Iinv, 1)} A et I AC ${fr(C.Iac, 1)} A.`,
  );
  lines.push(
    `Câbles : PV → MPPT ${s.cab.Spv} mm² sur ${s.cab.Lpv} m (ΔU max ${s.cab.dupv * 100} %) ; ` +
    `batterie → onduleur ${s.cab.Sbat} mm² sur ${s.cab.Lbat} m (ΔU max ${s.cab.dubat * 100} %).`,
  );
  lines.push(
    `Protections : fusibles de string ${s.prot.fpv} A, fusible batterie ${s.prot.fbat} A, disjoncteur AC ${s.prot.qac} A, ` +
    `DDR 30 mA ${s.prot.ddr ? 'prévu' : 'ABSENT'}, parafoudre DC ${s.prot.dcspd ? 'prévu' : 'absent'}.`,
  );

  const answered = (Object.keys(s.ans) as PvAnswerKey[]).filter(k => s.ans[k] != null);
  if (answered.length) {
    lines.push(
      'Réponses saisies par l\'élève (les valeurs attendues sont indiquées pour toi : NE LES DONNE JAMAIS) — ' +
      answered.map(k => {
        const exp = expectedAnswer(s, k);
        return `${ANSWER_LABEL[k]} : ${s.ans[k]} (attendu ≈ ${fr(exp.value, 1)})`;
      }).join(' ; ') + '.',
    );
  }

  const E = checks(s, s.step);
  const bads = E.filter(x => x.kind === 'bad');
  const warns = E.filter(x => x.kind === 'warn');
  lines.push(`Contrôles bloquants de l'étape : ${bads.length ? bads.map(b => `${b.title} — ${b.detail}`).join(' | ') : 'aucun'}.`);
  if (warns.length) lines.push(`Points de vigilance : ${warns.map(w => w.title).join(' ; ')}.`);
  lines.push(`Aides déjà ouvertes sur cette étape : ${s.helpUsed[s.step] ?? 0} ; tentatives refusées : ${s.badTries[s.step] ?? 0}.`);

  if (extra?.fiche) {
    lines.push('--- Fiche de rappel que l\'élève vient d\'ouvrir ---');
    lines.push(coursPrompt(extra.fiche, student?.diploma ?? 'bacpro'));
  }
  lines.push(
    'CONSIGNE ABSOLUE : c\'est un TP de calcul. Rappelle la RÈGLE ou la FORMULE (E = P × t, I = P / U, ' +
    'Ppv = Ejour / (HSP × η), Voc froid = Voc × (1 + k × (Tmin − 25)), Cbat = Ejour × jours / (DoD × η), ' +
    'S = 2 ρ L I / ΔU, Iu ≤ In ≤ Iz…), fais-la appliquer par l\'élève, et ne donne JAMAIS la valeur numérique finale ' +
    'ni la référence exacte du matériel à choisir.',
  );

  return lines.join('\n');
}

/** Questions rapides proposées à l'élève, par étape. */
export const PV_QUICK: Record<number, string[]> = {
  0: ['Comment compter l\'énergie d\'un récepteur ?', 'Wh ou W, quelle différence ?'],
  1: ['Pourquoi la puissance de démarrage ?', 'Tous les récepteurs en même temps ?'],
  2: ['C\'est quoi la HSP ?', 'Pourquoi le mois le plus défavorable ?'],
  3: ['Pourquoi 48 V plutôt que 12 V ?', 'Comment passer de P à I ?'],
  4: ['Série ou parallèle ?', 'Pourquoi corriger la Voc au froid ?'],
  5: ['Plomb ou LiFePO₄ ?', 'À quoi sert la DoD ?'],
  6: ['Pourquoi mon MPPT est-il refusé ?', 'PWM ou MPPT ?'],
  7: ['VA ou W ?', 'Quelle marge sur l\'onduleur ?'],
  8: ['Iz ou chute de tension ?', 'Pourquoi 2 × L dans la formule ?'],
  9: ['Comment calibrer un fusible de string ?', 'Pourquoi du matériel DC ?'],
  10: ['Que doit contenir une note de calcul ?', 'À quoi sert le schéma unifilaire ?'],
};

/** Mot d'accueil du professeur à chaque étape. */
export const PV_HELLO: Record<number, string> = {
  0: 'On commence par le bilan des besoins. Une puissance en watts ne suffit pas : ce qui compte ici, c\'est l\'énergie sur une journée. Quelle grandeur multiplie la puissance ?',
  1: 'Énergie et puissance instantanée sont deux choses différentes. Quels récepteurs peuvent réellement fonctionner ensemble ?',
  2: 'La ressource solaire dépend du site : on interroge PVGIS. Sur quel mois dimensionne-t-on une installation autonome, à ton avis ?',
  3: 'À puissance égale, la tension du parc fixe le courant. Regarde ce que devient I quand tu passes de 12 à 48 V.',
  4: 'Fiche technique en main : que font Ns modules en série sur la tension, et Np chaînes en parallèle sur le courant ?',
  5: 'La capacité utile n\'est pas la capacité nominale : la DoD et le rendement entrent dans le calcul. Combien de jours d\'autonomie te demande le client ?',
  6: 'Le régulateur se choisit sur trois critères : tension PV maximale au froid, courant de charge et puissance admissible. Commence par la tension.',
  7: 'L\'onduleur doit tenir la puissance simultanée en continu ET la pointe au démarrage. Attention aussi aux VA face aux W.',
  8: 'Un câble se vérifie deux fois : échauffement puis chute de tension. Laquelle des deux impose la plus grosse section ici ?',
  9: 'Règle unique pour toute protection : courant d\'utilisation ≤ calibre ≤ courant admissible du câble. Et le matériel DC n\'est pas du matériel AC.',
  10: 'Dernière étape : la note de calcul. Relis-la, vérifie que chaque valeur est justifiée, puis imprime-la.',
};

/** Réponses préparées si l'API du professeur n'est pas disponible. */
export function pvFallbackAnswer(q: string): string {
  const l = q.toLowerCase();
  if (/wh|énergie|energie|ejour|p × t|jour/.test(l)) return 'L\'énergie d\'un récepteur, c\'est sa puissance multipliée par sa durée d\'utilisation : E = P × t. Additionne ensuite tous les récepteurs, sans oublier la quantité. Quelle unité obtiens-tu ?';
  if (/simultan|même temps|meme temps|démarrage|demarrage/.test(l)) return 'La puissance simultanée, c\'est la somme des puissances des récepteurs qui peuvent tourner ensemble. Les moteurs, eux, appellent plusieurs fois leur puissance nominale au démarrage : c\'est la pointe que doit tenir l\'onduleur.';
  if (/hsp|irradiation|ensoleill|pvgis|mois/.test(l)) return 'La HSP, c\'est le nombre d\'heures équivalentes à 1000 W/m². Sur une installation autonome, on dimensionne sur le mois le plus défavorable, sinon l\'hiver le parc se vide. Compare les deux valeurs du site.';
  if (/12 v|24 v|48 v|tension du parc|tension système|tension systeme/.test(l)) return 'Pars de I = P / U. À puissance égale, multiplier la tension par quatre divise le courant par quatre : sections, fusibles et chutes de tension suivent. Calcule le courant pour ta puissance simultanée sous chaque tension.';
  if (/série|serie|parallèle|parallele|ns|np|couplage/.test(l)) return 'En série les tensions s\'additionnent et le courant reste celui d\'un module ; en parallèle c\'est l\'inverse. Regarde ce que tu dois augmenter : la tension du champ ou son courant ?';
  if (/voc|froid|température|temperature|coefficient/.test(l)) return 'La Voc augmente quand il fait froid : Voc froid = Voc × (1 + k × (Tmin − 25)), avec k négatif en %/°C. C\'est cette valeur, pas celle à 25 °C, qui doit rester sous la Voc max du régulateur.';
  if (/batterie|dod|capacité|capacite|autonomie|plomb|lifepo/.test(l)) return 'Cbat(Wh) = Ejour × nombre de jours / (DoD × rendement), puis divise par la tension du parc pour obtenir des ampères-heures. Le plomb ne donne que 50 % d\'énergie utilisable, le lithium environ 80 %.';
  if (/mppt|pwm|régulateur|regulateur|refus/.test(l)) return 'Trois contrôles : la Voc au froid du champ sous la Voc max du régulateur, le courant de charge (≈ Ppv / Ubat) sous le calibre, et la puissance PV sous la puissance admissible à ta tension de parc. Lequel des trois ne passe pas ?';
  if (/onduleur|va|pointe/.test(l)) return 'Un onduleur se choisit sur la puissance simultanée majorée d\'environ 25 %, et sur la pointe de démarrage. Attention : les VA affichés ne sont pas les watts utiles, vérifie les deux lignes de la fiche.';
  if (/section|câble|cable|chute|iz|ρ|rho/.test(l)) return 'Deux vérifications, jamais une seule : le courant doit rester sous le Iz du câble, et la chute de tension sous la limite admise, avec S = 2 × ρ × L × I / ΔU. Prends la section normalisée supérieure au plus contraignant des deux.';
  if (/fusible|calibre|disjoncteur|protection|ddr|parafoudre/.test(l)) return 'La règle générale : courant d\'utilisation ≤ calibre de la protection ≤ courant admissible du câble. Pour un string PV, le calibre reste en plus entre 1,25 et 2,4 fois l\'Isc du module.';
  if (/dc|ac|continu|alternatif/.test(l)) return 'En continu l\'arc ne s\'éteint pas tout seul au passage par zéro : il faut du matériel de tension assignée DC, avec un pouvoir de coupure DC et souvent une polarité. Un disjoncteur 230 V AC n\'a rien à faire sur le parc batterie.';
  if (/note de calcul|unifilaire|schéma|schema|rapport/.test(l)) return 'Une note de calcul doit permettre à un autre technicien de refaire ton étude : hypothèses du site, besoins, formules, résultats et matériels retenus. Le schéma unifilaire montre la chaîne et les valeurs clés de chaque maillon.';
  return 'Dis-moi quelle grandeur tu cherches et avec quelle formule tu comptes la trouver : je te dirai si le raisonnement tient, mais le calcul reste le tien.';
}
