'use client';
/* eslint-disable @next/next/no-img-element -- photos de bibliothèque servies en data URI */

/**
 * Étagère des appareils de mesure, au-dessus de la zone de travail (SPEC-v3 §6).
 * Port de `renderTray` de `docs/reference/illustration-v4.tpl.html`.
 *
 * Photos de bibliothèque pour le multimètre, la pince et le contrôleur d'installation ;
 * icônes pour le VAT et le tachymètre. Hors des étapes de mesure, l'étagère reste visible
 * mais grisée (info-bulle « disponible aux étapes mesures »).
 */
import React from 'react';
import type { InstrumentKind } from '@/lib/types';
import { INSTRUMENTS } from '@/lib/sim/mesures';
import { libraryItemSync, loadLibraryItem } from '@/lib/data/library';
import './tray.css';

export const TRAY_DISABLED_HINT = 'disponible aux étapes mesures';

/** Miniatures photo des appareils (bibliothèque, chargées à la demande). */
export function useInstrumentPhotos(): Record<string, string> {
  const [src, setSrc] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let alive = true;
    const keys = INSTRUMENTS.map((i) => i.libKey).filter((k): k is string => !!k);
    void Promise.all(keys.map((k) => loadLibraryItem(k))).then((list) => {
      if (!alive) return;
      const out: Record<string, string> = {};
      list.forEach((it) => { if (it?.src) out[it.key] = it.src; });
      if (Object.keys(out).length) setSrc(out);
    });
    return () => { alive = false; };
  }, []);
  return React.useMemo(() => {
    const out = { ...src };
    for (const i of INSTRUMENTS) {
      if (!i.libKey || out[i.libKey]) continue;
      const it = libraryItemSync(i.libKey);
      if (it?.src) out[i.libKey] = it.src;
    }
    return out;
  }, [src]);
}

export interface InstrumentTrayProps {
  /** Appareil sélectionné dans le store. */
  value: InstrumentKind | null;
  onSelect: (i: InstrumentKind) => void;
  /** Étagère grisée : les appareils sont visibles mais non sélectionnables. */
  disabled?: boolean;
  /** Message d'info-bulle quand l'étagère est grisée. */
  disabledHint?: string;
}

const ICON: Partial<Record<InstrumentKind, string>> = { vat: '🔴', tach: '🔦' };

export default function InstrumentTray({
  value, onSelect, disabled = false, disabledHint = TRAY_DISABLED_HINT,
}: InstrumentTrayProps) {
  const photos = useInstrumentPhotos();
  return (
    <div
      className={`se-tray${disabled ? ' off' : ''}`}
      data-testid="instrument-tray"
      title={disabled ? disabledHint : undefined}
    >
      <span className="tt">Appareils de mesure</span>
      <div className="items">
        {INSTRUMENTS.map((i) => (
          <button
            key={i.id}
            type="button"
            data-tray={i.id}
            disabled={disabled}
            aria-pressed={value === i.id}
            title={disabled ? disabledHint : i.name}
            onClick={() => onSelect(i.id)}
            className={value === i.id ? 'sel' : undefined}
          >
            {i.libKey && photos[i.libKey]
              ? <img src={photos[i.libKey]} alt="" />
              : <span className="ico">{ICON[i.id] ?? '🔧'}</span>}
            <span className="nm">{i.name.split(' · ')[0].split(' (')[0]}</span>
          </button>
        ))}
      </div>
      {disabled && <span className="note">{disabledHint}</span>}
    </div>
  );
}
