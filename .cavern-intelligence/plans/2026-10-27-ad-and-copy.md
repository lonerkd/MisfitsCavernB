# Plan — advertising and copywriting (BACKLOG 3.32 b–e)

Status: **C1–C3 built 2026-10-27 behind `ad_copywriting`; C4 remains open.**
Parent: [guest-review-and-phases](2026-10-27-guest-review-and-phases.md). Done
already: the `Advertising` and `Copywriting` formats and client-approval gates
(`20261031000600`); the client review link and numbered versions (D1).

## What the owner described

"AD writing, copy writing — probably the main one." A copywriter takes a client
**brief**, produces **one idea in many pieces** (30/15/6 s spots, posters,
banners, headlines, radio, social), each with its own limits and its own
versions, checks them against the **brand's rules**, and the **client approves**
in a browser without an account.

## What already exists, and the naming trap

- **A campaign is a project.** An Advertising project *is* the campaign; each
  piece is a **script** in it. Versions, the review link, the approval gate, the
  card, mentions and archive/carry all already work per script. So there is no
  new "campaign" object.
- **Do not reuse the name `campaigns`.** `public.campaigns` is the Promos tab's
  distribution plan (platform, reach, spend). It stays as it is.
- `scripts.format` and the registry in `lib/formats/script-formats.ts` decide how
  a script is read; ScriptOS knows screenplay shapes only.

## The pieces

### C1 — Deliverables (built)
A **deliverable** is a copy script plus its spec: `deliverables(script_id unique, project_id, title, kind, max_chars, max_seconds, words_per_second, notes)`. A composite foreign key pins the script to the same project. An insert trigger creates a deliverable for every script in an Advertising or Copywriting project; changing a project's format backfills existing scripts. The deliverable cannot be deleted independently of its script.
`kind` is a short list
(`spot_30`, `spot_15`, `spot_6`, `radio`, `poster`, `banner`, `headline`,
`social`, `other`) with default limits per kind (data in `lib/ad/kinds.ts`,
overridable per piece). RLS through `can_access_project` / `can_shape_project`
(the same as scripts). Because the row stores both ids, it needs a **same-project guarantee**: a unique `(id, project_id)` on `scripts` and a composite foreign key `(script_id, project_id)` → `scripts (id, project_id)` (the pattern slice A used for `links`), so a shaper of project A cannot point a deliverable at project B's script. Persona test: Sam writes, Jordan scoped, Riley nothing, and a cross-project script is refused. UI: a **Deliverables** panel in the
Studio's Scenes/Share area listing every piece with its state — *draft · with the
client · approved · changes requested* (from `item_versions`) — and "send all
drafts for review". Entity kind `deliverable` is trigger-written and follows the script title. The approval gate blocks until every ad deliverable has a latest sent version approved by the client and confirmed by the team.

### C2 — The copy format and editor (built)
Add `copy` to the script-format registry. Keep `scripts.content` a **string**
(so sync, offline, versions, the review page and the future CRDT all keep working)
with light section markers, e.g.

```
# HEADLINE
Fresh from the cave.
# VISUAL
# VO
# SFX
# BODY
# CTA
```

A pure parser turns that into blocks; the editor shows each block with its own
limit meter (characters for static, seconds at a reading pace for spots). The
review page renders the same blocks. No new storage format.

### C3 — Brand rules (built)
Security: rule text is readable by shapers and writable by the project owner; guests and viewers do not receive the rule list. A client sees only the sent copy snapshot. Cross-project links are rejected by the entity composite-key pattern.
`brand_rules(project_id, kind, text, severity)` with kinds *must include*, *never
say*, *tone note*, *legal line*. A pure checker runs over a piece's text and
lists missing/forbidden literal wording next to the limit meter and on the
deliverables panel. Tone notes are guidance, not machine-judged. The brief and
brand-guideline references are owner-approved, immutable records; the team
attaches them to each piece through `links` and sees the approved text in the
copy editor.

### C4 — Export (S/M)
A piece or the whole set as a PDF and as plain text for the client's own tools.

## Order and sizes
C1 → C2 → C3 → C4. C1 is the base everything hangs on; C2 is the biggest and the
one the copywriter lives in.

## Implementation decisions and follow-up

1. Keep marked text so sync, offline capture, versions and review continue to
   use the existing `scripts.content` string.
2. Use 2.5 spoken words per second by default; the owner can tune the rate per
   deliverable.
3. Only the project owner creates, approves and changes briefs or brand rules.
   The guest RPC returns only the named version and never exposes the rule list.
4. The Advertising/Copywriting gate is stricter than the film gate: every
   deliverable must have a latest sent, approved and team-confirmed version.
5. The current approved phase engine has five phase IDs, so the existing format
   remains Brief → Concept & copy → Production → Finishing → Delivered; client
   review is the approval gate before production. Splitting this into six phase
   IDs requires revisiting the phase-engine decision in the parent plan.
6. C4 export is intentionally still open and is not required for this slice.
