'use client';

/**
 * Étape POSE d'un TP réseau : composer l'armoire 19" (corrigé D.2.1).
 *
 * L'élève prend un élément dans la palette, puis clique le U où il le pose (le U du haut de
 * l'élément). Une pose à contresens est refusée avec sa raison et compte une erreur de pose,
 * comme un appareil posé sur le mauvais rail. Tolérance documentée dans le TP : les deux
 * passe-fils sont interchangeables, les deux réserves 2 U aussi.
 */
import React from 'react';
import type { AttemptState, TpDefinition } from '@/lib/types';
import { Button, Card, Note, SideTitle } from '@/components/ui';
import { occupant, rackComplet } from '@/lib/sim/reseau';
import { Center, Hint, Side } from '@/components/parcours/StageLayout';

interface Props {
  tp: TpDefinition;
  st: AttemptState;
  onPlace: (id: string, debut: number) => void;
  onNext: () => void;
}

const H_U = 34;

export default function ArmoireReseau({ tp, st, onPlace, onNext }: Props) {
  const def = tp.reseau!;
  const rack = st.reseau?.rack ?? {};
  const [sel, setSel] = React.useState<string | null>(null);
  const restant = def.rack.filter(r => rack[r.id] == null);
  const fait = rackComplet(def, st);
  const usedU = def.rack.filter(r => rack[r.id] != null).reduce((a, r) => a + r.u, 0);

  const poser = (n: number) => {
    if (!sel) return;
    onPlace(sel, n);
    setSel(null);
  };

  const panneau = (
    <>
      <SideTitle>Composer l&apos;armoire 19&quot;</SideTitle>
      <Note>
        D.2.1 : {def.rackU} U au total, réserves comprises. Choisis un élément dans la palette, puis clique le U où
        poser son bord supérieur. Le switch est encadré par deux passe-fils, le NAS a besoin d&apos;une tablette 2 U.
      </Note>
      <Card title={`Palette · ${restant.length} élément${restant.length > 1 ? 's' : ''}`}>
        <div className="flex flex-col gap-1.5">
          {restant.map(r => (
            <button
              key={r.id}
              type="button"
              data-rack-item={r.id}
              onClick={() => setSel(sel === r.id ? null : r.id)}
              className={`flex min-h-touch items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-[12px] ${
                sel === r.id ? 'border-accent bg-accent/15 font-semibold' : 'border-[var(--line)] bg-[var(--surface)]'
              }`}
            >
              <span>{r.label}{r.ref ? <span className="ml-1 font-mono-num text-[11px] text-muted">{r.ref}</span> : null}</span>
              <span className="font-mono-num text-[11px]">{r.u} U</span>
            </button>
          ))}
          {restant.length === 0 && <Note>Tout est posé.</Note>}
        </div>
      </Card>
      <Card title="Occupation">
        <div className="font-mono-num text-[18px]">{usedU} / {def.rackU} U</div>
        <Note>{st.poseErrors} erreur{st.poseErrors > 1 ? 's' : ''} de pose</Note>
      </Card>
      {fait && (
        <Button variant="primary" onClick={onNext} data-next-pose>Armoire conforme, passer au câblage</Button>
      )}
    </>
  );

  // Rangées de l'armoire : chaque élément posé occupe ses U ; les U libres sont cliquables.
  const lignes: React.ReactNode[] = [];
  for (let n = 1; n <= def.rackU; n += 1) {
    const occ = occupant(def, rack, n);
    const it = occ ? def.rack.find(r => r.id === occ)! : null;
    if (it && rack[it.id] !== n) continue; // U intermédiaire d'un élément de 2 U
    const h = it ? it.u * H_U + (it.u - 1) * 3 : H_U;
    lignes.push(
      <div key={n} className="contents">
        <div className="flex items-center justify-center font-mono-num text-[11px] text-muted" style={{ height: h }}>
          {it && it.u > 1 ? `${n}–${n + it.u - 1}` : n}
        </div>
        {it ? (
          <div
            data-u-pose={n}
            className={`flex items-center justify-between rounded-md px-3 text-[12px] font-semibold ${
              it.id.startsWith('res') ? 'border border-dashed border-[#8E969E] bg-[#E6E9EE] text-muted' : 'bg-[#2B3340] text-white'
            }`}
            style={{ height: h }}
          >
            <span>{it.label}</span>
            <span className="font-mono-num text-[10.5px] opacity-80">{it.ref ?? ''} · {it.u} U</span>
          </div>
        ) : (
          <button
            type="button"
            data-u={n}
            onClick={() => poser(n)}
            disabled={!sel}
            className={`rounded-md border border-dashed text-[11.5px] ${
              sel ? 'border-accent bg-accent/10 text-ink hover:bg-accent/20' : 'border-[#8E969E] bg-[#EEF1F5] text-muted'
            }`}
            style={{ height: h }}
          >
            {sel ? `Poser ici (U${n})` : '— libre —'}
          </button>
        )}
      </div>,
    );
  }

  return (
    <>
      <Side>{panneau}</Side>
      <Center>
        <div className="w-full max-w-[560px] rounded-2xl bg-[#3C4654] p-3 shadow-md" data-armoire>
          <div className="mb-2 text-center font-title text-[15px] font-semibold uppercase tracking-wide text-white">
            Coffret LCS³ 19&quot; fixe · {def.rackU} U · profondeur 580 mm
          </div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: '44px 1fr' }}>{lignes}</div>
        </div>
        <Hint>
          {fait
            ? 'Armoire composée dans l’ordre du corrigé : obturateur, PDU, passe-fils, switch, passe-fils, panneau, réserve, tablette NAS, réserve.'
            : sel
              ? `Clique le U où poser : ${def.rack.find(r => r.id === sel)?.label}.`
              : 'Choisis un élément dans la palette.'}
        </Hint>
      </Center>
    </>
  );
}
