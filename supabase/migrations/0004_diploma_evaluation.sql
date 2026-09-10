-- 0004 — diplôme préparé sur le profil, grille d'évaluation par compétences sur la tentative.
alter table public.profiles add column if not exists diploma text check (diploma in ('cap','bacpro','bts','cster'));
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.attempts add column if not exists evaluation jsonb;
alter table public.attempts add column if not exists diploma text;
comment on column public.profiles.diploma is 'cap | bacpro | bts | cster — diplôme préparé (référentiel de compétences)';
comment on column public.attempts.evaluation is 'Grille de compétences évaluées à la fin du TP (CompetenceEval[])';
