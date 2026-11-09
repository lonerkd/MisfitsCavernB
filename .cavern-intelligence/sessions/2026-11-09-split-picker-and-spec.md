# Session — 2026-11-09: the pane picker, and a browser spec that found a real bug (slice 5)

**Built:** the split bar's picker offers **This project** (the project's own page) whenever either pane is on a project (`projectOf`, `surfacesFor` in `lib/split/core.ts`; the Studio and editor already follow the active project, so the project's page was the missing destination); a project's page now counts as its own surface ("This project"), not the generic "Projects" list; Day out of days' header sits above its card instead of inside it.

**Browser spec (`e2e/split.spec.ts`, "the project in two panes"):** against a local Supabase stack and a production build: on a wide window the offer is made, declined, and does not come back after a reload; **Two panes** opens the project beside the breakdown; a toolkit tile clicked in the project pane opens the editor in the other pane while the project stays; the picker lists **This project**. Run in this container (dockerd, `npm run db:start`, a build against the local stack, Chromium from `/opt/pw-browsers` through `MC_LOCAL_CHROMIUM`, video off because there is no ffmpeg): the three split specs pass, the existing accessibility check included.

**The bug it found:** the split page froze its layout from `window.location.search` on its first render. On a client-side navigation (a Link, the island, Ctrl+\) the new page renders while the address bar still shows the old page, so the query was empty and the split opened with the default pair, ignoring `?a=&b=`. The old spec could not see it because the default pair is what Ctrl+\ from the editor asks for anyway. The page now reads the router's query (`useSearchParams`, under Suspense).

**Also recorded:** BACKLOG 3.48, a frosted mode for every theme (owner, after seeing Slate's glass island).
**Not verified:** the pane picker's look; the other themes in the split.
