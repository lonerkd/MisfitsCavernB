# Information architecture and the sound desk (owner, 2026-11-07)

**The owner's words (three messages, one thread):** do the keyboard-tools idea for every tool; "in ScriptOS shouldn't the Audio panel contain the table read, and all the Spotify-to-script stuff, with tags?"; "the music needs improving — I like the icon over the one that says *Audio Engine*; the Spotify experience isn't designed for working at all: no sync with the song already playing, many things"; and "a lot of things that should just exist in the right bar are hidden behind unnecessary tabs in the OS, and vice versa."

## What exists today (inventory, 2026-11-07)
- **Editor right rail, seven tabs:** Write (scene card, quick insert, writing loop, characters, stash), Breakdown, Refs (scene references), Insights (stats, characters, lint, timing), History (revisions), Audio (only the project's saved reference tracks), Notes. **Centre views:** Write, Board, Outline, Preview, Stats (Stats overlaps Insights). **Left nav:** scripts, templates, story map.
- **Studio, eight tabs:** Overview, Library, Scenes, Production, Post, Promos, Pitch, Share. **Production alone is 36 views in one flat list** (`PRODUCTION_VIEWS`).
- **Where audio lives:** the table read is a floating control in the writing area (`WriteView`); the mood-per-scene Spotify search and the saved tracks live on the `/soundtrack` page and a global widget (`GlobalAudioWidget`, labelled "Audio Engine"); the editor's Audio tab only lists saved refs. Nothing connects a scene to a track you can tag.
- **Spotify:** the app plays through its own Web Playback SDK device. It already asks for `user-read-playback-state` and `user-modify-playback-state` but never reads what the person is *already* playing, so a song running on the phone or desktop app is invisible and the in-app player fights it.
- Overlaps: Scenes (Studio) ↔ Refs (editor); Stats (centre) ↔ Insights (rail); Notes appears twice by design (rail, Studio overview).

## The rule
**The rail is for what you are doing to this scene now; the OS (Studio) is for the project.** Anything you need while writing sits in the rail without a tab hop; anything that is about the whole project or another role leaves the rail.

## Proposed editor rail (four sections, fewer tabs, each a scroll of sections)
1. **Scene** — the scene card, who is in it, its references, its breakdown tags, notes on this scene, quick insert. (Replaces Write, Refs, Breakdown and the scene part of Notes.)
2. **Sound** — **table read** (play, pause, from here / from the scene, voices, speed, scene timings; today a floating control), **now playing** (synced to whatever Spotify is playing anywhere), **music for this scene** (its mood, suggestions, one-tap *tag the playing track to this scene*), the project's saved tracks. (Replaces Audio.)
3. **Script** — insights, stats (the centre Stats view goes), lint, history and revisions. (Replaces Insights and History.)
4. **Notes** — all three layers (private, project, writers), as built.
Phone: the four sections are the Tools sheet's four tabs.

## The music, designed for work
- **Sync with what is already playing** (read `GET /me/player` on focus and every few seconds while the page is visible; show title, artist, progress, device; control it through the Web API: play/pause/next/seek/volume on *that* device). "Play here" (transfer to this browser) is a button, not the default; the in-app SDK player is a choice for people with no other device.
- **Tags:** a track is tagged to a scene (or a line range) with a role (theme, source music, temp score, needle drop) and free tags; saved in `project_audio_references` (new columns `scene_id`, `role`, `tags`; RLS as the table has). The scene card shows its tags; the Sound section lists by scene; the playing track can be tagged with one tap.
- **Working-friendly:** the music follows the writer between pages (the global widget stays, icon-only: the *Audio Engine* label goes, the disc icon stays); it ducks while a table read speaks; moods are suggestions never auto-plays; no surprise autoplay on load.
- **Table read ↔ music:** a scene's tagged cue can play under its table read.

## Order of work
1. **Sound section** in the editor (the table read moves in; saved tracks; mood suggestions from `lib/spotify/moods.ts`; no schema change). Widget label removed.
2. **Sync (built 2026-11-07)** with the playing Spotify session (`lib/spotify/playback.ts`: read + control the active device; `SpotifyContext` learns "the player is somewhere else").
3. **Tags** (migration + persona test, the tag UI, the scene card).
4. **The rail's four sections** (merge Write/Refs/Breakdown into Scene; Insights/History into Script; retire the centre Stats view), phone Tools sheet follows.
5. **Studio:** Production's 36 views grouped (by phase and role) with search; Scenes opens the same scene card as the editor.
6. **A tool strip over the keyboard for every writing surface** (Lounge composer, Studio forms, On set notes), as the editor has.

**Decisions I made on the owner's behalf (say if wrong):** four rail sections (not five); Stats leaves the centre views; the in-app Spotify player stops being the default; tags live on the existing audio-references table.
