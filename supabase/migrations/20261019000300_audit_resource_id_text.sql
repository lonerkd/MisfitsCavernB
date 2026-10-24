-- audit_logs.resource_id was uuid, but many callers (admin_close_job, export
-- tests) pass non-UUID opaque strings. Widen it to text; uuid values remain
-- valid text so existing data is preserved.

ALTER TABLE public.audit_logs ALTER COLUMN resource_id TYPE text;
