-- The brief catalogue's admin screen (/admin/brief-questions) can now edit,
-- reorder and remove questions. Editing is a plain UPDATE under the existing
-- admin-only RLS policy. Two things need a function:
--
--   admin_move_brief_question(key, direction) — moves a question one place up
--     (-1) or down (1) inside its phase. The phase is renumbered 10, 20, 30…
--     in the order it already reads (position, then key), so duplicate or
--     gappy positions cannot make a move do nothing, and the swap is one
--     transaction. Moving past either end does nothing.
--   admin_remove_brief_question(key) — removes the question and, through
--     ON DELETE CASCADE, every project's answer to it, and writes an
--     audit_logs row saying which question and how many answers went.
--
-- Both are admin-only (internal.caller_is_admin()). The screen uses the
-- removal function; the table's own admin DELETE policy is unchanged.

CREATE FUNCTION public.admin_move_brief_question(p_key text, p_direction integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ph text;
  keys text[];
  i integer;
  j integer;
  tmp text;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  if p_direction not in (-1, 1) then
    raise exception 'Direction is -1 (up) or 1 (down)' using errcode = '22023';
  end if;
  select phase into ph from public.brief_questions where key = p_key;
  if not found then
    raise exception 'No such question' using errcode = 'P0002';
  end if;
  select array_agg(q.key order by q.position, q.key) into keys
    from public.brief_questions q where q.phase = ph;
  i := array_position(keys, p_key);
  j := i + p_direction;
  if j < 1 or j > array_length(keys, 1) then
    return;
  end if;
  tmp := keys[i];
  keys[i] := keys[j];
  keys[j] := tmp;
  update public.brief_questions b set position = t.ord * 10
    from unnest(keys) with ordinality as t(k, ord)
   where b.key = t.k;
end;
$function$;

CREATE FUNCTION public.admin_remove_brief_question(p_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.brief_questions;
  answers integer;
begin
  if not internal.caller_is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  select * into q from public.brief_questions where key = p_key for update;
  if not found then
    raise exception 'No such question' using errcode = 'P0002';
  end if;
  select count(*) into answers from public.project_brief where question = p_key;
  delete from public.brief_questions where key = p_key;
  insert into public.audit_logs (user_id, action, resource_type, resource_id, details)
    values ((select auth.uid()), 'admin_remove_brief_question', 'brief_question', p_key,
            jsonb_build_object('label', q.label, 'phase', q.phase, 'answers_deleted', answers));
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_move_brief_question(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_move_brief_question(text, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_remove_brief_question(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_brief_question(text) TO authenticated, service_role;
