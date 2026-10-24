# Session — 2026-10-18: every brief option's `implies` must point at something real

**Found:** `tests/integration/brief.test.ts` only checked that implied *crafts* exist. An option could imply a breakdown category or a channel preset that no project/seed has, and nothing would fail.

**Changed:** the catalogue test now checks `implies.crafts` (against `crafts`), `implies.breakdown` (against the keys `breakdown_categories` seeds for a new project) and `implies.channels` (against `channel_presets`). It fails and names `question/option → kind:ref` for each dangling reference, and fails if any of the three tables or reference lists is empty. `brief_questions.options` is jsonb, so it is validated by a small parser (`parseOptions`) that throws on a malformed option or `implies` list, rather than cast to a type.

**Not verified:** typecheck, lint and the integration run — `node_modules` is not installed in this worktree and the install was not permitted here. Run `npm run typecheck`, `npm run lint` and `npm run test:integration -- brief` (local Supabase stack) before merging.
