# Session - 2026-11-21: the Sound page works without Spotify; scene blocks no longer pile up on a phone

- **The gate is split (owner agreed):** the whole Sound page used to show only "Connect Spotify" until a token existed, though the scenes timeline, the tags and the library never need Spotify. Now they open for everyone; the sound deck, the Premium note and the Find tab ask to connect, in place, with a Connect Spotify button. A scene's "Find" opens the Find tab (with the query filled) and asks to connect. Playing a track with no connection now says so in a toast instead of doing nothing (`playUri`).
- **A real phone bug the spec found:** the scene blocks are 16 px per minute wide while buttons carry a 44 pt minimum width, so on a phone the blocks overlapped and a tap on scene 1 landed on scene 3. On a phone the scale now widens until the shortest scene is a 44 pt target (`SceneTimeline`); the strip scrolls sideways.
- **`e2e/sound-phone.spec.ts`** (from the held `claude/sound-batch`, with the fake Spotify token removed): no sideways page scroll, three scene blocks, a tap presses one, tabs and blocks are 44 px tall, both orientations.

**Still held** (`claude/sound-batch`): the minimap and arrow-key navigation for long scripts, and a 30-scene spec; they rebase onto this.

**Verified:** typecheck, the audio and OS unit tests (183), and `e2e/sound-phone.spec.ts` (3 passed) on a production build on the local stack, with no Spotify token. **Not verified:** a phone device; a screenshot of the not-connected Find tab was not taken.
