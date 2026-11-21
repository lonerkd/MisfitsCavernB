# 2026-11-21 — FDX round-trip losses fixed

Fixed the four losses pinned as `it.fails` in `lib/scriptos/fdx-roundtrip.test.ts`; each is now a normal `it`.

- `blocks.ts` `renderBlockText`: a character cue upper-cases only the name, so an extension in parentheses keeps its case; a forced scene heading (`.Rooftop`) keeps its case.
- `import.ts` `parseFdx`: the `<TitlePage>` element is skipped (it is not body text), and only line breaks and tabs are collapsed, so runs of inner spaces survive.
- `backlog-detail.md` (4.9): the entry no longer lists the losses as pinned.

Decision: editing a character cue now leaves `(cont'd)` as typed rather than upper-casing it; the parser reads either case.

Verified: `npx vitest run lib/scriptos` (57 files passed, 590 tests); `npx tsc --noEmit`; eslint on changed files; `npm run sync-intel`. Not looked at in a browser (no visible UI change beyond cue case while typing).
