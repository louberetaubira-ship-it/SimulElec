-- ---------------------------------------------------------------------------
-- Lot 12 : DEUX adresses par personne.
--
-- Un enseignant a souvent deux boîtes : l'adresse ACADÉMIQUE, qui est son
-- identité professionnelle mais n'est pas un compte Google, et une adresse
-- GOOGLE, pratique pour entrer d'un clic. Les deux désignent la même personne
-- et doivent ouvrir le même compte.
--
-- `email` reste la clé et l'identité de référence — c'est elle qui porte le mot
-- de passe. `google_email` est facultative : elle ne sert qu'à laisser passer la
-- connexion Google.
-- ---------------------------------------------------------------------------

alter table public.teacher_allowlist
  add column if not exists google_email text;

comment on column public.teacher_allowlist.google_email is
  'Adresse Google facultative de la meme personne. Autorise la connexion Google sans etre l''identite de reference.';

-- Une adresse Google ne peut désigner qu'une personne. L'index est PARTIEL :
-- plusieurs lignes peuvent laisser la colonne vide sans se gêner.
create unique index if not exists teacher_allowlist_google_email_key
  on public.teacher_allowlist (lower(google_email))
  where google_email is not null;

-- ---------------------------------------------------------------------------
-- Le trigger accepte désormais l'une OU l'autre des deux adresses.
--
-- Le rôle et le nom viennent de la ligne trouvée, quelle que soit l'adresse par
-- laquelle la personne est entrée : se connecter avec Google ne doit pas donner
-- un compte différent de celui ouvert avec l'adresse académique.
-- ---------------------------------------------------------------------------
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

  -- Une adresse peut, par accident de saisie, correspondre à DEUX lignes : comme
  -- `email` d'une personne et comme `google_email` d'une autre. La ligne dont
  -- c'est l'identité de référence l'emporte, sans quoi le rôle attribué
  -- dépendrait de l'ordre de lecture de la table.
  select * into allow from public.teacher_allowlist
   where lower(email) = lower(new.email)
      or lower(google_email) = lower(new.email)
   order by (lower(email) = lower(new.email)) desc
   limit 1;

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
