-- ---------------------------------------------------------------------------
-- 0007_tps_prof.sql — TP construits par le professeur dans le studio.
--
-- * `author`   : professeur propriétaire du TP (null = TP de l'établissement / seed).
-- * `archived` : TP retiré du catalogue sans être supprimé.
-- * `diplomas` : diplômes visés (cap, bacpro, bts, cster).
-- * Les tentatives des élèves survivent à la suppression d'un TP.
-- * RLS : un professeur écrit et supprime SES TP, l'administrateur tous,
--   l'élève ne lit que les TP publiés et non archivés.
--
-- Idempotente : peut être rejouée sans risque.
-- ---------------------------------------------------------------------------

alter table public.tps add column if not exists author   uuid references public.profiles(id) on delete set null;
alter table public.tps add column if not exists archived boolean not null default false;
alter table public.tps add column if not exists diplomas text[] not null default '{}';

comment on column public.tps.author   is 'Professeur auteur du TP (null : TP fourni ou TP historique de l''établissement)';
comment on column public.tps.archived is 'true = retiré du catalogue élève, conservé pour le professeur';
comment on column public.tps.diplomas is 'Diplômes visés : cap | bacpro | bts | cster';

create index if not exists tps_author_idx   on public.tps (author);
create index if not exists tps_archived_idx on public.tps (archived);

-- Les tentatives ne doivent pas disparaître avec le TP : la clé étrangère devient « set null »
-- sur une colonne conservée pour l'historique.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'attempts_tp_id_fkey' and table_name = 'attempts'
  ) then
    alter table public.attempts drop constraint attempts_tp_id_fkey;
  end if;
end $$;

comment on column public.attempts.tp_id is
  'Identifiant du TP (sans contrainte : les tentatives sont conservées même si le TP est supprimé)';

-- ------------------------------------------------------------------ RLS
alter table public.tps enable row level security;

-- Lecture : élève → TP publiés et non archivés ; professeur et admin → tout.
drop policy if exists "tps read" on public.tps;
create policy "tps read" on public.tps for select
  using ((published and not archived) or public.is_teacher());

-- Écriture : le professeur crée ses TP (author = lui), l'administrateur tout.
drop policy if exists "tps teacher write" on public.tps;
drop policy if exists "tps insert" on public.tps;
create policy "tps insert" on public.tps for insert
  with check (public.is_admin() or (public.is_teacher() and (author = auth.uid() or author is null)));

drop policy if exists "tps update" on public.tps;
create policy "tps update" on public.tps for update
  using (public.is_admin() or (public.is_teacher() and (author = auth.uid() or author is null)))
  with check (public.is_admin() or (public.is_teacher() and (author = auth.uid() or author is null)));

drop policy if exists "tps delete" on public.tps;
create policy "tps delete" on public.tps for delete
  using (public.is_admin() or (public.is_teacher() and author = auth.uid()));
