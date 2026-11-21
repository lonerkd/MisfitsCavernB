-- A person left off a film's credits can ask to be added, and the project's owner decides (owner, 2026-11-08, portfolio decision 4:
-- "a person left off can ask to be added and the project's owner decides"). A request is a row: who, which project, what they did,
-- a note. Only the owner of a project that has a public page (visibility link or public, with a share token) takes requests; the
-- requester sees their own, the owner sees the project's. Approving is the owner adding the person to the crew (existing crew
-- tools); this table only records the ask and the answer.

-- Whether a project takes credit requests: it has a page to be credited on. Definer, because an outsider cannot read `projects`.
CREATE FUNCTION internal.takes_credit_requests(pid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pid AND p.visibility IN ('link', 'public') AND p.share_token IS NOT NULL);
$function$;
REVOKE ALL ON FUNCTION internal.takes_credit_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION internal.takes_credit_requests(uuid) TO authenticated;

CREATE TABLE public.credit_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  craft text NOT NULL CHECK (char_length(btrim(craft)) BETWEEN 1 AND 60),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX credit_requests_one_pending_idx ON public.credit_requests (project_id, requester_id) WHERE status = 'pending';
CREATE INDEX credit_requests_requester_idx ON public.credit_requests (requester_id);
CREATE INDEX credit_requests_project_idx ON public.credit_requests (project_id, status);
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit requests view" ON public.credit_requests FOR SELECT TO authenticated
  USING (requester_id = (SELECT auth.uid()) OR internal.is_project_creator(project_id));
-- Ask for yourself, on a project with a page, as a person who is not already on the crew.
CREATE POLICY "credit requests ask" ON public.credit_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()) AND status = 'pending' AND decided_at IS NULL
              AND internal.takes_credit_requests(project_id)
              AND NOT internal.is_project_creator(project_id)
              AND NOT internal.is_project_member(project_id));
-- Only the project's owner decides.
CREATE POLICY "credit requests decide" ON public.credit_requests FOR UPDATE TO authenticated
  USING (internal.is_project_creator(project_id)) WITH CHECK (internal.is_project_creator(project_id));
-- The requester may withdraw a pending ask; the owner may clear any.
CREATE POLICY "credit requests delete" ON public.credit_requests FOR DELETE TO authenticated
  USING ((requester_id = (SELECT auth.uid()) AND status = 'pending') OR internal.is_project_creator(project_id));

-- Only the answer can change, and it is stamped.
CREATE FUNCTION internal.credit_requests_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.project_id is distinct from old.project_id or new.requester_id is distinct from old.requester_id
     or new.craft is distinct from old.craft or new.note is distinct from old.note or new.created_at is distinct from old.created_at then
    raise exception 'Only the answer to a credit request can change' using errcode = '42501';
  end if;
  if old.status <> 'pending' then
    raise exception 'That request has already been answered' using errcode = '23514';
  end if;
  new.decided_at := now();
  return new;
end;
$function$;
REVOKE ALL ON FUNCTION internal.credit_requests_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER credit_requests_guard BEFORE UPDATE ON public.credit_requests FOR EACH ROW EXECUTE FUNCTION internal.credit_requests_guard();

-- The share page needs the project's id to send a request, and an outsider cannot read `projects`. This gives it to a SIGNED-IN person
-- who holds the exact share token of a link/public project (nothing else, no anon).
CREATE FUNCTION public.get_shared_project_id(p_token text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.id FROM public.projects p
   WHERE auth.uid() IS NOT NULL AND coalesce(btrim(p_token), '') <> '' AND p.share_token = p_token AND p.visibility IN ('link', 'public');
$function$;
REVOKE ALL ON FUNCTION public.get_shared_project_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_project_id(text) TO authenticated;
