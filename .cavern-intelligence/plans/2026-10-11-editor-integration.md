# The editor on the film graph — plan

**Status: draft for the owner, 2026-10-11.** Nothing here is built. Owner
direction: *the editor is the core of the suite; it has to be cut over to the
film graph to be fully integrated, and that is a major expansion, not a
thinning.* This plan takes that at face value.

Related: [film-graph-spec.md](../film-graph-spec.md) (the graph; step 4
entities and links is a prerequisite for part of this),
[scriptos-engine.md](../scriptos-engine.md), [bible/04-scriptos.md](../bible/04-scriptos.md),
BACKLOG 3.18.

## 1. What the editor is today (measured 2026-10-11)

| | |
|---|---|
| The page | `app/(suite)/editor/page.tsx`, **1,610 lines**: 32 `useState`, 16 `useEffect`, 27 `useCallback`, 16 `useRef` in one component |
| Its parts | `components/editor/` — **4,187 lines** (centre views, side panels, header, left nav, breakdown, cut-note margins, writing loop) |
| Its engine | `lib/scriptos/` — **3,436 lines** (parser, timing, analysis, sync, storage, export/import, revisions, table read) |
| Its tests | six e2e specs touch it (`editor-project-script`, `split`, `script-share`, `beat-to-script`, `onset-offline`, `transcripts`) plus `studio-journey`; parser/fountain/timing unit tests |
| Its model | **the script is one string** (`scripts.content`, Fountain). Everything else — scenes, characters, tags, timing — is *derived* from it by a main-thread parse |
| Its sync | whole-document, last-writer-wins, 1.5 s debounce, with a KEEP MINE / TAKE THEIRS prompt; IndexedDB first, retry in 15 s |
| Its link to the graph | one-way and thin: `sync_script_scenes` writes scene rows (ids kept stable by `planSceneSync`), and writes `scenes.cast_list` / `scenes.location` as **text**; database triggers turn those into `characters`, `scene_characters`, `location_id`. The editor itself reads none of the graph. |

So the editor is the **producer** of the graph's raw material and a **stranger**
to the graph's meaning. Everything that makes the suite feel connected happens
elsewhere (Studio, call sheet), and the person writing never sees it.

## 2. The three hard problems

These are why this is a major expansion. Each is a design question first.

### 2.1 Text is the truth for *content*; rows are the truth for *identity*

A script has to stay portable plain text: Fountain, FDX and PDF export, the
share link, offline editing, revisions and the diff all depend on it. So the
text stays the source of what is *written*. But a character, a location and a
scene are *things with ids* the rest of the suite points at. The editor needs a
rule for the seam:

- A cue in the text (`MAYA`) **resolves to** a character row by name, per
  project. The row is the identity; the text is its current spelling.
- Renaming is therefore **two writes** — the row and every cue in the text —
  and today only the row side exists.

**A latent bug this exposes (found 2026-10-11, no UI triggers it yet):**
`sync_script_scenes` overwrites `scenes.cast_list` from the parsed text on
every save, and `characters_rename` (step 2) rewrites `cast_list` when a
character row is renamed. The script text still says the old name, so the next
sync **reverts the rename and recreates the old character**. Any rename UI built
before the text is rewritten as well would appear to work and then undo itself.
The rule above fixes it by making the rename a text rewrite first.

### 2.2 Co-writing is whole-document last-writer-wins

A character or location rename rewrites many lines. With whole-document LWW and
a five-character conflict heuristic, a rename racing a co-writer's typing either
drops one of them or throws the KEEP MINE / TAKE THEIRS banner at someone who
did nothing wrong. Everything in 2.1 that edits text on the person's behalf
(rename, "use this location", accept a suggestion) needs **merge-capable
concurrent editing** underneath it. That is the CRDT the docs already call "a
large change, not yet scheduled" — here it stops being optional.

### 2.3 Offline

Edits save to IndexedDB first and replay later. Graph writes made from the
editor (a story day, a look, a rename) need the same guarantee, with a queue
that survives reload and a rule for what happens when a rename was made offline
and a co-writer typed the old name meanwhile.

## 3. What it should feel like (the target)

The person is writing; the film is around the page, not in another tab.

1. **A scene knows where and when it is.** The scene's heading carries a quiet
   gutter: story day · shoot day · location (with its daylight warning).
   Click to change; the change is a row, not a field of text.
2. **A cue is a character.** Hover `MAYA`: her card — who plays her, her
   scenes, her look in *this* scene, her next call. Autocomplete offers the
   project's characters (with the actor), not a list guessed from the text.
3. **A location is a place.** Typing a heading offers real locations; the
   daylight and the permit status show in the margin.
4. **Rewrites ripple the right way.** Rename a character or location once; the
   script, the call sheet, the sides and the continuity sheet all follow,
   including for a co-writer who is typing at that moment.
5. **Notes are attached to things.** A margin note can be *about* a scene, a
   character or a location (step 4's links), and follows it through rewrites.
6. **The context panel is the scene card.** Today "Refs" shows media; it
   becomes the scene's whole card: cast and looks, shoot day and light, sides
   preview, breakdown, references, open post notes.

## 4. The route

Strangler, as for the rest of the graph — **the editor keeps working at every
step**; nothing is cut over until the thing replacing it has a test that was
green before. Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈
several sessions · **XL** = a project.

| # | Phase | Delivers | Size | Needs |
|---|---|---|---|---|
| E0 | **Safety net first** | Two-browser **co-writing** e2e (type in two sessions, both survive; the conflict banner appears only when it should), an **offline** e2e for the editor (type offline → reload → reconnect → saved), a **rename-ripple** test as a *failing* spec marked `fixme`, a baseline of the editor's render cost. No product change. | M | — |
| E1 | **Take the page apart** | `page.tsx` 1,610 → a shell; its 32 pieces of state and 27 callbacks move into named hooks (`useScriptDocument`, `useScriptSelection`, `useEditorPanels`, `useScriptCasting`, …) with a context that already has a slot for graph data. Moves only; the E0 suite is the proof. (This is restructure phase 7's editor entry, but it is the *enabling* work, not the goal.) | L | E0 |
| E2 | **The editor reads the graph** | `useFilm(scriptId)`: characters (with actor), scene story/shoot-day/location, looks. The gutter (1), cue hover card (2), location suggestions (3), and the scene card in the side panel (6). **Read only** — no new writes from the editor, so nothing here can corrupt a script. The parse still produces scenes; the graph is overlaid by scene id. | L | E1 |
| E3 | **Merge-capable editing** | A CRDT document under the text (Yjs; `scripts.content` remains a plain-text snapshot kept in step, so export/share/revisions/FDX are untouched), a `script_docs` update log or snapshot, the Realtime provider replacing whole-document broadcast, IndexedDB persistence of the CRDT state for offline, and a migration that seeds each script's document from its current text. Co-writers' typing merges instead of conflicting. | XL | E0, E1 |
| E4 | **The editor writes the graph** | Story day/time and looks editable in the scene card (rows); and the first **text-rewriting operations done properly**: rename a character, rename or choose a location — executed as one CRDT transaction that rewrites every cue/heading *and* updates the row, so 2.1's bug cannot occur. Offline queue for the row writes. | L | E2, E3 |
| E5 | **Things in the margin** | Annotations linked to entities (step 4 `links`): a note about a scene/character/location that follows it through rewrites; `@` mentions in notes. | L | E4, graph step 4 |
| E6 | **Contract** | Stop writing `scenes.cast_list` / `scenes.location` from the parse; the graph rows are derived from the CRDT document's structure and the people's choices; drop the text columns (graph step 7). | M | E4, E5 |

**What this order protects:** E0/E1 make the cut-over *possible to verify*;
E2 is the first user-visible gain and is read-only; E3 is the only phase that
changes how text is stored and synced, so it comes before anything that edits
text for the person; E4–E6 only then change meaning.

**What can ship early and independently of the rest:** the graph-read half of
E2 (gutter, cue card) does not need the CRDT, and is the quickest way to make
the editor *feel* connected. The risky half (writing text on the person's
behalf) is deliberately after E3.

## 5. Risks, said plainly

- **Data loss in a co-written script** is the failure that ends trust in the
  suite. E3 is gated on a two-browser e2e, an offline e2e, a seed/rollback
  migration, and a period where the old `scripts.content` path still receives
  every save (the CRDT is derived *from* it before it becomes primary).
- **Editor performance.** The parse runs on the main thread on every change.
  Overlaying graph data must not add per-keystroke work; resolve names through
  a map built when the script *saves*, not when it changes. A render-cost
  baseline (E0) makes regressions visible.
- **A parallel model.** Two models of "who is in this scene" (the parse and the
  rows) coexist from E2 until E6. The overlay is keyed by scene id and never
  edits the parse's output; if they disagree the **text wins** until E4.
- **Scope drift.** This plan is a ladder, not a rewrite. Each rung ships and is
  useful alone; stopping after E2 leaves a better editor, not a half-built one.
- **Mobile.** The editor on a phone is its own constraint (the island, the
  virtual keyboard). The scene card must work in the island's sheet, not only
  the desktop side panel.

## 6. Decisions for the owner

1. **A CRDT (Yjs) under the script — yes or no?** It is the largest single
   decision here. *Yes* gives merge-safe co-writing and safe automated rewrites
   (and removes the KEEP MINE / TAKE THEIRS prompt for most cases); it adds a
   dependency, a new storage shape, and a migration. *No* means renames and
   other automated text edits must either lock the script or be refused while
   anyone else is in it. (My recommendation: yes — the editor is the core, and
   LWW is the weakest part of it.)
2. **Is a rename allowed to touch the script text?** The plan assumes yes (the
   script follows the graph's names). The alternative — names live only in the
   text, the graph follows — is simpler but cannot let a person rename from a
   card.
3. **Order of the first rung.** E0 → E1 → E2 is the safe order. If you want the
   connected feel sooner, E2's read-only gutter and cue card can be built
   *before* E1 on a thin adapter, at the cost of doing E1 later around more
   code.
4. **What the gutter shows by default** (story day, shoot day, location,
   daylight) vs. on hover — a design call, to settle with the design language
   (*show, don't write*).

## 7. What I would not do

- A big-bang rewrite of the editor, or a second editor "next door".
- Build rename or any text-rewriting feature before E3.
- Move the script's source of truth out of plain text.
- Start E2's gutter work by copying graph logic into the editor page; it reads
  `lib/film` like every other tool.

## 8. First step if approved

E0, in one PR: the co-writing e2e, the offline e2e, the `fixme` rename-ripple
spec, and the render baseline — all against the unchanged editor, so each is a
pure addition and each can be run on `main` today.
