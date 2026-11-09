# The project in two panes, and every tool at the project page's level (owner, 2026-11-09)

**Owner:** "I need every tool and everything designed to at minimum the level of the project page ... nothing else is as functional, but still beautiful, cohesive ... and we need to improve the split screen and make it more auto ... a dual page is the best and ideal use state for the project."

## What the project page does that the tools mostly don't
Read from `app/(suite)/projects/[id]/page.tsx`, `components/progress/*`, `components/projects/hub/*`:
1. **It tells you where you are and what is next**: the phase ring (2 of 5), milestones with one hint for the next, a gate to move on.
2. **Tools are bricks**: one grid of named, iconed tiles; locked ones say when they open; an Early tag.
3. **One header, one accent**: the project's colour carries through ring, bricks and borders; glass cards, one radius, the display type at the top.
4. **Every card has a state**: empty, partly done, done, with the thing to do next beside it.

A tool page (a Studio view, a production tool, the editor rails) typically has a title and a table or a form: no "what is next", no progress, no consistent card.

## The design language to hold every tool to (the minimum)
- A **tool header**: name, what it is for in one line, the project accent, its count or progress, its Print/CSV/Share actions in one row.
- A **next step** line when the tool's data is incomplete (the same hint voice as the milestones).
- **Cards** are the glass card with the one radius; empty states say what to add first; status uses the theme tokens.
- All of it from `components/ui/` and `design-tokens.md`; no tool builds its own card.

## The split screen becomes the project's default working state
Built 2026-11-09 (slice 1): **Two panes** on the project page opens the project beside the tool its phase works in (development → editor, pre-production → breakdown, production → On set, post → Post); a toolkit tile or "Go" opened from the project pane **comes up in the other pane** (`open-beside`, linked or not); `companionOf` pairs breakdown ↔ schedule, readiness / On set → schedule, Sound → script.

**Built 2026-11-09 (slice 2):** `ToolHeader` on Locations, Cast & crew, Shot list and Money; the Two panes offer (once per project, 1280 px and up, remembered on this device; no automatic redirect because Close would loop).

**Built 2026-11-09 (slice 3):** `ToolHeader` on every Production view (see BACKLOG 3.47).

**Left, in order:**
1. A shared tool header and next-step component, then the Studio's 36 views and the production tools moved onto it, one group at a time (M each; start with the ones people open most: Scenes, Breakdown, Schedule, Money, Library).
2. The split opens by itself where it earns it: a project opened on a wide screen (>= 1280 px) offers the pair once and remembers the choice per project (a device preference); narrow screens keep one page.
3. A project-aware pair picker in the split bar (the project's own tools, not a global list) and the pair remembered per project.
4. The editor and Studio sharing the scene card (BACKLOG 3.42 step 5) so a pane never repeats the other.
5. A browser spec: open Two panes, click a tile, the other pane navigates; in both orientations on a phone (the phone keeps one pane and a switcher).

Done when each tool header, empty state and card matches the project page, the project opens as a pair by default on a wide screen, and the owner has used it.
