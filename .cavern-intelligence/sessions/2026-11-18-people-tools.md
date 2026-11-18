# Session - 2026-11-18: Casting and the Character bible get search, and casting gets undo

Casting board: a header search over characters (name and performer); **Cast** and **Reopen** now push an undo (Ctrl/⌘ Z re-casts the previous performer, or reopens the role), through `lib/os/undo` with the origin taken before the first await. Character bible: search over name, full name, age, arc and description. Both already checked save errors and toasted; neither had search or undo. Crew boards left as is (invites are not reversible).

**Verified:** typecheck, lint, `components/studio` unit tests. Not run in a browser; no new e2e. **Left:** confirm before removing a casting note or cancelling an audition; the same standard for Library, Scenes, Post, Promos and the pages outside the Studio (BACKLOG 3.38 / 3.51).
