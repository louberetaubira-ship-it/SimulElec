import type { AttemptState, TpDefinition } from '../types';
import { isControlLive, isRunning, type SimState } from './engine';
import { nextLiaison, requiredLiaisons, STAGES } from './progress';
import { EPI, mesureDone, mesuresFor, readingLabel } from './mesures';

const fr = (v: number, d = 1) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Contexte envoyé au professeur virtuel : cahier des charges + état réel du montage,
 * EPI, consignation, lectures d'instruments et panne (secrète).
 */
export function buildContext(tp: TpDefinition, st: AttemptState, sim: SimState): string {
  const lines: string[] = [];
  lines.push(`Étape en cours : ${st.stage + 1}/${STAGES.length} — ${STAGES[st.stage]}.`);
  lines.push(`TP : ${tp.title} (${tp.level}). ${tp.summary}`);
  if (tp.motor) lines.push(`Moteur : ${Object.entries(tp.plaque).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  lines.push(`Cahier des charges : ${tp.cahierDesCharges.map(c => `${c.k} = ${c.v}`).join(' ; ')}.`);

  if (st.stage === 2) {
    const choix = tp.postes.map(p => {
      const i = st.choices[p.id];
      const o = i != null ? p.options[i] : null;
      return `${p.name.split(' ·')[0]} = ${o ? `${o.ref}${o.ok ? ' (juste)' : ' (faux)'}` : 'aucun'}`;
    }).join(', ');
    const bonnes = tp.postes.map(p => p.options.find(o => o.ok)?.ref).filter(Boolean).join(', ');
    lines.push(`Choix actuels : ${choix}.`);
    lines.push(`Bonnes réponses, à NE PAS révéler : ${bonnes}.`);
  }

  if (st.stage === 3) {
    const poses = tp.slots.filter(s => st.placed[s.id]).map(s => s.id);
    lines.push(`Appareils posés : ${poses.join(', ') || 'aucun'} ; erreurs de pose : ${st.poseErrors}.`);
  }

  if (st.stage === 4) {
    const req = requiredLiaisons(tp).length;
    const n = nextLiaison(tp, st);
    lines.push(`Liaisons réalisées : ${st.wires.length}/${req}, refus : ${st.wireErrors}.`);
    lines.push(`Prochaine liaison du tableau, à NE PAS donner telle quelle : ${n ? `${n.a} → ${n.b} (${n.net})` : 'aucune, le câblage est complet'}.`);
  }

  if (st.stage === 5) {
    const faits = Object.keys(st.tests);
    lines.push(`Tests réalisés : ${faits.join(', ') || 'aucun'} sur ${tp.tests.map(t => t.id).join(', ')}.`);
  }

  if (st.stage >= 6) {
    const manquants = EPI.filter(e => e.req && !st.epi[e.id]).map(e => e.name);
    lines.push(`EPI cochés : ${Object.keys(st.epi).filter(k => st.epi[k]).join(', ') || 'aucun'}${manquants.length ? ` ; manque : ${manquants.join(', ')}` : ' ; équipement complet'}.`);
    const c = st.cons;
    lines.push(
      `Consignation : séparation ${c.sep ? 'faite' : 'non faite'}, condamnation ${c.lock ? 'faite' : 'non faite'}, ` +
      `identification ${c.ident ? 'faite' : 'non faite'}, VAT vérifié sur source ${c.vatRef ? 'oui' : 'non'}, ` +
      `${c.vat.length} paire(s) contrôlée(s) à la VAT, re-vérification ${c.vatRef2 ? 'faite (installation consignée)' : 'non faite'}.`,
    );
    const d = st.decons;
    lines.push(`Déconsignation : cadenas ${d.unlock ? 'retiré' : 'en place'}, appareils ${d.close ? 'refermés' : 'ouverts'}, essai ${d.essai ? 'concluant' : 'non fait'}.`);
  }

  if (st.stage >= 7) {
    for (const s of ['horsTension', 'sousTension'] as const) {
      const list = mesuresFor(tp, s);
      if (!list.length) continue;
      const etat = list.map(m => `${m.title} : ${mesureDone(st, m.id) ? 'validée' : 'à faire'}`).join(' ; ');
      lines.push(`Mesures ${s === 'horsTension' ? 'hors tension' : 'sous tension'} — ${etat}.`);
    }
    const last = st.readings.slice(-6).map(readingLabel).join(' | ');
    lines.push(`Dernières lectures d'instrument : ${last || 'aucune'}.`);
  }

  if (st.stage >= 8) {
    lines.push(
      `État du montage : Q1 ${sim.q1 ? 'fermé' : 'ouvert'}, F2 ${sim.f2 ? 'fermé' : 'ouvert'}, F3 ${sim.f3 ? 'fermé' : 'ouvert'}, ` +
      `commande ${isControlLive(sim) ? 'sous tension' : 'hors tension'}, KM1 ${sim.km1 ? 'enclenché' : 'retombé'}, ` +
      `F1 ${sim.f1trip ? 'déclenché' : 'ok'}, couplage ${sim.coupling === 'Y' ? 'étoile' : 'triangle'}, ` +
      `moteur ${isRunning(sim) ? 'en marche' : 'à l\'arrêt'}, I = ${fr(sim.I, 2)} A, n = ${Math.round(sim.n)} tr/min, charge ${Math.round(sim.load * 100)} %.`,
    );
  }

  if (st.stage === 10 && st.fault && !st.fixed) {
    const f = tp.faults.find(x => x.id === st.fault);
    if (f) lines.push(`PANNE INJECTÉE — SECRÈTE, ne jamais la nommer, guider vers la mesure qui la révèle : ${f.title}. Symptôme signalé : ${f.symptom}.`);
    if (st.diagnosis) lines.push(`Hypothèse de l'élève : ${tp.faults.find(x => x.id === st.diagnosis)?.title ?? st.diagnosis} (${st.diagTries} essai(s)).`);
  }

  return lines.join('\n');
}

/** Questions rapides proposées à l'élève, par étape. */
export const QUICK_QUESTIONS: Record<number, string[]> = {
  0: ['Quel TP choisir ?', 'C\'est quoi C5 et C6 ?'],
  1: ['Que veut dire 400 V Y ?', 'Pourquoi une commande en 24 V ?'],
  2: ['Comment choisir le calibre du GV2 ?', 'LC1D09 ou LC1D32 ?', 'À quoi sert la classe 10 ?'],
  3: ['Pourquoi cet ordre sur le rail ?', 'À quoi servent X1 et X2 ?'],
  4: ['Je suis bloqué', 'À quoi sert le contact 13-14 ?', 'Pourquoi 95-96 dans la commande ?'],
  5: ['Pourquoi une VAT ?', 'Quel seuil d\'isolement ?'],
  6: ['Quels EPI pour du BT ?', 'Dans quel ordre consigner ?', 'Pourquoi vérifier le VAT deux fois ?'],
  7: ['Quelle valeur pour le PE ?', 'Pourquoi 500 V pour l\'isolement ?', 'Mon ohmmètre affiche ERR'],
  8: ['Qui remet sous tension ?', 'Le moteur ne démarre pas'],
  9: ['Où poser la pince ?', 'Pourquoi 400 V entre phases ?', 'Comment lire le glissement ?'],
  10: ['Par où commencer le diagnostic ?', 'Quelle mesure faire ?'],
};

/** Mot d'accueil du professeur à chaque étape. */
export const HELLO: Record<number, string> = {
  0: 'Bonjour. Choisis ton TP dans le catalogue ; si tu hésites, dis-moi ce que tu as déjà fait en atelier.',
  1: 'Lis bien la plaque signalétique : deux valeurs vont te servir pendant tout le TP. Lesquelles, à ton avis ?',
  2: 'Pour chaque poste, pars de la question : quelle grandeur cet appareil doit-il supporter ou régler ?',
  3: 'Sur une platine, l\'ordre des appareils suit le sens du courant. Pose-les dans cet esprit.',
  4: 'Suis le tableau de câblage borne à borne. Si tu ne vois pas pourquoi une liaison existe, demande-moi.',
  5: 'Contrôle visuel, serrage, puis les tests : rien ne se mesure au hasard.',
  6: 'On passe aux EPI et à la consignation : séparation, condamnation, identification, VAT. Dans cet ordre, sans en sauter un.',
  7: 'Installation consignée : tu peux mesurer en ohms. Jamais l\'inverse.',
  8: 'Déconsignation : le cadenas d\'abord, puis on referme Q1, F2, F3 et on essaie.',
  9: 'Sous tension : bonne position du sélecteur, bons cordons, et tu notes ce que tu lis.',
  10: 'On t\'a signalé une panne. Méthode : symptôme, hypothèses, mesure qui tranche. Que dit le symptôme ?',
};

/** Réponses préparées, utilisées si l'API du professeur n'est pas disponible. */
export function fallbackAnswer(q: string): string {
  const l = q.toLowerCase();
  if (/13.?14|auto.?maintien/.test(l)) return 'Quand tu relâches S2, qui garde la bobine alimentée ? Regarde quel contact de KM1 est en parallèle de S2, et ce qu\'il devient quand KM1 est enclenché.';
  if (/95|96|thermique|f1/.test(l)) return 'Le relais thermique ne coupe pas la puissance lui-même. Où doit-il agir pour que KM1 retombe ? Cherche son contact NC dans le circuit de commande.';
  if (/epi|gants|écran|ecran|équipement|equipement/.test(l)) return 'Pour une intervention BT : gants isolants, écran facial, outils isolés 1000 V, chaussures, VAT vérifié et cadenas. Les bijoux, eux, restent au vestiaire. Que te manque-t-il dans ta liste ?';
  if (/consign|cadenas|séparation|separation|identification/.test(l)) return 'Quatre temps, toujours dans le même ordre : séparation, condamnation, identification, vérification d\'absence de tension. Où en es-tu exactement ?';
  if (/vat|absence de tension/.test(l)) return 'La VAT se vérifie sur une source connue avant ET après la mesure : sinon, comment savoir que l\'appareil fonctionnait encore ?';
  if (/gv2|calibre|plage|réglage|reglage/.test(l)) return 'Reprends In sur la plaque signalétique. La plage de réglage de la protection doit encadrer cette valeur : ni trop basse, ni trop haute.';
  if (/lc1d|contacteur|bobine/.test(l)) return 'Deux questions pour un contacteur : quel courant AC-3 doit-il tenir, et sous quelle tension sa bobine sera-t-elle alimentée ? Relis la ligne « commande » du cahier des charges.';
  if (/x1|x2|bornier/.test(l)) return 'Un bornier sépare ce qui est dans l\'armoire de ce qui en sort. Que traverse X1, que traverse X2, et quelle section chacun doit-il accepter ?';
  if (/isolement|mω|mohm|megohm|mégohm|500/.test(l)) return 'Sous 500 V continu, la NF C 15-100 attend au moins 0,5 MΩ. Que signifierait une valeur bien plus basse pour le moteur ?';
  if (/err|ohms sous tension/.test(l)) return 'Un ohmmètre injecte son propre courant : sous tension il affiche ERR et son fusible saute. Que dois-tu faire avant toute mesure de résistance ?';
  if (/pe|continuité|continuite/.test(l)) return 'La continuité du PE se mesure entre la borne PE du bornier et la masse du récepteur, sous 200 mA. En dessous de 2 Ω, c\'est bon.';
  if (/pince|courant/.test(l)) return 'La pince se serre sur UN seul conducteur : si tu en enserres deux, la somme des courants s\'annule. Sur quelle phase veux-tu lire In ?';
  if (/démarre pas|demarre pas|rien ne se passe|rien/.test(l)) return 'Procède par ordre : Q1 fermé ? F2 ? F3 ? Puis mesure la tension aux bornes de la bobine A1-A2 pendant l\'appui sur S2. Que trouves-tu ?';
  if (/panne|diagnostic|commencer|mesure/.test(l)) return 'Pars du symptôme. S\'il concerne la commande, mesure en tension le long de la boucle : F3, 95-96, S1, S2, A1-A2. Si le moteur ronfle, pense à la puissance : pince sur chaque phase.';
  if (/glissement|vitesse|tr\/min/.test(l)) return 'Compare la vitesse lue à la vitesse de synchronisme : 1500 tr/min pour 4 pôles en 50 Hz. L\'écart, rapporté à ns, c\'est le glissement.';
  if (/couplage|triangle|étoile|etoile/.test(l)) return 'Regarde la plaque : 400 V Y / 230 V Δ. Sur un réseau 400 V, quel couplage donne 230 V par enroulement ?';
  return 'Dis-moi ce que tu observes ou ce que tu as mesuré, et où tu bloques précisément : je t\'aiderai à raisonner, pas à deviner.';
}
