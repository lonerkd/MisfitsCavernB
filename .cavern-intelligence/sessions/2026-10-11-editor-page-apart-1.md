# Session — 2026-10-11: taking the editor page apart, part 1 (E1)

First slice of E1 in the [editor-on-the-graph plan](../plans/2026-10-11-editor-integration.md)
(PR #169; may not be merged yet). **Moves only — no behaviour change.**
`app/(suite)/editor/page.tsx` 1,610 → 1,446 lines; three coherent pieces now
live in hooks beside the editor's components:

- `useEditUndo` — undo/redo, grouped by pauses (`components/editor/useEditUndo.ts`).
- `useScriptAnnotations` — the margin notes: load, add (routing to shots/beats/tasks), remove.
- `useTableRead` — the table read and its per-scene timing.

**Why these first:** self-contained (a few pieces of state, no tangle with the
script text or the scene index), and each had **no direct test**, so they were
tested before they were trusted:
- 20 unit tests (`useEditUndo`, `useScriptAnnotations`, `useTableRead`) — `renderHook` with the toast/confirm and the speech engine faked; vitest now also picks up `components/**/*.test.*` (coverage stays scoped to `lib/`).
- A new e2e, `editor-undo.spec.ts`. **It passes on the original 1,610-line page as well as the refactored one** (run both ways), which is the proof that undo is unchanged. The table read (`table-read.spec.ts`) and margin notes (`shot-designer.spec.ts`) already had e2e and pass.

**Care taken:** the hooks keep the original timings, reset order and updater
functions. One catch while moving: a first draft read an error's message only
from `Error` instances; Supabase errors are plain objects with a `message`, so
that would have changed what a writer sees on a failed save — it uses the
original rule.

**Verified:** typecheck, eslint, `npm run test` (695), and these pass on a build of
this branch: editor-undo, table-read, shot-designer, editor-project-script,
split, script-share, beat-to-script, studio-journey, accessibility (every page).
**Not verified:** the other e2e shards (CI); the co-writing/offline safety net
(#172, a separate branch) was not run against this change.

**Next in E1:** the cut-notes and split-screen following, casting/crew, find &
replace, the opening/switching of scripts (the largest and riskiest piece), the
write/format handlers, the writing loop.
