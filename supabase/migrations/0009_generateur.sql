-- ---------------------------------------------------------------------------
-- 0009_generateur.sql — Lot 8 : générateur de TP assisté.
--
-- * `generation_logs` : une ligne par génération (coût, durée, passes, anomalies).
-- * `tps` : traçabilité de la validation humaine d'un TP généré.
-- * `generation_quota(uid)` : nombre de générations du mois courant.
-- * RÈGLE MÉTIER : un TP généré ne peut pas être publié tant qu'un professeur
--   ne l'a pas validé (`validated_at`).
--
-- Idempotente : peut être rejouée sans risque.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------------ journal des générations
create table if not exists public.generation_logs (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  theme         text not null default '',
  diploma       text,
  duree_ms      integer not null default 0,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cout_estime   numeric(10,4) not null default 0,
  passes        integer not null default 1,
  anomalies     integer not null default 0,
  statut        text not null default 'ok',
  tp_id         text
);

comment on table  public.generation_logs             is 'Journal des générations de TP (un appel au modèle = une ligne)';
comment on column public.generation_logs.theme       is 'Thème demandé par le professeur (aucune donnée personnelle d''élève)';
comment on column public.generation_logs.diploma     is 'Diplôme visé : cap | bacpro | bts | cster';
comment on column public.generation_logs.duree_ms    is 'Durée totale de la génération, vérifications comprises (ms)';
comment on column public.generation_logs.cout_estime is 'Coût estimé de l''appel, en euros';
comment on column public.generation_logs.passes      is 'Nombre d''appels au modèle (1 ou 2)';
comment on column public.generation_logs.anomalies   is 'Anomalies restantes après vérification';
comment on column public.generation_logs.statut      is 'ok | anomalies | erreur | quota | refus';
comment on column public.generation_logs.tp_id       is 'TP enregistré à partir de cette génération, s''il a été gardé';

create index if not exists generation_logs_teacher_idx on public.generation_logs (teacher_id, created_at desc);

alter table public.generation_logs enable row level security;

-- Lecture : le professeur voit ses générations, l'administrateur toutes.
drop policy if exists "generation_logs read" on public.generation_logs;
create policy "generation_logs read" on public.generation_logs for select
  using (teacher_id = auth.uid() or public.is_admin());

-- Écriture : insertion par le serveur au nom du professeur connecté (ou par l'administrateur).
drop policy if exists "generation_logs insert" on public.generation_logs;
create policy "generation_logs insert" on public.generation_logs for insert
  with check (public.is_admin() or (public.is_teacher() and teacher_id = auth.uid()));

drop policy if exists "generation_logs update" on public.generation_logs;
create policy "generation_logs update" on public.generation_logs for update
  using (public.is_admin() or teacher_id = auth.uid())
  with check (public.is_admin() or teacher_id = auth.uid());

-- --------------------------------------------------------- validation humaine d'un TP
alter table public.tps add column if not exists validated_by  uuid references public.profiles(id) on delete set null;
alter table public.tps add column if not exists validated_at  timestamptz;
alter table public.tps add column if not exists generated     boolean not null default false;
alter table public.tps add column if not exists generation_id uuid references public.generation_logs(id) on delete set null;

comment on column public.tps.validated_by  is 'Professeur qui a relu et validé le TP généré';
comment on column public.tps.validated_at  is 'Date de validation humaine (obligatoire avant publication d''un TP généré)';
comment on column public.tps.generated     is 'true = dossier et maquette produits par le générateur';
comment on column public.tps.generation_id is 'Génération à l''origine du TP (generation_logs.id)';

create index if not exists tps_generated_idx on public.tps (generated);

-- ------------------------------------------------------------------- quota mensuel
create or replace function public.generation_quota(uid uuid) returns integer
  language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from public.generation_logs
   where teacher_id = uid
     and created_at >= date_trunc('month', now());
$$;

comment on function public.generation_quota(uuid) is
  'Nombre de générations de TP consommées par ce professeur depuis le 1er du mois';

-- ----------------------------------------------- règle métier : validation avant publication
create or replace function public.tps_validation_avant_publication() returns trigger
  language plpgsql as $$
begin
  if new.generated and new.published and new.validated_at is null then
    raise exception 'Ce TP a été généré automatiquement : il doit être relu et validé par un professeur avant d''être publié.'
      using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists tps_validation_avant_publication on public.tps;
create trigger tps_validation_avant_publication
  before insert or update on public.tps
  for each row execute function public.tps_validation_avant_publication();
