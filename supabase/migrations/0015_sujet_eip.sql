-- ---------------------------------------------------------------------------
-- 0015_sujet_eip.sql — sujets numériques imposables (complets ou thématiques).
--
-- Un sujet numérique (`eip`, `eip-habilitations`, `eip-eclairage`, `eip-myhome`,
-- `eip-vigik`) s'impose à une classe comme un TP, par `assignments` : la clé étrangère
-- `assignments.tp_id → tps.id` est retirée (comme celle d'`attempts` en 0007), puisqu'un
-- sujet numérique n'a pas de ligne dans `tps`.
--
-- Le renommage des identifiants techniques des copies existantes vers les identifiants
-- neutres a été appliqué directement en base (2026-09-23) ; il n'a pas lieu d'être rejoué.
--
-- Idempotente.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'assignments_tp_id_fkey' and table_name = 'assignments'
  ) then
    alter table public.assignments drop constraint assignments_tp_id_fkey;
  end if;
end $$;

comment on column public.assignments.tp_id is
  'TP (table tps) ou sujet numérique (/sujet/<id>, complet ou thématique) imposé à la classe';
