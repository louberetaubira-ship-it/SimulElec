'use client';

/**
 * Essai de traversée du local à vélos, sur le modèle d'`EssaisPortail.tsx` : une
 * modale plein écran où l'élève « se déplace » dans le local, zone par zone, et
 * vérifie que l'éclairage KNX réagit comme le cahier des charges le demande — à la
 * présence ET à la luminosité, avec sa temporisation d'escalier, son canal commun
 * (L6) et le poussoir du local électrique qui n'a ni détecteur ni minuterie. La DEL
 * d'état du poussoir suit l'objet d'ACQUITTEMENT (DTR 21, C.4.3) : elle s'allume quand
 * l'actionneur confirme que le canal 8 est à ON, pas au simple appui sur la touche.
 *
 * La carte zone ↔ détecteur ↔ canal ↔ luminaire vient de `tp.knxZones` (la même
 * table que le wizard de mise en service utilise à l'onglet Liaisons) : rien n'est
 * dupliqué ici, seule la disposition du plan (purement visuelle) est propre à ce
 * composant.
 */
import React from 'react';
import type { KnxZone } from '@/lib/types';
import { ESSAIS_KNX_LOCAL } from '@/lib/sim/progress';

/** Disposition du plan (purement visuelle), par identifiant de zone. */
const POS: Record<string, { x: number; y: number }> = {
  z12: { x: 20, y: 20 }, z34: { x: 20, y: 130 },
  circ2: { x: 160, y: 20 }, circ1: { x: 160, y: 130 },
  z56: { x: 300, y: 20 }, z78: { x: 300, y: 130 },
};

export default function EssaiKnxLocal({ zones, faits, onReussi, onClose }: {
  zones: KnxZone[];
  faits: Record<string, boolean> | undefined;
  onReussi: (id: string) => void;
  onClose: () => void;
}) {
  const [lux, setLux] = React.useState(20);
  const [eleve, setEleve] = React.useState<string | null>(null);
  const [onL, setOnL] = React.useState<Record<string, boolean>>({});
  const [l8, setL8] = React.useState(false);
  const l6Par = React.useRef<Set<string>>(new Set());
  const [conseil, setConseil] = React.useState(
    'Clique une zone du plan pour y déplacer l’élève. Il fait sombre : les détecteurs doivent allumer la zone où il se trouve.',
  );

  const jour = lux > 60;
  const reussi = React.useRef(onReussi);
  reussi.current = onReussi;

  const visiter = (z: KnxZone) => {
    setEleve(z.id);
    if (jour) {
      reussi.current('knx-jour');
      setConseil(`${z.detecteur} détecte l’élève, mais la luminosité mesurée est suffisante : rien ne s’allume. C’est l’économie d’énergie voulue.`);
      return;
    }
    setOnL(prev => {
      const next = { ...prev };
      for (const l of z.luminaires) next[l] = true;
      return next;
    });
    reussi.current('knx-nuit');
    if (z.luminaires.includes('L6')) {
      l6Par.current.add(z.detecteur);
      if (l6Par.current.size >= 2) reussi.current('knx-l6');
    }
    setConseil(`${z.detecteur} détecte l’élève : ${z.luminaires.join(' et ')} ${z.luminaires.length > 1 ? 's’allument' : 's’allume'}.`);
  };

  const attendre = () => {
    const any = Object.values(onL).some(Boolean);
    setOnL({});
    if (any) reussi.current('knx-min');
    setConseil(any
      ? 'Minuterie écoulée sans présence : les canaux 1 à 7 retombent. L8 (canal 8, commutation simple) reste comme il est.'
      : 'Rien n’était allumé par détection.');
  };

  const bp1 = () => {
    setL8(true);
    setConseil('Touche 1 : télégramme ON (valeur 1) vers le canal 8, L8 s’allume — commutation simple, pas de détecteur, pas de minuterie. L’actionneur acquitte : la DEL d’état du poussoir s’allume.');
  };
  const bp2 = () => {
    if (l8) reussi.current('knx-bp');
    setL8(false);
    setConseil(l8
      ? 'Touche 2 : télégramme OFF (valeur 0) vers le canal 8, L8 s’éteint — et la DEL d’état avec lui : elle suit l’état de la lampe, retourné par l’actionneur.'
      : 'Touche 2 : L8 était déjà éteint, la DEL d’état aussi. Allume d’abord avec la touche 1.');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/55 p-3" data-essai-knx>
      <div className="w-full max-w-[1100px] rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 font-title text-[20px] font-semibold">Essai · traversée du local à vélos</h3>
          <button type="button" onClick={onClose} data-essai-knx-close className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[13px] font-semibold">✕ Fermer</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <svg viewBox="0 0 440 330" className="block h-auto w-full rounded-xl">
              <rect x={2} y={2} width={436} height={326} rx={8} fill={jour ? '#FFFBE8' : '#2B3340'} />
              {zones.filter(z => POS[z.id]).map(z => {
                const p = POS[z.id];
                const on = eleve === z.id;
                return (
                  <g key={z.id} data-essai-zone={z.id} onClick={() => visiter(z)} style={{ cursor: 'pointer' }}>
                    <rect x={p.x} y={p.y} width={120} height={90} rx={6} fill={jour ? '#fff' : '#3A4452'} stroke="#8A94A3" />
                    <text x={p.x + 6} y={p.y + 16} fontSize={10} fill={jour ? '#5D6878' : '#CFD6DF'}>{z.label} · {z.detecteur}</text>
                    {z.luminaires.filter(l => l !== 'L6').map((l, i) => (
                      <g key={l}>
                        <circle
                          cx={p.x + 30 + i * 40} cy={p.y + 58} r={11}
                          fill={onL[l] ? '#FFD54A' : '#6B7684'}
                          style={onL[l] ? { filter: 'drop-shadow(0 0 8px #FFD54A)' } : undefined}
                        />
                        <text x={p.x + 24 + i * 40} y={p.y + 84} fontSize={9} fill={jour ? '#141A21' : '#fff'}>{l}</text>
                      </g>
                    ))}
                    {on && <circle cx={p.x + 98} cy={p.y + 12} r={5} fill="#2F6FD1" />}
                  </g>
                );
              })}
              {/* L6, luminaire commun aux deux circulations : un point unique, jamais dupliqué */}
              <circle cx={220} cy={125} r={11} fill={onL.L6 ? '#FFD54A' : '#6B7684'} style={onL.L6 ? { filter: 'drop-shadow(0 0 8px #FFD54A)' } : undefined} />
              <text x={235} y={129} fontSize={9} fill={jour ? '#141A21' : '#fff'}>L6 commun</text>
              <rect x={20} y={240} width={280} height={70} rx={6} fill={jour ? '#fff' : '#3A4452'} stroke="#8A94A3" />
              <text x={28} y={258} fontSize={10} fill={jour ? '#5D6878' : '#CFD6DF'}>Local électrique · BP (canal 8, pas de détecteur)</text>
              <circle cx={70} cy={288} r={12} fill={l8 ? '#FFD54A' : '#6B7684'} style={l8 ? { filter: 'drop-shadow(0 0 8px #FFD54A)' } : undefined} />
              <text x={88} y={292} fontSize={9} fill={jour ? '#141A21' : '#fff'}>L8</text>
              {/* poussoir BP et sa DEL d'état (retour d'état de l'actionneur, canal 8) */}
              <rect x={150} y={266} width={28} height={36} rx={3} fill="#FAFAFA" stroke="#8A94A3" />
              <line x1={164} y1={268} x2={164} y2={300} stroke="#CDD2D8" />
              <circle
                cx={164} cy={284} r={3.2} data-essai-del={l8 ? 'on' : 'off'}
                fill={l8 ? '#35E36A' : '#3A4047'}
                style={l8 ? { filter: 'drop-shadow(0 0 4px #35E36A)' } : undefined}
              />
              <text x={184} y={281} fontSize={8.5} fill={jour ? '#141A21' : '#fff'}>BP</text>
              <text x={184} y={293} fontSize={8} fill={jour ? '#5D6878' : '#CFD6DF'}>DEL d&apos;état {l8 ? 'allumée' : 'éteinte'}</text>
            </svg>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[12px] text-muted">Luminosité extérieure</span>
              <input
                type="range" min={0} max={100} value={lux}
                onChange={e => setLux(Number(e.target.value))}
                data-essai-lux
                className="h-touch flex-1 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono-num text-[12px]">{lux}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" data-essai-bp1 onClick={bp1} className="min-h-touch rounded-lg bg-[#1B222C] px-3 text-[12.5px] font-semibold text-white">BP touche 1 (ON)</button>
              <button type="button" data-essai-bp2 onClick={bp2} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">BP touche 2 (OFF)</button>
              <button type="button" data-essai-wait onClick={attendre} className="min-h-touch rounded-lg border border-[var(--line)] px-3 text-[12.5px] font-semibold">Attendre 5 min (minuterie)</button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div>
              <b className="text-[13px]">Fiche d&apos;essais</b>
              <div className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
                {ESSAIS_KNX_LOCAL.map(e => (
                  <div key={e.id} data-fiche={e.id}>{faits?.[e.id] ? <span className="font-bold text-good">☑</span> : '☐'} {e.label}</div>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-[#1B222C] p-2.5 text-[12.5px] text-[#E9EEF5]">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent font-bold text-[#141A21]">P</span>
              <span>{conseil}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
