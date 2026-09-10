-- SimulElec — atelier libre : montages personnels (« projects »).
-- 0001_core.sql crée déjà une table `projects` minimale (owner_id / state) ; cette migration
-- l'amène au schéma v3 (owner / scene / data / class_id / shared) sans perdre les lignes existantes.

-- ---------------------------------------------------------------- table
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  scene      text not null default 'ind',
  data       jsonb not null,
  class_id   uuid references public.classes(id) on delete set null,
  shared     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- reprise du schéma 0001 (owner_id → owner, state → data)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'owner_id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'owner')
  then
    alter table public.projects rename column owner_id to owner;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'state')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'projects' and column_name = 'data')
  then
    alter table public.projects rename column state to data;
  end if;
end $$;

alter table public.projects add column if not exists scene    text    not null default 'ind';
alter table public.projects add column if not exists data     jsonb   not null default '{}'::jsonb;
alter table public.projects add column if not exists class_id uuid;
alter table public.projects add column if not exists shared   boolean not null default false;

-- `data` est toujours fourni par l'application : pas de valeur par défaut.
alter table public.projects alter column data drop default;
alter table public.projects alter column data set not null;

do $$ begin
  alter table public.projects
    add constraint projects_owner_fkey foreign key (owner) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects
    add constraint projects_class_fkey foreign key (class_id) references public.classes(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects
    add constraint projects_scene_chk check (scene in ('ind', 'hab', 'ter', 'pv'));
exception when duplicate_object then null; end $$;

create index if not exists projects_owner_idx on public.projects (owner, updated_at desc);
create index if not exists projects_class_idx on public.projects (class_id) where shared;

-- ---------------------------------------------------------------- trigger updated_at
-- `public.set_updated_at()` est défini par 0001_core.sql.
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.projects enable row level security;

-- l'ancienne politique de 0001 portait sur owner_id
drop policy if exists "projects own" on public.projects;

drop policy if exists "projects owner read" on public.projects;
create policy "projects owner read" on public.projects for select
  using (owner = auth.uid());

drop policy if exists "projects owner insert" on public.projects;
create policy "projects owner insert" on public.projects for insert
  with check (owner = auth.uid());

drop policy if exists "projects owner update" on public.projects;
create policy "projects owner update" on public.projects for update
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "projects owner delete" on public.projects;
create policy "projects owner delete" on public.projects for delete
  using (owner = auth.uid());

-- Lecture par la classe : membres de la classe (profiles.class_id) et professeur de cette classe.
drop policy if exists "projects class read" on public.projects;
create policy "projects class read" on public.projects for select
  using (
    shared
    and class_id is not null
    and (
      class_id = (select p.class_id from public.profiles p where p.id = auth.uid())
      or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------- grants
revoke all on table public.projects from anon;
grant select, insert, update, delete on table public.projects to authenticated;
