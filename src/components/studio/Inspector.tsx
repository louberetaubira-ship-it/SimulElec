'use client';

/**
 * Colonne de droite du studio : matériel, postes de choix, liaisons attendues, mesures,
 * compétences et réglages du TP.
 */
import React from 'react';
import type { ExpectedMeasure, Poste, PosteOption, SceneKind } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { DIPLOMAS, DOMAIN_LABEL, type DiplomaId, type Domain } from '@/lib/data/competences';
import { RAILS } from '@/lib/scene/geometry';
import { NET_LIST, terminalsOf, type TerminalRef } from './model';
import { competenceCodes, useStudio, type StudioTab } from './store';

const TABS: { id: StudioTab; label: string }[] = [
  { id: 'materiel', label: 'Matériel' },
  { id: 'postes', label: 'Postes de choix' },
  { id: 'liaisons', label: 'Liaisons' },
  { id: 'mesures', label: 'Mesures' },
  { id: 'competences', label: 'Compétences' },
  { id: 'reglages', label: 'Réglages' },
];

const SCENES: { id: SceneKind; label: string }[] = [
  { id: 'ind', label: 'Industriel · armoire' },
  { id: 'hab', label: 'Habitat · tableau' },
  { id: 'ter', label: 'Tertiaire · coffret' },
  { id: 'pv', label: 'Photovoltaïque' },
];

const DOMAINS = Object.keys(DOMAIN_LABEL) as Domain[];

/** Liste déroulante de bornes, groupée par appareil. */
function TerminalSelect({
  value, onChange, terminals, label,
}: { value: string; onChange: (v: string) => void; terminals: TerminalRef[]; label: string }) {
  const groups = React.useMemo(() => {
    const out = new Map<string, TerminalRef[]>();
    for (const t of terminals) {
      const list = out.get(t.group) ?? [];
      list.push(t);
      out.set(t.group, list);
    }
    return Array.from(out.entries());
  }, [terminals]);
  return (
    <select className="st-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">— {label} —</option>
      {groups.map(([g, list]) => (
        <optgroup key={g} label={g}>
          {list.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ matériel */

function Materiel() {
  const def = useStudio((s) => s.def);
  const items = useStudio((s) => s.items);
  const sel = useStudio((s) => s.sel);
  const select = useStudio((s) => s.select);
  const remove = useStudio((s) => s.remove);
  const nudge = useStudio((s) => s.nudge);
  const patchSlot = useStudio((s) => s.patchSlot);

  const slot = sel?.kind === 'slot' ? def.slots.find((s) => s.id === sel.id) : undefined;
  const item = slot ? items[slot.key] : undefined;

  return (
    <div>
      <p className="st-sub">Clique un appareil de la platine ou de la liste pour le régler.</p>
      <div className="st-list" style={{ marginTop: 6 }} data-testid="st-slots">
        {def.slots.length === 0 && <p className="st-sub">Aucun appareil posé pour l’instant.</p>}
        {def.slots.map((s) => (
          <div key={s.id} className={`st-line${sel?.kind === 'slot' && sel.id === s.id ? ' sel' : ''}`}>
            <div className="head">
              <b>{s.rep ?? s.id}</b>
              <span className="n">{s.label}</span>
              <span className="st-tag">rail {(s.rail ?? 0) + 1}</span>
              <button type="button" className="st-mini" onClick={() => select({ kind: 'slot', id: s.id })} aria-label={`Régler ${s.rep ?? s.id}`}>⚙</button>
              <button type="button" className="st-mini danger" onClick={() => remove({ kind: 'slot', id: s.id })} aria-label={`Retirer ${s.rep ?? s.id}`}>×</button>
            </div>
          </div>
        ))}
        {(def.annexItems ?? []).map((a) => (
          <div key={`annex-${a.rep}`} className={`st-line${sel?.kind === 'annex' && sel.id === a.rep ? ' sel' : ''}`}>
            <div className="head">
              <b>{a.rep}</b>
              <span className="n">{a.name}</span>
              <span className="st-tag">annexe</span>
              <button type="button" className="st-mini" onClick={() => select({ kind: 'annex', id: a.rep })} aria-label={`Sélectionner ${a.rep}`}>⚙</button>
              <button type="button" className="st-mini danger" onClick={() => remove({ kind: 'annex', id: a.rep })} aria-label={`Retirer ${a.rep}`}>×</button>
            </div>
          </div>
        ))}
        {(def.recvItems ?? []).map((a) => (
          <div key={`recv-${a.rep}`} className={`st-line${sel?.kind === 'recv' && sel.id === a.rep ? ' sel' : ''}`}>
            <div className="head">
              <b>{a.rep}</b>
              <span className="n">{a.name}</span>
              <span className="st-tag">récepteur</span>
              <button type="button" className="st-mini" onClick={() => select({ kind: 'recv', id: a.rep })} aria-label={`Sélectionner ${a.rep}`}>⚙</button>
              <button type="button" className="st-mini danger" onClick={() => remove({ kind: 'recv', id: a.rep })} aria-label={`Retirer ${a.rep}`}>×</button>
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div className="st-card" style={{ marginTop: 10 }}>
          <h3 className="st-h">Position</h3>
          <div className="st-row">
            <button type="button" className="st-mini" onClick={() => nudge(-6)} aria-label="Déplacer vers la gauche">←</button>
            <button type="button" className="st-mini" onClick={() => nudge(6)} aria-label="Déplacer vers la droite">→</button>
            <span className="st-sub">pas de 6 px (≈ 7 mm)</span>
          </div>
        </div>
      )}

      {slot && item && (
        <div className="st-card" style={{ marginTop: 10 }}>
          <h3 className="st-h">{slot.rep ?? slot.id}</h3>
          <label className="st-field">
            <span>Repère</span>
            <input className="st-input" value={slot.rep ?? ''} onChange={(e) => patchSlot(slot.id, { rep: e.target.value })} />
          </label>
          <label className="st-field">
            <span>Désignation</span>
            <input className="st-input" value={slot.label} onChange={(e) => patchSlot(slot.id, { label: e.target.value })} />
          </label>
          <div className="st-two">
            <label className="st-field">
              <span>Rail</span>
              <select
                className="st-select"
                value={String(slot.rail ?? 0)}
                onChange={(e) => patchSlot(slot.id, { rail: Number(e.target.value) })}
              >
                {RAILS.map((_, i) => <option key={i} value={i}>Rail {i + 1}</option>)}
              </select>
            </label>
            <label className="st-field">
              <span>Largeur (px)</span>
              <input
                className="st-input"
                type="number"
                value={slot.w ?? item.w}
                onChange={(e) => patchSlot(slot.id, { w: Number(e.target.value) || item.w })}
              />
            </label>
          </div>
          <p className="st-sub" style={{ marginTop: 6 }}>
            {item.ref} · {item.terminals.length} borne{item.terminals.length > 1 ? 's' : ''} · {item.family}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ postes de choix */

function OptionEditor({
  option, index, onChange, onGood,
}: { option: PosteOption; index: number; onChange: (o: PosteOption) => void; onGood: () => void }) {
  return (
    <div className="st-line">
      <div className="head">
        <span className="st-tag">{option.ok ? 'bonne réponse' : `piège ${index + 1}`}</span>
        <button type="button" className="st-mini" onClick={onGood} aria-label="Marquer comme bonne réponse">
          {option.ok ? '★' : '☆'}
        </button>
      </div>
      <input className="st-input" value={option.ref} onChange={(e) => onChange({ ...option, ref: e.target.value })} placeholder="Référence" aria-label="Référence" />
      <input className="st-input" value={option.spec} onChange={(e) => onChange({ ...option, spec: e.target.value })} placeholder="Caractéristiques" aria-label="Caractéristiques" />
      <textarea className="st-area" style={{ minHeight: 54 }} value={option.why} onChange={(e) => onChange({ ...option, why: e.target.value })} placeholder="Justification" aria-label="Justification" />
    </div>
  );
}

function Postes() {
  const def = useStudio((s) => s.def);
  const addPoste = useStudio((s) => s.addPoste);
  const updatePoste = useStudio((s) => s.updatePoste);
  const removePoste = useStudio((s) => s.removePoste);

  const libres = def.slots.filter((s) => !def.postes.some((p) => p.id === s.id));

  const setOption = (pi: number, oi: number, o: PosteOption) => {
    const p = def.postes[pi];
    updatePoste(pi, { ...p, options: p.options.map((x, i) => (i === oi ? o : x)) });
  };
  const setGood = (pi: number, oi: number) => {
    const p: Poste = def.postes[pi];
    updatePoste(pi, {
      ...p,
      options: p.options.map((x, i) => {
        const rest: PosteOption = { key: x.key, ref: x.ref, spec: x.spec, why: x.why, ...(x.half ? { half: true } : {}) };
        return i === oi ? { ...rest, ok: true } : rest;
      }),
    });
  };

  return (
    <div>
      <p className="st-sub">
        Un poste par appareil à choisir : une bonne référence et deux pièges, chacun justifié.
      </p>
      {libres.length > 0 && (
        <div className="st-row" style={{ margin: '8px 0' }}>
          {libres.map((s) => (
            <button key={s.id} type="button" className="st-mini" onClick={() => addPoste(s.id)} data-poste={s.id}>
              + {s.rep ?? s.id}
            </button>
          ))}
        </div>
      )}
      <div className="st-list" data-testid="st-postes">
        {def.postes.map((p, pi) => (
          <div key={p.id} className="st-line">
            <div className="head">
              <b>{p.id}</b>
              <span className="n">{p.name}</span>
              <button type="button" className="st-mini danger" onClick={() => removePoste(pi)} aria-label={`Retirer le poste ${p.name}`}>×</button>
            </div>
            <input className="st-input" value={p.name} onChange={(e) => updatePoste(pi, { ...p, name: e.target.value })} aria-label="Nom du poste" />
            <input className="st-input" value={p.need} onChange={(e) => updatePoste(pi, { ...p, need: e.target.value })} placeholder="Besoin" aria-label="Besoin" />
            {p.options.map((o, oi) => (
              <OptionEditor key={oi} option={o} index={oi} onChange={(x) => setOption(pi, oi, x)} onGood={() => setGood(pi, oi)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- liaisons */

function Liaisons() {
  const def = useStudio((s) => s.def);
  const items = useStudio((s) => s.items);
  const addLiaison = useStudio((s) => s.addLiaison);
  const removeLiaison = useStudio((s) => s.removeLiaison);
  const deduce = useStudio((s) => s.deduce);
  const net = useStudio((s) => s.net);
  const setNet = useStudio((s) => s.setNet);

  const terminals = React.useMemo(() => terminalsOf(def, items), [def, items]);
  const [a, setA] = React.useState('');
  const [b, setB] = React.useState('');
  const [door, setDoor] = React.useState(false);
  const [pre, setPre] = React.useState(false);

  return (
    <div>
      <TerminalSelect value={a} onChange={setA} terminals={terminals} label="première borne" />
      <div style={{ height: 6 }} />
      <TerminalSelect value={b} onChange={setB} terminals={terminals} label="seconde borne" />
      <div className="st-row" style={{ marginTop: 6 }}>
        <select className="st-select" style={{ width: 100 }} value={net} onChange={(e) => setNet(e.target.value as typeof net)} aria-label="Conducteur">
          {NET_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <label className="st-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={door} onChange={(e) => setDoor(e.target.checked)} /> en porte
        </label>
        <label className="st-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={pre} onChange={(e) => setPre(e.target.checked)} /> installateur
        </label>
      </div>
      <div className="st-row" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="st-btn primary"
          data-testid="st-add-liaison"
          disabled={!a || !b || a === b}
          onClick={() => { addLiaison(a, b, net, { door, prewired: pre }); setA(''); setB(''); }}
        >
          Ajouter la liaison
        </button>
        <button type="button" className="st-btn" onClick={deduce} data-testid="st-deduce">Déduire du schéma</button>
      </div>

      <p className="st-sub" style={{ marginTop: 8 }}>
        {def.liaisons.length} liaison{def.liaisons.length > 1 ? 's' : ''} attendue{def.liaisons.length > 1 ? 's' : ''}
        {' · '}{def.liaisons.filter((l) => l.prewired).length} déjà câblée(s) par l’installateur
      </p>
      <div className="st-list" data-testid="st-liaisons">
        {def.liaisons.map((l, i) => (
          <div key={`${l.a}-${l.b}-${i}`} className="st-line">
            <div className="head">
              <b>{l.a}</b>
              <span className="n">→ {l.b}</span>
              <span className="st-tag">{l.net}</span>
              {l.prewired && <span className="st-tag warn">installateur</span>}
              {l.door && <span className="st-tag">porte</span>}
              <button type="button" className="st-mini danger" onClick={() => removeLiaison(i)} aria-label={`Retirer la liaison ${l.a} ${l.b}`}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- mesures */

function Mesures() {
  const def = useStudio((s) => s.def);
  const items = useStudio((s) => s.items);
  const addMesure = useStudio((s) => s.addMesure);
  const updateMesure = useStudio((s) => s.updateMesure);
  const removeMesure = useStudio((s) => s.removeMesure);
  const terminals = React.useMemo(() => terminalsOf(def, items), [def, items]);

  const dials = (m: ExpectedMeasure) => INSTRUMENTS.find((i) => i.id === m.instrument)?.dials ?? ['V~'];

  return (
    <div>
      <button type="button" className="st-btn primary" onClick={addMesure} data-testid="st-add-mesure">
        Ajouter une mesure
      </button>
      <div className="st-list" style={{ marginTop: 8 }} data-testid="st-mesures">
        {def.mesures.map((m, i) => (
          <div key={m.id} className="st-line">
            <div className="head">
              <b>{m.id}</b>
              <span className="n">{m.title}</span>
              <button type="button" className="st-mini danger" onClick={() => removeMesure(i)} aria-label={`Retirer la mesure ${m.title}`}>×</button>
            </div>
            <input className="st-input" value={m.title} onChange={(e) => updateMesure(i, { ...m, title: e.target.value })} aria-label="Titre de la mesure" />
            <div className="st-two">
              <select className="st-select" value={m.stage} onChange={(e) => updateMesure(i, { ...m, stage: e.target.value as ExpectedMeasure['stage'] })} aria-label="Moment de la mesure">
                <option value="horsTension">Hors tension</option>
                <option value="sousTension">Sous tension</option>
              </select>
              <select
                className="st-select"
                value={m.instrument}
                onChange={(e) => {
                  const instrument = e.target.value as ExpectedMeasure['instrument'];
                  const d = INSTRUMENTS.find((x) => x.id === instrument)?.dials ?? [];
                  updateMesure(i, { ...m, instrument, dial: d.includes(m.dial) ? m.dial : (d[1] ?? d[0] ?? '') });
                }}
                aria-label="Appareil de mesure"
              >
                {INSTRUMENTS.map((ins) => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
              </select>
            </div>
            <select className="st-select" value={m.dial} onChange={(e) => updateMesure(i, { ...m, dial: e.target.value })} aria-label="Position du sélecteur">
              {dials(m).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <TerminalSelect value={m.a ?? ''} onChange={(v) => updateMesure(i, { ...m, a: v })} terminals={terminals} label="borne rouge" />
            <TerminalSelect value={m.b ?? ''} onChange={(v) => updateMesure(i, { ...m, b: v })} terminals={terminals} label="borne noire" />
            <div className="st-row">
              <input className="st-input" style={{ width: 78 }} type="number" value={m.min} onChange={(e) => updateMesure(i, { ...m, min: Number(e.target.value) })} aria-label="Valeur minimale" />
              <input className="st-input" style={{ width: 78 }} type="number" value={m.max} onChange={(e) => updateMesure(i, { ...m, max: Number(e.target.value) })} aria-label="Valeur maximale" />
              <input className="st-input" style={{ width: 70 }} value={m.unit} onChange={(e) => updateMesure(i, { ...m, unit: e.target.value })} aria-label="Unité" />
              <select
                className="st-select"
                style={{ width: 120 }}
                value={m.when ?? ''}
                onChange={(e) => updateMesure(i, { ...m, when: (e.target.value || undefined) as ExpectedMeasure['when'] })}
                aria-label="Condition"
              >
                <option value="">sans condition</option>
                <option value="ctl">commande sous tension</option>
                <option value="run">moteur en marche</option>
                <option value="off">hors tension</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- compétences */

function Competences() {
  const domains = useStudio((s) => s.domains);
  const diplomas = useStudio((s) => s.diplomas);
  const toggleDomain = useStudio((s) => s.toggleDomain);
  const toggleDiploma = useStudio((s) => s.toggleDiploma);

  return (
    <div>
      <p className="st-sub">Coche les domaines travaillés : chaque diplôme y associe ses compétences.</p>
      <div className="st-list" style={{ marginTop: 6, maxHeight: '38vh' }}>
        {DOMAINS.map((d) => (
          <label key={d} className={`st-line${domains.includes(d) ? ' sel' : ''}`} style={{ cursor: 'pointer' }}>
            <span className="head">
              <input type="checkbox" checked={domains.includes(d)} onChange={() => toggleDomain(d)} data-domain={d} />
              <span className="n" style={{ color: '#141A21' }}>{DOMAIN_LABEL[d]}</span>
            </span>
          </label>
        ))}
      </div>
      <h3 className="st-h" style={{ marginTop: 12 }}>Ce que cela représente</h3>
      <div className="st-list" data-testid="st-competences">
        {DIPLOMAS.map((dip) => {
          const codes = competenceCodes(dip.id as DiplomaId, domains);
          return (
            <div key={dip.id} className="st-line">
              <div className="head">
                <b>{dip.short}</b>
                <span className="n">{codes.length} compétence{codes.length > 1 ? 's' : ''}</span>
                <label className="st-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={diplomas.includes(dip.id)} onChange={() => toggleDiploma(dip.id)} data-diploma={dip.id} />
                  visé
                </label>
              </div>
              <div className="st-row">
                {codes.map((c) => <span key={c} className="st-tag ok">{c}</span>)}
                {codes.length === 0 && <span className="st-sub">Aucun domaine coché.</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- réglages */

function Reglages() {
  const def = useStudio((s) => s.def);
  const patchDef = useStudio((s) => s.patchDef);
  const setScene = useStudio((s) => s.setScene);

  const cdc = def.cahierDesCharges;

  return (
    <div>
      <label className="st-field">
        <span>Titre</span>
        <input className="st-input" value={def.title} onChange={(e) => patchDef({ title: e.target.value })} data-testid="st-title-2" />
      </label>
      <label className="st-field">
        <span>Niveau</span>
        <input className="st-input" value={def.level} onChange={(e) => patchDef({ level: e.target.value })} />
      </label>
      <label className="st-field">
        <span>Famille et scène</span>
        <select className="st-select" value={def.scene} onChange={(e) => setScene(e.target.value as SceneKind)} data-testid="st-scene">
          {SCENES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className="st-field">
        <span>Annexe</span>
        <select className="st-select" value={def.annex} onChange={(e) => patchDef({ annex: e.target.value as typeof def.annex })}>
          <option value="door">Porte (coffret de boutons)</option>
          <option value="room">Pièce</option>
          <option value="local">Local</option>
          <option value="roof">Toiture</option>
        </select>
      </label>
      <div className="st-row" style={{ marginTop: 8 }}>
        <label className="st-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={def.station} onChange={(e) => patchDef({ station: e.target.checked })} /> coffret de porte
        </label>
        <label className="st-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={def.hasMotor} onChange={(e) => patchDef({ hasMotor: e.target.checked })} /> moteur
        </label>
      </div>
      <label className="st-field">
        <span>Résumé (catalogue)</span>
        <input className="st-input" value={def.summary} onChange={(e) => patchDef({ summary: e.target.value })} />
      </label>
      <label className="st-field">
        <span>Situation professionnelle</span>
        <textarea className="st-area" value={def.situation} onChange={(e) => patchDef({ situation: e.target.value })} data-testid="st-situation" />
      </label>

      <h3 className="st-h" style={{ marginTop: 12 }}>Cahier des charges</h3>
      <div className="st-list">
        {cdc.map((l, i) => (
          <div key={i} className="st-line">
            <input
              className="st-input"
              value={l.k}
              placeholder="Intitulé"
              aria-label="Intitulé"
              onChange={(e) => patchDef({ cahierDesCharges: cdc.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })}
            />
            <input
              className="st-input"
              value={l.v}
              placeholder="Valeur"
              aria-label="Valeur"
              onChange={(e) => patchDef({ cahierDesCharges: cdc.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })}
            />
            <button type="button" className="st-mini danger" onClick={() => patchDef({ cahierDesCharges: cdc.filter((_, j) => j !== i) })}>Retirer</button>
          </div>
        ))}
      </div>
      <button type="button" className="st-btn" style={{ marginTop: 6 }} onClick={() => patchDef({ cahierDesCharges: [...cdc, { k: '', v: '' }] })}>
        Ajouter une ligne
      </button>

      <h3 className="st-h" style={{ marginTop: 12 }}>Quiz de validation</h3>
      <div className="st-list">
        {def.quiz.map((q, i) => (
          <div key={i} className="st-line">
            <input
              className="st-input"
              value={q.q}
              placeholder="Question"
              aria-label="Question"
              onChange={(e) => patchDef({ quiz: def.quiz.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
            />
            {q.options.map((o, oi) => (
              <div key={oi} className="st-row">
                <input
                  className="st-input"
                  value={o}
                  aria-label={`Réponse ${oi + 1}`}
                  onChange={(e) => patchDef({
                    quiz: def.quiz.map((x, j) => (j === i ? { ...x, options: x.options.map((y, k) => (k === oi ? e.target.value : y)) } : x)),
                  })}
                />
                <button
                  type="button"
                  className="st-mini"
                  aria-label={`Bonne réponse ${oi + 1}`}
                  onClick={() => patchDef({ quiz: def.quiz.map((x, j) => (j === i ? { ...x, answer: oi } : x)) })}
                >
                  {q.answer === oi ? '★' : '☆'}
                </button>
              </div>
            ))}
            <button type="button" className="st-mini danger" onClick={() => patchDef({ quiz: def.quiz.filter((_, j) => j !== i) })}>Retirer la question</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="st-btn"
        style={{ marginTop: 6 }}
        onClick={() => patchDef({ quiz: [...def.quiz, { q: '', options: ['', '', ''], answer: 0 }] })}
      >
        Ajouter une question
      </button>

      <h3 className="st-h" style={{ marginTop: 12 }}>Pannes possibles</h3>
      <div className="st-list">
        {def.faults.map((f, i) => (
          <div key={f.id} className="st-line">
            <input className="st-input" value={f.title} placeholder="Titre de la panne" aria-label="Titre de la panne" onChange={(e) => patchDef({ faults: def.faults.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <input className="st-input" value={f.symptom} placeholder="Symptôme" aria-label="Symptôme" onChange={(e) => patchDef({ faults: def.faults.map((x, j) => (j === i ? { ...x, symptom: e.target.value } : x)) })} />
            <input className="st-input" value={f.fix} placeholder="Remède" aria-label="Remède" onChange={(e) => patchDef({ faults: def.faults.map((x, j) => (j === i ? { ...x, fix: e.target.value } : x)) })} />
            <button type="button" className="st-mini danger" onClick={() => patchDef({ faults: def.faults.filter((_, j) => j !== i) })}>Retirer</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="st-btn"
        style={{ marginTop: 6 }}
        onClick={() => patchDef({ faults: [...def.faults, { id: `p${def.faults.length + 1}`, title: '', symptom: '', fix: '' }] })}
      >
        Ajouter une panne
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- assemblage */

export default function Inspector() {
  const tab = useStudio((s) => s.tab);
  const setTab = useStudio((s) => s.setTab);

  return (
    <section className="st-card" aria-label="Inspecteur">
      <div className="st-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'sel' : ''}
            onClick={() => setTab(t.id)}
            data-tab={t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'materiel' && <Materiel />}
      {tab === 'postes' && <Postes />}
      {tab === 'liaisons' && <Liaisons />}
      {tab === 'mesures' && <Mesures />}
      {tab === 'competences' && <Competences />}
      {tab === 'reglages' && <Reglages />}
    </section>
  );
}
