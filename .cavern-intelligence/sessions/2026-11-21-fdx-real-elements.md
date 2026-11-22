# 2026-11-21 — FDX: real elements instead of Fountain markers as text

The FDX exporter wrote dual dialogue, centered text, sections and the title page as Action paragraphs with Fountain markers as literal text (Final Draft showed `STEEL ^` or `> THE END <`). Now:

- `export.ts`: new pure `scriptToFdx` (`exportScriptAsFdx` downloads it). Dual dialogue is one `<DualDialogue>` with both speakers; centered text is an Action paragraph with `Alignment="Center"`; the title page is a `<TitlePage>` built from the Fountain keys (the script's name only when the source has none); sections and synopses are `General` paragraphs. The title page header was written unescaped (a title with `&` produced broken XML): escaped now.
- `import.ts` `parseFdx`: reads `<DualDialogue>` (second cue gets ` ^`), centered paragraphs (`> text <`), and the `<TitlePage>` back into `Title:`, `Credit:`, `Author:` and the other keys (our export labels each paragraph with an XML comment `<!--cavern:key=...-->`; a Final Draft file without labels is read by position). Self-closing `<Paragraph/>` no longer swallows the next paragraph.
- Tests: `fdx-roundtrip.test.ts` runs under jsdom for a real XML parse; new cases for dual dialogue (parentheticals, two pairs), centered, title page with all keys, a Final Draft-style unlabelled title page, sections/synopses, and no `^` or `> <` in any exported text.

Decisions:
- A caret on its own line (`^` between two speakers) is Fountain's second spelling of dual dialogue; it comes back as `NAME ^` after the second cue. Same reading, different text, so the old case that expected it back verbatim now expects the canonical form.
- Sections and synopses have no FDX element. They stay as text (`General`, marker kept) rather than inventing attributes Final Draft might reject; the importer reads General text verbatim, so they come back exactly.
- Notes, forced elements (`!`, `@`, `~`, `> transition`), page breaks and boneyard keep today's behaviour: I am not confident what Final Draft reads for them (`<ScriptNote>` is the candidate). Left in `backlog-detail.md` 4.9.

Verified: `npx vitest run lib/scriptos` (647 passed, 1 skipped); `npx tsc --noEmit`; eslint on the three changed files; `npm run sync-intel`. Not verified: Final Draft itself was not available, so no exported file was opened in it. Only the round trip and an XML well-formedness check (jsdom) were run; whether Final Draft lays out the dual columns, the centered line and the title page as intended is unchecked. No UI changed, so no browser look or e2e.
