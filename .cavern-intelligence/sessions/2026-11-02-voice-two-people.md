# Session — 2026-11-02: two real people in one voice room, seen in two browsers

The island's call work (join from anywhere, mute, leave, Room, "who is speaking") had only ever been seen with one person: the speaker line for a peer was unit-tested, the mesh itself untouched. `e2e/voice-two-people.spec.ts` closes that gap: two accounts (project owner and a confirmed crew member), two Chromium instances each with its own fake microphone, a real WebRTC connection between them over the local stack's Realtime signalling.

**What it checks:** the first person joins and the island says "1 person"; the second joins and **both islands say "2 people"**; because each fake microphone beeps, **each island names the other as speaking** ("<name> speaking"); the second leaves from the island and the first goes back to "1 person". No product code changed.

**Verified:** it passes 4 of 4 runs (about 14 s each); a mutated copy (expecting "3 people") fails, so the assertions can fail. **Not verified:** the ninth joiner being refused (BACKLOG 3.24 d, small, needs nine contexts); audio quality (a beep proves a track is flowing, not that it sounds right); a network that needs a TURN relay.

**Running it in this container:** the app must be built against the local stack (`npm run stack:up -- build`, otherwise sign-in says "Unable to connect"), and `MC_LOCAL_CHROMIUM` must point at the binary (`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`), not the folder.
