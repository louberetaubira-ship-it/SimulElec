'use client';

/**
 * Catalogue résolu d'un TP : appareils du pack + éléments de bibliothèque (clés « l_… »).
 *
 * Extrait de `TpPanel` pour être réutilisable hors du parcours élève — l'espace
 * professeur rend la platine en lecture seule et ne doit pas dépendre du store du TP.
 */
import React from 'react';
import type { CatalogueItem, TpDefinition } from '@/lib/types';
import { CATALOGUE_BY_KEY } from '@/lib/data/catalogue';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';

export function useTpItems(tp: TpDefinition): Record<string, CatalogueItem> {
  const [lib, setLib] = React.useState<Record<string, CatalogueItem>>({});

  const keys = React.useMemo(
    () => Array.from(new Set<string>([
      ...tp.slots.map((s) => s.key),
      ...(tp.annexItems ?? []).map((a) => a.key),
      ...(tp.recvItems ?? []).map((a) => a.key),
    ])),
    [tp],
  );

  React.useEffect(() => {
    const missing = keys.filter((k) => k.startsWith('l_'));
    if (!missing.length) return;
    let alive = true;
    void Promise.all(missing.map((k) => loadLibraryItem(k))).then((list) => {
      if (!alive) return;
      const out: Record<string, CatalogueItem> = {};
      list.forEach((it) => { if (it) out[it.key] = it; });
      if (Object.keys(out).length) setLib((p) => ({ ...p, ...out }));
    });
    return () => { alive = false; };
  }, [keys]);

  return React.useMemo(() => {
    const out: Record<string, CatalogueItem> = { ...lib };
    for (const k of keys) {
      const it = CATALOGUE_BY_KEY[k] ?? libraryItemSync(k);
      if (it) out[k] = it;
    }
    return out;
  }, [keys, lib]);
}
