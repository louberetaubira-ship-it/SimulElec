-- ---------------------------------------------------------------------------
-- 0008_evaluation.sql — mode de passage d'un TP (entraînement / évaluation).
--
-- * `assignments.mode` : mode imposé par le professeur à la classe au moment
--   d'affecter le TP. `null` = l'élève choisit lui-même au lancement.
-- * Le mode réellement joué, le chronomètre et l'auto-évaluation de l'élève sont
--   portés par le JSON `attempts.state` (AttemptState) et par `attempts.report`,
--   sans nouvelle colonne ; l'auto-évaluation est aussi recopiée dans chaque ligne
--   de `attempts.evaluation` (champ `self`), que les lectures existantes ignorent.
--
-- Idempotente : peut être rejouée sans risque.
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists mode text
  check (mode is null or mode in ('entrainement', 'evaluation'));

comment on column public.assignments.mode is
  'entrainement | evaluation — mode imposé par le professeur (null : l''élève choisit)';
