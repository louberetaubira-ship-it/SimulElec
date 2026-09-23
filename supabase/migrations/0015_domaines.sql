-- 0015 — Classement des TP par domaine professionnel (voir docs/SPEC-domaines.md).
--
-- Additive et idempotente. Les codes et sous-domaines font foi dans
-- src/lib/taxonomy/domaines.ts ; seule la liste des 11 codes est vérifiée ici.
-- `family` reste : elle pilote la scène. Les TP existants reçoivent le domaine
-- déduit de leur famille (ind→IND, hab→HAB, ter→TER, pv→ENR).
-- Les policies RLS de `tps` couvrent les nouvelles colonnes (même table).

alter table public.tps
  add column if not exists domaine text,
  add column if not exists domaines_sec text[] not null default '{}',
  add column if not exists sous_domaine text,
  add column if not exists activites text[] not null default '{}',
  add column if not exists mots_cles text[] not null default '{}';

alter table public.tps drop constraint if exists tps_domaine_check;
alter table public.tps add constraint tps_domaine_check
  check (domaine is null or domaine in ('HAB','TER','IND','DOM','ENR','RES','INF','SEC','COM','CVC','EAU'));

update public.tps set domaine = case family when 'ind' then 'IND' when 'hab' then 'HAB' when 'ter' then 'TER' when 'pv' then 'ENR' end
  where domaine is null and family is not null;

create index if not exists tps_domaine_idx on public.tps (domaine);
