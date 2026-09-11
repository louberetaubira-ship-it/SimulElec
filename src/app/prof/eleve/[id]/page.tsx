'use client';

/**
 * Fiche d'un élève vue par le professeur : identité, tentatives, bilan de compétences
 * par TP et cumulé, aide utilisée.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { countHelpByAttempt, getStudentFile, type StudentFile } from '@/lib/db/classes';
import { competenceTps, eleveStats, noteSur20 } from '@/lib/eleve-stats';
import { DIPLOMAS } from '@/lib/data/competences';
import BilanExport from '@/components/parcours/BilanExport';
import {
  BilanCompetences,
  Chiffre,
  Message,
  PageTitle,
  Panneau,
  PastillesCompetences,
  dateCourte,
} from '@/components/gestion/ui';

const STATUT_LABEL: Record<string, string> = {
  en_cours: 'En cours',
  termine: 'Terminé',
  abandonne: 'Abandonné',
};
const STATUT_CLASS: Record<string, string> = {
  en_cours: 'border-warn/50 bg-warn/10 text-warn',
  termine: 'border-good/50 bg-good/10 text-good',
  abandonne: 'border-line bg-[var(--surface-2)] text-muted',
};

export default function FicheElevePage({ params }: { params: { id: string } }) {
  const [file, setFile] = useState<StudentFile | null>(null);
  const [aide, setAide] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getStudentFile(params.id);
        if (!alive) return;
        setFile(data);
        if (data) setAide(await countHelpByAttempt(data.attempts.map((a) => a.id)));
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-[14px] text-muted">Chargement…</main>;

  if (!file) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageTitle>Fiche élève</PageTitle>
        <Message error={err ?? "Élève introuvable, ou vous n'enseignez pas à cette classe."} />
        <Link href="/prof/classes" className="mt-3 inline-block text-[13px] font-semibold underline">
          Retour à mes classes
        </Link>
      </main>
    );
  }

  const { student, klass, attempts } = file;
  const stats = eleveStats(attempts);
  const diplome = DIPLOMAS.find((d) => d.id === (student.diploma ?? klass?.diploma));
  const nom =
    student.full_name ?? (`${student.last_name ?? ''} ${student.first_name ?? ''}`.trim() || 'Élève');
  const aideTotale = Object.values(aide).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <Link href="/prof/classes" className="text-[13px] font-semibold text-muted underline">
        ← Mes classes
      </Link>

      <PageTitle
        sub={
          <>
            {klass?.name ?? 'Sans classe'} · {diplome?.short ?? 'Diplôme non renseigné'} · identifiant{' '}
            <span className="font-mono">{student.login ?? '—'}</span>
          </>
        }
      >
        {nom}
      </PageTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Chiffre label="TP terminés" value={stats.tpDone} />
        <Chiffre label="Moyenne" value={stats.moyenne != null ? stats.moyenne : '—'} unit="/20" />
        <Chiffre label="Compétences acquises" value={stats.competences.filter((c) => c.mastery === 'acquis').length} />
        <Chiffre label="Questions au prof virtuel" value={aideTotale} />
      </div>

      <Panneau title="Tentatives">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-[.06em] text-muted">
              <tr>
                <th className="px-3 py-2.5">TP</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5">Note</th>
                <th className="px-3 py-2.5">Aide utilisée</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Compétences du TP</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-line align-top">
                  <td className="px-3 py-2.5 font-semibold">{a.tp_id}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUT_CLASS[a.status]}`}
                    >
                      {STATUT_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono">{a.score != null ? `${noteSur20(a.score)}/20` : '—'}</td>
                  <td className="px-3 py-2.5 font-mono">{aide[a.id] ?? 0}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted">
                    {dateCourte(a.finished_at ?? a.updated_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <PastillesCompetences competences={a.evaluation ?? []} />
                  </td>
                </tr>
              ))}
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    Aucune tentative enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panneau>

      <Panneau title="Bilan de compétences cumulé" className="bilan-sheet">
        <BilanExport
          className="mb-3"
          competences={stats.competences}
          tpsParCode={competenceTps(attempts)}
          fichier={`bilan-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          identite={{
            eleve: nom,
            etablissement: null,
            classe: klass?.name ?? null,
            diplome: diplome?.short ?? null,
          }}
        />
        <BilanCompetences competences={stats.competences} />
      </Panneau>

      <Message error={err} />
    </main>
  );
}
