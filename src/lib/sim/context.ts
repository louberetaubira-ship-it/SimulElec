import type { AttemptState, TpDefinition } from '../types';
import type { SimState } from './engine';
import { nextLiaison, requiredLiaisons, STAGES } from './progress';

const fr = (v: number, d = 1) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Contexte envoyé au professeur virtuel : cahier des charges + état réel du montage.
 * La panne injectée y figure explicitement comme SECRÈTE : le serveur ajoute la règle
 * « ne jamais la nommer », le client ne l'affiche jamais.
 */
export function buildContext(tp: TpDefinition, st: AttemptState, sim: SimState): string {
  const lines: string[] = [];
  lines.push(`Étape en cours : ${st.stage + 1}/${STAGES.length} — ${STAGES[st.stage]}.`);
  lines.push(`TP : ${tp.title} (${tp.level}). ${tp.summary}`);
  lines.push(`Moteur : ${Object.entries(tp.plaque).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
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
    const posés = tp.slots.filter(s => st.placed[s.id]).map(s => s.id);
    lines.push(`Appareils posés : ${posés.join(', ') || 'aucun'} ; erreurs de pose : ${st.poseErrors}.`);
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
    lines.push(
      `État du montage : Q1 ${sim.q1 ? 'fermé' : 'ouvert'}, F2 ${sim.f2 ? 'fermé' : 'ouvert'}, ` +
      `KM1 ${sim.km1 ? 'enclenché' : 'retombé'}, F1 ${sim.f1trip ? 'déclenché' : 'ok'}, ` +
      `I = ${fr(sim.I, 2)} A, n = ${Math.round(sim.n)} tr/min, charge ${Math.round(sim.load * 100)} %.`,
    );
    const last = st.readings.slice(-5).map(r => `${r.point} = ${r.display}`).join(', ');
    lines.push(`Derniers relevés : ${last || 'aucun'}.`);
  }

  if (st.stage === 7 && st.fault && !st.fixed) {
    const f = tp.faults.find(x => x.id === st.fault);
    if (f) lines.push(`PANNE INJECTÉE — SECRÈTE, ne jamais la nommer, guider vers la mesure qui la révèle : ${f.title}. Symptôme signalé : ${f.symptom}.`);
    if (st.diagnosis) lines.push(`Hypothèse de l'élève : ${tp.faults.find(x => x.id === st.diagnosis)?.title ?? st.diagnosis} (${st.diagTries} essai(s)).`);
  }

  return lines.join('\n');
}

/** Questions rapides proposées à l'élève, par étape. */
export const QUICK_QUESTIONS: Record<number, string[]> = {
  0: ['Quel TP choisir ?', 'C\'est quoi C5 et C6 ?'],
  1: ['Que veut dire 400 V Y ?', 'Pourquoi une commande en 230 V ?'],
  2: ['Comment choisir le calibre du GV2 ?', 'LC1D09 ou LC1D32 ?', 'À quoi sert la classe 10 ?'],
  3: ['Pourquoi cet ordre sur le rail ?', 'À quoi servent X1 et X2 ?'],
  4: ['Je suis bloqué', 'À quoi sert le contact 13-14 ?', 'Pourquoi 95-96 dans la commande ?'],
  5: ['Pourquoi une VAT ?', 'Quel seuil d\'isolement ?'],
  6: ['Mon moteur ne démarre pas', 'Le courant de démarrage est-il normal ?', 'Le thermique a déclenché'],
  7: ['Par où commencer le diagnostic ?', 'Quelle mesure faire ?'],
};

/** Mot d'accueil du professeur à chaque étape. */
export const HELLO: Record<number, string> = {
  0: 'Bonjour. Choisis ton TP dans le catalogue ; si tu hésites, dis-moi ce que tu as déjà fait en atelier.',
  1: 'Lis bien la plaque signalétique : deux valeurs vont te servir pendant tout le TP. Lesquelles, à ton avis ?',
  2: 'Pour chaque poste, pars de la question : quelle grandeur cet appareil doit-il supporter ou régler ?',
  3: 'Sur une platine, l\'ordre des appareils suit le sens du courant. Pose-les dans cet esprit.',
  4: 'Suis le tableau de câblage borne à borne. Si tu ne vois pas pourquoi une liaison existe, demande-moi.',
  5: 'Avant toute mise sous tension : consignation, VAT, puis les tests. Dans cet ordre.',
  6: 'Mise en service : une manœuvre à la fois, et tu notes ce que tu observes avant de mesurer.',
  7: 'On t\'a signalé une panne. Méthode : symptôme, hypothèses, mesure qui tranche. Que dit le symptôme ?',
};

/** Réponses préparées, utilisées si l'API du professeur n'est pas disponible. */
export function fallbackAnswer(q: string): string {
  const l = q.toLowerCase();
  if (/13.?14|auto.?maintien/.test(l)) return 'Quand tu relâches S2, qui garde la bobine alimentée ? Regarde quel contact de KM1 est en parallèle de S2, et ce qu\'il devient quand KM1 est enclenché.';
  if (/95|96|thermique|f1/.test(l)) return 'Le relais thermique ne coupe pas la puissance lui-même. Où doit-il agir pour que KM1 retombe ? Cherche son contact NC dans le circuit de commande.';
  if (/gv2|calibre|plage|réglage|reglage/.test(l)) return 'Reprends In sur la plaque signalétique. La plage de réglage de la protection doit encadrer cette valeur : ni trop basse (déclenchements intempestifs), ni trop haute (moteur non protégé).';
  if (/lc1d|contacteur|bobine/.test(l)) return 'Deux questions pour un contacteur : quel courant AC-3 doit-il tenir, et sous quelle tension sa bobine sera-t-elle alimentée ? Relis la ligne « commande » du cahier des charges.';
  if (/x1|x2|bornier/.test(l)) return 'Un bornier sépare ce qui est dans l\'armoire de ce qui en sort. Demande-toi ce qui traverse X1 et ce qui traverse X2, et quelle section chacun doit accepter.';
  if (/vat|absence de tension|consign/.test(l)) return 'La VAT vérifie qu\'il n\'y a plus de tension là où tu vas travailler, avec un appareil testé avant et après. Sans elle, aucune mesure d\'ohms ni d\'isolement.';
  if (/isolement|mω|mohm|megohm|mégohm/.test(l)) return 'Sous 500 V continu, la NF C 15-100 attend au moins 0,5 MΩ. Que signifierait une valeur bien plus basse pour le moteur ?';
  if (/démarre pas|demarre pas|rien ne se passe|rien/.test(l)) return 'Procède par ordre : Q1 fermé ? F2 fermé ? Puis mesure la tension aux bornes de la bobine A1-A2 pendant l\'appui sur S2. Que trouves-tu ?';
  if (/panne|diagnostic|commencer|mesure/.test(l)) return 'Pars du symptôme. S\'il concerne la commande, mesure en tension le long de la boucle : F2, 95-96, S1, S2, A1-A2. Si le moteur ronfle, pense à la puissance : pince sur chaque phase.';
  if (/ordre|rail|platine/.test(l)) return 'Dans quel ordre le courant traverse-t-il Q1, KM1 et F1 ? La platine suit ce chemin : ça simplifie le câblage et le dépannage.';
  if (/glissement|vitesse|tr\/min/.test(l)) return 'Compare la vitesse lue à la vitesse de synchronisme : 1500 tr/min pour 4 pôles en 50 Hz. L\'écart, rapporté à ns, c\'est le glissement. Que devient-il quand la charge augmente ?';
  if (/démarrage|pointe|6/.test(l)) return 'À l\'enclenchement, le moteur est vu comme un transformateur en court-circuit : le courant grimpe très au-dessus de In avant de retomber. Regarde la fonction MAX de la pince.';
  return 'Dis-moi ce que tu observes ou ce que tu as mesuré, et où tu bloques précisément : je t\'aiderai à raisonner, pas à deviner.';
}
