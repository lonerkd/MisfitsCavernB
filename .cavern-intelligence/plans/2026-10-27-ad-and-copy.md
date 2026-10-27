# Plan — advertising and copywriting (BACKLOG 3.32 b–e)

Status: **proposed 2026-10-27, for the owner's go** (decisions at the end).
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

### C1 — Deliverables (M)
A **deliverable** is a script plus its spec: `deliverables(script_id unique, project_id, kind, max_chars, max_seconds, notes)`. Enforce that `script_id` belongs to the same `project_id` with a composite foreign key or equivalent trigger.
`kind` is a short list
(`spot_30`, `spot_15`, `spot_6`, `radio`, `poster`, `banner`, `headline`,
`social`, `other`) with default limits per kind (data in `lib/ad/kinds.ts`,
overridable per piece). RLS through `can_access_project` / `can_shape_project`
(the same as scripts). Because the row stores both ids, it needs a **same-project guarantee**: a unique `(id, project_id)` on `scripts` and a composite foreign key `(script_id, project_id)` → `scripts (id, project_id)` (the pattern slice A used for `links`), so a shaper of project A cannot point a deliverable at project B's script. Persona test: Sam writes, Jordan scoped, Riley nothing, and a cross-project script is refused. UI: a **Deliverables** panel in the
Studio's Scenes/Share area listing every piece with its state — *draft · with the
client · approved · changes requested* (from `item_versions`) — and "send all
drafts for review". Entity kind `deliverable` (a trigger-written row like the others, label = the piece's title; the kind list and `entity_sync` get one entry) so the card can show and attach. The approval gate already covers every piece, since it looks at every sent script; a deliverable with no sent version blocks it only once something has been sent for others — if a gate should wait for *all* pieces, C1 adds that rule (decision 4 below).

### C2 — The copy format and editor (L)
Add `copy` to the script-format registry. Keep `scripts.content` a **string**
(so sync, offline, versions, the review page and the future CRDT all keep working)
with light section markers, e.g.

```
# HEADLINE
Fresh from the cave.
# VISUAL | # VO | # SFX     (two-column spots: picture left, sound right)
# BODY
# CTA
```

A pure parser turns that into blocks; the editor shows each block with its own
limit meter (characters for static, seconds at a reading pace for spots). The
review page renders the same blocks. No new storage format.

### C3 — Brand rules (M)
Security: rules are visible and writable only by people who shape the project (`can_shape_project`); a guest sees only the result of the check on the review page, never the rule list; cross-project references use the same composite-key pattern as C1.
`brand_rules(project_id, kind, text, severity)` with kinds *must include*, *never
say*, *tone note*, *legal line*. A pure checker runs over a piece's text and
lists breaches next to the limit meter and on the deliverables panel ("3 of 7
pieces breach a rule"). Rules and the brief are **approved references**: library
items / documents marked approved (D2 lifecycle `approved`), linked to the
project by the card, shown beside every piece.

### C4 — Export (S/M)
A piece or the whole set as a PDF and as plain text for the client's own tools.

## Order and sizes
C1 → C2 → C3 → C4. C1 is the base everything hangs on; C2 is the biggest and the
one the copywriter lives in.

## Decisions for the owner
1. **Content as marked text** (recommended: keeps everything that already works)
   or a structured JSON document per piece (richer, but sync/versions/review each
   need rewriting)?
2. **Spots' reading pace** for the seconds meter: ~2.5 words/second (a common
   voice-over pace) as the default, editable per piece — fine?
3. **Brand rules**: owner-set only (recommended), or may the client add rules
   through their review link?
4. **Gate scope**: today the approval gate waits for every script that *has been sent*; should it wait for **every deliverable** to be sent and approved (stricter, recommended for ad work)?
