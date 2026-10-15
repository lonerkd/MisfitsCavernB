-- QA (2026-10-15): co-writing sync only goes one way reliably. The editor's
-- primary sync is a broadcast channel (lib/scriptos/sync.ts), which has no
-- delivery guarantee — a missed broadcast (a reconnect, a dropped socket)
-- leaves the other party stale until they refresh. scripts was never added
-- to the realtime publication, so there was no backup path.
ALTER PUBLICATION supabase_realtime ADD TABLE public.scripts;
