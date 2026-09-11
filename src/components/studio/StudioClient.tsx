'use client';

/**
 * Studio de création de TP : bibliothèque | platine | inspecteur.
 * Enregistrement automatique du brouillon (~5 s), publication explicite après contrôle
 * de cohérence, et essai immédiat du parcours côté élève.
 */
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/db/profiles';
import type { ProfileRow } from '@/lib/db/types';
import { toFile } from './model';
import { useStudio } from './store';
import Library from './Library';
import Stage from './Stage';
import Inspector from './Inspector';
import './studio.css';

/** Télécharge la définition du TP au format `.json`. */
function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudioClient({ id, source }: { id: string | null; source?: string | null }) {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [ready, setReady] = React.useState(false);

  const s = useStudio();
  const load = s.load;

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const p = await getMyProfile();
        if (alive) setProfile(p);
      } catch {
        if (alive) setProfile(null);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Chargement unique : après le premier enregistrement, l'URL passe de /prof/tp/nouveau
  // à /prof/tp/<id> et les paramètres changent — il ne faut pas recharger par-dessus le
  // travail en cours.
  const charge = React.useRef<string | null>(null);
  React.useEffect(() => {
    const cle = `${id ?? ''}|${source ?? ''}`;
    if (charge.current === cle) return;
    if (charge.current !== null && !id && useStudio.getState().id) return;
    charge.current = cle;
    void load(id, source ?? null);
  }, [load, id, source]);

  // L'identifiant est attribué au premier enregistrement : l'URL suit sans recharger.
  const storeId = s.id;
  React.useEffect(() => {
    if (!id && storeId) window.history.replaceState(null, '', `/prof/tp/${storeId}`);
  }, [id, storeId]);

  // Flèches du clavier : déplacement de l'appareil sélectionné.
  const nudge = s.nudge;
  const sel = s.sel;
  React.useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-6); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(6); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, nudge]);

  if (!ready || s.loading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-[14px] text-muted">Chargement du studio…</main>;
  }

  if (!profile || (profile.role !== 'professeur' && profile.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-title text-[32px] font-bold uppercase">Studio de TP</h1>
        <p className="mt-3 rounded-[10px] border border-crit/50 bg-crit/10 px-3 py-2 text-[13px] text-crit">
          Cet espace est réservé aux comptes professeur.
        </p>
        <Link href="/login" className="mt-4 inline-block text-[13px] font-semibold underline">Se connecter</Link>
      </main>
    );
  }

  const etat = s.saving ? 'Enregistrement…' : s.dirty ? 'Modifications non enregistrées' : s.savedAt ? 'Enregistré' : 'Brouillon';

  return (
    <>
      <div className="st-bar">
        <input
          className="title"
          value={s.def.title}
          placeholder="Titre du TP"
          aria-label="Titre du TP"
          data-testid="st-title"
          onChange={(e) => s.patchDef({ title: e.target.value })}
        />
        <span className={`st-state${!s.dirty && s.savedAt ? ' ok' : ''}`} data-testid="st-state">{etat}</span>
        <span className="st-tag">{s.published ? 'publié' : 'brouillon'}</span>
        {s.id && <span className="st-tag">{s.id}</span>}
        <button type="button" className="st-btn" onClick={() => void s.save()} disabled={s.saving} data-testid="st-save">
          Enregistrer
        </button>
        {s.published ? (
          <button type="button" className="st-btn ghost" onClick={() => void s.unpublish()}>Dépublier</button>
        ) : (
          <button type="button" className="st-btn primary" onClick={() => void s.publish()} data-testid="st-publish">
            Publier
          </button>
        )}
        <button
          type="button"
          className="st-btn"
          data-testid="st-test"
          onClick={async () => {
            const saved = await s.save();
            if (saved) router.push(`/tp/${saved}`);
          }}
        >
          Tester en élève
        </button>
        <button
          type="button"
          className="st-btn"
          onClick={() => download(`${s.id ?? 'tp'}.json`, toFile(s.def, s.domains, s.diplomas))}
        >
          Exporter
        </button>
        <Link href="/prof/tp" className="st-btn" style={{ display: 'grid', placeItems: 'center' }}>Mes TP</Link>
      </div>

      {s.error && <p className="st-err" style={{ margin: '8px 12px' }} role="alert">{s.error}</p>}

      {s.anomalies.length > 0 && (
        <details className="st-card" style={{ margin: '8px 12px' }} data-testid="st-anomalies">
          <summary className="st-h" style={{ cursor: 'pointer', margin: 0 }}>
            Contrôle de cohérence · {s.anomalies.length} point{s.anomalies.length > 1 ? 's' : ''} à revoir
          </summary>
          <ul className="st-anomalies" style={{ marginTop: 8 }}>
            {s.anomalies.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </details>
      )}

      <main className="st-wrap">
        <Library />
        <Stage />
        <Inspector />
      </main>
    </>
  );
}
