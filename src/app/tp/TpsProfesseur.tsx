'use client';

/**
 * Section « TP du professeur » du catalogue : les TP documentaires publiés en base,
 * rédigés dans /prof/tp/nouveau. Les TP fournis avec l'application sont écartés,
 * ils ont déjà leurs vignettes plus haut dans la page.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { spriteUrl } from '@/lib/data/catalogue';
import { tpSprites } from '@/components/parcours/tpSprites';
import { listTeacherTps, type TpRow } from '@/lib/db/tps';

const FAMILY_SHORT: Record<string, string> = {
  ind: 'industriel',
  hab: 'habitat',
  ter: 'tertiaire',
  pv: 'photovoltaïque',
};

export default function TpsProfesseur() {
  const [tps, setTps] = useState<TpRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listTeacherTps()
      .then((rows) => {
        if (alive) setTps(rows);
      })
      .catch(() => {
        // catalogue hors-ligne ou élève non connecté : on n'affiche que les TP fournis
        if (alive) setTps([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading || tps.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-title text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
        TP du professeur · lecture et cahier des charges
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {tps.map((tp) => (
          <Link
            key={tp.id}
            href={`/tp/${tp.id}`}
            data-tp={tp.id}
            className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-[96px] items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)]">
              {tpSprites(tp.id).map((k, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${k}-${i}`}
                  src={spriteUrl(k)}
                  alt=""
                  className="max-h-[80px] max-w-[120px] object-contain"
                  style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-[20px] font-bold">{tp.title}</h3>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                TP du professeur
              </span>
            </div>
            {tp.summary && <p className="m-0 text-[13px] text-muted">{tp.summary}</p>}
            <div className="flex flex-wrap gap-1.5">
              {tp.level && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {tp.level}
                </span>
              )}
              {tp.family && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {FAMILY_SHORT[tp.family] ?? tp.family}
                </span>
              )}
              {tp.competences.map((c) => (
                <span key={c} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {c}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
