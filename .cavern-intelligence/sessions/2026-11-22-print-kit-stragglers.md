# 2026-11-22 — Print kit: the last two pop-up printers (BACKLOG 3.45)

**What**: the last tools that built their own `window.open` print page (unescaped, no CSV) now go through the kit.
- World notes (`components/world/WorldEditor.tsx`): the old Export button is a Print / PDF + CSV `PrintButton` over `worldNotesDoc` (`lib/world/print.ts`: places, lore, rules, timeline), with the project's name, accent and logo (passed from `WorldView`).
- Script revision diff (`components/editor/DiffModal.tsx`): its Export is a `PrintButton` over `diffDoc` (`lib/scriptos/diff-print.ts`: lines added and cut), branded from the editor page.
- Deleted the dead `lib/characters/export.ts` (replaced earlier by `character-bible-print`) and `lib/world/export.ts`.
- Only `app/(suite)/call/[id]` (crew's phone page) and PaperworkView (opens a stored file) still call `window.print` / `window.open`, by design.

**Verified**: see the PR (typecheck, lint, unit tests for both documents).
**Not done**: looking at the printed PDF of these two pages by eye; the 3.45 "left" items (QR scan, upload for the logo).
