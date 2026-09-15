-- ---------------------------------------------------------------------------
-- Lot 13 : MODIFIER et RETIRER un élève, sans perdre ses notes.
--
-- Pourquoi une colonne plutôt qu'un `delete` : la chaîne de clés étrangères est
-- entièrement en CASCADE.
--
--     auth.users → profiles (on delete cascade)
--     profiles   → attempts (student_id, on delete cascade)
--     attempts   → measurements (on delete cascade)
--     attempts   → messages (on delete cascade)
--
-- Supprimer le compte d'un élève détruit donc, en une seule instruction et sans
-- retour possible, TOUTES ses tentatives, toutes ses mesures et tout son
-- dialogue avec le professeur virtuel — c'est-à-dire la totalité de ce qui
-- fonde sa notation et le bilan de compétences de la classe. Un élève qui
-- change d'établissement en cours d'année ferait disparaître le travail déjà
-- évalué de l'année.
--
-- On garde donc le compte et on le met hors service : c'est le RETRAIT.
--   • `archived` = true : l'élève sort des listes actives du professeur ;
--   • la connexion est bloquée côté GoTrue par l'API d'administration
--     (`ban_duration`), pas ici — un drapeau de table n'empêche personne
--     d'ouvrir une session ;
--   • `class_id` est CONSERVÉ. C'est le point important : `teaches_student()`
--     passe par `profiles.class_id → classes.teacher_id`. Détacher l'élève de
--     sa classe couperait au professeur l'accès en lecture aux tentatives qu'on
--     cherche justement à préserver — les données seraient là, mais plus
--     personne ne pourrait les lire.
--
-- La suppression définitive reste possible, mais uniquement par la route
-- serveur `/api/classes/eleves/retrait` en mode `definitif`, qui la refuse dès
-- qu'une tentative existe. Aucune politique `for delete` n'est créée sur
-- `profiles` : le professeur ne doit jamais pouvoir déclencher la cascade
-- depuis le navigateur, où rien ne vérifierait ce qui est détruit.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists archived boolean not null default false;

comment on column public.profiles.archived is
  'Élève retiré de sa classe : sorti des listes actives et de l''effectif, connexion bloquée, mais tentatives, mesures et notes conservées et toujours lisibles par son professeur.';

-- Le professeur liste ses élèves actifs classe par classe : l'index partiel
-- sert exactement cette lecture-là.
create index if not exists profiles_class_actifs_idx
  on public.profiles (class_id)
  where archived = false;

-- ------------------------------------------------------------------ RLS
--
-- Rien à affaiblir, rien à ouvrir de plus :
--
--   • LECTURE — « profiles self read » (0001) couvre déjà la nouvelle colonne :
--     `teaches_student(id)` reste vrai puisque `class_id` est conservé.
--   • ÉCRITURE — « profiles teacher update » (0005) autorise le professeur à
--     modifier les profils des élèves de SES classes, et l'admin partout :
--     poser `archived`, changer `first_name` / `last_name` / `login` y entre
--     sans nouvelle politique.
--
-- On se contente donc de REPOSER la politique d'écriture à l'identique, pour
-- qu'un environnement recréé depuis les seules migrations 0001→0013 l'ait bien,
-- et pour que la clause `with check` soit lisible à côté de la colonne qu'elle
-- protège désormais. Le prédicat est inchangé, mot pour mot, par rapport à
-- 0005 : un professeur ne touche qu'aux élèves de ses classes.
drop policy if exists "profiles teacher update" on public.profiles;
create policy "profiles teacher update" on public.profiles for update
  using (public.teaches_student(id) or public.is_admin())
  with check (public.teaches_student(id) or public.is_admin());

-- L'identifiant de connexion reste unique : l'index partiel de 0005
-- (`profiles_login_key`) vaut aussi pour un élève retiré, sans quoi un compte
-- archivé libérerait son identifiant et deux comptes se retrouveraient à
-- répondre au même `nom.prenom` à la connexion. On ne le touche pas.
