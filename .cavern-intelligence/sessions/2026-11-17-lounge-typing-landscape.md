# Session - 2026-11-17: the Lounge while typing sideways (BACKLOG 3.41)

The Lounge's header icons (Search, Pinned, Manage without their words) were already in `main` (2026-11-17-open-items). What the sideways phone still lacked was room to read while typing: a landscape iPhone keyboard covers about half of the 393 pt screen, and the top bar (44 px), the chat header (about 60 px) and the 63 px the chat column keeps free for the island left the message list a line or two above the composer.

**Changed (CSS only, no migration):** while the keyboard is up on a short touch screen (`html[data-typing='true']`), the Lounge's top bar and chat header step aside, the room ends where the keyboard starts (`calc(100dvh - var(--kb))`), and the chat column stops reserving the island's height (the island makes way for the keyboard too). They come back when the keyboard goes. In the browser, with the keyboard simulated (`data-typing` and `--kb: 190px` set by hand, because headless Chromium has no on-screen keyboard), two messages plus the composer fit above it where there were about 30 px for messages before.

**Not verified:** a real iOS keyboard (its height and when `usePhoneLayout().typing` turns on), and a real iPhone. If the header being gone while typing is a surprise, the back button is the thing to put back first. **Left (S):** the portrait Lounge was not changed.
