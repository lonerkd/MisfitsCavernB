# Sound — the Scenes timeline (sketch, 2026-11-08)

Step 3 of [soundtrack-home](2026-11-08-soundtrack-home.md). The owner chose a **timeline** over rows: the film's scenes left to right, width by length, each scene's music as bars beneath it, its mood as the colour. This sketch is the design to approve before anything is built. Nothing here is built.

## What it is for

One picture answers four questions a writer or director asks about a film's sound, none of which the editor's per-scene view can:

1. **Where is there no music?** (the long grey stretches)
2. **Is the score coherent?** (the same theme returning, or three unrelated tracks in one act)
3. **Does the sound follow the story's shape?** (mood colour against pace; a quiet scene between two loud ones)
4. **What do I do about it?** One tap from a gap to "find music for this scene".

## What exists to build on (no schema change)

- **Scenes**: `scenes` rows with `scene_number`, `heading`, `time_of_day`, `script_id`, `ordinal`, and two lengths: `est_duration` (page eighths, the breakdown's own figure; `eighthsOf` in the Stripboard) and `read_seconds` (the table read's measured time, when it has been run).
- **Tagged tracks**: `project_audio_references.for_scene`, `role`, `tags` (owners and writers tag; everyone on the project reads).
- **Mood**: `sceneMood(body, timeOfDay)` and `scriptMoods(text)` in `lib/spotify/moods.ts` (a mood name and colour per scene, from what happens in it).
- **The Library and `TrackTagger`** (reused for tagging from the timeline), `useSpotify().playUri` (play a bar).

## The picture

```
 Scene     1    2     3        4    5   6        7      8         9
 mood     ▇▇▇  ▇▇▇▇  ▇▇▇▇▇▇▇  ▇▇▇  ▇▇  ▇▇▇▇▇▇▇  ▇▇▇▇▇  ▇▇▇▇▇▇▇▇  ▇▇▇
 (width = how long the scene runs; colour = its mood)
 Theme    ━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━━━
 Source                     ━━━━━━
 Temp score         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 (no music)                    ░░░░░░░░░░░░                ░░░░░░░░░░░░░░
           └ minutes 0 ──────────── 30 ──────────── 60 ──────────── 90
```

- **Top lane: the scenes**, one block each, width proportional to length, coloured by mood, labelled with the number (and the heading on hover and in the open panel). A thin act ruler (minutes) sits underneath.
- **Music lanes: one per role** (Theme, Source, Temp score, Needle drop, Ambience, plus Untagged role). A track tagged to a scene is a bar spanning that scene's block; a track tagged to several scenes (the same theme returning) is the same colour in each, so recurrence reads. Tracks carry their title on the bar when it is wide enough, on hover otherwise.
- **Gaps are drawn, not implied**: a scene with no music in any lane gets a hatched "no music" mark in the bottom lane; it is the one thing the picture is built to show.
- **Clicking a scene block** opens its detail under the timeline (not a modal): the heading, its mood and why (the words that gave it), its tracks (play, change role/tags with `TrackTagger`, remove), "Find music for this scene" (switches to Find with that scene's query filled in and the tag target set to it), and "Read from here" (the table read, from `SoundPanel`'s engine).
- **Clicking a bar plays it** through the deck above.

## Width: how a scene's length is decided

In order of trust, per scene: `read_seconds` (the table read measured it) → `est_duration` page eighths at one page a minute (a screenplay's rule of thumb) → a floor so a 1/8-page scene is still a visible block (min width) → if neither exists yet (a freshly typed script), the scene's line count against the script's average. The axis says which it is: "from the table read" or "estimated from page length", and a scene that fell back to the floor is drawn with a dotted edge. The timeline never invents a number: if a script has no scenes it says so and points to the editor.

## Scale and several scripts

- A feature is 100 to 200 scenes: at 1280 px, blocks are narrow but legible as colour; the detail panel and hover do the reading. A **zoom** (⌘ scroll / pinch / a slider) and a **minimap strip** above handle long films; below 40 scenes it fits without scrolling.
- A project can hold more than one script (a pilot and a bible, drafts). The timeline shows **one script at a time** (a picker, default the most recently edited), because scene numbers repeat across scripts and a joined timeline would lie.
- **Series**: one script is an episode; the picker is the episode list.

## The phone

- Portrait: the timeline is a **horizontal scroller** with snap, the scene detail opens in a bottom sheet (`BottomSheet`, already built); lanes keep their labels pinned at the left. Blocks have a 44 pt minimum tap area in the lane even when the visual is narrower.
- Landscape: shows about a third of the film at once; this is the better orientation for it and the sketch's primary phone case.
- No drag on a phone; tagging goes through the detail sheet.

## Interaction and access

- **Read**: anyone who can open the project (the tags are theirs to see).
- **Tag, retag, remove from a scene**: owners and writers only (`useCanShape`, matching the database since migration `20261108000000`). Others get a read-only detail with no buttons, not disabled buttons.
- **Drag a bar to another scene** (desktop): moves the tag (an update of `for_scene`), with an undo through `lib/os/undo.ts`. A track has one scene today (a column, not a link table); the recurrence picture above therefore needs one decision (below).
- **Keyboard**: arrow keys move between scene blocks, Enter opens the detail, `T` tags, `F` finds music. The timeline is a list of buttons in reading order for screen readers (each block's accessible name: "Scene 4, tense, 2 minutes, no music").
- **Live**: it refreshes through the same realtime channel the editor's refs use, so a writer tagging in the editor moves the bar on a director's open Sound page.

## The one decision the picture raises

**A track has one scene today** (`for_scene` is a single column). A theme that returns in scenes 1, 5 and 9 is three rows (three references to the same song), which works but is clumsy and the Library lists it three times. The recurrence view wants a track-to-many-scenes link. Options:

1. **Keep one scene per reference; group by uri.** The timeline shows the same colour for the same song URI, the Library groups references by URI ("Theme · 3 scenes"). No migration. Slightly odd data (three rows for a song) but cheap and honest. **Recommended for the first build.**
2. **A link table `audio_reference_scenes(reference_id, scene_id)`.** The right shape long term; a migration with RLS through `can_shape_project`, a persona test, a backfill of `for_scene`, and the editor, `SceneMusic`, `SoundPanel` and the Library all change. An M of its own; do it only if option 1 proves clumsy in use.

## Build order (each step ships on its own)

1. **The data layer, pure and tested**: `lib/audio/timeline.ts` builds the model from scenes, refs and moods (block widths with the fallbacks above, lanes by role, same-song colouring, the gap list). Unit tests for the width rules, the lanes, the gaps and a script with no scenes. (S)
2. **The read-only timeline**: scene blocks, lanes, gaps, hover, the script picker, the detail panel with Find and Read from here; replaces the Moods tab. Browser spec at desktop and at 393×852 and 852×393. (M)
3. **Tagging from the timeline** (owners and writers): `TrackTagger` in the detail panel, remove, drag to move with undo, and the live refresh. Persona spec: a writer tags and a viewer sees it with no buttons. (S/M)
4. **Zoom and the minimap** for long films, and the keyboard map. (S)
5. If option 2 above proves necessary: the link table, as its own PR.

## What this does not do

- It does not play or time music against the film (there is no picture, and Spotify gives no audio signal): the bars are *placement*, not a mix. A bar's width is the scene's, never the song's length.
- It does not suggest music by itself beyond what Find already does for a scene's mood. A "fill the gaps" that auto-tags is a product call and is not in this sketch.
- It does not change the editor: its Scene music block and Sound section keep working, and gain an "Open on the timeline" link (`/soundtrack?scene=<id>`), step 5 of the home plan.

## Questions for the owner

1. **Option 1 or option 2** for a song used in several scenes (recommendation: 1 now).
2. **Width by length is the point of the picture.** Is "one page a minute from page eighths, the table read's measured time when it exists" an acceptable rule, or should the length come only from the table read (honest, but empty until someone runs it)?
3. **One script at a time** with a picker, or all of a project's scripts end to end (wrong for drafts, right for a series bible)?
4. **Drag to move a tag** on desktop: wanted, or is "open the detail and pick another scene" enough for the first build?
