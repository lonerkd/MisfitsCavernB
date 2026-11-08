# The Cavern experience — an explorable cave that listens (sketch, 2026-11-08)

Owner brief: "I usually have Wallpaper Engine, but a cavern version synced to my stuff and my Spotify can be great. You should be able to explore the cave with simple arrow keys or hold-to-guide, so when I'm bored I have an inside distraction while listening to music and can just zone out. Like the no-wifi game from Chrome: while it's AFK it does its own interactive journey."

Nothing here is built. It replaces the current full-screen cavern (`CavernVisualizer`: a static cutout of black spikes and one orange glow, which the owner called ugly).

## What it is

A calm, endless, side-on **flight through a procedurally generated cave**, drawn in layers so it has depth. You steer a small light (a lantern spirit) with the arrow keys, or hold a direction (or hold the mouse / a finger) and it drifts toward it. **There is no fail state** and no score you must chase: it is for zoning out. Leave it alone for a few seconds and an **autopilot** takes over and flies its own wandering route; touch any key and control is yours again, with no jerk. The music is yours (Spotify, already playing); the cave only watches it.

## The honest limit on "synced to Spotify"

Spotify does not hand a web page the audio. The Web Playback SDK plays protected audio the page cannot read, and the track-analysis endpoints (beats, loudness, energy) are closed to new apps. So a cave that visibly beats in time with the kick drum **cannot come from Spotify alone**. What can be real, in three levels (each stands on its own):

1. **Always on: synced to the player's state.** Play and pause (the cave breathes in and settles), track changes (a slow transition to a new cave), the song's progress (the journey has a shape: a long tunnel that opens into a chamber near the end), the album art's colours (the light takes the cover's palette), and a **seed from the track id** so the same song always makes the same cave. This is real data, available now through `useSpotify()`.
2. **Opt-in: real audio reactivity.** The browser can analyse whatever the computer is playing if the person chooses to share it: `getDisplayMedia({ audio: true })` ("share system audio" on Windows Chrome / Edge, or this tab) into an `AnalyserNode`, then a frequency read each frame (bass pushes the glow, highs shimmer the spores, a beat flash). This is the same way web visualisers work. It needs a prompt every session, and **whether it hears Spotify's protected in-page audio is unverified** (system audio capture should; tab capture of protected audio may be silent): the first build tries it and says plainly when it hears nothing. Microphone is a crude last resort and not recommended.
3. **Your stuff: the project.** With a project active, the scenes' moods and the tracks tagged to scenes colour the world. A song tagged to a Dread scene turns the cave dark red; Quiet is cold blue-grey; the scene's heading is carved faintly into a rock face you pass; characters can be the fireflies. The journey can follow the script's own timeline (the Scenes timeline's length and moods) so a film's shape becomes a flight. All of it is data the suite already has.

## Playing it

| Input | Does |
|---|---|
| Arrow keys / WASD | steer (up and down move the lantern, left and right set the pace) |
| Hold a direction, hold the mouse, or hold a finger | drift toward that point, smoothly |
| Space | a gentle pulse of light (lights nearby spores, costs nothing) |
| Esc, or the corner button | leave |
| Nothing for ~6 s | the autopilot flies its own route; any input hands back at once |

- **No fail state:** the walls steer you softly away (a magnet, not a crash). Zoning out is the point.
- **Spores to find:** drifting lights you can brush for a soft ripple of colour; nothing is counted unless a quiet "caves explored" tally in a corner is wanted (a question below).
- **Reduced motion** (`prefers-reduced-motion`): slower drift, no pulses, no flashes; never more than three brightness changes a second.

## How it is made

- **Canvas 2D, layered parallax** (no WebGL needed): far rock, mid rock, near rock and a foreground, each a different speed, blurred and fogged by depth; **rim light** along the rock edges from the lantern; drifting mist; spores and dust; a soft off-centre glow. This is what turns "cutout" into "cave".
- **Procedural and seeded:** the cave is generated in chunks ahead of the lantern from seeded noise, so the same seed (the track id) is the same cave and it never ends. Left alone, the autopilot follows the cave's own centre line with a slow wander; control hands back by blending, not snapping.
- **Cheap:** one `requestAnimationFrame` loop, paused when the tab is hidden, drawn at a capped resolution on weak devices; a frame budget measured on the phone audit.
- **Where it lives:** the full-screen button on the Sound deck and the corner player opens it (today's cavern), and it is also its own route, `/cavern`, with the chrome hidden and the cursor auto-hiding, to leave on a second monitor. Because it is a web page, it can also be loaded as a **web wallpaper in Wallpaper Engine** (it supports web content); that is a use, not a feature we build, and is unverified here.
- **Phone:** touch to guide, landscape is the good orientation, no audio capture (mobile browsers do not offer it), so levels 1 and 3 only.

## Build order (each ships on its own)

1. **The cave itself, and the autopilot** (S/M): the layered generated cave with rim light, mist and spores, seeded from the track id, coloured by the album art, breathing with play/pause, journey shaped by song progress. Replaces `CavernVisualizer` with no new controls yet. Unit tests for the generator (same seed, same cave; chunks join), a spec that it opens and closes.
2. **Steering** (S): arrow keys, hold-to-guide with mouse and touch, the soft wall magnet, the autopilot handover both ways. Tests for the control law (no snap; idle starts the autopilot; input stops it).
3. **Your stuff** (S/M): project mood colours, the scene headings carved in the rock, the Scenes timeline as the journey's shape.
4. **Audio reactivity** (M, opt-in): `getDisplayMedia` audio into an analyser; a plain "I can't hear anything" state; tested with a fake audio source, honestly marked as unverified against real Spotify audio until the owner tries it.
5. **`/cavern` as a wallpaper route** (S): chrome hidden, cursor auto-hide, remembered settings.

## What this does not do

- It does not play sound of its own (the music is Spotify's), and it does not claim to be beat-synced when level 2 is off or hears nothing: the cave says which level it is running at in a small corner label.
- It is not a game with enemies, levels or a fail state.
- It does not read or transmit the captured audio: analysis stays in the browser and nothing is stored.

## Decisions (owner, 2026-11-08)

1. **The audio-share prompt is acceptable** (level 2, opt-in), still to be built.
2. **A tally:** left to Claude: a quiet "N m in" reading, shown with the controls, never stored.
3. **The runner is a stick-figure ninja, like the mobile ninja games, running with a lantern in its right hand through dark caves that vary.**
4. **Side-on.** The owner's vision was first-person but worried it was too hard and too heavy for the site; a figure seen running is side-on by nature, and the layered depth gives the feel. First-person stays a possible later mode, not planned.

**Built 2026-11-08 (steps 1 and 2, with the figure):** the seeded cave (`lib/cavern/cave.ts`: four kinds of place, tunnel, chamber, crawl and teeth, blended; always room to run), the runner and autopilot (`runner.ts`), drifting specks (`spores.ts`), the cover's colour (`palette.ts`), and the renderer (`components/shell/cavernScene.ts`: three cave layers, the dark that only the lantern lifts, a lit rim, the figure with its scarf). Arrow keys or WASD, or hold the mouse or a finger; right faster, left slower, up leaps, down crouches; idle for 6 s and it runs its own route, input takes it back without a jerk; the cave is seeded by the song and a new song blends in beyond the screen edge. Level 1 sync (state, seed, cover colour, strolling when paused). **Left:** the project's moods and the Scenes timeline as the journey (step 3), real audio reactivity (step 4: opt-in `getDisplayMedia`), `/cavern` as a wallpaper route (step 5), the song's progress shaping the journey, and a look at it on the owner's screen and phone.

## Questions for the owner (answered above)

1. **Is the Level 2 prompt acceptable** (the browser asks to share audio each session), given it is the only way to a real beat? Or is state-synced (levels 1 and 3) enough?
2. **A quiet "caves explored / distance flown" tally** in a corner: wanted, or nothing counted at all?
3. **The lantern spirit**: a plain glowing light, or something with a little character (a small creature, a drone, a paper boat on an underground river)?
4. **Side-on flight** (what is sketched) or a **first-person tunnel** (more immersive, harder to steer and to make look right)?
