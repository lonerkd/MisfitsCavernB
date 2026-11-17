# Session - 2026-11-17: the Jobs board's loading skeleton (BACKLOG 3.41)

**Seen in the 8-minute phone recording:** the Jobs board sat on heavy black bars for a long time. Cause, in two parts: the global `.skeleton` class was hard-coded near-black (`#111` / `#1a1a1a`), so on Paper (and every light theme) every skeleton in the suite (Jobs, Projects, Crew, Portfolio manage, Admin) read as black slabs; and nothing said a slow load was slow.

**Changed (no migration):** `.skeleton` is a shimmer of the theme's own ink (`rgba(var(--ink-rgb), …)`), no animation under reduced motion; `.progress-bar`'s track is the same ink instead of `#1a1a1a`. The Jobs skeleton is a labelled live region (`role="status"`, `aria-busy`, "Loading job listings"); after 6 s it says "Still loading. The connection may be slow." (`useSlowWhile`, unit-tested); the "All Roles" chip no longer shows a misleading 0 while the board loads.

**Looked at:** a built app at 393x852 with the jobs request held for 9 s: the skeleton in Paper and in Cavern (pale and dim ghosts), and the slow hint at 7.5 s. Not measured: why a real load took long on the owner's phone (the board is one `jobs` query ordered by `created_at`; its latency on production was not looked at).
