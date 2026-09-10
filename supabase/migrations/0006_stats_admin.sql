-- ---------------------------------------------------------------------------
-- 0006_stats_admin.sql — chiffres de l'établissement pour l'écran /admin.
--
-- La RLS limite chaque professeur à ses propres classes : un simple `count`
-- sous-estime les chiffres, même pour un administrateur. Cette fonction
-- `security definer` contourne la RLS mais vérifie elle-même que l'appelant
-- est bien administrateur.
-- ---------------------------------------------------------------------------

create or replace function public.etablissement_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  stats json;
begin
  if not public.is_admin() then
    raise exception 'Chiffres de l''établissement réservés à l''administrateur.'
      using errcode = '42501';
  end if;

  select json_build_object(
    'professeurs',  (select count(*) from public.profiles  where role in ('professeur', 'admin')),
    'classes',      (select count(*) from public.classes),
    'eleves',       (select count(*) from public.profiles  where role = 'eleve'),
    'tps_publies',  (select count(*) from public.tps       where published),
    'tps_realises', (select count(*) from public.attempts  where status = 'termine')
  ) into stats;

  return stats;
end $$;

comment on function public.etablissement_stats() is
  'Chiffres de l''établissement (professeurs, classes, élèves, TP publiés, TP réalisés). Lève une exception si l''appelant n''est pas administrateur.';

revoke all on function public.etablissement_stats() from public;
revoke all on function public.etablissement_stats() from anon;
grant execute on function public.etablissement_stats() to authenticated;
