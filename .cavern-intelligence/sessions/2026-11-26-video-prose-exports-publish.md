# 2026-11-26 — Video and prose: format-shaped exports and a publishing step (BACKLOG 3.51 gap 2, 3.22)

The `video-script` and `prose` formats existed in the registry since 2026-11-15, but their exports were
still document-shaped (a generic jsPDF page) and neither had a publishing step. Both now export in their
own shape, through the print kit where the ad campaign prints (`lib/ad/campaign-print.ts` was the model):

- **New pure module `lib/scriptos/format-export.ts`.** A video script reads as its sections: each
  section's `[bracketed]` on-screen cues and spoken lines (speaker tags and delivery notes kept with the
  line), and a section marker's own timestamp (`0:45 - SPONSOR`).
- **Video PDF** is a shooting layout: one table per section, *On screen* beside *Spoken*, the section
  headed with its written timestamp, and facts for section count, spoken words and an estimated running
  time (spoken words at ~150 a minute). It prints through the browser, so any language prints as written.
- **Video publish package** (Export › *Publish package (.md)*): one Markdown file built only from the
  document's own words and structure — title options (the document's title, and the hook's first spoken
  line, labelled as from the hook), a description excerpted from the opening sections, chapters with the
  timestamps written in the script exactly as written, the other chapter times estimated from spoken
  words and labelled estimates with the rate named, and tags drawn from the title and section names
  alone (no invented topics), capped inside YouTube's 500-character tag budget.
- **Prose PDF** is an article print: the opening paragraph as the lead, headed sections, pull quotes
  set apart as notes, word count and reading time in the facts.
- **Prose publishing** is the clean file itself: Export › *Markdown (.md)* (one title, `##` headings,
  paragraphs, pull quotes as quotes) or *HTML article (.html)* (the print kit's complete standalone
  document) — the files a blog platform ingests, no cleanup pass needed.
- The Export menu now speaks in words (`exportChoiceLabel`): a video script offers PDF / Publish
  package / Text; an article offers PDF / Markdown / HTML article / Text; screenplay and the other
  formats keep their existing choices (copy's are unchanged, pinned by test).

Decisions: no AI and no invented metadata anywhere in the package — what the document does not carry
(a chapter time, a topic) is either estimated from its words and labelled, or left out. The jsPDF
document path still serves podcast, copy, game and outline PDFs; only video and prose moved.

Verified: tests first (15 new unit tests in `lib/scriptos/format-export.test.ts`, seen failing before
the module existed; the choice/label tests added to `export-format.test.ts`); typecheck (app + e2e)
clean; lint 0 errors; the full unit suite green; build green; all 57 pages within the bundle budget.
A browser spec (`e2e/format-publish.spec.ts`) covers both downloads end to end through the Export menu;
it is an opt-in local-stack spec and this machine has no Docker, so its first run is the nightly
e2e-local job — the gap is the stack, not the flow. The print layouts themselves were not eyeballed in
a browser in this session.

Left open (recorded in 3.51): format-aware exports for the game script; a fuller guide workflow per
format; carrying an ad or an article into a production plan.
