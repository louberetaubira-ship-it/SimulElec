'use client';

/**
 * Wizard ETS de mise en service KNX (5 onglets), pendant la déconsignation.
 *
 * Tout ce que ce composant sait du chantier vient du TP (`tp.knxMiseEnService`,
 * `tp.knxZones`) : les interfaces trouvées sur le réseau (adresse individuelle, IP,
 * MAC, et les entrées non sélectionnables de la vraie fenêtre), les rappels du dossier
 * affichés aux onglets Adresses et Paramètres, les leurres du canal 8, les participants à
 * adresser et le canal (ou les deux canaux) que chaque détecteur doit publier. Les
 * réponses de l'élève sont commises dans `st.knx` par quatre actions du store
 * (`knxSetIface`, `knxProg`, `knxToggleLink`, `knxSetParam`) — ce composant ne garde
 * en local que ce qui ne regarde personne d'autre : l'onglet ouvert, le participant
 * actuellement « en mode programmation », et le dernier message du professeur bot.
 */
import React from 'react';
import type { AttemptState, KnxModeCanal, TpDefinition } from '@/lib/types';
import { knxErreurs, knxState } from '@/lib/sim/knxMiseEnService';

export interface MiseEnServiceKnxProps {
  tp: TpDefinition;
  st: AttemptState;
  /** ETS ne parle au bus que si le tableau est sous tension. */
  alimente: boolean;
  onIface: (i: number) => void;
  onProg: (id: string) => void;
  onLink: (det: string, canal: number) => void;
  onParam: (which: 'chX' | 'ch8', value: KnxModeCanal) => void;
}

const TABS = ['Interface', 'Adresses', 'Liaisons', 'Paramètres', 'Télécharger'];
const ERR_LABEL: Record<string, string> = {
  interface: 'interface', adresses: 'adresses', liaisons: 'liaisons', paramètres: 'paramètres',
};

export default function MiseEnServiceKnx({ tp, st, alimente, onIface, onProg, onLink, onParam }: MiseEnServiceKnxProps) {
  const def = tp.knxMiseEnService;
  const zones = React.useMemo(() => tp.knxZones ?? [], [tp.knxZones]);
  const [tab, setTab] = React.useState(0);
  const [progMode, setProgMode] = React.useState<string | null>(null);
  const [dlClicked, setDlClicked] = React.useState(false);
  const [msg, setMsg] = React.useState(
    'Commence par l’onglet Interface : ETS doit parler au bus par la passerelle de ce chantier, pas par une autre trouvée sur le réseau.',
  );
  const k = knxState(st);

  if (!def) return null;

  const rep = (id: string) => def.participants.find(p => p.id === id)?.rep ?? id;

  const clickParticipant = (id: string) => {
    if (!alimente) return;
    if (!progMode) { setMsg('Choisis d’abord, dans l’onglet Adresses, le participant à programmer.'); return; }
    if (id !== progMode) {
      setMsg(`Ce n’est pas ${rep(progMode)} : ETS attend l’appui sur SON bouton de programmation, sinon l’adresse irait au mauvais appareil.`);
      return;
    }
    onProg(id);
    setMsg(`Adresse ${def.participants.find(p => p.id === id)?.adresse} programmée dans ${rep(id)}. La LED s’éteint : c’est fini pour lui.`);
    setProgMode(null);
  };

  const errs = knxErreurs(tp, st);
  const statut = !dlClicked ? 'non téléchargé' : errs.length ? 'erreurs' : 'téléchargé ✓';

  const btn = (active: boolean, onClick: () => void, label: React.ReactNode, key?: React.Key) => (
    <button
      key={key}
      type="button"
      disabled={!alimente}
      onClick={onClick}
      className={`min-h-touch rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold disabled:opacity-40 ${
        active ? 'border-accent bg-accent text-[#141A21]' : 'border-[var(--line)] bg-[var(--surface-2)]'
      }`}
    >
      {label}
    </button>
  );

  const planLed = (id: string, label: string) => {
    const on = progMode === id;
    const done = !!k.prog[id];
    return (
      <button
        key={id}
        type="button"
        data-knx-plan={id}
        disabled={!alimente}
        onClick={() => clickParticipant(id)}
        className="flex min-h-touch items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
      >
        <i
          className="block h-2.5 w-2.5 rounded-full"
          style={{ background: on ? '#FF3B30' : done ? '#1E9E5A' : '#8A94A3' }}
        />
        {label}
      </button>
    );
  };

  return (
    <div className="mt-1.5 flex flex-col gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-2">
      <div className="flex items-center justify-between rounded-lg bg-[#2b3a4a] px-2 py-1 text-[11px] font-bold text-white">
        <span>ETS · projet « {tp.title.split('·')[0].trim()} »</span>
        <span data-knx-status>{statut}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            data-knx-tab={i}
            onClick={() => setTab(i)}
            className={`min-h-touch rounded-t-lg px-2 py-1 text-[11px] font-semibold ${
              tab === i ? 'bg-[var(--surface)] border border-b-0 border-[var(--line)]' : 'bg-[var(--surface-2)]'
            }`}
          >
            {i + 1}. {t}
          </button>
        ))}
      </div>

      {!alimente && (
        <div className="rounded-lg border border-crit bg-crit/10 px-2 py-1.5 text-[11.5px]">
          ETS ne peut pas se connecter : le tableau n&apos;est pas encore sous tension.
        </div>
      )}

      {tab === 0 && (
        <div className="flex flex-col gap-1">
          <b className="text-[12px]">Interfaces trouvées sur le réseau</b>
          {def.interfaces.map((r, i) => (
            <label key={r.individuelle + r.ip} className="flex items-center gap-1.5 text-[11.5px]">
              <input
                type="radio"
                name="knx-iface"
                disabled={!alimente}
                checked={k.iface === i}
                onChange={() => { onIface(i); setMsg(i === def.bonneInterface ? `Bonne interface : ${r.individuelle}, adresse IP ${r.ip}${r.mac ? `, MAC ${r.mac}` : ''} — celle de ce chantier.` : `Cette interface n’est pas celle du chantier : regarde son adresse individuelle et son IP.`); }}
                className="h-touch w-touch accent-[var(--accent)]"
                data-knx-iface={i}
              />
              <span className="font-mono-num">{r.individuelle}</span>
              {r.nom ? <> · {r.nom}</> : null}
              {' · '}<span className="font-mono-num">{r.ip}:3671</span>
              {r.mac && <> · <span className="font-mono-num text-[10.5px] text-muted">{r.mac}</span></>}
            </label>
          ))}
          {(def.autres ?? []).map(a => (
            <div key={a} className="flex items-center gap-1.5 pl-1 text-[11.5px] text-muted" title="non sélectionnable">
              <span className="inline-block h-3 w-3 rounded-sm border border-[var(--line)]" /> {a}
            </div>
          ))}
        </div>
      )}

      {tab === 1 && (
        <div className="flex flex-col gap-2">
          {def.rappelAdresses && (
            <p className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px]" data-knx-rappel="adresses">{def.rappelAdresses}</p>
          )}
          <p className="text-[11.5px]">Clique « Programmer », puis appuie sur le <b>bouton de programmation</b> du même participant sur le plan.</p>
          <div className="flex flex-col gap-1">
            {def.participants.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span><span className="font-mono-num">{p.adresse}</span> · {p.rep}</span>
                {k.prog[p.id] ? (
                  <span className="font-bold text-good">✓ programmé</span>
                ) : (
                  btn(progMode === p.id, () => { setProgMode(p.id); setMsg(`ETS attend : appuie sur le bouton de programmation de ${p.rep} sur le plan.`); }, 'Programmer')
                )}
              </div>
            ))}
          </div>
          <b className="text-[12px]">Plan du local</b>
          <div className="flex flex-wrap gap-1.5">
            {zones.map(z => planLed(z.detecteur, `${z.detecteur} · ${z.label}`))}
            {planLed('ACT', 'Actionneur 8 voies')}
            {planLed('BP', 'BP · local électrique')}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11.5px]">Relie chaque détecteur au(x) canal(aux) de sa zone.</p>
          {zones.map(z => (
            <div key={z.id} className="flex flex-wrap items-center gap-1 text-[11.5px]">
              <span className="w-16 font-semibold">{z.detecteur} →</span>
              {[1, 2, 3, 4, 5, 6, 7].map(c => btn((k.links[z.detecteur] ?? []).includes(c), () => onLink(z.detecteur, c), c, c))}
              <span className="text-[10.5px] text-muted">({z.label})</span>
            </div>
          ))}
          <div className="text-[11.5px]">BP → canal 8 <span className="font-bold text-good">prérempli</span></div>
        </div>
      )}

      {tab === 3 && (
        <div className="flex flex-col gap-2 text-[11.5px]">
          <p>Paramètre des canaux de l&apos;actionneur.</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-32">Canaux 1 à 7 :</span>
            {(['Commutation', 'Minuterie'] as const).map(v => btn(k.chX === v, () => { onParam('chX', v); setMsg(v === 'Minuterie' ? 'Oui : les zones et circulations s’éteignent seules, temporisation d’escalier.' : 'Sans minuterie, les luminaires resteraient allumés tant qu’un appui ne les éteint pas : pas ce que demande le cahier des charges pour les zones et circulations.'); }, v, v))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-32">Canal 8 (local électrique) :</span>
            {(def.modesCanal8 ?? (['Commutation', 'Minuterie'] as KnxModeCanal[])).map(v => btn(k.ch8 === v, () => { onParam('ch8', v); setMsg(v === 'Commutation' ? 'Oui : le local électrique s’allume et s’éteint au poussoir, sans minuterie.' : v === 'Minuterie' ? 'Le local électrique se commande au poussoir, en ON / OFF : c’est une commutation simple, pas une minuterie.' : `« ${v} » ne correspond pas à un éclairage commandé en ON / OFF par deux touches : c’est une commutation simple (C.4.6).`); }, v, v))}
          </div>
          {def.rappelParametres && (
            <p className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[11px]" data-knx-rappel="parametres">{def.rappelParametres}</p>
          )}
        </div>
      )}

      {tab === 4 && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            data-knx-download
            disabled={!alimente}
            onClick={() => { setDlClicked(true); setMsg(errs.length ? `Téléchargement incomplet : ${errs.map(e => ERR_LABEL[e] ?? e).join(', ')}.` : '9 participants téléchargés : l’installation est prête pour l’essai.'); }}
            className="min-h-touch self-start rounded-lg bg-[#1B222C] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            Télécharger dans les participants
          </button>
          {dlClicked && (
            <div data-knx-download-result className={`text-[11.5px] font-semibold ${errs.length ? 'text-crit' : 'text-good'}`}>
              {errs.length ? `Téléchargement incomplet : ${errs.map(e => ERR_LABEL[e] ?? e).join(', ')}.` : '9 participants téléchargés ✓'}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2 text-[11.5px] text-[#E9EEF5]">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-accent text-[11px] font-bold text-[#141A21]">P</span>
        <span>{msg}</span>
      </div>
    </div>
  );
}
