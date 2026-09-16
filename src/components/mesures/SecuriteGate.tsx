'use client';

/**
 * Verrou de sécurité des mesures SOUS TENSION (NF C 18-510).
 * L'élève choisit ses EPI/EIS et confirme l'état du matériel. Tant que
 * l'équipement n'est pas bon (matériel manquant, choix inadapté, ou contrôle
 * d'état non confirmé), la mesure reste bloquée.
 */
import React from 'react';
import { Note } from '@/components/ui';
import {
  SECU_CHECKS, SECU_EQUIP, secuVerdict, type SecuState,
} from '@/lib/sim/securite';

export interface SecuriteGateProps {
  secu: SecuState;
  onToggleEquip: (id: string) => void;
  onToggleCheck: (id: string) => void;
}

export default function SecuriteGate({ secu, onToggleEquip, onToggleCheck }: SecuriteGateProps) {
  const v = secuVerdict(secu);
  const equip = secu.equip ?? {};
  const checks = secu.checks ?? {};

  return (
    <div className="flex flex-col gap-3">
      {/* 1 · Choix EPI / EIS ------------------------------------------------ */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          1 · Équipements pour l&apos;opération sous tension
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SECU_EQUIP.map(e => {
            const on = !!equip[e.id];
            const bad = on && !!e.wrong;
            const good = on && !!e.req;
            return (
              <button
                key={e.id}
                type="button"
                data-secu-equip={e.id}
                onClick={() => onToggleEquip(e.id)}
                aria-pressed={on}
                className={`flex min-h-touch items-start gap-2 rounded-[10px] border px-2 py-1.5 text-left text-[12px] ${
                  bad ? 'border-crit bg-crit/10'
                    : good ? 'border-good bg-good/10 font-semibold'
                      : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <span className="text-[18px] leading-none" aria-hidden>{e.icon}</span>
                <span className="min-w-0 flex-1">
                  {e.name}
                  <small className="block text-muted">{e.desc}</small>
                </span>
                <span className={`ml-auto ${bad ? 'text-crit' : 'text-good'}`}>
                  {bad ? '✕' : on ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        {v.bad.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {v.bad.map(e => (
              <Note key={e.id} className="text-crit">
                <b>{e.name.split(' (')[0]} — inadapté.</b> {e.why}
              </Note>
            ))}
          </div>
        )}
      </div>

      {/* 2 · Contrôle de l'état du matériel -------------------------------- */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          2 · Le matériel est-il en bon état ?
        </div>
        <Note className="mb-1.5">
          Gants et tapis isolants n&apos;ont <b>pas de date de péremption</b>, mais une
          validité d&apos;essai à respecter. Un équipement usagé se rebute :
          craquelure, coupure, trace de brûlure, gonflement ou collage → mise au rebut.
        </Note>
        <div className="flex flex-col gap-1">
          {SECU_CHECKS.map(k => {
            const on = !!checks[k.id];
            return (
              <label
                key={k.id}
                data-secu-check={k.id}
                className={`flex min-h-touch cursor-pointer items-start gap-2 rounded-[10px] border px-2 py-1.5 text-[12px] ${
                  on ? 'border-good bg-good/10' : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleCheck(k.id)}
                  className="mt-0.5 h-touch w-touch accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  {k.title}
                  {k.hint && <small className="block text-muted">{k.hint}</small>}
                </span>
                <span className="ml-auto text-good">{on ? '✓' : ''}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Verdict ----------------------------------------------------------- */}
      {v.ok ? (
        <Note className="text-good">
          Équipement adapté, complet et contrôlé — tu peux réaliser la mesure sous tension.
        </Note>
      ) : (
        <Note className="text-crit">
          <b>Mesure bloquée.</b>{' '}
          {v.bad.length > 0
            ? 'Retire le matériel inadapté.'
            : v.missing.length > 0
              ? 'Complète les EPI/EIS nécessaires.'
              : 'Confirme les contrôles d\'état du matériel.'}
        </Note>
      )}
    </div>
  );
}
