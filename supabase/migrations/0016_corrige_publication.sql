-- ---------------------------------------------------------------------------
-- 0016_corrige_publication.sql — publication du corrigé d'un sujet numérique.
--
-- Côté élève, la réponse attendue n'est jamais servie avant que le professeur ne PUBLIE le
-- corrigé, par classe et par sujet (`GET /api/sujet/solution` lit cette table avec la session
-- de l'élève). Un sujet thématique (`eip-eclairage`) est ouvert par la publication de son
-- sujet complet (`eip`) OU par la sienne propre.
--
--  • lecture : les élèves de la classe (profiles.class_id), le professeur de la classe, l'admin ;
--  • écriture (publier / retirer) : le professeur de la classe ou l'admin (`owns_class`, 0005).
--
-- Idempotente.
-- ---------------------------------------------------------------------------

create table if not exists public.sujet_corriges (
  class_id   uuid not null references public.classes(id) on delete cascade,
  sujet_id   text not null,
  publie_par uuid references public.profiles(id) on delete set null,
  publie_le  timestamptz not null default now(),
  primary key (class_id, sujet_id)
);

comment on table public.sujet_corriges is
  'Corrigé d''un sujet numérique (/sujet/<id>) publié pour une classe : réponses attendues visibles des élèves';

create index if not exists sujet_corriges_sujet_idx on public.sujet_corriges (sujet_id);

alter table public.sujet_corriges enable row level security;

drop policy if exists "sujet_corriges read" on public.sujet_corriges;
create policy "sujet_corriges read" on public.sujet_corriges for select
  using (public.owns_class(class_id)
         or class_id = (select class_id from public.profiles where id = auth.uid()));

drop policy if exists "sujet_corriges insert" on public.sujet_corriges;
create policy "sujet_corriges insert" on public.sujet_corriges for insert
  with check (public.owns_class(class_id) and publie_par = auth.uid());

drop policy if exists "sujet_corriges update" on public.sujet_corriges;
create policy "sujet_corriges update" on public.sujet_corriges for update
  using (public.owns_class(class_id))
  with check (public.owns_class(class_id) and publie_par = auth.uid());

drop policy if exists "sujet_corriges delete" on public.sujet_corriges;
create policy "sujet_corriges delete" on public.sujet_corriges for delete
  using (public.owns_class(class_id));

grant select, insert, update, delete on public.sujet_corriges to authenticated;
