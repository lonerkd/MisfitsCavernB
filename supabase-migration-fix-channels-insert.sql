-- Migration: fix the channels INSERT policy so a project's actual creator
-- (or crew) can create a channel at all. Applied live already; committing
-- here so the fix is tracked in the repo, unlike the original policy this
-- replaces, which was never captured in any committed migration file.
--
-- Root cause (found while verifying Phase 5's auto-channel-creation against
-- the live DB with a real account): the original policy's WITH CHECK required
-- created_by = auth.uid() in addition to is_project_creator(project_id). Both
-- clauses independently proved true in isolation, yet the actual INSERT still
-- failed for every real user, including a project's own creator.
--
-- The deeper bug lived one level down, in can_view_channel() (the table's
-- SELECT/USING policy): INSERT ... RETURNING (what Supabase-js's
-- .select().single() generates, and what Prefer: return=representation
-- requests) requires Postgres to re-check the SELECT policy against the row
-- just inserted, within the SAME command as the INSERT. Under Postgres's MVCC
-- command-counter rules, a statement's own just-inserted row isn't visible to
-- nested re-queries of the same table within that command, so
-- can_view_channel's internal `select 1 from channels c where c.id = cid`
-- never found the row -- even though the identical check against the exact
-- same row succeeds an instant later as its own statement. This wasn't
-- specific to my new code: createChannel() has always used
-- .select().single(), so the Lounge's own "+ New Channel" button has likely
-- been silently broken for every real user this whole time.
--
-- Fixed in two parts:
-- 1. This migration: simplifies the INSERT policy to the same proven
--    creator-or-crew pattern already working for project_crew and
--    character_castings, dropping the redundant created_by self-check (not a
--    real security boundary -- project ownership/membership already gates
--    this).
-- 2. lib/supabase/channels.ts: createChannel() no longer chains
--    .select().single() onto the insert (which triggers the RETURNING/MVCC
--    issue above regardless of how permissive the policy is) -- it inserts
--    with Prefer: return=minimal, then does a separate follow-up SELECT to
--    fetch the created row. Verified against the live DB: this two-step
--    pattern succeeds every time; the direct RETURNING form fails every time,
--    even with this corrected policy in place.

DROP POLICY IF EXISTS "channels create by project owner" ON channels;

CREATE POLICY "channels create by project creator or crew" ON channels FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND (public.is_project_creator(project_id) OR public.is_project_member(project_id))
  );
