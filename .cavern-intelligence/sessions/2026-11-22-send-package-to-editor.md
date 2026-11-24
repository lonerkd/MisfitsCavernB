# 2026-11-22 — Send the editor's package to the editor (3.51, slice)

The package for the editor (Production › Editorial handoff) was only printable. It now has **Send to editor**: the confirmed crew in the Editorial department (an editor, an assistant editor, a colourist...; never the sender) each get a notification with the counts from the package (scenes shot, shots with a selected take, cards verified) and, in plain words, what the editor cannot use yet, linked to the handoff. A confirm names the people first; no confirmed editor shows an error saying where to add one; a partial failure says how many were reached.

- `lib/studio/editor-handoff.ts` (pure: recipients, message) with unit tests; `EditorPackagePanel.tsx` holds the button. No migration, no new table: it uses `notify`.
- Audit state found while here: acknowledgements, learn-my-lines, take timings and photos, and `/call` in the mobile audit were already built; the 3.51 text was stale on those and is updated for this item.
- Left (backlog 3.51): the package as a numbered version the editor acknowledges; selected takes arriving in the post cut; investor budget summary, distributor screening link, press kit in the review link.

Verified: typecheck clean, eslint clean on the changed files, `editor-handoff.test.ts` 4 passed.
