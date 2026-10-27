# The link layer and the card — spec (film-graph step 4)

Status: **draft for the owner's review** (2026-10-27). Parent design, already
approved: [film-graph-spec.md](../film-graph-spec.md) §2b and §3. Order agreed
with the owner (2026-10-27): graph cutover → this → navigation and tool layouts →
the editor on the graph. Slices **A → B → C** below were agreed in chat.

## Why

After the cutover the spine (scenes, characters, locations, days) is linked by
id — but a task, a document or a media item still says what it is about with a
title or a category string, and each tool draws its own row for a character or
a scene. Two things fix that: **one identity per thing** (so anything can link to
anything) and **one card** that opens any identity from anywhere.

## What it must do (success)

1. From a scene, character, location or shoot day, the person opens a card that
   lists everything connected to it, grouped by kind, and can attach or detach
   a task, document or media item.
2. Renaming a thing changes its label everywhere, because links point at ids.
3. A link can never point at something deleted or at another project's thing.
4. Riley (outsider) reads no entity or link; Jordan (crew) reads them all in
   the project; only people who may shape the project write links.
5. Nothing is a mock: every control on the card persists.

## Data (migration: `entities_and_links`)

**`entities`** — one row per linkable thing; **the entity's id *is* the source
row's id** (so a card can open from any row without a lookup).

| column | |
|---|---|
| `id uuid` PK | = the source row's id |
| `project_id uuid` | not null; FK `projects` on delete cascade; `unique (id, project_id)` |
| `kind text` | check in the first-slice kinds below |
| `label text` | the display name, kept in step by triggers |
| `updated_at` | |

**First-slice kinds (seven):** `scene` (`scenes`), `character` (`characters`),
`location` (`project_locations`), `shoot_day` (`shoot_days`), `task`
(`project_tasks`), `document` (`project_documents`), `media` (`media`). Later:
element, shot, money line, person-on-the-project.

**Labels:** scene → `{number}. {heading or title}`; character → name; location →
name; shoot day → `Day {n}`; task, document, media → title.

**Triggers** (one per source table, `SECURITY DEFINER`, on the §2.D allowlist):
after insert → insert the entity; after update of the label's columns → update
`label`; after delete → delete the entity (links cascade). A migration backfill
inserts entities for every existing row (idempotent).

**`links`**

| column | |
|---|---|
| `id uuid` PK | |
| `project_id uuid` | not null |
| `from_entity`, `to_entity uuid` | composite FKs `(x, project_id) → entities(id, project_id)` on delete cascade — a link cannot cross projects or dangle |
| `kind text` | default `'about'`; free-form short tag later (`'for'`, `'mentions'`) |
| `created_by uuid` | default `auth.uid()`; cannot be rewritten |
| `created_at` | |
| | `unique (from_entity, to_entity, kind)`, `check (from_entity <> to_entity)` |

A link is stored once, in the direction it was made; the card reads both
directions.

**RLS (from birth, one SELECT policy each):** read — `internal.can_access_project(project_id)`;
insert on `links` — `internal.can_access_project(project_id)` (**anyone on the
project may attach**, owner's answer 2026-10-27) with `created_by` = the caller;
delete — the link's creator, or `internal.can_shape_project(project_id)`;
`entities` has **no** write policy for any role (triggers only).

**Realtime:** `links` joins the publication; the card refreshes when a link
changes.

## The read-model and the card

- `lib/film/links.ts` — `listLinks(entityId)`, `attach(from, to, kind?)`,
  `detach(linkId)`; each returns an error message, never throws into the UI.
- `lib/film/card.ts` — pure selectors: `cardOf(entity, links, entities, spine)`
  → `{ title, subtitle, facts[], groups: { kind, items[] }[] }`. A scene's facts
  come from the spine (day, location, cast via `castOf`); a character's from
  `scene_characters`; etc. Unit-tested without a database.
- `components/film/EntityCard.tsx` — the one component (a side panel on desktop,
  a sheet on phone). Opened by `openCard(entityId)` from a provider, so any
  surface can call it.
- Entry points in slice A: a scene strip on the stripboard, a cast name and a
  scene row on the call sheet. ⌘K / search hits join in slice B.

## Slices

- **A — the layer and the card (M/L).** Migration, backfill, triggers, the RLS
  persona test (`tests/integration/entities-links.test.ts`: Sam writes,
  Jordan scoped, Riley nothing, cross-project link refused, delete cascades,
  rename updates label), `lib/film/links.ts`, `card.ts`, `EntityCard` for
  scene / character / location / shoot day, entry points above. Behind flag
  `entity_cards`.
- **B — attach (M).** Attach and detach tasks, documents and media from the
  card; the card for those three kinds; search hits open cards.
- **C — mentions (M).** `@` in the Lounge, tasks and notes creates a
  `mentions` link; it shows on the card and survives a rename. (Mentions in the
  script editor wait for the editor-on-graph work.)

## Risks

- **Triggers on seven tables**, one of them hot (`scenes`, rewritten by the
  script sync). The trigger only writes when the label changed; measure the
  sync before and after.
- **Drift:** an entity with no source row (or the reverse). Mitigation: the
  triggers are the only writer; a persona test inserts, renames and deletes via
  each source table; a one-off check query is added to the drift workflow's notes.
- **The card can become another dumping ground.** Groups are fixed by kind;
  facts come only from selectors.

## Not in this spec

Money lines, elements, shots, people; mentions in the editor; card layouts per
tool (that is step 3 of the redesign order and builds on this).

## Phases, status and layers (owner, 2026-10-27) — designed here, built as slice D

The owner's description of how work really moves, in their words condensed:
a film passes through **pre-production → production → post-production** (and
release). Inside each phase there are iterations where references and material
come in and go out. When something is **locked and approved** it moves on and
becomes part of the project's **official resources / references**. What gets
*pitched to get a budget approved* is different from everything that was
considered to reach that point (internal vs external). **At each phase change**
the team decides what is useful to carry into the next phase; the rest is
**archived or removed**. In production, because it is real footage, usually
everything is kept — so it is **archived**. And there are **layers of
audience: public, investor and team.**

What that means for the model (not built in A–C; A is designed so none of it
needs a rewrite):

- **Status on linked material.** Media, documents and (later) other things
  carry a lifecycle: `working` (in iteration) → `approved` (locked, official) →
  `archived`. A link inherits the status of what it points at; the card shows
  official items first and working ones as "in progress".
- **Phase gates.** The project has a `phase`. Moving to the next phase opens a
  gate: a list of everything `working` or `approved` from the phase ending, and
  for each the owner chooses *carry forward*, *archive* or *remove*. Archive is
  the default in production and after (real footage is kept); remove is only
  offered for material nobody else links to (or after a confirm that lists who
  does). The gate is a real action with an audit entry, never a notice.
- **Layers.** Each *approved* item has an audience: `team` (default), `investor`
  or `public`. Team sees everything it can access today; the investor layer is
  the pitch — what was approved for that audience, not the working trail;
  public is what the shared lookbook already is (`media.shared`), generalized.
  This builds on, and must not break, the existing share links and the
  `/shared/[token]` page.
- **Where it lives.** Status and audience are columns on the shared things
  (starting with `media` and `project_documents`), not on `links`, so one
  rule answers "is this official?" everywhere.

This is its own spec (**slice D**) because it changes what outsiders (investors,
the public) are allowed to read — the highest-risk surface in the suite. It is
not started until the owner has decided the questions below.

## Decided (owner, 2026-10-27)

1. Anyone on the project can attach a link (done in the RLS above).
2. The card's links are visible to everyone who can see the project; the
   *linked item* still follows its own access.

## Decided for slice D (owner, 2026-10-27)

- **Layers:** team, **investors / guests**, public. "Guest" is anyone invited
  from outside the team to see the approved material — an investor, a
  publisher, a reader, a client. Entry is by a link per layer first; accounts
  later.
- **Phases are data, not code.** The four phases — pre-production, production,
  post-production, release — are the **default**, and they work for now. But
  the suite is for *all* creatives (video games of every style, music videos,
  music writing, film, series, novels, comics, anime, educational writing,
  personal writing) and can grow into traditional workflows, so the phase set
  is a template keyed to the **project format** (the formats already managed at
  `/admin/formats`): each format names its own phases, may have more or fewer
  (a personal essay may have two and no gates; a studio game may have
  alpha/beta/gold), and may turn the approval gate on or off. A new format
  needs a row, not a deploy.
- **Words follow the format.** The gate's labels ("pitch", "lock", "wrap")
  come from the template too, so a novelist is never asked to "wrap
  production".

Still open: who approves and passes a gate (proposal below).

## Questions for the owner (slice D)

1. **Who approves and who passes a gate?** (Proposal: approving an item and
   passing a gate are owner/shape-permission actions; anyone can propose.)
2. **Which formats get a template first?** (Proposal: film and series with the
   four defaults, then game, music, book/comic — each its own small data
   change once the model exists.)
