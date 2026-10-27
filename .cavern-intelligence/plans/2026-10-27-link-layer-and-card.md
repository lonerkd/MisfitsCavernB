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
insert/update/delete on `links` — `internal.can_shape_project(project_id)`;
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

## Questions for the owner

1. Is "everyone who can see the project can see every link" right, or should a
   link to a private document hide from crew who can't open the document? (Default
   here: links are visible; the *linked item* still follows its own access.)
2. Should crew (Jordan) be able to attach, or only people who shape the project?
   (Default here: shape only.)
