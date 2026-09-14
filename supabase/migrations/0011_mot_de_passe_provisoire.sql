-- ---------------------------------------------------------------------------
-- Lot 11 : mot de passe PROVISOIRE.
--
-- L'administrateur génère un mot de passe aléatoire et le remet de la main à la
-- main. Ce mot de passe a traversé une conversation, un carnet, peut-être un
-- message : il est connu d'au moins deux personnes, donc il n'est pas un secret.
-- Il ne sert qu'à ouvrir la première session, et la première session ne sert
-- qu'à en choisir un autre.
--
-- Le drapeau ci-dessous porte cette obligation. Il est posé par l'API
-- d'administration à la génération, et levé au moment — et seulement au moment —
-- où le mot de passe a effectivement changé.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'Mot de passe provisoire remis par l''administrateur : la personne doit en choisir un autre avant d''accéder au reste de l''application.';

-- Les comptes déjà en place gardent leur mot de passe : on n'impose rien
-- rétroactivement, sans quoi un professeur en cours d'année serait bloqué sans
-- comprendre pourquoi.
