# The film graph — one connected core

**Status: approved by the owner 2026-10-10. Step 1 (days and places → daylight)
is built — migration `20261010010000`, `lib/film/`, ADR 0005. Next: step 2
(people in scenes → sides).** Not yet in step 1, deliberately: `scenes.day_order`
(nothing orders scenes within a day yet) and `shoot_day_id` on timesheets and
expenses (they arrive with money, step 5).

Owner, 2026-10-10: *"A new normalized and global — an ecosystem, an OS,
whatever you want to call it. Everything must be connected."* And before
that: the suite is "a complicated mix of text boxes, drop-downs and lists",
when it should be the thing a filmmaker feels is missing but couldn't name.

This document says what "connected" means in the data, what it looks like to
the person using it, and the order it gets built in so that every step ships a
tool someone can use — not months of plumbing.

## 1. What's disconnected today

The suite has 63 tables and most of the right ones. What it doesn't have is
links between them. The film is described several times over, in text:

| The suite knows… | …but stores it as | So this can't happen |
|---|---|---|
| where a scene is set | `scenes.location`, a string matched by name to `project_locations` | rename a location once; daylight for a scene; "everything at this place" |
| who is in a scene | `scenes.cast_list`, a comma-separated string | sides for an actor; an exact cast per day; a character's whole thread |
| who plays whom | `character_castings.character_name`, a string | casting survives a character rename |
| who is called | `call_sheet_calls.character_name`, a string | the call sheet follows the schedule |
| which day a scene shoots | `scenes.shoot_day`, a bare number; `call_sheets.shoot_day`, another bare number | one "day" that the schedule, call sheet, set log, timesheets and costs all agree on |
| which beat a scene serves | `project_beats.scene_number`, a number | the board and the script move together |
| what a note is about | `script_annotations.line_index` | notes follow the scene through rewrites |
| what a cost is for | `budget_items.category`, e.g. the text "Breakdown · Props" | cost per scene, per day, per character, per location |
| what a task, document or file is about | nothing (`project_tasks` has a title and a person) | "what's left for scene 12", "everything for Day 3" |
| when in the story a scene happens | nothing | continuity when shooting out of order |
| where a location actually is | an address string | sunrise, magic hour, travel between locations |

Every tool therefore keeps its own list and its own dropdowns, and the person
is the integration layer. That is the "mix of text boxes".

## 2. The model

**Things** (each one a real row with an id) and **links** between them.

```
Project
 ├─ Script ── Scene ─┬─ at ─────────── Location (with coordinates, timezone)
 │                   ├─ features ───── Character ── played by ── Person
 │                   ├─ shoots on ──── Shoot day ── Call sheet, Set log, Timesheets
 │                   ├─ happens on ─── Story day
 │                   ├─ needs ──────── Element (prop, wardrobe, vehicle, VFX…)
 │                   ├─ covered by ─── Shot ── Take (set log)
 │                   ├─ serves ─────── Beat
 │                   └─ state of each Character in it (look, wardrobe, injury, what they carry)
 └─ anything ── linked to ── anything:  Task · Document · Media · Money line · Note · Message
```

Two layers, on purpose:

### 2a. The spine — typed, enforced links

The relationships the tools *compute* on are real foreign keys, so they can't
drift and the database can answer questions directly.

| Link | Schema |
|---|---|
| Scene → Location | `scenes.location_id` → `project_locations` |
| Location facts | `project_locations.latitude`, `longitude`, `timezone` |
| Character (per project) | `characters` (`id`, `project_id`, `name`, the bible fields); `script_characters` folds into it |
| Scene ↔ Character | `scene_characters` (`scene_id`, `character_id`, `speaks`, `line_count`) — replaces `cast_list` |
| Character → Person | `character_castings.character_id`; `call_sheet_calls.character_id` |
| Shoot day | `shoot_days` (`id`, `project_id`, `day_number`, `shoot_date`, `unit`) — one row per day |
| Scene → Shoot day | `scenes.shoot_day_id`, `scenes.day_order` |
| Call sheet → Shoot day | `call_sheets.shoot_day_id` (one each); timesheets and expenses gain `shoot_day_id` |
| Story time | `scenes.story_day` (integer), `scenes.story_time` (text: "dawn", "later") |
| Continuity | `scene_states` (`scene_id`, `character_id`, `look`, `notes`, `media_id`, and links to wardrobe/prop elements) |
| Beat → Scene | `project_beats.scene_id` |
| Note → Scene | `script_annotations.scene_id` (kept in step by the scene sync) |

### 2b. The universal layer — anything links to anything

For attachments (a task about a scene, a contract for a location, a reference
image for a character, a cost for a day, a chat message that mentions Day 3),
every thing gets one identity:

- `entities` (`id`, `project_id`, `kind`, `label`) — one row per scene,
  character, location, shoot day, element, shot, person-on-the-project, media
  item, document, task, money line. Kept by triggers; never written by hand.
- `links` (`project_id`, `from_entity`, `to_entity`, `kind`, `created_by`) —
  real foreign keys both ways, so a link can't point at something that's gone.

Rejected: `(type, id)` pairs on each table (nothing stops them dangling), and
a nullable `scene_id / location_id / character_id / …` on every table (every
new kind of thing means altering every table).

**Security.** `entities` and `links` carry `project_id`; reading follows
`internal.can_access_project`, writing follows the existing shape permission.
One rule for the whole layer. Private projects stay private because nothing
here bypasses the project.

## 3. What the person feels

1. **Everything is an object.** A scene, a character, a location, a day, a
   person, a prop: each opens as a card — from anywhere, including ⌘K — that
   shows everything connected to it and lets you attach anything. No tool owns
   it.
2. **Mentions.** Type `@` in chat, a note or a task to link a scene, a
   character or a day. The mention is a real link: it shows on that thing's
   card, and it survives a rename.
3. **Change ripples.** Move a scene to another day and the call sheet, the
   sides, the cast called, the day's cost, the daylight and the readiness
   check all follow, because they read the same row.
4. **The suite answers questions.** "What's left before we can shoot Day 3?"
   "Everything MAYA wears." "What does this scene cost?" "Who's affected by
   this rewrite?"
5. **Fewer fields.** What the script already says is read from the script and
   confirmed, not typed again (decision 1 below).

## 4. How the app reads it

`lib/film/` — one pure, unit-tested read-model assembled from the spine:
`Film { scenes, characters, locations, days, elements, shots }` with selectors
(`sceneCard`, `dayPlan`, `characterThread`, `locationSheet`, `connected(entity)`)
and one hook, `useFilm(projectId)`, live through Realtime. Tools stop querying
their own slices and read this. Derived facts (a day's page count, cast, cost,
sunrise; a scene's readiness) are computed here, once.

Daylight is computed locally from coordinates and the date (the standard solar
position formulas) — no outside service, works offline.

## 5. Getting there without breaking the app

The destination is one normalised core. The route is one tool at a time:

1. **Expand** — add the new tables and columns beside the old ones.
2. **Backfill** — fill them from today's text. Locations match by the same
   normalised name the Locations view already uses; characters come from the
   script parse. Anything ambiguous is listed for a person to settle, never
   guessed.
3. **Keep both in step** — database triggers keep the old text columns
   correct while old code still reads them, and `sync_script_scenes` writes the
   new links on every save.
4. **Cut tools over** — each tool moves to `lib/film` in its own PR.
5. **Contract** — when nothing reads a text column, drop it.

Each step is a migration with the drift gate, persona tests (owner, crew,
outsider, anonymous) and e2e, as every schema change here already is.

## 6. Order of work — every step ships a tool

| # | The core gains | The filmmaker gets |
|---|---|---|
| 1 | **Days and places**: `shoot_days`, scene → location, coordinates | **Daylight on the schedule and call sheet** — sunrise, sunset, magic hour per day and location; a warning when a DAY exterior is scheduled past sunset; travel between the day's locations |
| 2 | **People in scenes**: `characters`, `scene_characters`, casting and calls by id | **Sides** — each actor's pages for tomorrow, generated from the call sheet; exact cast per day; a character's whole thread through the film |
| 3 | **Story time**: `story_day`, `scene_states` | **Continuity** — the film in story order beside shoot order; each character's look, wardrobe and injuries per story day; a sheet for wardrobe and make-up; warnings when a look changes mid-day |
| 4 | **Entities and links** | **The card, mentions, and "connected"** — open anything anywhere; attach tasks, documents and references to any scene, character, location or day |
| 5 | **Money on the graph**: costs linked to elements, scenes, days, people | **What a line costs** — cost and days in the script's margin as you write; cost per scene and per day; labour from who works which days |
| 6 | (reads only) | **My day**, per role — the DP's, the 1st AD's, wardrobe's; then the **coverage tracker** on set with "you're behind: protect these" |
| 7 | **Contract**: drop the text columns | nothing visible; the old lists are gone for good |

Steps 1–3 and 6 are the set's side (B); 4–5 the writer's side (A). Each step is
several PRs. This is the largest piece of work the suite has had — on the
order of the Studio rebuild, several times over — and it's the right one.

## 7. Decisions

1. **Inferred, then confirmed** (default, pending the owner): story days and
   scene cast are read from the script (`NEXT MORNING`, `LATER`, `CONTINUOUS`,
   who speaks) and shown for confirmation; a person can always override, and
   an override is never overwritten by a later sync.
2. **Personal scripts** (no project) keep their characters but have no
   production graph; it appears when the script joins a project.
3. **One script per project** drives scenes, as today (`scenes.script_id`).
4. **No outside services** in steps 1–7. Weather on a call sheet stays a typed
   field until a forecast provider is chosen.

## 8. Risks, said plainly

- **Backfill ambiguity** — two locations with near-identical names; a
  character cue spelled two ways. Mitigated by listing, not guessing.
- **Two sources of truth during the move.** Mitigated by triggers and by
  cutting tools over quickly; the text columns are the copy, the links the truth.
- **Realtime and RLS cost** on the new tables. Mitigated by `project_id` on
  every row with an index, and policies that call one stable helper.
- **Size.** If it stalls halfway, the suite is worse than now: two models and
  neither complete. So each step leaves the app whole and shippable, and step 7
  is not optional.
