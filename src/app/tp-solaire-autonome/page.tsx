import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Installation solaire autonome · TP complet · SimulElec',
  description:
    'TP photovoltaïque autonome (24 V) : dimensionnement, couplage série/parallèle, calepinage, pose sur toit, platine câblée avec protections, simulation, mise en service, mesures et maintenance.',
};

/**
 * TP « cycle complet » photovoltaïque autonome (suite du dimensionnement PV).
 * Le parcours interactif validé est hébergé en page pleine (public/tp/pv-autonome.html)
 * dans la coque de l'application (navigation SimulElec au-dessus).
 */
export default function TpSolaireAutonomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-2 py-4">
      <div className="mb-3 px-2">
        <div className="font-title text-[12px] font-semibold uppercase tracking-[.14em] text-accent">
          Bac Pro MELEC · Photovoltaïque
        </div>
        <h1 className="text-[26px] font-bold">Installation solaire autonome — TP complet</h1>
        <p className="mt-1 max-w-[70ch] text-[14px] text-muted">
          Du dimensionnement à la maintenance : calculs, couplage série/parallèle, calepinage du toit,
          pose et raccordement, platine câblée avec protections, simulation sous tension, mise en
          service, mesures et dépannage.
        </p>
      </div>
      <iframe
        src="/tp/pv-autonome.html"
        title="TP installation solaire autonome"
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--app)]"
        style={{ height: 'calc(100vh - 150px)', minHeight: 640 }}
      />
    </div>
  );
}
