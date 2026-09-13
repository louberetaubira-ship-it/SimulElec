'use client';

/**
 * Tableau de câblage de l'étape 5, partagé par la colonne de gauche et par le dock du
 * mode atelier (voir `docs/maquettes/atelier-tableau-cablage.html`).
 *
 * En atelier, l'élève n'a plus la colonne : sans ce dock il perd la liaison suivante et la
 * liste de ce qu'il a posé. Le contenu n'est pas le même des deux côtés — sous la main
 * pendant le câblage, on ne garde que ce qui sert à câbler :
 *
 * | bloc                              | colonne | dock |
 * |-----------------------------------|---------|------|
 * | consignes (deux paragraphes)      | oui     | non  |
 * | Annuler / Rétablir / Supprimer    | oui     | non — déjà dans la barre haute |
 * | liaison suivante, progression     | oui     | oui  |
 * | effacer l'étape / tout recâbler   | oui     | oui  |
 * | recommencer le TP                 | oui     | non — irréversible, pas sous le doigt |
 * | fils posés, liaisons attendues    | oui     | oui  |
 *
 * Cliquer une liaison attendue allume ses deux bornes sur la platine (`aim()`), ce qui
 * évite à l'élève de chercher « XC:5 int. » à la loupe.
 */
import React from 'react';
import type { AttemptState, Liaison, TpDefinition } from '@/lib/types';
import { Button, Note, SideTitle } from '@/components/ui';
import { isWired, requiredLiaisons, wiringComplete } from '@/lib/sim/progress';
import { NET_COLOR } from '@/lib/scene/geometry';
import type { PanelWire } from '@/components/panel/Panel';
import { WireToolButton } from '@/components/panel/WireTools';
import { useParcours, wireLabel } from '@/app/tp/[id]/store';
import { repereLiaison } from '@/lib/sim/reperes';

export interface TableauProps {
  tp: TpDefinition;
  st: AttemptState;
  wires: PanelWire[];
  /** `colonne` : hors plein écran. `dock` : panneau de gauche du mode atelier. */
  variant: 'colonne' | 'dock';
  /** Barre Annuler / Rétablir / Supprimer (colonne seulement). */
  toolbar?: React.ReactNode;
  onNext: () => void;
  onAssist?: () => void;
  showAssist?: boolean;
}

/** Progression + erreurs, en chiffres alignés. */
function Compteur({ done, total, st }: { done: number; total: number; st: AttemptState }) {
  return (
    <div className="flex items-center gap-2 font-mono-num text-[11.5px]">
      <span className="flex-none">{done} / {total}</span>
      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <i className="block h-full bg-good transition-all" style={{ width: `${total ? done / total * 100 : 0}%` }} />
      </span>
      {st.wireErrors > 0 && (
        <span className="flex-none font-semibold text-crit">
          {st.wireErrors} erreur{st.wireErrors > 1 ? 's' : ''}
        </span>
      )}
      {(st.wiresRemoved ?? 0) > 0 && (
        <span className="flex-none text-muted">{st.wiresRemoved} retiré{(st.wiresRemoved ?? 0) > 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

export default function TableauCablage({
  tp, st, wires, variant, toolbar, onNext, onAssist, showAssist = false,
}: TableauProps) {
  const dock = variant === 'dock';
  const required = requiredLiaisons(tp);
  const doneCount = required.filter(l => isWired(st, l)).length;
  const complete = wiringComplete(tp, st);
  const next = required.find(l => !isWired(st, l));

  const selWire = useParcours(s => s.selWire);
  const aimed = useParcours(s => s.aimed);
  const selectWire = useParcours(s => s.selectWire);
  const deleteWire = useParcours(s => s.deleteWire);
  const askReset = useParcours(s => s.askReset);
  const aim = useParcours(s => s.aim);

  const isAimed = (l: Liaison) => aimed != null && aimed[0] === l.a && aimed[1] === l.b;

  return (
    <>
      {!dock && (
        <>
          <SideTitle>Tableau de câblage</SideTitle>
          <Note>
            Clique une borne puis l&apos;autre : le fil prend la couleur du conducteur et chemine dans les
            goulottes. Une liaison hors tableau est refusée et comptée en erreur. Le réseau → X1 et le câble
            moteur sont déjà posés par l&apos;installateur.
          </Note>
          <Note>
            Tu t&apos;es trompé ? Clique un fil sur la platine pour le sélectionner, puis « Supprimer le fil »
            (ou la touche <b>Suppr</b>). Sur téléphone, garde le doigt appuyé sur le fil.
          </Note>
          {toolbar}
        </>
      )}

      {next ? (
        <div className="rounded-[10px] border border-accent bg-accent/10 px-2 py-1.5 font-mono-num text-[12px]">
          <span className="block text-[9.5px] font-semibold uppercase tracking-[.12em] text-accent">
            Fil suivant
          </span>
          {repereLiaison(tp, next)} <span className="text-muted">({next.net})</span>
        </div>
      ) : (
        <div className="rounded-[10px] border border-good bg-good/10 px-2 py-1.5 text-[12px]">
          <span className="block font-mono-num text-[9.5px] font-semibold uppercase tracking-[.12em] text-good">
            Câblage terminé
          </span>
          Passe aux tests hors tension.
        </div>
      )}

      <Compteur done={doneCount} total={required.length} st={st} />

      <div className="wt-bar">
        <WireToolButton data-testid={dock ? 'dock-reset-stage' : 'reset-stage'} onClick={() => askReset('stage')}>
          Effacer les fils de cette étape
        </WireToolButton>
        <WireToolButton data-testid={dock ? 'dock-reset-all' : 'reset-all'} onClick={() => askReset('all')}>
          Tout recâbler
        </WireToolButton>
        {!dock && (
          <WireToolButton data-testid="reset-tp" onClick={() => askReset('tp')}>
            Recommencer le TP
          </WireToolButton>
        )}
      </div>

      {showAssist && onAssist && (
        <Button size="sm" onClick={onAssist}>Câblage assisté</Button>
      )}

      <SideTitle>Fils posés · {wires.length}</SideTitle>
      <div
        className={`flex flex-col gap-1 overflow-y-auto ${dock ? 'max-h-[190px]' : 'max-h-[26vh] lg:max-h-[220px]'}`}
        data-testid={dock ? 'dock-wire-list' : 'wire-list'}
      >
        {wires.length === 0 && <Note>Aucun fil sur la platine pour l&apos;instant.</Note>}
        {wires.map((w, i) => (
          <div
            key={`${w.a}~${w.b}`}
            data-testid="wire-row"
            data-selected={selWire === i ? 'on' : 'off'}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 font-mono-num text-[11.5px] ${selWire === i ? 'border-accent bg-accent/10' : 'border-[var(--line)] bg-[var(--surface)]'}`}
          >
            <button
              type="button"
              className="flex min-h-touch flex-1 items-center gap-2 text-left"
              onClick={() => selectWire(i)}
              aria-pressed={selWire === i}
            >
              <i className="h-1.5 w-4 flex-none rounded-sm" style={{ background: NET_COLOR[w.net] }} />
              <span className="min-w-0 flex-1 truncate">{wireLabel(tp, w)}</span>
            </button>
            {w.prewired ? (
              <span className="flex-none rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[.04em] text-muted">
                pré-câblé
              </span>
            ) : (
              <button
                type="button"
                data-testid="wire-remove"
                className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[15px] font-bold text-crit hover:bg-[var(--surface-2)]"
                aria-label={`Supprimer le fil ${wireLabel(tp, w)}`}
                onClick={() => deleteWire(i)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <SideTitle>Liaisons attendues · {required.length - doneCount} restantes</SideTitle>
      {/* dans le dock, c'est le panneau qui défile : pas de second ascenseur imbriqué */}
      <div className={`flex flex-col gap-1 ${dock ? '' : 'max-h-[36vh] overflow-y-auto lg:max-h-[300px]'}`}>
        {required.map(l => {
          const d = isWired(st, l);
          const isNext = next === l;
          const on = isAimed(l);
          return (
            <button
              key={`${l.a}~${l.b}`}
              type="button"
              data-testid="liaison-row"
              aria-pressed={on}
              onClick={() => aim(l)}
              title="Montrer les deux bornes sur la platine"
              className={`flex min-h-touch items-center gap-2 rounded-lg border px-2 py-1.5 text-left font-mono-num text-[11.5px] ${on ? 'border-accent bg-accent/10' : d ? 'border-[var(--line)] bg-[var(--surface)] line-through opacity-55' : isNext ? 'border-accent bg-[var(--surface)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}
            >
              <i className="h-1 w-3 flex-none rounded-sm" style={{ background: NET_COLOR[l.net] }} />
              <span className="min-w-0 flex-1 truncate">{repereLiaison(tp, l)}</span>
              {l.door && <span className="flex-none text-[10px] text-muted">porte</span>}
            </button>
          );
        })}
      </div>

      {complete && (
        <Button variant="primary" onClick={onNext}>Câblage terminé, passer aux tests</Button>
      )}
    </>
  );
}
