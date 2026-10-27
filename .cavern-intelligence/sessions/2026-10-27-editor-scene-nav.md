# Session — 2026-10-27: Go to scene actually jumps, and ⌘↓/⌘↑ walks the script

**Why:** the editor's Go to scene dialog (Ctrl/⌘ + G) only showed a toast —
"Jumped to Scene 4" — and left the caret where it was. The toast was the only
thing that moved. A writer's most-used navigation command, and it lied.

**Changed**
- `app/(suite)/editor/page.tsx` — the dialog's jump now calls `jumpToScene`
  (caret on the scene's heading, view back to Write, scrolled into view); the
  toast is gone because the page moves. New: **Ctrl/⌘ + ↓ / ↑** jumps to the
  next / previous scene from wherever the caret is, stops at the first and last
  scene (no wrap). Bound through `useEffectEvent`, so the listener is added once
  and still sees the current scene.
- `components/editor/EditorModals.tsx` — the dialog previews what Enter would
  land on: the scene's heading, or "No scene 9 · 1 - 3" in the danger colour. A
  text/numeric input with `sceneNumberFromInput`, so "3a", "1e3", "2.5" and "-1"
  are not read as scenes. Shortcuts overlay lists both bindings.
- `lib/scriptos/sceneviews.ts` — two pure helpers (`stepScene`,
  `sceneNumberFromInput`) with tests in `sceneviews.test.ts`; a jsdom test for
  the dialog in `components/editor/EditorModals.test.tsx`.
- Docs: `bible/04-scriptos.md` (how to move through the script), BACKLOG 3.33
  (what is left of 4.7's quick wins), `wishlist-ranking.md` §7 marked built.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on the four touched
files; `npx vitest run lib/scriptos/sceneviews.test.ts` (10 tests) and
`components/editor/EditorModals.test.tsx` (5 tests) pass; full `npx vitest run`
and `npm run build` on this branch (see CI).

**Not verified:** the editor in a browser — the sandbox has no local Supabase
stack, so the jump's scroll position and the ⌘↓/⌘↑ binding were not watched
happen. Worth a two-minute check next time the app is up: put the caret in the
middle of a script, press ⌘G → 4 → Enter (caret lands on scene 4's heading), then
⌘↓ twice and ⌘↑ once.

**Next:** the rest of 4.7's quick wins are scoped as BACKLOG 3.33 (page number,
a character's scenes, command history).

---

**Update, same branch — the rest of it, not just scene numbers.** While the box
was open, it now also takes:

- **a page** — `p12`, `p.12`, `pg12` or `page 12` — and lands on that page's
  first printed line (the same 55-lines-a-page measure the page count uses, via
  the new `lineAtPage` in `timing.ts`; `printedLines` was split into
  `printedLineRuns` so both read one implementation). It previews the scene the
  page opens in.
- **a character's name** (exact, or a unique beginning, any case). Enter goes to
  *their* next scene after the caret; the box stays open, so Enter again walks
  their scenes in order and wraps at the end. Two names that share a beginning
  say "keep typing"; nothing matching says so instead of doing nothing.
- Page and character resolution is pure in `lib/scriptos/goto.ts`
  (`resolveGoTo`, `speakingCast`, `lineOffset`), so the label and the target are
  unit-tested; the dialog has a jsdom test per kind.

**Verified (second pass):** `npx tsc --noEmit` clean; `npx vitest run` on the
four touched suites (45 tests) green; full suite and build re-run before the
push (see the commit). Still not watched in a browser — the page jump's caret
position depends on the textarea's line height, which only a real render shows.

