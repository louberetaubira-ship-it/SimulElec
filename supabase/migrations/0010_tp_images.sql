-- =============================================================================
-- 0010 · Image de couverture d'un TP dans le catalogue
--
-- Par défaut, la vignette d'un TP est un montage automatique des photos de ses
-- appareils (`tpSprites`). C'est correct mais générique : deux TP qui partagent
-- un contacteur et un transformateur se ressemblent. L'établissement veut
-- pouvoir mettre la photo de SA platine.
--
-- Le droit est volontairement étroit : seul un ADMINISTRATEUR pose ou retire une
-- image. Un professeur, même auteur d'un TP, ne touche pas au catalogue —
-- l'image est l'identité visuelle de l'établissement, pas un réglage de séance.
-- =============================================================================

create table if not exists public.tp_images (
  tp_id      text primary key,
  url        text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.tp_images is
  'Image de couverture d''un TP dans le catalogue. Écriture réservée au rôle admin.';

alter table public.tp_images enable row level security;

-- Lecture : tout le monde, y compris les élèves — c'est une vignette de catalogue.
drop policy if exists tp_images_lecture on public.tp_images;
create policy tp_images_lecture
  on public.tp_images for select
  using (true);

-- Écriture : administrateurs seulement. `public.is_admin()` vient de 0005.
drop policy if exists tp_images_ecriture_admin on public.tp_images;
create policy tp_images_ecriture_admin
  on public.tp_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Stockage des fichiers
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tp-images', 'tp-images', true)
on conflict (id) do nothing;

drop policy if exists "tp images lisibles par tous" on storage.objects;
create policy "tp images lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'tp-images');

drop policy if exists "tp images deposees par un admin" on storage.objects;
create policy "tp images deposees par un admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tp-images' and public.is_admin());

drop policy if exists "tp images remplacees par un admin" on storage.objects;
create policy "tp images remplacees par un admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'tp-images' and public.is_admin())
  with check (bucket_id = 'tp-images' and public.is_admin());

drop policy if exists "tp images supprimees par un admin" on storage.objects;
create policy "tp images supprimees par un admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'tp-images' and public.is_admin());
