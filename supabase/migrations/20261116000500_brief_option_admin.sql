-- The brief catalogue's admin screen can now edit an option's label, add and
-- remove options, and change a question's phase. Label, add and phase are plain
-- UPDATEs under the existing admin-only RLS policy. Answers are the catch:
-- project_brief.value holds an option's id ('one': the id as a string; 'many':
-- an array of ids), and an admin cannot read other projects' answers. So:
--
--   admin_count_brief_answers(key, option) — how many projects answered a
--     question (option null) or chose one option of it. Admin only. The page
--     counts with this before it asks, so the number is the real one.
--   admin_remove_brief_option(key, option) — in one transaction: refuses if
--     another question's ask_when waits on that option, or if it would leave
--     fewer than two; clears the answers (a 'one' answer is deleted; a 'many'
--     answer loses the id, and is deleted if it was the only one); removes the
--     option; writes an audit_logs row with how many answers were cleared.
--
-- internal.brief_question_guard() is the floor under both: whatever writes
-- brief_questions (this screen, a script, the dashboard), a question that has
-- answers cannot change kind, and an option an answer still names cannot
-- disappear from options. An unanswered one can.

CREATE FUNCTION internal.brief_question_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  gone text;
begin
  if new.kind is distinct from old.kind
     and exists (select 1 from public.project_brief where question = old.key) then
    raise exception 'A question that projects have answered cannot change kind' using errcode = '22023';
  end if;
  if new.options is distinct from old.options and old.kind <> 'number' then
    for gone in
      select o->>'id' from jsonb_array_elements(old.options) o
       where not exists (select 1 from jsonb_array_elements(new.options) n where n->>'id' = o->>'id')
    loop
      if exists (select 1 from public.project_brief where question = old.key and value @> to_jsonb(gone)) then
        raise exception 'Option % has answers; remove it with admin_remove_brief_option', gone using errcode = '22023';
      end if;
    end loop;
  end if;
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.brief_question_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER brief_question_guard BEFORE UPDATE OF kind, options ON public.brief_questions
  FOR EACH ROW EXECUTE FUNCTION internal.brief_question_guard();

CREATE FUNCTION public.admin_count_brief_answers(p_key text, p_option text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.project_brief
           where question = p_key and (p_option is null or value @> to_jsonb(p_option)));
end;
$function$;

CREATE FUNCTION public.admin_remove_brief_option(p_key text, p_option text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.brief_questions;
  opt jsonb;
  affected integer := 0;
  n integer;
  waiting text;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select * into q from public.brief_questions where key = p_key for update;
  if not found then
    raise exception 'No such question' using errcode = 'P0002';
  end if;
  if q.kind = 'number' then
    raise exception 'A number question has no options' using errcode = '22023';
  end if;
  select o into opt from jsonb_array_elements(q.options) o where o->>'id' = p_option;
  if opt is null then
    raise exception 'No such option' using errcode = 'P0002';
  end if;
  if jsonb_array_length(q.options) <= 2 then
    raise exception 'A question keeps at least two options' using errcode = '22023';
  end if;
  select string_agg(b.label, ', ') into waiting from public.brief_questions b
   where b.key <> p_key and (b.ask_when #> array['answer', p_key]) @> to_jsonb(p_option);
  if waiting is not null then
    raise exception 'Asked only after this option in: %. Change that first.', waiting using errcode = '22023';
  end if;

  if q.kind = 'one' then
    delete from public.project_brief where question = p_key and value = to_jsonb(p_option);
    get diagnostics affected = row_count;
  else
    delete from public.project_brief where question = p_key and value = jsonb_build_array(p_option);
    get diagnostics affected = row_count;
    update public.project_brief
       set value = (select coalesce(jsonb_agg(v), '[]'::jsonb) from jsonb_array_elements(value) v where v <> to_jsonb(p_option))
     where question = p_key and value @> to_jsonb(p_option);
    get diagnostics n = row_count;
    affected := affected + n;
  end if;

  update public.brief_questions
     set options = (select jsonb_agg(o order by ord) from jsonb_array_elements(q.options) with ordinality as t(o, ord) where o->>'id' <> p_option)
   where key = p_key;
  insert into public.audit_logs (user_id, action, resource_type, resource_id, details)
    values ((select auth.uid()), 'admin_remove_brief_option', 'brief_question', p_key,
            jsonb_build_object('option', p_option, 'label', opt->>'label', 'answers_cleared', affected));
  return affected;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_count_brief_answers(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_brief_answers(text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_remove_brief_option(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_brief_option(text, text) TO authenticated, service_role;
