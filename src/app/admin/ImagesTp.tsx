'use client';

/**
 * Image de couverture des TP du catalogue — écran administrateur.
 *
 * Sans image posée, la vignette du catalogue est un montage automatique des
 * photos d'appareils du TP : correct, mais deux TP qui partagent un contacteur
 * et un transformateur se ressemblent. L'administrateur met ici la photo de la
 * platine réelle de l'établissement.
 *
 * Le droit est vérifié deux fois : ici pour ne pas proposer un bouton qui
 * échouerait, et en base par les règles RLS de la migration 0010 — un
 * professeur qui appellerait l'API directement est refusé par Postgres.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TPS } from '@/lib/data/tps';
import { clearTpImage, getTpImages, setTpImage } from '@/lib/db/tpImages';
import { Panneau } from '@/components/gestion/ui';

/** 2 Mo : au-delà, la vignette pèse plus lourd que la page qui la porte. */
const TAILLE_MAX = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ImagesTp({ admin }: { admin: boolean }) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const champs = useRef<Record<string, HTMLInputElement | null>>({});

  const charger = useCallback(async () => {
    setImages(await getTpImages(createClient()));
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  if (!admin) return null;

  const deposer = async (tpId: string, file: File) => {
    setErr(null);
    if (!TYPES.includes(file.type)) {
      setErr('Format accepté : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > TAILLE_MAX) {
      setErr(`Image trop lourde (${Math.round(file.size / 1024)} ko) : 2 Mo au maximum.`);
      return;
    }
    setBusy(tpId);
    try {
      await setTpImage(createClient(), tpId, file);
      await charger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Dépôt impossible.');
    } finally {
      setBusy(null);
    }
  };

  const retirer = async (tpId: string) => {
    setErr(null);
    setBusy(tpId);
    try {
      await clearTpImage(createClient(), tpId);
      await charger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Retrait impossible.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panneau title="Images du catalogue">
      <p className="mb-3 max-w-[70ch] text-[12.5px] text-muted">
        Une image par TP, visible sur la carte du catalogue. Sans image posée, la vignette reste
        le montage automatique des appareils du TP. JPEG, PNG ou WebP, 2 Mo au maximum ;
        le cadrage utile est un rectangle large — la carte affiche 96 px de haut.
      </p>
      {err && <p className="mb-3 text-[12.5px] font-semibold text-crit">{err}</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {TPS.map(tp => (
          <li
            key={tp.id}
            className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--line)] p-2.5"
          >
            <div className="flex h-[48px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--surface-2)]">
              {images[tp.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[tp.id]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted">montage</span>
              )}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="text-[13.5px] font-semibold">{tp.title}</div>
              <div className="font-mono text-[11px] text-muted">{tp.id}</div>
            </div>
            <input
              ref={(el) => { champs.current[tp.id] = el; }}
              type="file"
              accept={TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void deposer(tp.id, f);
              }}
            />
            <button
              type="button"
              disabled={busy === tp.id}
              onClick={() => champs.current[tp.id]?.click()}
              className="min-h-touch rounded-[10px] border border-[var(--line)] px-3 text-[12.5px] font-semibold disabled:opacity-40"
            >
              {busy === tp.id ? 'Envoi…' : images[tp.id] ? 'Remplacer' : 'Choisir une image'}
            </button>
            {images[tp.id] && (
              <button
                type="button"
                disabled={busy === tp.id}
                onClick={() => retirer(tp.id)}
                className="min-h-touch rounded-[10px] border border-crit/50 px-3 text-[12.5px] font-semibold text-crit disabled:opacity-40"
              >
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panneau>
  );
}
