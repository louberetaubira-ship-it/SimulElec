import Link from 'next/link';
import type { Metadata } from 'next';
import { TPS } from '@/lib/data/tps';
import { spriteUrl } from '@/lib/data/catalogue';
import { FAMILY_LABEL, tpSprites } from '@/components/parcours/tpSprites';
import TpsProfesseur from './TpsProfesseur';

export const metadata: Metadata = {
  title: 'Catalogue des TP · SimulElec',
  description: 'Quatorze travaux pratiques d\'électrotechnique simulés : du cahier des charges à la mise en service.',
};

const SCENE_LABEL: Record<string, string> = {
  ind: 'armoire industrielle',
  hab: 'tableau d\'habitation',
  ter: 'coffret tertiaire',
  pv: 'coffret photovoltaïque',
};

const FAMILIES: ('ind' | 'hab' | 'ter' | 'pv')[] = ['ind', 'hab', 'ter', 'pv'];

export default function CataloguePage() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8">
      <header className="mb-6">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Bac Pro MELEC · BTS Électrotechnique
        </div>
        <h1 className="text-[40px] font-bold">Catalogue des TP</h1>
        <p className="mt-1 max-w-[66ch] text-[15px] text-muted">
          Choisis un TP : tu liras l&apos;énoncé, choisiras le matériel, poseras les appareils, câbleras
          borne à borne, puis tu passeras aux EPI, à la consignation, aux mesures hors tension, à la
          déconsignation et aux mesures sous tension avant de valider.
        </p>
      </header>

      {FAMILIES.map(fam => {
        const list = TPS.filter(t => t.family === fam);
        if (!list.length) return null;
        return (
          <section key={fam} className="mb-8">
            <h2 className="mb-3 font-title text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
              {FAMILY_LABEL[fam]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map(tp => (
                <Link
                  key={tp.id}
                  href={`/tp/${tp.id}`}
                  data-tp={tp.id}
                  className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex h-[96px] items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)]">
                    {tpSprites(tp.id).map((k, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${k}-${i}`} src={spriteUrl(k)} alt="" className="max-h-[80px] max-w-[120px] object-contain" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-[20px] font-bold">{tp.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tp.playable ? 'bg-good/20 text-good' : 'bg-[var(--surface-2)] text-muted'}`}>
                      {tp.playable ? 'jouable' : 'prévu'}
                    </span>
                    {tp.kind === 'dimensionnement' && (
                      <span data-kind="dimensionnement" className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        dimensionnement
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-[13px] text-muted">{tp.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{tp.level}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{SCENE_LABEL[tp.scene]}</span>
                    {tp.competences.map(c => (
                      <span key={c} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">{c}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <TpsProfesseur />
    </div>
  );
}
