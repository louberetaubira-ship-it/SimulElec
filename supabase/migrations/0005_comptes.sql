-- ---------------------------------------------------------------------------
-- Lot 6 : comptes professeurs (liste blanche), classes par diplôme,
-- comptes élèves créés par le professeur (identifiant nom.prenom + mot de passe).
-- ---------------------------------------------------------------------------

-- Liste blanche des enseignants autorisés à se connecter avec Google.
create table if not exists public.teacher_allowlist (
  email      text primary key,
  full_name  text,
  role       public.user_role not null default 'professeur',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.teacher_allowlist enable row level security;

insert into public.teacher_allowlist (email, full_name, role)
values ('loubere.taubira@gmail.com', 'L. Taubira', 'admin')
on conflict (email) do update set role = 'admin';

-- Profils : identité des comptes élèves créés par un professeur.
alter table public.profiles
  add column if not exists login       text,
  add column if not exists first_name  text,
  add column if not exists last_name   text,
  add column if not exists created_by  uuid references public.profiles(id) on delete set null,
  add column if not exists last_seen_at timestamptz;
create unique index if not exists profiles_login_key on public.profiles (login) where login is not null;

-- Classes : diplôme préparé, archivage.
alter table public.classes
  add column if not exists diploma  text check (diploma in ('cap','bacpro','bts','cster')),
  add column if not exists archived boolean not null default false;

-- Admin ?
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Le professeur enseigne-t-il à cette classe ?
create or replace function public.owns_class(cid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.classes where id = cid and teacher_id = auth.uid())
      or public.is_admin();
$$;

-- Création du profil à l'inscription :
--   • compte élève (créé par l'API serveur) : métadonnées role=eleve + classe + identité ;
--   • compte Google : autorisé seulement si l'adresse est dans la liste blanche.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  meta_role text := new.raw_user_meta_data->>'role';
  allow     public.teacher_allowlist%rowtype;
begin
  if meta_role = 'eleve' then
    insert into public.profiles (id, email, full_name, role, class_id, diploma,
                                 login, first_name, last_name, created_by, onboarded)
    values (new.id, new.email,
            trim(coalesce(new.raw_user_meta_data->>'first_name','') || ' ' || coalesce(new.raw_user_meta_data->>'last_name','')),
            'eleve',
            nullif(new.raw_user_meta_data->>'class_id','')::uuid,
            nullif(new.raw_user_meta_data->>'diploma',''),
            new.raw_user_meta_data->>'login',
            new.raw_user_meta_data->>'first_name',
            new.raw_user_meta_data->>'last_name',
            nullif(new.raw_user_meta_data->>'created_by','')::uuid,
            true)
    on conflict (id) do nothing;
    return new;
  end if;

  select * into allow from public.teacher_allowlist where lower(email) = lower(new.email);
  if allow.email is null then
    raise exception 'Cette adresse n''est pas autorisée sur SimulElec. Demande à l''administrateur de l''ajouter.'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, onboarded)
  values (new.id, new.email,
          coalesce(allow.full_name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.raw_user_meta_data->>'avatar_url',
          allow.role, true)
  on conflict (id) do update set role = excluded.role;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ RLS
drop policy if exists "allowlist read" on public.teacher_allowlist;
create policy "allowlist read" on public.teacher_allowlist for select using (public.is_teacher());

drop policy if exists "allowlist admin write" on public.teacher_allowlist;
create policy "allowlist admin write" on public.teacher_allowlist for all
  using (public.is_admin()) with check (public.is_admin());

-- Le professeur peut modifier les profils des élèves de ses classes ; l'admin, tous.
drop policy if exists "profiles teacher update" on public.profiles;
create policy "profiles teacher update" on public.profiles for update
  using (public.teaches_student(id) or public.is_admin())
  with check (public.teaches_student(id) or public.is_admin());

-- Lecture des classes : l'admin voit tout l'établissement.
drop policy if exists "classes read" on public.classes;
create policy "classes read" on public.classes for select
  using (teacher_id = auth.uid()
         or id = (select class_id from public.profiles where id = auth.uid())
         or public.is_admin());

-- Suivi en direct de la progression des élèves.
alter publication supabase_realtime add table public.attempts;
