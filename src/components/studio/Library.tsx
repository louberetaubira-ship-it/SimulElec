'use client';
/* eslint-disable @next/next/no-img-element -- vignettes servies depuis public/sprites et data URI de bibliothèque */

/**
 * Colonne de gauche du studio : recherche plein texte et familles de la bibliothèque
 * (1 381 appareils photo) plus le catalogue de base. Un clic pose l'appareil dans la
 * zone active de la platine.
 */
import React from 'react';
import type { CatalogueItem } from '@/lib/types';
import { CATALOGUE, spriteUrl } from '@/lib/data/catalogue';
import { libraryIndex, libraryItemSync, loadFamily, searchLibrary } from '@/lib/data/library';
import { svgForKey } from '@/components/panel/svg';
import { useStudio } from './store';

const FAMILIES = libraryIndex();
const PACK = -1;

function Thumb({ item }: { item: CatalogueItem }) {
  const vector = svgForKey(item.key);
  if (vector) return <span className="thumb">{vector}</span>;
  return <span className="thumb"><img src={item.src ?? spriteUrl(item.key)} alt="" /></span>;
}

export default function Library() {
  const add = useStudio((s) => s.add);
  const say = useStudio((s) => s.say);
  const [fam, setFam] = React.useState<number>(PACK);
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<CatalogueItem[]>(CATALOGUE);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    const needle = q.trim();

    async function run() {
      setBusy(true);
      try {
        if (needle) {
          const hits = searchLibrary(needle, 80);
          const files = Array.from(new Set(hits.map((h) => h.file))).slice(0, 8);
          await Promise.all(files.map((f) => loadFamily(f).catch(() => ({}))));
          if (!alive) return;
          const low = needle.toLowerCase();
          const packHits = CATALOGUE.filter((c) => `${c.name} ${c.ref} ${c.family} ${c.key}`.toLowerCase().includes(low));
          const libHits = hits
            .map((h) => libraryItemSync(h.key))
            .filter((x): x is CatalogueItem => x !== null);
          setItems([...packHits, ...libHits].slice(0, 120));
          return;
        }
        if (fam === PACK) { setItems(CATALOGUE); return; }
        const f = FAMILIES[fam];
        await loadFamily(f.file);
        if (!alive) return;
        setItems(f.keys.map((k) => libraryItemSync(k)).filter((x): x is CatalogueItem => x !== null));
      } catch {
        if (alive) { setItems([]); say('Bibliothèque indisponible : réessaie.'); }
      } finally {
        if (alive) setBusy(false);
      }
    }

    void run();
    return () => { alive = false; };
  }, [fam, q, say]);

  const total = FAMILIES.reduce((a, f) => a + f.count, 0);

  return (
    <section className="st-card" aria-label="Bibliothèque">
      <h2 className="st-h">Bibliothèque</h2>
      <input
        className="st-search"
        placeholder="Chercher un appareil…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Chercher dans la bibliothèque"
        data-testid="st-search"
      />
      <div className="st-fams" role="tablist">
        <button type="button" className={fam === PACK && !q ? 'sel' : ''} onClick={() => { setQ(''); setFam(PACK); }}>
          Pack SimulElec <small>{CATALOGUE.length}</small>
        </button>
        {FAMILIES.map((f, i) => (
          <button key={f.file} type="button" className={fam === i && !q ? 'sel' : ''} onClick={() => { setQ(''); setFam(i); }}>
            {f.family} <small>{f.count}</small>
          </button>
        ))}
      </div>
      <p className="st-sub">
        {busy ? 'Chargement…' : `${items.length} élément${items.length > 1 ? 's' : ''} · ${total} en bibliothèque`}
      </p>
      <div className="st-grid" data-testid="st-lib">
        {items.map((it) => (
          <button key={it.key} type="button" className="st-item" data-k={it.key} onClick={() => void add(it)}>
            <Thumb item={it} />
            <b>{it.name}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
