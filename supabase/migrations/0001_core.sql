-- SimulElec — schéma de base (copie fidèle de ce qui est déployé sur le projet Supabase).
-- Documentaire : la base distante existe déjà, ce fichier sert de référence versionnée
-- et permet de recréer un environnement (supabase db reset / nouveau projet).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- types
do $$ begin
  create type public.user_role as enum ('eleve', 'professeur', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attempt_status as enum ('en_cours', 'termine', 'abandonne');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tables
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  level       text,
  teacher_id  uuid not null,
  join_code   text not null unique
                default upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)),
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  avatar_url    text,
  role          public.user_role not null default 'eleve',
  etablissement text default 'Lycée J.-M. Michotte',
  class_id      uuid,
  created_at    timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_class_fk foreign key (class_id) references public.classes(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.classes
    add constraint classes_teacher_id_fkey foreign key (teacher_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

create table if not exists public.tps (
  id          text primary key,          -- ex: 'demarrage-direct'
  title       text not null,
  level       text,
  competences text[] default '{}',
  summary     text,
  definition  jsonb not null,            -- TpDefinition sérialisée (voir scripts/seed-tps.ts)
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.assignments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  tp_id      text not null references public.tps(id) on delete cascade,
  due_at     timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  tp_id       text not null references public.tps(id) on delete cascade,
  status      public.attempt_status not null default 'en_cours',
  stage       integer not null default 0,
  score       numeric,
  state       jsonb not null default '{}'::jsonb,   -- AttemptState
  report      jsonb,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists attempts_student_idx on public.attempts (student_id, updated_at desc);

create table if not exists public.measurements (
  id         uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  stage      integer not null,
  instrument text not null,
  point      text not null,
  value      numeric,
  display    text,
  created_at timestamptz not null default now()
);
create index if not exists measurements_attempt_idx on public.measurements (attempt_id, created_at);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  stage      integer not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_attempt_idx on public.messages (attempt_id, created_at);

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  state      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- fonctions
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists attempts_updated_at on public.attempts;
create trigger attempts_updated_at before update on public.attempts
  for each row execute function public.set_updated_at();

drop trigger if exists tps_updated_at on public.tps;
create trigger tps_updated_at before update on public.tps
  for each row execute function public.set_updated_at();

-- Profil créé automatiquement à l'inscription (Google OAuth).
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_teacher() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('professeur', 'admin'));
$$;

create or replace function public.teaches_student(sid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles p
    join public.classes c on c.id = p.class_id
    where p.id = sid and c.teacher_id = auth.uid());
$$;

-- Un élève rejoint une classe avec le code affiché par le professeur.
create or replace function public.join_class(code text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.classes where join_code = upper(code);
  if cid is null then raise exception 'Code de classe inconnu'; end if;
  update public.profiles set class_id = cid where id = auth.uid();
  return cid;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.profiles     enable row level security;
alter table public.classes      enable row level security;
alter table public.tps          enable row level security;
alter table public.assignments  enable row level security;
alter table public.attempts     enable row level security;
alter table public.measurements enable row level security;
alter table public.messages     enable row level security;
alter table public.projects     enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (id = auth.uid() or public.teaches_student(id) or public.is_teacher());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "classes read" on public.classes;
create policy "classes read" on public.classes for select
  using (teacher_id = auth.uid()
         or id = (select class_id from public.profiles where id = auth.uid()));

drop policy if exists "classes teacher write" on public.classes;
create policy "classes teacher write" on public.classes for insert
  with check (teacher_id = auth.uid() and public.is_teacher());

drop policy if exists "classes teacher update" on public.classes;
create policy "classes teacher update" on public.classes for update using (teacher_id = auth.uid());

drop policy if exists "classes teacher delete" on public.classes;
create policy "classes teacher delete" on public.classes for delete using (teacher_id = auth.uid());

drop policy if exists "tps read" on public.tps;
create policy "tps read" on public.tps for select using (published or public.is_teacher());

drop policy if exists "tps teacher write" on public.tps;
create policy "tps teacher write" on public.tps for all
  using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "assignments read" on public.assignments;
create policy "assignments read" on public.assignments for select using (true);

drop policy if exists "assignments teacher write" on public.assignments;
create policy "assignments teacher write" on public.assignments for all
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

drop policy if exists "attempts own" on public.attempts;
create policy "attempts own" on public.attempts for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "attempts teacher read" on public.attempts;
create policy "attempts teacher read" on public.attempts for select
  using (public.teaches_student(student_id));

drop policy if exists "measurements own" on public.measurements;
create policy "measurements own" on public.measurements for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid()));

drop policy if exists "measurements teacher read" on public.measurements;
create policy "measurements teacher read" on public.measurements for select
  using (exists (select 1 from public.attempts a where a.id = attempt_id and public.teaches_student(a.student_id)));

drop policy if exists "messages own" on public.messages;
create policy "messages own" on public.messages for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid()));

drop policy if exists "messages teacher read" on public.messages;
create policy "messages teacher read" on public.messages for select
  using (exists (select 1 from public.attempts a where a.id = attempt_id and public.teaches_student(a.student_id)));

drop policy if exists "projects own" on public.projects;
create policy "projects own" on public.projects for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.attempts;

-- ===== Durcissement (migration harden_functions) =====
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.is_teacher() from anon, public;
revoke execute on function public.teaches_student(uuid) from anon, public;
revoke execute on function public.join_class(text) from anon, public;
