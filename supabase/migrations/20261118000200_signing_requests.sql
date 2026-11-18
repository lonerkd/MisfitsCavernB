-- Signable paperwork: a document's text sent to a person as a link; they read it, type their name, agree, and the production
-- keeps who signed, when, and a hash of the exact text they agreed to.
--
-- The link is the secret (two random uuids), so the signer needs no account. A guest reads and signs only through three
-- SECURITY DEFINER functions that check the exact token. The production's people (who can shape the project) create and read
-- requests; nobody can edit one in place (the text a person signed is what they signed), so voiding goes through a function
-- and there is no UPDATE or DELETE policy. A signed request marks its paperwork row "done" (a release, a deal memo).
-- A typed name with an agreement box is an electronic signature in the plain sense; whether it is enough for a given
-- document is for the production's lawyer (BACKLOG 1, lawyer review).

CREATE TABLE public.signing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.project_documents(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  signer_label text CHECK (char_length(signer_label) <= 120),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'void')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  signed_name text CHECK (char_length(signed_name) BETWEEN 2 AND 120),
  signed_at timestamptz,
  body_hash text,
  decline_reason text CHECK (char_length(decline_reason) <= 1000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signing_requests_project_idx ON public.signing_requests (project_id, created_at DESC);
CREATE INDEX signing_requests_created_by_idx ON public.signing_requests (created_by);
CREATE INDEX signing_requests_document_idx ON public.signing_requests (document_id);

ALTER TABLE public.signing_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signing_requests FROM anon;
REVOKE UPDATE, DELETE ON public.signing_requests FROM authenticated;
CREATE POLICY signing_requests_read ON public.signing_requests FOR SELECT TO authenticated
  USING (internal.can_shape_project(project_id));
CREATE POLICY signing_requests_create ON public.signing_requests FOR INSERT TO authenticated
  WITH CHECK (
    internal.can_shape_project(project_id)
    AND status = 'pending' AND signed_at IS NULL AND signed_name IS NULL AND body_hash IS NULL AND decline_reason IS NULL
    AND created_by = (select auth.uid())
    AND (document_id IS NULL OR EXISTS (select 1 from public.project_documents d where d.id = document_id and d.project_id = signing_requests.project_id))
  );

-- What a guest sees of a request: the text, the project's name, and where it stands (expired once past its date).
CREATE FUNCTION public.get_signing(p_token text)
 RETURNS TABLE(title text, body text, project_title text, signer_label text, status text, expires_at timestamptz,
               signed_name text, signed_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select r.title, r.body, p.title, r.signer_label,
         case when r.status = 'pending' and r.expires_at <= now() then 'expired' else r.status end,
         r.expires_at, r.signed_name, r.signed_at
    from public.signing_requests r
    join public.projects p on p.id = r.project_id
   where r.token = p_token and char_length(coalesce(p_token, '')) >= 32;
$function$;
REVOKE ALL ON FUNCTION public.get_signing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signing(text) TO anon, authenticated;

CREATE FUNCTION internal.notify_signing(p_project uuid, p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select distinct u.id, 'signing', left(p_title, 200), left(p_body, 280), '/studio?tab=production&view=paperwork'
  from (
    select creator_id as id from public.projects where id = p_project
  ) u
  where u.id is not null;
end;
$function$;
REVOKE ALL ON FUNCTION internal.notify_signing(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Sign: a pending, unexpired request, the agreement ticked, a name of 2 to 120 characters.
CREATE FUNCTION public.sign_document(p_token text, p_name text, p_agree boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.signing_requests;
  name_ text := btrim(coalesce(p_name, ''));
begin
  if not coalesce(p_agree, false) or char_length(name_) not between 2 and 120 or char_length(coalesce(p_token, '')) < 32 then return false; end if;
  select * into r from public.signing_requests where token = p_token for update;
  if r.id is null or r.status <> 'pending' or r.expires_at <= now() then return false; end if;
  update public.signing_requests
     set status = 'signed', signed_name = name_, signed_at = now(),
         body_hash = encode(sha256(convert_to(r.body, 'UTF8')), 'hex')
   where id = r.id;
  if r.document_id is not null then
    update public.project_documents set status = 'done', updated_at = now() where id = r.document_id;
  end if;
  perform internal.notify_signing(r.project_id, r.title || ' signed', name_ || ' signed.');
  return true;
end;
$function$;
REVOKE ALL ON FUNCTION public.sign_document(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_document(text, text, boolean) TO anon, authenticated;

CREATE FUNCTION public.decline_signing(p_token text, p_reason text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.signing_requests;
  reason_ text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if char_length(coalesce(reason_, '')) > 1000 or char_length(coalesce(p_token, '')) < 32 then return false; end if;
  select * into r from public.signing_requests where token = p_token for update;
  if r.id is null or r.status <> 'pending' or r.expires_at <= now() then return false; end if;
  update public.signing_requests set status = 'declined', decline_reason = reason_ where id = r.id;
  perform internal.notify_signing(r.project_id, r.title || ' declined', coalesce(reason_, 'No reason given.'));
  return true;
end;
$function$;
REVOKE ALL ON FUNCTION public.decline_signing(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_signing(text, text) TO anon, authenticated;

-- Void: the production withdraws a pending request (the link stops working).
CREATE FUNCTION public.void_signing(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.signing_requests;
begin
  select * into r from public.signing_requests where id = p_id for update;
  if r.id is null or not internal.can_shape_project(r.project_id) then return false; end if;
  if r.status <> 'pending' then return false; end if;
  update public.signing_requests set status = 'void' where id = r.id;
  return true;
end;
$function$;
REVOKE ALL ON FUNCTION public.void_signing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_signing(uuid) TO authenticated;
