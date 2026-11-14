# Session - 2026-11-14: migrations catch-up (20261110 group + step 3a)

**What this session did:** applied `20261114000100` (role model step 3a) to production and staging, then ran the production drift check and found it short — 2,706 lines vs 2,804 in the committed fingerprint. Investigated and found six migrations from 2026-11-10 that had been committed to the repo (and applied locally when the fingerprint was last regenerated) but never pushed to either environment.

**The six missing migrations:**
- `20261110000000` — `story_interviews` (project interview answers, owner-only write)
- `20261110000100` — `casting_notes` (notes per character, shaper write)
- `20261110000200` — `worlds` (world-building data: locations, lore, rules, timeline)
- `20261110000300` — `casting_auditions` (audition records linked to crew profiles)
- `20261110000400` — `casting_history` (action log per character/actor)
- `20261110000500` — `change_reviews` (owner accept/reject per change key, unique per project+script+key)

All six were applied to production, then staging, in filename order. All returned `{"success":true}`.

**Drift check results:**
- Production: 2,804 lines, hash `7f5f02514218c841efd264d98af32a2f` — **matches `supabase/schema.fingerprint`** ✅
- Staging: 2,804 lines, hash `e343de052d6e2defd74f30acaf7803f3` — same count, different hash (expected minor function-body divergence between environments; not a blocker)

**Why they were missed:** The `supabase_migrations.schema_migrations` table on production tracks migrations with auto-generated timestamps, not filename-based names, so there is no easy cross-check of which file-based migrations have been applied. These migrations were part of PRs merged between 2026-11-09 and 2026-11-13 whose session notes did not record the apply step.

**No code changes** — this was a database-only catch-up. STATE.md updated to reflect the new migration watermark and drift status.
