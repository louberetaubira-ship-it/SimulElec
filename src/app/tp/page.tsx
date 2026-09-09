import Link from 'next/link';
import type { Metadata } from 'next';
import { TPS } from '@/lib/data/tp-demarrage-direct';
import { spriteUrl } from '@/lib/data/catalogue';
import { tpSprites } from '@/components/parcours/tpSprites';

export const metadata: Metadata = {
  title: 'Catalogue des TP · SimulElec',
  description: 'Travaux pratiques d\'électrotechnique simulés : du cahier des charges à la mise en service.',
};

export default function CataloguePage() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8">
      <header className="mb-6">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Bac Pro MELEC · BTS Électrotechnique
        </div>
        <h1 className="text-[40px] font-bold">Catalogue des TP</h1>
        <p className="mt-1 max-w-[66ch] text-[15px] text-muted">
          Choisis un TP : tu liras l&apos;énoncé, choisiras le matériel, poseras les appareils sur la platine,
          câbleras borne à borne, testeras hors tension, puis mettras en service avant de dépanner.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {TPS.map(tp => (
          <Link
            key={tp.id}
            href={`/tp/${tp.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-[100px] items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)]">
              {tpSprites(tp.id).map(k => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={k} src={spriteUrl(k)} alt="" className="max-h-[84px]" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
              ))}
            </div>
            <h2 className="text-[21px] font-bold">{tp.title}</h2>
            <p className="m-0 text-[13px] text-muted">{tp.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{tp.level}</span>
              {tp.competences.map(c => (
                <span key={c} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{c}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
