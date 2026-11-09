# Session — 2026-11-09: one header for every tool (slice 2 of the project-in-two-panes plan)

Owner: every tool at the project page's level. The plan ([plans/2026-11-09-project-in-two-panes.md](../plans/2026-11-09-project-in-two-panes.md), BACKLOG 3.47) named what the project page does that the tools don't; this builds the first answer.

**Built:** `ToolHeader` (`components/studio/ToolHeader.tsx` + `toolHeader.module.css`): the phase panel scaled to one tool — an accent-tinted glass card with the tool's icon, its group, its title, one line of purpose, a progress bar with "n of m", stat chips, a **Next** step in the project page's hint voice, and the actions (Print / CSV) in one row. On **Locations, Cast & crew, Shot list and Money** (their old title rows are gone; Print and CSV are unchanged). The Two panes **offer**: once per project on a screen 1280 px wide or more, remembered on this device (`lib/split/offer.ts`, `components/projects/TwoPanesOffer.tsx`). It does not open the split by itself: the split's Close goes back to the project page, so an automatic redirect would loop.

**Decision (mine, the owner left it open):** offer once and remember, not auto-open.

**Verified:** typecheck, lint, unit tests (the header, the offer, every Studio view test). **Not verified:** on screen (the header in Paper and Misfit, the offer at 1280 px) and about 50 more views still carry their old title rows.
