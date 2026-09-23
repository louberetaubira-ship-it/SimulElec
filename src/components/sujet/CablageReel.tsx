'use client';
/**
 * Mode « câblage réel » d'une question schéma du sujet numérique : le montage se fait sur la
 * platine du simulateur, dans le TP platine dédié (`TPS`, `hidden: true`), en trois temps —
 * **Câbler**, **Mettre sous tension**, **Essai** — puis l'élève valide : le relevé
 * (`PlatineResultat`) est figé dans sa copie par `onResultat`.
 *
 * Le moteur est celui du parcours (`useParcours`, `src/app/tp/[id]/store.ts`) :
 *  - `init(tp)` au montage charge (ou crée) la tentative du TP platine — `attempts.tp_id` =
 *    identifiant du TP de service, pas celui du sujet. En démonstration (pas de session), la
 *    tentative vit dans le `localStorage` (`simulelec.platine.<id>`) ;
 *  - l'état est préparé pour le câblage : matériel du corrigé choisi, appareils posés, étape
 *    Câblage — pose, EPI, consignation et mesures hors tension ne sont pas demandés ici ;
 *  - le câblage passe par `clickTerminal` / `assist` (liaisons refusées comptées), la mise
 *    sous tension par `deviceClick` (organes `q1`, `f2`, `f3` et organes supplémentaires) ;
 *  - l'essai fonctionnel est évalué sur le câblage réel par `CablageReelModeles.ts`.
 *
 * ATTENTION : `useParcours` est un singleton global. Monter ce composant réinitialise le
 * parcours en cours dans l'onglet (c'est sans conséquence sur la page d'un sujet, où aucun
 * autre TP n'est ouvert ; le parcours `/tp/<id>` rappelle lui-même `init` à son montage).
 * Deux `CablageReel` ne doivent pas être montés en même temps.
 */
import React from 'react';
import type { PlatineResultat } from '@/lib/sujet/types';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { tpById } from '@/lib/data/tps';
import { ETAPE, isWired, normalizeState, requiredLiaisons } from '@/lib/sim/progress';
import { repereLiaison } from '@/lib/sim/reperes';
import { terminalLabel } from '@/lib/sim/layout';
import { PANEL_W, sceneOf } from '@/lib/scene/geometry';
import Panel from '@/components/panel/Panel';
import Workspace from '@/components/panel/Workspace';
import { useTpItems } from '@/components/panel/useTpItems';
import {
  ConfirmDialog, UndoBar, WireContextMenu, WireToolbar, useWireShortcuts,
} from '@/components/panel/WireTools';
import TableauCablage from '@/components/parcours/TableauCablage';
import { deviceStateOf } from '@/components/parcours/panelState';
import { Toast } from '@/components/ui';
import { panelWires, useParcours, wireLabel } from '@/app/tp/[id]/store';
import { MODELES, organeFerme, type Entrees, type Evaluation, type ModelePlatine, type Voyant } from './CablageReelModeles';
import '@/components/parcours/parcours.css';

export interface CablageReelProps {
  /** TP platine dédié (`TPS`, `hidden: true`). */
  tpId: string;
  /** Résultat déjà validé (copie remise ou validation antérieure). */
  resultat: PlatineResultat | null;
  /** Copie remise : lecture seule. */
  readOnly?: boolean;
  /** Appelé quand l'élève valide son câblage (relevé figé). */
  onResultat: (r: PlatineResultat) => void;
}

type Onglet = 'cabler' | 'tension' | 'essai';

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'cabler', label: '1 · Câbler' },
  { id: 'tension', label: '2 · Mettre sous tension' },
  { id: 'essai', label: '3 · Essai' },
];

/** Clé du `localStorage` de la tentative en démonstration. */
const cleDemo = (tpId: string) => `simulelec.platine.${tpId}`;

function lireDemo(tpId: string): AttemptState | null {
  try {
    const raw = window.localStorage.getItem(cleDemo(tpId));
    return raw ? normalizeState(JSON.parse(raw) as Partial<AttemptState>) : null;
  } catch {
    return null;
  }
}

function ecrireDemo(tpId: string, st: AttemptState) {
  try { window.localStorage.setItem(cleDemo(tpId), JSON.stringify(st)); } catch { /* stockage indisponible */ }
}

/**
 * Prépare la tentative pour le câblage : matériel du corrigé, appareils posés, étape Câblage.
 * Rien n'est effacé — les fils déjà posés restent. `complete` déclenche la sauvegarde.
 */
function preparer(tp: TpDefinition) {
  const s = useParcours.getState();
  const st = s.st;
  const done = { ...st.done };
  for (let i = 0; i <= ETAPE.POSE; i++) done[i] = true;
  const choices = { ...st.choices };
  for (const p of tp.postes) {
    if (choices[p.id] != null) continue;
    const i = p.options.findIndex(o => o.ok);
    if (i >= 0) choices[p.id] = i;
  }
  const placed = { ...st.placed };
  for (const sl of tp.slots) placed[sl.id] = true;
  useParcours.setState({
    st: {
      ...st, stage: ETAPE.CABLAGE, done, choices, placed,
      mode: st.mode ?? 'entrainement', startedAt: st.startedAt ?? new Date().toISOString(),
    },
  });
  s.complete(ETAPE.POSE);
}

/** Signature du câblage : les observations de l'essai ne valent que pour ce câblage-là. */
const signature = (st: AttemptState) => st.wires.map(w => [w.a, w.b].sort().join('~')).sort().join('|');

const TONE: Record<NonNullable<Voyant['tone']>, string> = {
  good: 'var(--good, #1E9E63)', accent: 'var(--accent, #E39A00)', crit: 'var(--crit, #D93A3A)',
};

function Pastille({ v }: { v: Voyant }) {
  return (
    <li className="flex items-center gap-2 text-[12.5px]">
      <i
        className="h-3 w-3 flex-none rounded-full border border-[var(--line)]"
        style={{ background: v.on ? TONE[v.tone ?? 'good'] : 'var(--surface-2)', boxShadow: v.on ? `0 0 6px ${TONE[v.tone ?? 'good']}` : undefined }}
      />
      <span className={v.on ? 'font-semibold' : 'text-muted'}>{v.label}</span>
    </li>
  );
}

function Coche({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px]">
      <span className={`mt-[1px] grid h-4 w-4 flex-none place-items-center rounded-full text-[10px] font-bold ${ok ? 'bg-good text-white' : 'border border-[var(--line)] text-muted'}`}>
        {ok ? '✓' : ''}
      </span>
      <span className={ok ? '' : 'text-muted'}>{children}</span>
    </li>
  );
}

/** Relevé figé : ce qui est enregistré dans la copie. */
function Releve({ r }: { r: PlatineResultat }) {
  const tout = r.conformes === r.total && r.sousTension && r.essai;
  return (
    <div className={`rounded-[10px] border px-3 py-2 text-[12.5px] ${tout ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface-2)]'}`}>
      <div className="mb-1 font-title text-[12px] font-semibold uppercase tracking-[.08em] text-muted">Relevé validé</div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        <li><b className="font-mono-num">{r.conformes} / {r.total}</b> liaisons conformes</li>
        <li>Mise sous tension : <b>{r.sousTension ? 'réussie' : 'non réussie'}</b></li>
        <li>Essai fonctionnel : <b>{r.essai ? 'réussi' : 'non réussi'}</b></li>
      </ul>
    </div>
  );
}

export default function CablageReel(props: CablageReelProps) {
  const tpDef = tpById(props.tpId);
  const modele = MODELES[props.tpId];
  if (!tpDef || !modele) {
    return <div className="text-[13px] text-crit">TP platine introuvable : {props.tpId}.</div>;
  }
  return <CablageReelPlatine key={props.tpId} {...props} tpDef={tpDef} modele={modele} />;
}

function CablageReelPlatine({
  tpId, resultat, readOnly = false, onResultat, tpDef, modele,
}: CablageReelProps & { tpDef: TpDefinition; modele: ModelePlatine }) {
  const s = useParcours();
  const { st, sim } = s;
  const [pret, setPret] = React.useState(false);
  const [onglet, setOnglet] = React.useState<Onglet>('cabler');
  const [edition, setEdition] = React.useState(false);
  const [entrees, setEntrees] = React.useState<Entrees>(() => ({ ...modele.entreesInitiales }));
  const [obs, setObs] = React.useState<{ sig: string; sousTension: boolean; vus: string[] }>({ sig: '', sousTension: false, vus: [] });
  const minuteries = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  // Mise en page selon la place réellement disponible (colonne de question du sujet, pas l'écran) :
  // côte à côte quand la zone est large, empilée sinon.
  const racine = React.useRef<HTMLElement>(null);
  const [large, setLarge] = React.useState(true);
  React.useEffect(() => {
    const el = racine.current;
    if (!el) return undefined;
    const mesurer = () => setLarge(el.clientWidth >= 860);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- chargement de la tentative du TP platine (singleton : voir l'en-tête)
  React.useEffect(() => {
    let vivant = true;
    setPret(false);
    void (async () => {
      await useParcours.getState().init(tpDef);
      if (!vivant || useParcours.getState().tp?.id !== tpDef.id) return;
      const g = useParcours.getState();
      if (g.offline && !g.attemptId) {
        const demo = lireDemo(tpDef.id);
        if (demo) useParcours.setState({ st: demo });
      }
      preparer(tpDef);
      setPret(true);
    })();
    return () => { vivant = false; };
  }, [tpDef]);

  // ---- démonstration : la tentative suit dans le localStorage
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const off = useParcours.subscribe((g) => {
      if (g.tp?.id !== tpDef.id || !g.offline || g.attemptId) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => ecrireDemo(tpDef.id, g.st), 400);
    });
    return () => { off(); if (t) clearTimeout(t); };
  }, [tpDef]);

  React.useEffect(() => () => { minuteries.current.forEach(clearTimeout); }, []);

  const tp = s.tp && s.tp.id === tpDef.id ? s.tp : null;
  const charge = pret && tp != null;
  const fige = resultat != null && !edition;
  const interactif = charge && !readOnly && !fige;

  const items = useTpItems(tpDef);
  const wires = React.useMemo(() => (tp ? panelWires(tp, st, sim) : []), [tp, st, sim]);
  const required = React.useMemo(() => (tp ? requiredLiaisons(tp) : []), [tp]);
  const conformes = required.filter(l => isWired(st, l)).length;

  const ev: Evaluation | null = React.useMemo(
    () => (tp ? modele.evaluer(tp, st, sim, entrees) : null),
    [tp, modele, st, sim, entrees],
  );

  // ---- observations de l'essai, pour le câblage courant
  const sig = signature(st);
  React.useEffect(() => {
    if (!ev || !charge) return;
    setObs((o) => {
      const base = o.sig === sig ? o : { sig, sousTension: false, vus: [] };
      const nouveaux = modele.observer(ev, entrees).filter(id => !base.vus.includes(id));
      const st2 = base.sousTension || ev.sousTension;
      if (!nouveaux.length && st2 === base.sousTension && base === o) return o;
      return { sig, sousTension: st2, vus: [...base.vus, ...nouveaux] };
    });
  }, [ev, modele, entrees, sig, charge]);

  const obsCourantes = obs.sig === sig ? obs : { sig, sousTension: false, vus: [] as string[] };
  const essaiOk = modele.attendus.every(a => obsCourantes.vus.includes(a.id));
  const sousTensionOk = obsCourantes.sousTension;

  // l'essai réussi est aussi noté dans la tentative du TP platine (suivi du professeur)
  const essaiReussi = s.essaiReussi;
  React.useEffect(() => { if (essaiOk && charge) essaiReussi('cablage-reel'); }, [essaiOk, charge, essaiReussi]);

  // ---- outils de câblage (mêmes gestes que l'étape Câblage du parcours)
  useWireShortcuts({
    active: interactif && onglet === 'cabler',
    hasSelection: s.selWire != null,
    onDelete: s.deleteSelectedWire,
    onUndo: s.undo,
    onRedo: s.redo,
    onEscape: () => s.selectWire(null),
  });

  const organes = modele.organes(tpDef);
  const tousFermes = organes.every(o => organeFerme(sim, o.id));

  const commande = (id: string) => {
    const c = modele.commandes.find(x => x.id === id);
    if (!c) return;
    // Bouton qui manœuvre un organe de la platine (sélecteur de marche) : même geste qu'un clic
    // sur l'appareil.
    if (c.organe) { s.deviceClick(c.organe); return; }
    setEntrees(e => c.effet(e));
    if (c.relache) {
      const relache = c.relache;
      minuteries.current.push(setTimeout(() => setEntrees(e => relache(e)), 2500));
    }
  };

  const valider = () => {
    onResultat({
      conformes, total: required.length, sousTension: sousTensionOk, essai: essaiOk,
      attemptId: s.attemptId,
    });
    setEdition(false);
  };

  const toolbar = (
    <WireToolbar
      compact
      canUndo={s.undoStack.length > 0}
      canRedo={s.redoStack.length > 0}
      canDelete={s.selWire != null}
      onUndo={s.undo}
      onRedo={s.redo}
      onDelete={s.deleteSelectedWire}
    />
  );

  /** Clic sur un appareil pendant la mise sous tension et l'essai. */
  const surAppareil = (id: string) => {
    const f = modele.surAppareil?.[id];
    if (f) { setEntrees(e => f(e)); return; }
    s.deviceClick(id);
  };

  /**
   * Récepteurs signalés sur la platine (lampe allumée, volet en course, gâche ouverte…) et
   * écrans des appareils (fréquence du variateur, tensions des trackers de l'onduleur).
   */
  const overlay = (at: (id: string) => { x: number; y: number } | null) => (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible', pointerEvents: 'none', zIndex: 30 }}>
      {(ev?.afficheurs ?? []).map((a) => {
        const p = at(a.ancre.borne);
        if (!p) return null;
        const x = p.x + a.ancre.dx, y = p.y + a.ancre.dy;
        const pas = Math.min(15, (a.h - 4) / Math.max(1, a.lignes.length));
        return (
          <g key={a.id} data-afficheur={a.id}>
            <rect x={x} y={y} width={a.w} height={a.h} rx={3} fill={a.eteint ? '#101418' : '#0f2317'} />
            {!a.eteint && a.lignes.map((l, i) => (
              <text
                key={i} x={x + a.w / 2} y={y + 3 + pas * (i + 0.78)} textAnchor="middle"
                fontSize={i === 1 ? Math.min(13, pas) : Math.min(9, pas - 1)} fontWeight={i === 1 ? 700 : 500}
                fontFamily="var(--font-mono), monospace" fill="#6dff9e"
              >
                {l}
              </text>
            ))}
          </g>
        );
      })}
      {(ev?.recepteurs ?? []).filter(r => r.on && r.ancre).map((r) => {
        const p = at(r.ancre!.borne);
        if (!p) return null;
        const x = p.x + r.ancre!.dx, y = p.y + r.ancre!.dy;
        const c = TONE[r.tone ?? 'good'];
        return (
          <g key={r.id}>
            <circle cx={x} cy={y} r={17} fill={c} opacity={0.25} />
            <circle cx={x} cy={y} r={11} fill="#fff" stroke={c} strokeWidth={2} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={c}>{r.picto ?? '●'}</text>
          </g>
        );
      })}
    </svg>
  );

  const geo = sceneOf(tpDef);
  const cabler = onglet === 'cabler' && interactif;
  const manoeuvre = (onglet === 'tension' || onglet === 'essai') && interactif;

  const panneau = (
    <Workspace
      fill
      contentHeight={geo.panelH}
      contentWidth={PANEL_W + geo.alimW + geo.porteW}
      storageKey="sujet-platine"
      title={tpDef.title}
      subtitle={ONGLETS.find(o => o.id === onglet)?.label}
      indicator={`${conformes} / ${required.length} liaisons`}
      actions={cabler ? toolbar : undefined}
      dock={cabler && tp ? (
        <TableauCablage tp={tp} st={st} wires={wires} variant="dock" onNext={() => setOnglet('tension')} onAssist={s.assist} showAssist />
      ) : undefined}
      dockTitle="Tableau de câblage"
    >
      {tp ? (
        <Panel
          tp={tp}
          items={items}
          wires={wires}
          cover={false}
          marks
          fixedScale
          deviceState={{ ...deviceStateOf(sim, tp), ...(ev?.etats ?? {}) }}
          motorRpm={ev?.rpm ?? 0}
          aimed={cabler ? s.aimed : null}
          pickTerminals={cabler}
          onTerminal={cabler ? s.clickTerminal : undefined}
          selectedWire={cabler ? s.selWire : null}
          onWire={cabler ? s.selectWire : undefined}
          onWireLongPress={cabler ? s.openWireMenu : undefined}
          onDevice={manoeuvre ? surAppareil : undefined}
          overlay={overlay}
        />
      ) : <div />}
    </Workspace>
  );

  /* ------------------------------------------------------------ colonne de gauche */

  const colonne = (() => {
    if (!charge || !tp) return <p className="text-[12.5px] text-muted">Chargement de la platine…</p>;
    if (!interactif) {
      return (
        <div className="flex flex-col gap-2">
          {resultat ? <Releve r={resultat} /> : <p className="text-[12.5px] text-muted">Aucun relevé validé.</p>}
          <p className="text-[12px] text-muted">
            {readOnly ? 'Copie remise : la platine est en lecture seule.' : 'Le relevé ci-dessus est celui de ta copie.'}
          </p>
          {!readOnly && resultat && (
            <button type="button" className="min-h-touch rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] font-semibold" onClick={() => setEdition(true)}>
              Reprendre le câblage
            </button>
          )}
        </div>
      );
    }
    if (onglet === 'cabler') {
      return (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[12px] text-muted">
            Clique une borne puis l&apos;autre, comme au tableau de câblage. Une liaison hors schéma est refusée
            et comptée en erreur. L&apos;assistance pose la liaison suivante.
          </p>
          {toolbar}
          <TableauCablage tp={tp} st={st} wires={wires} variant="dock" onNext={() => setOnglet('tension')} onAssist={s.assist} showAssist />
        </div>
      );
    }
    if (onglet === 'tension') {
      return (
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-[12px] text-muted">Ferme les organes (clique l&apos;appareil sur la platine ou le bouton), de l&apos;amont vers l&apos;aval.</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {organes.map(o => {
              const f = organeFerme(sim, o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => s.deviceClick(o.id)}
                    aria-pressed={f}
                    className={`flex min-h-touch w-full items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-[12.5px] ${f ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}
                  >
                    <b className={`w-6 flex-none text-center font-mono-num ${f ? 'text-good' : 'text-muted'}`}>{f ? 'I' : 'O'}</b>
                    <span className="flex-1">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div
            className={`rounded-[10px] px-3 py-2 text-center font-title text-[14px] font-bold tracking-[.12em] ${ev?.sousTension ? 'bg-good text-white' : tousFermes ? 'bg-crit/15 text-crit' : 'bg-[var(--surface-2)] text-muted'}`}
            role="status"
          >
            {ev?.sousTension ? 'SOUS TENSION' : tousFermes ? 'ALIMENTATION INCOMPLÈTE' : 'HORS TENSION'}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">{(ev?.alim ?? []).map(v => <Pastille key={v.id} v={v} />)}</ul>
          {tousFermes && !ev?.sousTension && (
            <p className="m-0 text-[12px] text-crit">Organes fermés, mais une alimentation manque : reprends le câblage.</p>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2.5">
        <p className="m-0 text-[12px] text-muted">{modele.consigne}</p>
        {!ev?.sousTension && (
          <p className="m-0 rounded-[8px] bg-warn/15 px-2 py-1 text-[12px]">L&apos;installation n&apos;est pas sous tension : passe d&apos;abord par l&apos;onglet 2.</p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {modele.commandes.map(c => {
            const actif = c.actif?.(entrees, sim) ?? false;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => commande(c.id)}
                aria-pressed={actif}
                className={`flex min-h-touch flex-col items-start rounded-[10px] border px-2 py-1.5 text-left text-[12px] ${actif ? 'border-accent bg-accent/15' : 'border-[var(--line)] bg-[var(--surface)]'}`}
              >
                <b>{c.label}</b>
                {c.sub && <span className="text-[10.5px] text-muted">{c.sub}</span>}
              </button>
            );
          })}
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">{(ev?.recepteurs ?? []).map(v => <Pastille key={v.id} v={v} />)}</ul>
        <div className="font-title text-[11.5px] font-semibold uppercase tracking-[.08em] text-muted">Fiche d&apos;essai</div>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {modele.attendus.map(a => <Coche key={a.id} ok={obsCourantes.vus.includes(a.id)}>{a.label}</Coche>)}
        </ul>
      </div>
    );
  })();

  return (
    <section ref={racine} className="cablage-reel rounded-[12px] border border-[var(--line)] bg-[var(--surface)]" data-testid="cablage-reel" data-tp={tpId}>
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="font-title text-[13px] font-semibold uppercase tracking-[.08em] text-accent">Câblage réel sur la platine</div>
          <div className="truncate text-[12px] text-muted">{tpDef.title}</div>
        </div>
        {interactif && (
          <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Étapes du câblage réel">
            {ONGLETS.map(o => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={onglet === o.id}
                onClick={() => setOnglet(o.id)}
                className={`min-h-[36px] rounded-full border px-3 text-[12px] font-semibold ${onglet === o.id ? 'border-ink bg-ink text-[var(--app)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}
              >
                {o.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="grid gap-0" style={{ gridTemplateColumns: large ? '270px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
        <aside className={`overflow-y-auto border-[var(--line)] p-3 ${large ? 'max-h-[520px] border-r' : 'max-h-[300px] border-b'}`}>
          {colonne}
        </aside>
        <div className="flex h-[520px] min-w-0 flex-col p-2">{panneau}</div>
      </div>

      {interactif && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] px-3 py-2 text-[12.5px]">
          <span className="font-mono-num"><b>{conformes} / {required.length}</b> liaisons</span>
          <span className={sousTensionOk ? 'font-semibold text-good' : 'text-muted'}>{sousTensionOk ? '✓' : '○'} mise sous tension</span>
          <span className={essaiOk ? 'font-semibold text-good' : 'text-muted'}>{essaiOk ? '✓' : '○'} essai</span>
          {s.selTerminal && onglet === 'cabler' && (
            <span className="text-muted">· borne {terminalLabel(tp as TpDefinition, s.selTerminal)} sélectionnée</span>
          )}
          {s.selWire != null && onglet === 'cabler' && wires[s.selWire] && (
            <span className="text-muted">· fil {wireLabel(tp as TpDefinition, wires[s.selWire])} sélectionné</span>
          )}
          <button
            type="button"
            onClick={valider}
            className="ml-auto min-h-touch rounded-[10px] px-4 text-[13px] font-bold text-white"
            style={{ background: '#141A21' }}
            data-testid="valider-cablage"
          >
            Valider mon câblage
          </button>
        </footer>
      )}

      {cabler && s.wireMenu && (
        <WireContextMenu x={s.wireMenu.x} y={s.wireMenu.y} onDelete={() => s.deleteWire(s.wireMenu!.index)} onCancel={s.closeWireMenu} />
      )}
      {cabler && <UndoBar message={s.undoNotice} onUndo={s.undo} onDismiss={s.dismissUndoNotice} />}
      {cabler && (s.confirmScope === 'stage' || s.confirmScope === 'all') && (
        <ConfirmDialog
          title={s.confirmScope === 'all' ? 'Tout recâbler ?' : 'Effacer ces fils ?'}
          body={<p>Les fils que tu as posés {s.confirmScope === 'all' ? 'sur la platine' : 'dans ce circuit'} seront retirés. Tu peux revenir en arrière avec « Annuler ».</p>}
          confirmLabel={s.confirmScope === 'all' ? 'Tout recâbler' : 'Effacer ces fils'}
          danger={false}
          busy={false}
          onConfirm={() => void s.confirmReset()}
          onCancel={() => s.askReset(null)}
        />
      )}
      <Toast message={s.toast} />
      <span className="sr-only" aria-live="polite">
        {required.find(l => !isWired(st, l)) && tp ? `Fil suivant : ${repereLiaison(tp, required.find(l => !isWired(st, l))!)}` : ''}
      </span>
    </section>
  );
}
