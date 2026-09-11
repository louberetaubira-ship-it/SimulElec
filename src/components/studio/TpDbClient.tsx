'use client';

/**
 * Ouverture d'un TP enregistré en base (studio du professeur) côté élève :
 * si la définition est jouable, c'est le vrai parcours (`ParcoursClient`) sur la platine
 * construite par le professeur ; sinon le parcours de lecture documentaire.
 */
import React from 'react';
import type { TpDefinition } from '@/lib/types';
import { getTpRow, rowToDefinition } from '@/lib/db/tps';
import ParcoursClient from '@/app/tp/[id]/ParcoursClient';
import LectureClient from '@/app/tp/[id]/LectureClient';

export default function TpDbClient({ id }: { id: string }) {
  const [tp, setTp] = React.useState<TpDefinition | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const row = await getTpRow(id);
        const def = row ? rowToDefinition(row) : null;
        if (alive && def && def.playable) setTp(def);
      } catch {
        /* hors-ligne ou définition illisible : on retombe sur la lecture */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (!ready) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-[14px] text-muted">Ouverture du TP…</main>;
  }
  if (tp) return <ParcoursClient tp={tp} />;
  return <LectureClient id={id} />;
}
