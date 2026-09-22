-- Sujets numériques (copies conformes de sujets d'examen, `/sujet/<id>`).
--
-- La copie d'un élève est une ligne `attempts` ordinaire (`tp_id` = id du sujet,
-- `state.kind = 'sujet'`). Le professeur ne peut que LIRE les tentatives de ses élèves
-- (policy « attempts teacher read ») : la validation des réponses rédigées et la
-- réactivation d'une copie remise passent donc par deux fonctions `security definer`,
-- limitées aux copies de sujet numérique des élèves du professeur (ou à l'administrateur).

-- Validation professeur : corrections + annotations (dans `state`), note (/100) et grille.
create or replace function public.valider_copie_sujet(
  p_attempt uuid, p_state jsonb, p_score numeric, p_evaluation jsonb
) returns void
  language plpgsql security definer set search_path = public as $$
declare a public.attempts%rowtype;
begin
  select * into a from public.attempts where id = p_attempt;
  if not found then raise exception 'Copie introuvable'; end if;
  if not (public.teaches_student(a.student_id) or public.is_admin()) then
    raise exception 'Cette copie n''est pas celle d''un de vos élèves';
  end if;
  if coalesce(a.state->>'kind', '') <> 'sujet' or coalesce(p_state->>'kind', '') <> 'sujet' then
    raise exception 'Cette tentative n''est pas une copie de sujet numérique';
  end if;
  update public.attempts
     set state = p_state, score = p_score, evaluation = p_evaluation, updated_at = now()
   where id = p_attempt;
end;
$$;

-- Réactivation : la copie remise repasse « en cours » (note effacée), l'élève peut la reprendre.
create or replace function public.reactiver_copie_sujet(p_attempt uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare a public.attempts%rowtype;
begin
  select * into a from public.attempts where id = p_attempt;
  if not found then raise exception 'Copie introuvable'; end if;
  if not (public.teaches_student(a.student_id) or public.is_admin()) then
    raise exception 'Cette copie n''est pas celle d''un de vos élèves';
  end if;
  if coalesce(a.state->>'kind', '') <> 'sujet' then
    raise exception 'Cette tentative n''est pas une copie de sujet numérique';
  end if;
  update public.attempts
     set status = 'en_cours', score = null, finished_at = null,
         state = jsonb_set(jsonb_set(state, '{remise}', 'false'::jsonb), '{remiseAt}', 'null'::jsonb),
         updated_at = now()
   where id = p_attempt;
end;
$$;

revoke all on function public.valider_copie_sujet(uuid, jsonb, numeric, jsonb) from public, anon;
revoke all on function public.reactiver_copie_sujet(uuid) from public, anon;
grant execute on function public.valider_copie_sujet(uuid, jsonb, numeric, jsonb) to authenticated;
grant execute on function public.reactiver_copie_sujet(uuid) to authenticated;
