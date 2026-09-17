/**
 * Affichage d'une ressource lisible (Cours ou Fiche de révision).
 * Rend une suite de blocs typés ; pas d'état, composant serveur.
 */
import Link from 'next/link';
import { CATALOGUES, type Bloc, type FicheContenu } from '@/lib/data/ressources';

function couleurType(type: FicheContenu['type']): string {
  return CATALOGUES.find((c) => c.type === type)?.couleur ?? '#0E9E6E';
}
function labelType(type: FicheContenu['type']): string {
  return CATALOGUES.find((c) => c.type === type)?.label ?? '';
}

function BlocView({ bloc }: { bloc: Bloc }) {
  switch (bloc.kind) {
    case 'intro':
      return <p className="text-[15px] leading-relaxed text-[#2A333D]">{bloc.texte}</p>;
    case 'section':
      return (
        <section>
          <h2 className="mb-2 font-title text-[16px] font-semibold text-[#141A21]">{bloc.titre}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-[#2A333D]">
            {bloc.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
      );
    case 'tableau':
      return (
        <section>
          {bloc.titre && <h2 className="mb-2 font-title text-[16px] font-semibold text-[#141A21]">{bloc.titre}</h2>}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-[13.5px]">
              <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
                <tr>{bloc.entetes.map((e, i) => <th key={i} className="px-3 py-2.5">{e}</th>)}</tr>
              </thead>
              <tbody>
                {bloc.lignes.map((l, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    {l.map((c, j) => (
                      <td key={j} className={`px-3 py-2.5 ${j === 0 ? 'font-mono text-[12.5px] font-semibold' : ''}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    case 'securite':
      return (
        <section className="rounded-xl border border-crit/30 bg-crit/5 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-title text-[15px] font-semibold text-crit">
            <span aria-hidden>⚠️</span> {bloc.titre}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-[#2A333D]">
            {bloc.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
      );
    case 'vocab':
      return (
        <section>
          <h2 className="mb-2 font-title text-[16px] font-semibold text-[#141A21]">Vocabulaire</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {bloc.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-line bg-[var(--surface)] p-3">
                <dt className="text-[13.5px] font-semibold text-[#141A21]">{it.terme}</dt>
                <dd className="mt-0.5 text-[13px] text-muted">{it.def}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case 'retenir':
      return (
        <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <h2 className="mb-2 font-title text-[15px] font-semibold text-accent">À retenir</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-[#2A333D]">
            {bloc.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </section>
      );
  }
}

export default function FicheView({ fiche }: { fiche: FicheContenu }) {
  const couleur = couleurType(fiche.type);
  return (
    <div className="mx-auto max-w-[820px] px-4 py-8">
      <Link href="/ressources" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-[#141A21]">
        ← Ressources
      </Link>

      <header className="mb-6 rounded-2xl border border-line p-5" style={{ background: `${couleur}0D` }}>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.05em] text-white" style={{ background: couleur }}>
            {labelType(fiche.type)}
          </span>
          <span className="text-[12px] uppercase tracking-[.06em] text-muted">{fiche.sousTitre}</span>
        </div>
        <h1 className="mt-2 font-title text-[26px] font-bold leading-tight text-[#141A21]">{fiche.titre}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          {fiche.duree && <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-muted">⏱ {fiche.duree}</span>}
          {fiche.competences.map((c) => (
            <span key={c} className="rounded-full border border-line bg-white px-2.5 py-0.5 font-medium text-[#2A333D]">{c}</span>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {fiche.blocs.map((b, i) => <BlocView key={i} bloc={b} />)}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-[var(--surface-2)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Intention pédagogique</p>
        <p className="mt-1 text-[13px] text-[#2A333D]">{fiche.pedagogie}</p>
      </div>
    </div>
  );
}
