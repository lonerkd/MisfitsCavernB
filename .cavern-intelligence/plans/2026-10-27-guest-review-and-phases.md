# Guest review, lifecycle and phases — spec (slice D of the link layer)

Status: **approved by the owner 2026-10-27 (recommendations accepted); D1 built behind flag `guest_review`** (migration `20261030000000`; D1 covers project **scripts** — the text work; media versions follow). Order inside D: **D1 → D3 → D2**. Parent: [plans/2026-10-27-link-layer-and-card.md](2026-10-27-link-layer-and-card.md)
(slice D; the owner ordered A → D → B → C). Decided there: layers are team /
investors-and-guests / public; phases are format templates (film and series
first, then advertising and copy, then games, music and books); owner or
shape-permission passes a gate and approves, anyone can propose; advertising is
"probably the main" format, so the client in the loop comes first.

This slice changes what **people outside the team may read and write** — the
highest-risk surface in the suite. It is split so each part ships alone and the
risky part (anonymous writes) is small and reviewed on its own.

## What it must do (success)

1. A copywriter sends a numbered **version** of a piece to a client by a link.
   The client, with no account, reads it, comments, and approves or asks for
   changes. The team sees the decision and the comments on the version.
2. A version is **immutable** once sent: what the client saw is what is kept.
3. Approved material becomes an **official reference** (lifecycle `approved`);
   what is *pitched* (the investor layer) is only what was approved for that
   audience, never the working trail.
4. Moving to the next **phase** opens a gate that lists working and approved
   material and asks, for each, *carry forward*, *archive* or *remove*.
5. Revoking a link ends access at once. Riley (an outsider without a link) and
   a guest on one link read nothing outside it.

## D1 — versions and the guest review link (the core; M/L)

**Data** (migration `versions_and_reviews`, RLS from birth):

- `item_versions` — `id`, `project_id`, `item_kind` (`document` | `media`),
  `item_id`, `number` (1, 2, 3 … per item), `label`, `snapshot` (the text, or
  the media's storage path + title at that moment), `status`
  (`draft` → `sent` → `approved` | `changes_requested`), `created_by`,
  `created_at`. `unique (item_kind, item_id, number)`. Immutable after `sent`
  (a trigger refuses edits to `snapshot`). Read: `can_access_project`. Write:
  `can_access_project` creates a draft (anyone can propose); sending is
  `can_shape_project`.
- `review_links` — `id`, `project_id`, `token` (≥ 32 chars, the only thing a
  guest holds), `layer` (`guest` | `investor`), `version_ids` (exactly which
  versions this link may show), `expires_at`, `revoked_at`, `created_by`.
  Read/write: `can_shape_project`. A new token is a revoke, as for script links.
- `review_comments` — `id`, `version_id`, `link_id`, `author_id` (a team member)
  or `guest_name` (text, required for a guest), `body` (≤ 2000), `created_at`.
  Read: team via `can_access_project`; guests only through the RPC below.

**Guest access — only through `SECURITY DEFINER` RPCs that check the exact
token** (the repo's existing pattern: `get_shared_script`, `get_shared_lookbook`):

- `get_review(token)` → the link's layer, its versions' labels, numbers and
  snapshots, statuses and comments. Nothing else about the project — no ids of
  other items, no notes, no crew. Refuses a revoked or expired link, with the
  same empty answer as an unknown token (no oracle).
- `add_review_comment(token, version_number, guest_name, body)` → inserts one
  comment. Caps: body ≤ 2000, name ≤ 80, **≤ 200 comments per link**, only on a
  `sent` version the link names.
- `decide_review(token, version_number, decision, note)` → `approved` or
  `changes_requested` on a `sent` version the link names; records who (the
  name the guest gave) and when; re-deciding is allowed until the team
  closes the round. Notifies the team (the sender and shapers) through the
  existing notifications → Web Push path.

All three go on the §2.D allowlist with their gate. They are the only way an
anonymous caller writes anything; `anon` has no direct table grants.

**UI:** on a document or media item, "Versions": save a version, send for review
(creates the link, copies it), see comments and the decision per version, revoke.
The guest page is a new public route (`/review/[token]`) in the same style as
`/shared/[token]`, readable on a phone.

**Tests:** persona test (`tests/integration/versions-reviews.test.ts`): a guest
holding link A reads A's versions only, never B's or the project; a revoked or
expired token reads nothing and gives the same answer as an unknown one; the
comment cap and length limits hold; a decision lands only on a `sent` version;
sent snapshots can't be edited; Riley and anon have no direct table access;
the team (Sam, Jordan) reads comments; only a shaper sends.

## D2 — lifecycle and layers (M)

- `lifecycle` (`working` | `approved` | `archived`) on `media` and
  `project_documents`, set by shape-permission (a guest's approval *proposes*
  it; the team confirms, so a client cannot make something official alone).
- `audience` on an approved item: `team` (default) | `investor` | `public`.
- The investor layer is a `review_links` layer that can list **only approved
  items whose audience includes it**; the public layer generalizes today's
  `media.shared` and must not change what `/shared/[token]` shows until moved
  over deliberately.
- The card (slice A) shows an item's lifecycle and audience.

## D3 — phase templates and gates (M)

- `format_phases` — `format_id` (the project formats already managed at
  `/admin/formats`), `position`, `key`, `label`, `gate` (does leaving this
  phase open an approval gate). Data, admin-editable; **film and series first**
  with pre-production → production → post-production → release, then
  advertising and copy (brief → concept → copy → client review → production →
  delivery), then games, music and books. A format with no rows has no phases
  and no gates (a personal essay).
- `projects.phase_key`; `advance_phase(project, to_key, decisions)` is a
  `SECURITY DEFINER` RPC gated by `can_shape_project`. `decisions` maps each
  working/approved item to *carry forward* / *archive* / *remove*; **remove** is
  refused for an item that other things link to (the card lists them), and
  production-and-after phases default to *archive*. Writes an audit entry per
  advance and per removal.
- Labels come from the template, so a novelist is never asked to "wrap
  production".

## Risks, said plainly

- **Anonymous writes.** D1's two write RPCs are the first. Mitigation: exact
  token, caps per link, no table access, no ids returned, a revoke that works
  at once, and a persona test for each refusal. Open abuse (a leaked link
  spammed with comments) is bounded by the 200-comment cap and revocation; a
  per-IP limit would need an edge layer — not in D1.
- **A guest's name is self-asserted.** Comments and decisions show a name the
  guest typed; the UI says so. Verified identity (an invited account or an
  emailed code) comes with email (BACKLOG 3.15).
- **Immutable snapshots grow storage.** Text is small; media versions store a
  pointer to the file, and removing a media item that a sent version points at
  is refused until the version is archived.
- **Overlap with the existing share links.** `/shared`, `/s` and `/p` keep
  working untouched; `/review` is new. Moving them onto one layer model is a
  later, deliberate step, not part of D1.

## Decided (owner, 2026-10-27: "go with your recommendations")

1. Guest identity: a typed name for now; verification when email exists.
2. A guest's approval *proposes*; the team confirms (built: `confirmed_at` / `confirmed_by`).
3. Order: D1 → D3 → D2.

**D1 as built differs from the sketch above in one way:** a version is of a project **script** (`item_versions.script_id`), not a document or media item — `project_documents` are contracts and permits (files), and the copy the client reviews is a script. Media versions need a signed-URL route for guests and are a follow-up.

## Decisions that were needed before D1 (answered above)

1. **Guest identity:** is a typed name enough for the first version (with the
   limits above), or must a guest verify an email first? (Recommendation: a
   typed name now; verification when email exists.)
2. **Can a guest's "approved" make something official on its own, or does the
   team confirm?** (Recommendation: the team confirms — D2.)
3. **Order inside D:** D1 → D2 → D3 as written, or put phase templates (D3)
   first because film and series come first in your list? (Recommendation:
   D1 first — the client review is what advertising cannot work without; D3
   next, since film and series need it before D2.)
