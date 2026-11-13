# Sound (was Soundtrack) as the home of sound — a sketch (2026-11-08), decided the same day

Owner, 2026-11-07: "totally forgot we had Soundtrack! that should be the home/extension of the player and all the other sound stuff." This is a sketch to decide on, not a build. It starts from what exists, so nothing is built twice.

## What sound is today, and where it lives

| Thing | Where | Notes |
|---|---|---|
| The player: now playing, play/pause, next, seek, volume, "Free" (embed) vs "Premium" (SDK) mode, disconnect | `GlobalAudioWidget` (a disc in the island's bar, a 360 px panel) | the only control that is on every page; full-screen button opens the visualizer |
| The cavern visualizer | `CavernVisualizer` (opened from the player) | generative, follows playback, not beat-synced |
| What is playing anywhere (phone, desktop app) and driving it | `SpotifyContext` (`lib/spotify/playback.ts`) | the shared truth for the player, the island and the editor |
| The island's music activity | `lib/island/musicActivity.ts` | pause/next on every page |
| Soundtrack page: **Search** (fills from the script, fresh sets, previews), **Moods** (the script's scenes grouped by mood), **SFX** (upload and play the project's sound effects), **Project** (the "Audio Bible": saved references) | `app/(suite)/soundtrack/page.tsx` | four tabs; the page does not know what is playing or what the editor is doing |
| Music for the scene being written, tags (role, free tags), the table read | editor rail, **Sound** section (`SoundPanel`) and the Scene section's Music block (`SceneMusic`) | tag data in `project_audio_references` |
| "Music from the Cavern" (house playlists) | Community page (`HouseMusic`) | |
| Sound reports, sound mixer's tool | Studio › Production › Reports & logs | records only, not audio |

Three homes, none of them the home: the player is a popover, Soundtrack is a page of four unconnected tabs, and the editor's Sound section is the only place that knows the scene.

## What goes wrong for a person working

1. Soundtrack does not show what is playing, so a song found there starts "somewhere" and you look to the corner to see it.
2. A scene's music (the tags) can be seen in the editor and nowhere else; Soundtrack's Project tab lists tracks without the scene, role or tags the editor just gave them.
3. The table read, the SFX and the music are three tools for one job (what does this film sound like), in three places.
4. The player panel is a little copy of a page: Free/Premium mode, disconnect and a source picker crowd 360 px.

## The proposal

**Soundtrack is a page with a permanent now-playing deck on top, and three rooms below it. The player in the corner becomes its small version and always leads here.**

```
┌───────────────────────────────────────────────────────────────────────┐
│ ◉ Night Drive — Kavinsky      ⏮  ⏯  ⏭   ──●────── 1:02 / 3:00   🔊  ⛶ │  the deck: the same state as the corner player,
│   playing on Pixel 8 · Play here                                      │  the island and the editor (one SpotifyContext)
├───────────────────────────────────────────────────────────────────────┤
│  Find        Scenes        Library                                    │  rooms
├───────────────────────────────────────────────────────────────────────┤
│  FIND: one search box (filled from the script, a fresh set each time),│
│        results with Preview / Play / Save / Tag to a scene            │
│  SCENES: every scene as a row: its mood, its tagged music (role,      │
│        tags), "find music for this scene", the table read from here   │
│  LIBRARY: saved tracks (filter by role, tag, scene) · SFX · uploads   │
└───────────────────────────────────────────────────────────────────────┘
```

- **The deck** is the `GlobalAudioWidget`'s panel promoted to the top of the page: the same `useSpotify()` state, so a song started anywhere shows here at once, with the device it is on and "Play here". The corner disc keeps a *mini* panel (title, transport, one link "Open Soundtrack") instead of a copy of the page; Free/Premium mode and Disconnect move to the deck's menu. The visualizer opens from the deck's ⛶.
- **Find** is today's Search tab, unchanged in behaviour (it opens filled from the script, "Fresh set from the script", Preview), plus a **Tag to scene** on every result, so finding and tagging are one motion. Moods becomes a *filter row* in Find ("Tense", "Warm") rather than a tab: a mood is a way to search.
- **Scenes** is new and is the heart: the script's scenes as rows, each with its mood, its tagged tracks (role and tags), a play button per track, and "Find music for this scene" (jumps to Find with that scene's query and the tag target set). The table read starts from a scene row ("Read from here"). It reads the same rows the editor's Scene music block reads: one source, two views.
- **Library** merges the Project tab (the Audio Bible), the SFX tab and uploads: one list of everything the project owns, filterable by kind (song, SFX, upload), role, tag and scene, with tag editing in place (the editor's `TrackTagger`, reused).
- **The editor keeps its Sound section**, slimmer: the scene's music, "Tag this song to Scene n", the table read's remote, and an **Open in Soundtrack** link that lands on that scene's row. The editor is where you write; Soundtrack is where you work on the sound.
- **The island and the phone pill** link to Soundtrack from the music activity; on a phone Soundtrack is the deck plus a bottom segmented bar for the three rooms (the deck collapses to a mini bar while scrolling).

## What this does not do (on purpose)

- No new audio engine and no beat-synced visuals: Spotify gives the page no audio signal. The deck controls Spotify (the in-app SDK player or another device); SFX and uploads play as plain audio elements as they do today.
- No playlist management, queue or lyrics (Spotify's own app is better at all three).
- No schema change: every field needed (`for_scene`, `role`, `tags`, the SFX table) exists.

## Order of work (each step ships on its own)

1. **The deck** on Soundtrack (read-only first: now playing, transport, device, Play here, visualizer) from `useSpotify()`; the corner panel slims to a mini panel linking here. (S/M)
2. **Library** merges Project + SFX + uploads, with role/tag/scene filters and the shared tag editor. (M)
3. **Scenes** room: rows from the scene index and the tagged tracks; "Find music for this scene"; "Read from here". (M)
4. **Find** gets Tag-to-scene on every result; Moods becomes the filter row; tabs become the three rooms. (S)
5. **Editor ↔ Soundtrack** deep links (`/soundtrack?scene=<id>`), and the phone layout of the deck and rooms. (S/M)
6. A browser spec per room, both orientations (the CI phone audit covers the page once it is in its list), and persona checks that tags show only to the people who can open the project (the table already enforces it).

## Decisions (owner, 2026-11-08) — these replace the proposal where they differ

1. **Scenes is a timeline**, not rows: the film's scenes left to right (width by length, so the shape of the film reads at a glance), with each scene's tagged music as bars beneath it and its mood as the colour. A scene's details (find music, read from here, tags) open under its block. This is the larger build: it is step 3 and gets its own sketch before it starts.
2. **The Moods tab is retired**; its content (scenes grouped by mood) becomes a colour and a filter on the timeline.
3. **The corner player becomes a mini panel** (title, transport, "Open Sound"); the source picker and the free-mode embed list move to a "Listen without Premium" section on the page.
4. **Renamed: Sound** (the page title, the nav, the island, the Studio's tool list; the path `/soundtrack` stays for now so no link or bookmark breaks, and redirects when the path is renamed).
5. **Tagging is limited** to the project's owner and its writers (`can_shape_project`), not every member: a migration (the `audio refs update` policy and its guard) with a persona test (owner yes, writer yes, crew no, outsider no), applied to production then staging by hand after merge. It also closes the review's finding that any member could update any column. Step 2b below.

## Order of work, revised

1. **The deck** on the Sound page (built 2026-11-08: `SoundDeck`; the page and nav renamed to Sound).
2. **(2a)** the corner player slims to the mini panel. **(2b)** the tagging migration (owner and writers only). **(2c)** Library merges Project + SFX + uploads with role/tag/scene filters and the shared tag editor.
3. **Scenes timeline** (own sketch first).
4. **Find** gets Tag-to-scene on every result; Moods leaves as a tab; the tabs become the three rooms.
5. Editor ↔ Sound deep links (`/sound?scene=<id>`), and the phone layout of the deck and rooms.
6. A browser spec per room, both orientations.

## The questions, as asked (answered above)

1. **Is "Scenes" the right heart?** The alternative is a timeline view (scenes left to right with their music as bars) that shows how the film sounds as a whole; it is a better picture and a bigger build. Recommendation: rows now, a timeline later if rows prove too flat.
2. **Mood as a filter, not a tab:** agreed to retire the Moods tab? Its content (scenes grouped by mood) moves into Scenes as a grouping option.
3. **The corner player becomes a mini panel** (title, transport, link). It loses the source picker and Free-mode embed list: those serve people without Premium, so they move to the deck's "Listen without Premium" section rather than disappear.
4. **Name:** keep "Soundtrack", or "Sound" to match the editor's section?
5. **Who may tag?** Today any project member can tag any track (the review flagged the policy as broad; its fix is a separate migration). Should tagging stay open to crew, or become owner-and-writers only?
