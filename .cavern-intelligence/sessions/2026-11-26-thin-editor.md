# 2026-11-26 — Thin pages, first page: the editor (restructure phase 7)

**Owner's queue (2026-11-26):** restructure phase 7, one page per PR. The
editor page was 1,627 lines — the biggest page in the suite — even after the
extractions of the last two months. It is 1,307 after this PR. Everything
moved verbatim; no behaviour changes, no assertion weakened.

**What moved out of `app/(suite)/editor/page.tsx`:**

- `components/editor/useScriptOpening.ts` — which script opens (a linked
  `?script=` wins, else the active project's, else the latest or a fresh
  one) and following the session's project to its script. The page passes
  its state setters in; the linked/project refs and `currentScriptRef` live
  in the hook now.
- `components/editor/useScriptSaving.ts` — the debounced autosave, the
  on-device-only sync state with its one-time warning, and Save now. New
  unit tests (`useScriptSaving.test.tsx`) pin the debounce, the warn-once
  behaviour and both Save now outcomes.
- `components/editor/CharacterBibleModal.tsx` — the Character Bible modal,
  with the row selection and the relationship map as its own state (the
  component stays mounted, so both survive closing and reopening, as they
  did when the state lived in the page).
- `components/editor/TitlePageModal.tsx`, `EditorStatusBar.tsx`,
  `AutocompleteMenu.tsx` — the title-page modal, the status bar and the
  autocomplete dropdown, as leaf components taking props.

The moved JSX carried four literal colours the page's lint baseline had
grandfathered. The gate's `lint-baseline-shrinks` check refuses new
suppression entries, so instead of moving the suppressions the literals
became the tokens the design system already had for them: the two modal
scrims are `var(--scrim-flat)` / `var(--scrim-flat-strong)` (the exact
values), the cast badge tint is `color-mix` on `var(--ok)` (the Casting
Board pattern), and the collaborator initial is `var(--on-accent)`. The
page's baseline entry shrank away; no new entries exist. The bible
inventory was regenerated for the page's new size.

**Still in the page, for the next editor pass:** the `EditorCtx` assembly
and the right-panel stack construction (they thread most of the page's
state), the keyboard/typing handlers, and the scene-navigation cluster.
The page remains the orchestrator; this pass took the self-contained
clusters and the leaf modals.

**Verified:** typecheck (app + e2e), lint (0 errors; the two
exhaustive-deps warnings the move surfaced were fixed by naming the —
stable — setters in the dep arrays), the new hook tests, the full unit
suite and a production build locally; `npm run sync-intel` no drift. The
editor e2e specs are opt-in against the local stack and run in the nightly;
they are this PR's live proof, with the owner's next writing session.
