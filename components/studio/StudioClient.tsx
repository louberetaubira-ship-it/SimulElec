'use client';

/**
 * Studio de création de TP : bibliothèque | platine | inspecteur.
 * Enregistrement automatique du brouillon (~5 s), publication explicite après contrôle
 * de cohérence, et essai immédiat du parcours côté élève.
 *
 * Générateur (lot 8) : brief → génération → relecture dans l'inspecteur → validation
 * humaine → publication. Un TP généré non validé porte un bandeau permanent et un
 * filigrane à l'impression ; la base refuse sa publication.
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
import Brief, { type LancementBrief } from './Brief';
import Generation from './Generation';
import { cibleAnomalie, type AnomalieGeneration } from './generation';
import type { StudioTab } from './store';
import './studio.css';

/** Bandeau et filigrane d'un TP généré non validé. */
const MENTION = 'Brouillon généré — à valider avant diffusion';

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

/** Date courte « 12/09 ». */
function jourMois(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function StudioClient({
  id, source, generer,
}: { id: string | null; source?: string | null; generer?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [ready, setReady] = React.useState(false);
  const [mode, setMode] = React.useState<'editeur' | 'brief' | 'generation'>(generer ? 'brief' : 'editeur');
  const [lancement, setLancement] = React.useState<LancementBrief | null>(null);
  const [confirmation, setConfirmation] = React.useState(false);

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

  /* ------------------------------------------------------- écrans du générateur */

  if (mode === 'brief') {
    return (
      <main className="st-gen-wrap">
        <Brief
          initial={lancement}
          onLancer={(l) => { setLancement(l); setMode('generation'); }}
          onAnnuler={() => setMode('editeur')}
        />
      </main>
    );
  }

  if (mode === 'generation' && lancement) {
    return (
      <main className="st-gen-wrap">
        <Generation
          lancement={lancement}
          onAnnuler={() => setMode('brief')}
          onReprendre={() => setMode('brief')}
          onTermine={(res) => {
            s.importGeneration(res, lancement.brief.diplomaId);
            setMode('editeur');
            // Le brouillon est enregistré TOUT DE SUITE, sans attendre l'enregistrement
            // automatique : une génération coûte plusieurs minutes, elle ne doit jamais
            // disparaître parce que l'onglet a été fermé. Puis on rattache le TP au journal.
            void (async () => {
              const tpId = await s.save();
              if (tpId && res.generationId) {
                try {
                  const { lierTpAGeneration } = await import('@/lib/db/generations');
                  await lierTpAGeneration(res.generationId, tpId);
                } catch {
                  // le lien du journal n'est pas vital : le TP est enregistré, c'est l'essentiel
                }
              }
            })();
          }}
        />
      </main>
    );
  }

  /* ------------------------------------------------------------------ éditeur */

  const etat = s.saving ? 'Enregistrement…' : s.dirty ? 'Modifications non enregistrées' : s.savedAt ? 'Enregistré' : 'Brouillon';
  const bloquantes = s.genAnomalies.filter((a) => a.gravite === 'bloquante');
  const avertissements = s.genAnomalies.filter((a) => a.gravite === 'avertissement');
  const aValider = s.generated && !s.validatedAt;

  /** Amène le professeur à l'endroit concerné par une anomalie. */
  const allerA = (a: AnomalieGeneration) => {
    const cible = cibleAnomalie(a.chemin);
    s.setTab(cible.tab as StudioTab);
    if (cible.tab === 'materiel' && cible.index !== null) {
      const slot = s.def.slots[cible.index];
      if (slot) s.select({ kind: 'slot', id: slot.id });
    }
  };

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
        {s.generated && (
          <span className={`st-tag${s.validatedAt ? ' ok' : ' warn'}`} data-testid="st-gen-tag">
            {s.validatedAt ? `TP généré · validé le ${jourMois(s.validatedAt)}` : 'TP généré · non validé'}
          </span>
        )}
        {s.id && <span className="st-tag">{s.id}</span>}
        {!s.id && (
          <button type="button" className="st-btn primary" onClick={() => setMode('brief')} data-testid="st-generer">
            ✦ Générer un TP
          </button>
        )}
        <button type="button" className="st-btn" onClick={() => void s.save()} disabled={s.saving} data-testid="st-save">
          Enregistrer
        </button>
        {aValider && (
          <button
            type="button"
            className="st-btn primary"
            data-testid="st-valider"
            disabled={bloquantes.length > 0 || s.validating}
            title={bloquantes.length > 0 ? 'Corrigez d’abord les anomalies bloquantes.' : undefined}
            onClick={() => setConfirmation(true)}
          >
            Valider ce TP
          </button>
        )}
        {s.published ? (
          <button type="button" className="st-btn ghost" onClick={() => void s.unpublish()}>Dépublier</button>
        ) : (
          <button
            type="button"
            className="st-btn primary"
            onClick={() => void s.publish()}
            data-testid="st-publish"
            disabled={aValider}
            title={aValider ? 'Validez le TP généré avant de le publier.' : undefined}
          >
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

      {aValider && (
        <p className="st-bandeau" role="status" data-testid="st-bandeau">
          {MENTION} — vous engagez votre responsabilité pédagogique sur les valeurs et les
          consignes de sécurité.
        </p>
      )}
      {aValider && <div className="st-filigrane" aria-hidden="true" data-testid="st-filigrane">{MENTION}</div>}

      {s.error && <p className="st-err" style={{ margin: '8px 12px' }} role="alert" data-testid="st-error">{s.error}</p>}

      {s.genAnomalies.length > 0 && (
        <section className="st-card" style={{ margin: '8px 12px' }} data-testid="st-gen-anomalies" aria-label="Anomalies du TP généré">
          <h2 className="st-h">
            Contrôle du moteur · {bloquantes.length} bloquante{bloquantes.length > 1 ? 's' : ''},{' '}
            {avertissements.length} avertissement{avertissements.length > 1 ? 's' : ''}
          </h2>
          {[
            { titre: 'Bloquantes — à corriger avant validation', gravite: 'bloquante' as const, classe: 'crit' },
            { titre: 'Avertissements — à relire', gravite: 'avertissement' as const, classe: 'warn' },
          ].map((g) => {
            const liste = s.genAnomalies
              .map((a, index) => ({ a, index }))
              .filter((x) => x.a.gravite === g.gravite);
            if (liste.length === 0) return null;
            return (
              <div key={g.titre} style={{ marginTop: 6 }}>
                <p className="st-sub">{g.titre}</p>
                <div className="st-list" style={{ maxHeight: '26vh', marginTop: 4 }}>
                  {liste.map(({ a, index }) => (
                    <div key={`${a.chemin}-${index}`} className={`st-line st-anomalie ${g.classe}`} data-gravite={a.gravite}>
                      <div className="head">
                        <b>{a.chemin || '—'}</b>
                        <span className="n" style={{ color: '#141A21' }}>{a.message}</span>
                      </div>
                      <div className="st-row">
                        <button type="button" className="st-mini" data-aller={index} onClick={() => allerA(a)}>
                          Y aller
                        </button>
                        <button
                          type="button"
                          className="st-mini"
                          data-reglee={index}
                          onClick={() => s.resolveAnomalie(index)}
                        >
                          ✓ Réglée
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {s.corrections.length > 0 && (
        <details className="st-card" style={{ margin: '8px 12px' }} data-testid="st-corrections">
          <summary className="st-h" style={{ cursor: 'pointer', margin: 0 }}>
            Ce que le moteur a corrigé · {s.corrections.length} point{s.corrections.length > 1 ? 's' : ''}
          </summary>
          <ul className="st-anomalies" style={{ marginTop: 8, color: '#66717F' }}>
            {s.corrections.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
          {s.cout && (
            <p className="st-sub" style={{ marginTop: 6 }}>
              Génération : {s.cout.secondes} s · {s.cout.tokens} jetons ·{' '}
              {s.cout.euros.toFixed(2).replace('.', ',')} € estimés.
            </p>
          )}
        </details>
      )}

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

      {confirmation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" data-testid="st-dialog-validation">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-title text-[20px] font-semibold uppercase">Valider ce TP généré ?</h2>
            <p className="mt-2 text-[13px]">
              En validant, <b>vous engagez votre responsabilité pédagogique</b> sur l’ensemble du
              contenu : énoncé, consignes, valeurs attendues des mesures et, en particulier,
              <b> consignes de sécurité</b> (consignation, EPI, VAT). Le texte a été produit par un
              modèle : rien ne remplace votre relecture.
            </p>
            <p className="mt-2 text-[13px] text-muted">
              La validation inscrit votre nom et la date dans la base ; le TP devient publiable.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="st-btn" onClick={() => setConfirmation(false)}>Annuler</button>
              <button
                type="button"
                className="st-btn primary"
                data-testid="st-confirmer-validation"
                onClick={() => { setConfirmation(false); void s.validate(); }}
              >
                Je relis et je valide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
