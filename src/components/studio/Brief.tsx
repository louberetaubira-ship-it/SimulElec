'use client';

/**
 * Écran de brief du générateur de TP : ce que le professeur impose au modèle.
 * Diplôme, classe, durée, type de séance, thème et contexte, activités du référentiel,
 * dossier technique joint (compression des images, 10 Mo au total) et matériel réellement
 * disponible sur le plateau. Aucune donnée personnelle d'élève n'est transmise.
 */
import React from 'react';
import type { SceneKind } from '@/lib/types';
import { CATALOGUE } from '@/lib/data/catalogue';
import { COMPETENCES, DIPLOMAS, type DiplomaId } from '@/lib/data/competences';
import { listMyClasses } from '@/lib/db/classes';
import { myQuota, type Quota } from '@/lib/db/generations';
import type { ClassRow } from '@/lib/db/types';
import {
  TAILLE_DOCS_MAX, poidsLisible, preparerDocument, type BriefSaisie, type DocumentJoint,
} from './generation';

const SEQUENCES = [
  'séance de travaux pratiques',
  'séance de découverte',
  'travaux pratiques d’évaluation',
  'séance de remédiation',
  'projet pluridisciplinaire',
];

const DUREES = [55, 110, 165, 240, 330];

const SCENES: { id: SceneKind | ''; label: string }[] = [
  { id: '', label: 'Déduit du thème' },
  { id: 'ind', label: 'Industriel · armoire' },
  { id: 'hab', label: 'Habitat · tableau' },
  { id: 'ter', label: 'Tertiaire · coffret' },
  { id: 'pv', label: 'Photovoltaïque' },
];

/** Matériel du plateau, groupé par famille du catalogue. */
const MATERIEL: { famille: string; items: { key: string; name: string }[] }[] = (() => {
  const map = new Map<string, { key: string; name: string }[]>();
  for (const c of CATALOGUE) {
    const list = map.get(c.family) ?? [];
    list.push({ key: c.key, name: c.name });
    map.set(c.family, list);
  }
  return Array.from(map.entries()).map(([famille, items]) => ({ famille, items }));
})();

export interface LancementBrief {
  brief: BriefSaisie;
  docs: DocumentJoint[];
}

export default function Brief({
  onLancer, onAnnuler, initial,
}: {
  onLancer: (l: LancementBrief) => void;
  onAnnuler: () => void;
  /** Brief précédent : le professeur revient le corriger sans tout ressaisir. */
  initial?: LancementBrief | null;
}) {
  const depart = initial?.brief ?? null;
  const [diplomaId, setDiplomaId] = React.useState<DiplomaId>(depart?.diplomaId ?? 'bacpro');
  const [classes, setClasses] = React.useState<ClassRow[]>([]);
  const [classId, setClassId] = React.useState<string>(depart?.classId ?? '');
  const [duration, setDuration] = React.useState(depart?.duration ?? 240);
  const [sequenceType, setSequenceType] = React.useState(depart?.sequenceType ?? SEQUENCES[0]);
  const [theme, setTheme] = React.useState(depart?.theme ?? '');
  const [resume, setResume] = React.useState(depart?.resume ?? '');
  const [scene, setScene] = React.useState<SceneKind | ''>(depart?.scene ?? '');
  const [activities, setActivities] = React.useState<string[]>(depart?.activities ?? []);
  const [materiel, setMateriel] = React.useState<string[]>(depart?.materielDisponible ?? []);
  const [docs, setDocs] = React.useState<DocumentJoint[]>(initial?.docs ?? []);
  const [quota, setQuota] = React.useState<Quota | null>(null);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [survol, setSurvol] = React.useState(false);
  const [occupe, setOccupe] = React.useState(false);
  const fichier = React.useRef<HTMLInputElement>(null);

  // Un brief repris garde les choix du professeur : pas de préselection par-dessus.
  const vierge = React.useRef(depart === null);

  // Classes du professeur : s'il n'en a qu'une, son diplôme est préselectionné.
  React.useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const list = await listMyClasses();
        if (!vivant) return;
        setClasses(list);
        if (list.length === 1 && vierge.current) {
          setClassId(list[0].id);
          if (list[0].diploma) setDiplomaId(list[0].diploma);
        }
      } catch {
        if (vivant) setClasses([]);
      }
    })();
    void (async () => {
      try {
        const q = await myQuota();
        if (vivant) setQuota(q);
      } catch {
        if (vivant) setQuota(null);
      }
    })();
    return () => { vivant = false; };
  }, []);

  const poids = docs.reduce((s, d) => s + d.octets, 0);
  const tropLourd = poids > TAILLE_DOCS_MAX;
  const pret = theme.trim().length >= 3 && !tropLourd && !occupe;

  const bascule = (liste: string[], set: (v: string[]) => void, valeur: string) => {
    set(liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur]);
  };

  async function ajouter(fichiers: File[]) {
    if (fichiers.length === 0) return;
    setOccupe(true);
    setErreur(null);
    try {
      const prepares = await Promise.all(fichiers.map((f) => preparerDocument(f)));
      const suite = [...docs, ...prepares];
      const total = suite.reduce((s, d) => s + d.octets, 0);
      if (total > TAILLE_DOCS_MAX) {
        setErreur(`Le dossier joint dépasse 10 Mo (${poidsLisible(total)}). Retirez ou allégez un document.`);
      }
      setDocs(suite);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Document illisible.');
    } finally {
      setOccupe(false);
    }
  }

  const competences = COMPETENCES[diplomaId];

  return (
    <section className="st-gen" aria-label="Brief du générateur de TP" data-testid="gen-brief">
      <header className="st-gen-head">
        <div>
          <h1 className="st-gen-title">✦ Générer un TP complet</h1>
          <p className="st-sub">
            Le modèle rédige le dossier pédagogique et la maquette jouable à partir de votre brief.
            Vous relisez et corrigez ensuite chaque champ avant de valider et de publier.
          </p>
        </div>
        <span className="st-tag" data-testid="gen-quota">
          {quota ? `${quota.restantes} génération${quota.restantes > 1 ? 's' : ''} restante${quota.restantes > 1 ? 's' : ''} ce mois-ci (sur ${quota.plafond})` : 'Quota indisponible hors connexion'}
        </span>
      </header>

      <div className="st-gen-grid">
        <div className="st-card">
          <h2 className="st-h">Cadre de la séance</h2>
          <label className="st-field">
            <span>Diplôme</span>
            <select className="st-select" value={diplomaId} onChange={(e) => { setDiplomaId(e.target.value as DiplomaId); setActivities([]); }} data-testid="gen-diplome">
              {DIPLOMAS.map((d) => <option key={d.id} value={d.id}>{d.short}</option>)}
            </select>
          </label>
          <label className="st-field">
            <span>Classe (facultatif)</span>
            <select className="st-select" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="gen-classe">
              <option value="">Aucune classe précisée</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="st-two">
            <label className="st-field">
              <span>Durée</span>
              <select className="st-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))} data-testid="gen-duree">
                {DUREES.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </label>
            <label className="st-field">
              <span>Installation</span>
              <select className="st-select" value={scene} onChange={(e) => setScene(e.target.value as SceneKind | '')} data-testid="gen-scene">
                {SCENES.map((s) => <option key={s.id || 'auto'} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label className="st-field">
            <span>Type de séance</span>
            <select className="st-select" value={sequenceType} onChange={(e) => setSequenceType(e.target.value)} data-testid="gen-type">
              {SEQUENCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="st-card">
          <h2 className="st-h">Sujet</h2>
          <label className="st-field">
            <span>Thème du TP</span>
            <input
              className="st-input"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Démarrage direct d’un moteur de convoyeur"
              data-testid="gen-theme"
            />
          </label>
          <label className="st-field">
            <span>Résumé et contexte</span>
            <textarea
              className="st-area"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Atelier de conditionnement, moteur 1,5 kW 400 V, commande par boîte à boutons en porte d’armoire…"
              data-testid="gen-resume"
            />
          </label>
        </div>

        <div className="st-card">
          <h2 className="st-h">Activités du référentiel</h2>
          <p className="st-sub">Cochez ce que la séance doit faire travailler ({DIPLOMAS.find((d) => d.id === diplomaId)?.short}).</p>
          <div className="st-list" style={{ marginTop: 6, maxHeight: '34vh' }} data-testid="gen-activites">
            {competences.map((c) => (
              <label key={c.code} className={`st-line${activities.includes(c.label) ? ' sel' : ''}`} style={{ cursor: 'pointer' }}>
                <span className="head">
                  <input
                    type="checkbox"
                    checked={activities.includes(c.label)}
                    onChange={() => bascule(activities, setActivities, c.label)}
                    data-activite={c.code}
                  />
                  <b>{c.code}</b>
                  <span className="n libre" style={{ color: '#141A21' }}>{c.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="st-card">
          <h2 className="st-h">Dossier technique</h2>
          <p className="st-sub">
            Dossier de l’équipement, schéma, TP d’inspiration : PDF, images ou texte. 10 Mo au total,
            les images sont compressées avant l’envoi.
          </p>
          <div
            className={`st-drop${survol ? ' sel' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => { e.preventDefault(); setSurvol(false); void ajouter(Array.from(e.dataTransfer.files)); }}
            data-testid="gen-drop"
          >
            <button type="button" className="st-btn" onClick={() => fichier.current?.click()} disabled={occupe}>
              Choisir des documents
            </button>
            <span className="st-sub">ou déposez-les ici</span>
            <input
              ref={fichier}
              type="file"
              multiple
              className="hidden"
              accept="application/pdf,image/*,text/plain,.md,.csv"
              data-testid="gen-fichiers"
              onChange={(e) => {
                // Les fichiers sont copiés avant de vider l'input : `e.target.files` se vide avec lui.
                const liste = Array.from(e.target.files ?? []);
                e.target.value = '';
                void ajouter(liste);
              }}
            />
          </div>
          <p className={`st-sub${tropLourd ? ' crit' : ''}`} style={{ marginTop: 6 }} data-testid="gen-poids">
            {docs.length} document{docs.length > 1 ? 's' : ''} · {poidsLisible(poids)} / 10 Mo
          </p>
          <div className="st-list" style={{ marginTop: 6, maxHeight: '22vh' }}>
            {docs.map((d, i) => (
              <div key={`${d.name}-${i}`} className="st-line">
                <div className="head">
                  <b>{d.name}</b>
                  <span className="n">{poidsLisible(d.octets)}</span>
                  <button
                    type="button"
                    className="st-mini danger"
                    aria-label={`Retirer ${d.name}`}
                    onClick={() => setDocs(docs.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="st-card st-gen-large">
          <h2 className="st-h">Matériel disponible sur le plateau</h2>
          <p className="st-sub">
            Le modèle n’a le droit d’utiliser que ce que vous avez en atelier. Sans coche, tout le
            catalogue reste autorisé.
          </p>
          <div className="st-list" style={{ marginTop: 6, maxHeight: '30vh' }} data-testid="gen-materiel">
            {MATERIEL.map((f) => (
              <div key={f.famille} className="st-line">
                <div className="head"><b>{f.famille}</b></div>
                <div className="st-row">
                  {f.items.map((it) => (
                    <label
                      key={it.key}
                      className={`st-chip${materiel.includes(it.name) ? ' sel' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={materiel.includes(it.name)}
                        onChange={() => bascule(materiel, setMateriel, it.name)}
                        data-materiel={it.key}
                      />
                      {it.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {erreur && <p className="st-err" role="alert" style={{ marginTop: 10 }}>{erreur}</p>}

      <div className="st-row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="st-btn primary"
          disabled={!pret}
          data-testid="gen-lancer"
          onClick={() => onLancer({
            brief: {
              diplomaId,
              classId: classId || null,
              theme: theme.trim(),
              resume: resume.trim(),
              duration,
              sequenceType,
              activities,
              materielDisponible: materiel,
              scene,
            },
            docs,
          })}
        >
          ✦ Générer le TP complet
        </button>
        <button type="button" className="st-btn ghost" onClick={onAnnuler} data-testid="gen-annuler-brief">
          Revenir à la création manuelle
        </button>
        {!pret && theme.trim().length < 3 && <span className="st-sub">Indiquez au moins le thème du TP.</span>}
      </div>
    </section>
  );
}
