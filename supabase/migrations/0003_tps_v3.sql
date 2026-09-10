-- 0003_tps_v3.sql — colonnes v3 de la table `tps` (scène, famille, jouable).
-- Idempotent : peut être rejouée sans risque.

alter table public.tps add column if not exists family   text;
alter table public.tps add column if not exists scene    text;
alter table public.tps add column if not exists playable boolean not null default false;

comment on column public.tps.family   is 'ind | hab | ter | pv — famille pédagogique du TP';
comment on column public.tps.scene    is 'ind | hab | ter | pv — rendu visuel de la platine (SPEC-v3 §2)';
comment on column public.tps.playable is 'true = parcours complet (liaisons + mesures), false = « prévu »';

create index if not exists tps_family_idx on public.tps (family);
create index if not exists tps_playable_idx on public.tps (playable);
