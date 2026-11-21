# Print: one page for the board, headings that repeat on every page

**Not yet a PR** (committed locally on `claude/print-fit-repeat`, not pushed).

## What changed

- **Kit (`lib/print/kit.ts`)**: a `table` block takes an optional `title`. It
  becomes a full-width row at the top of `<thead>`, so a browser repeats it on
  every page the table continues onto. Inline styles only: the shared
  stylesheet and every other table are unchanged (the kit snapshot holds).
- **Schedule (`lib/studio/schedule-print.ts`)**: each day's banner is the
  table's title (was a section heading above it, which did not repeat).
- **Call sheet (`lib/studio/call-sheet-print.ts`)**: the Scenes, Cast and Crew
  headings are table titles (were section headings, so the continued crew
  list had no CREW heading).
- **Boards (`lib/studio/boards-print.ts`)**: the board box is
  `width: min(100%, 250mm)` at 16:10, so on A4 landscape it fits the page under
  the title. Cards are percentages of the box and keep their places.

## Verified

- `npx vitest run lib/print lib/studio`: 64 files pass (1 skipped).
- `npx tsc --noEmit` and `eslint` on the changed files: clean.
- Rendered the print samples with Playwright (`page.pdf`, `preferCSSPageSize`):

| Doc | Before | After |
|---|---|---|
| Boards | 2 pages (blank second page) | 1 page |
| Schedule | 5 pages; pages 3 and 5 opened with scene rows and no DAY banner | 5 pages; pages 3 and 5 repeat `DAY 3` and `DAY 6` |
| Call sheet | 6 pages; CREW only on page 4 | 6 pages; CREW on pages 4-6, CAST and SCENES repeat too |

## Not verified

- Printed on paper or in Safari/Firefox: only Chromium was used to render.
