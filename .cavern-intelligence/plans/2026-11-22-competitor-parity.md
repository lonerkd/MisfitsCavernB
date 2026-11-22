# Competitor parity pass: StudioBinder, Filmustage and the rest (BACKLOG 3.54, slice 6)

Owner, 2026-11-22: role tools "at minimum competing" with FilmUsage (the owner's spelling; the product that matches is **Filmustage**) and StudioBinder. This is the first pass: what they say they do, set against what the Cavern has, with the gaps ranked.

## How far to trust this

**Their side is vendor marketing pages and aggregator listings, read through a web search. Nobody has used these products for this.** Pricing figures conflict between sources, and several comparison articles are written by competing vendors (Celtx, Saturation, Filmustage). **Our side is checked against `origin/main`** (file and string searches, the backlog's own text), not by driving the app against theirs. The practitioner protocol of the 2026-11-15 role-suites audit (real crew doing a real day in each tool) has not been run against any competitor. So: a map of probable gaps to check, not a verdict.

## What they offer (from their own pages)

- **StudioBinder:** call sheets auto-filled with weather, location, cast and *nearest hospital*, personalised per recipient and sent by email or text; paid plans auto-populate call sheets from the schedule; multiple stripboard schedule versions with camera setups and meal / company-move banners; unlimited shot lists and storyboards with a tagger and camera / character movement arrows; a script breakdown that feeds scheduling, call sheets and production reports; custom breakdown categories. Free tier is limited (for example 10 shots per list). I found no casting module and little on budgeting.
- **Filmustage:** automatic (AI) script breakdown, a free tier, budgeting and call sheets in its listing, and export to Movie Magic.
- **The industry standard (Movie Magic Scheduling and Budgeting):** stripboard and budget with fringes and union calculations; Excel-style, no real-time collaboration; a one-time or monthly price.
- **Saturation.io:** real-time shared budget editing, cheaper than Movie Magic, but no native `.mbb` export and thinner on global fringes and union maths.
- **Celtx:** script, breakdown, scheduling and budget in one, aimed at indies.

## Where the Cavern stands (checked on `main`)

Have: script editor with live co-writing and offline, FDX / Fountain / PDF import and export, revisions, breakdown (tagging, categories, rates, per-scene sheets, page eighths, suggestions from past projects), stripboard with auto-schedule and company moves, day out of days, call sheets (issued, acknowledged, changes tracked, weather), readiness, shot designer with framing diagram, locations with permits, crew and roles with capabilities, casting with a shortlist, budget with lines, templates, cash flow, vendors, expenses and timesheets, an over-budget alert, a printed document for most tools, a project-wide film graph linking all of it.

Not found in the code: **nearest hospital on a call sheet; call sheets sent by text message; more than one schedule version; budget fringes, union rules or per diems; Movie Magic (`.mbb`) or Movie Magic Scheduling interchange; AI-assisted script breakdown; storyboard arrows / a tagger on frames.**

## Gaps, ranked by how much a working crew would feel them

1. **Interchange with the standard (Movie Magic budget and schedule).** Productions that must hand a budget to a studio, completion-bond or accountant need it; Saturation's lack of `.mbb` is one of its listed weaknesses, so it is both a gap and an opening. Needs the file format spec; M/L.
2. **Call sheet delivery and safety details:** nearest hospital (and police), delivery by text as well as the bell and email, per-recipient personalisation. The call sheet is the most-used paper on a shoot. S/M (hospital lookup needs a places service; text needs a provider and a cost).
3. **Budget depth: fringes, union rules, per diems, rate cards.** The biggest hole against Movie Magic for anything beyond a micro-budget. M/L, and it needs a producer's input on defaults.
4. **Schedule versions** (try a different order without losing the current one). StudioBinder has it on paid plans. M.
5. **Breakdown speed:** an assisted first pass (Filmustage's whole pitch). We already read the script deterministically; the open question is whether to add a model, which is a product and cost call. M.
6. **Storyboard annotation:** arrows for camera and character movement, tags on frames. S/M on top of the shot designer.

## Where we are ahead, or different

The graph: a change to a scene, a location or a person is visible everywhere it matters (readiness, call-sheet changes, world checks, budget alert), which list-based tools do not do. Live co-writing and the offline editor. Casting, portfolio, Lounge and Spotify in the same place. Print and export for almost every tool through one kit. None of this is parity work, and it is the real pitch.

## Not doing here

Matching every feature of every tool; copying a competitor's layout.

## Open (owner)

Whether Movie Magic interchange comes before budget depth; whether to add a model for breakdown; whether text messages (a paid provider) are wanted for call sheets; and, since this pass is desk research, whether to run the practitioner protocol with a real producer or first AD against StudioBinder before committing to the ranking.

## Sources

[StudioBinder](https://studiobinder.com/), [pre-production software](https://www.studiobinder.com/pre-production-software/), [choosing a plan](https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan), [Filmustage on Capterra](https://www.capterra.co.uk/software/1013259/filmustage), [Production Slate](https://www.capterra.ca/software/1109643/Production-Slate), [Celtx on film budgeting](https://blog.celtx.com/best-film-budgeting-software/), [Saturation on film budgeting](https://saturation.io/blog/best-film-budgeting-software), [Celtx vs StudioBinder](https://blog.celtx.com/celtx-vs-studiobinder-comparison/). Vendor-written sources are marked above; none was confirmed against the product.
