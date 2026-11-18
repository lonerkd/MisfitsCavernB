# Session - 2026-11-18: search and "who is here" in every Studio tab, not only Production

#645 gave the Production tools a header search and a "Dev is here too" line. Owner: every tool needs the breadth. The Studio page (`app/(suite)/studio/page.tsx`) now wraps every tab in the same `ToolHereContext` (`studio:<tab>`) and a `ToolFindProvider` keyed by the tab, and announces the tab through `updateToolPresence` (Production still names its own view, `production:<view>`, so the two never fight). Search is wired into the lists that had none: Scenes (the scene cards), Post (a cut's notes), Promos (campaigns). The Library already has its own filter bar and keeps it.

**Verified:** typecheck, lint (no new warnings), `components/studio` and `app` unit tests, and `e2e/studio-find-presence.spec.ts` (a second person in the Library tab is named in the owner's header; moving to Share clears it) against the local stack and a production build.

**Also:** `backlog-detail.md` 3.18 no longer says to keep `scenes.cast_list` (it was dropped 2026-11-17).

**Left:** search in the non-record tools (stripboard, breakdown), the Share tab and Overview (no list worth searching), and presence outside the Studio (Jobs, Crew, Lounge, Today).
