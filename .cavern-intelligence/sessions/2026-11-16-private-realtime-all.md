# Session - 2026-11-16: every Realtime channel private

**Why:** after #607 the owner turned off Realtime's "Allow public access". That refuses every non-private channel, and fifteen of the app's channels (Lounge DMs, typing, threads, unread, the notification bell, presence, voice signalling, project and Studio live updates, production records, notes, the projects list) were public, so they stopped in production. My earlier advice to turn the setting off was wrong: it is project-wide.

**Changed:** every `supabase.channel(...)` passes `private: true`; migration `20261116000300` replaces the two script-only policies with one SELECT and one INSERT policy on `realtime.messages` that cover each topic by who it belongs to (database-and-security.md §2.E). Row events (postgres_changes) are still filtered by each table's RLS.

**Tests:** `tests/integration/script-channel.test.ts` extended (project topics, a person's own topics, DMs, suite-wide topics, unknown topics refused). Unit tests for the touched areas pass (678); typecheck clean. Apply the migration to production, then staging, right after merge; then check the Lounge and the bell live.
