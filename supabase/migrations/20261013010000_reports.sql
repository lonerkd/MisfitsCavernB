-- Moderation, the first slice: anyone signed in can report a message, a job or a
-- profile; an admin sees every report and settles it. A report is a record of
-- what a person said about a thing — it does not hide or remove anything by
-- itself (that is the admin's call, with the tools they already have).

CREATE TABLE public.reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reporter_id uuid DEFAULT auth.uid() NOT NULL,
  kind text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT reports_kind_check CHECK (kind IN ('message', 'job', 'profile')),
  CONSTRAINT reports_status_check CHECK (status IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT reports_reason_check CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  -- One report per person per thing: a second is noise, not signal.
  CONSTRAINT reports_once_key UNIQUE (reporter_id, kind, target_id)
);
CREATE INDEX reports_status_idx ON public.reports USING btree (status, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- One SELECT policy: your own reports, or all of them if you are an admin.
CREATE POLICY "reports view" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR internal.caller_is_admin());
-- You can only report as yourself, and only open.
CREATE POLICY "reports insert" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()) AND status = 'open' AND resolved_by IS NULL);
-- Only an admin settles a report; nobody deletes one.
CREATE POLICY "reports settle" ON public.reports FOR UPDATE TO authenticated
  USING (internal.caller_is_admin()) WITH CHECK (internal.caller_is_admin());

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
REVOKE ALL ON public.reports FROM anon;
