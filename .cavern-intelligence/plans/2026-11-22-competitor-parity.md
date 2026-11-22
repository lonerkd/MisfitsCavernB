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

1. **Interchange with the standard (Movie Magic budget and schedule).** Productions that must hand a budget to a studio, completion-bond or accountant need it. **Research (2026-11-22, search summaries only, not hands-on):** Movie Magic's own files are `.mmsx` / `.msd` (Scheduling) and `.mmbx` / `.mbd` (Budgeting); **none has a public spec or SDK**, and `.mbb` (which this doc first named) has no official source and is unverified. The documented way *in* is: Movie Magic Scheduling imports **FDX** (and Final Draft's tagged `.sex`) as breakdown sheets, and Budgeting exports the whole budget to **Excel**; Wrapbook and Cast & Crew import Movie Magic budget output as XML or CSV, and Filmustage and Saturation import `.mmbx`. So **the smallest first slice is not a file writer**: (a) the FDX export we already have, checked against what Movie Magic Scheduling turns into elements; (b) a budget **Excel / CSV export** laid out like Movie Magic's, checked against the import dialogs of Saturation and Wrapbook (this is also the parked "money: spreadsheet export" item). No writer for a proprietary binary format until a spec exists: it is a licensing risk (nobody has taken a lawyer's view). **Built 2026-11-22 (first slice):** the FDX export writes scene numbers and scene lengths; the budget has an Excel button (SpreadsheetML). **Found while building:** Movie Magic Scheduling's docs say element tags come in from the *tagged* `.sex` file Final Draft's Tagger exports; an `.fdx` brings the scene headings and the speaking characters only. So writing our breakdown elements into the `.fdx` would not reach Movie Magic, and the `TagData` / `TagNumber` layout is not documented where I could read it: not written. Next: a `.sex` writer only if its format can be confirmed from a real file. Open: which FDX tags Movie Magic imports as elements, what its "XML Advanced" export contains, whether the trial versions open our files. M.
2. **Call sheet delivery and safety details:** nearest hospital (and police), delivery by text as well as the bell and email, per-recipient personalisation. The call sheet is the most-used paper on a shoot. S/M (hospital lookup needs a places service; text needs a provider and a cost).
3. **Budget depth: fringes, union rules, per diems, rate cards.** The biggest hole against Movie Magic for anything beyond a micro-budget. M/L, and it needs a producer's input on defaults.
4. **Schedule versions** (try a different order without losing the current one). StudioBinder has it on paid plans. M. **Built 2026-11-22:** named versions of the stripboard with compare and restore (`schedule_versions`, migration `20261122000600`; a restore saves the live board first); `sessions/2026-11-22-schedule-versions.md`.
5. **Breakdown speed:** an assisted first pass (Filmustage's whole pitch). We already read the script deterministically; the open question is whether to add a model, which is a product and cost call. M.
6. **Storyboard annotation:** arrows for camera and character movement, tags on frames. S/M on top of the shot designer.

## The owner's read, and what it changes

**Owner, 2026-11-22: these are the competitors to catch up to; the suite is about 30% of the way to a "perfect" tool by their measure, and wins no metric today.** Taking that as the ruling: the list above is a *catch-up* list, not a pitch, and the "different" section below is a hypothesis about where a win could come from, not a claim that one exists. Until the role tools are at parity, new surface work (the play direction, notifications) is judged by whether it moves a role tool toward parity or opens a metric the competitors cannot match; the order of the gaps above is the order to work in unless the owner says otherwise.

## Where we might be different (a hypothesis, not a win)

The graph: a change to a scene, a location or a person is visible everywhere it matters (readiness, call-sheet changes, world checks, budget alert), which list-based tools do not do. Live co-writing and the offline editor. Casting, portfolio, Lounge and Spotify in the same place. Print and export for almost every tool through one kit. None of this is parity work, and whether it is a pitch at all depends on the parity floor above.

## Not doing here

Matching every feature of every tool; copying a competitor's layout.

## Open (owner)

Whether Movie Magic interchange comes before budget depth; whether to add a model for breakdown; whether text messages (a paid provider) are wanted for call sheets; and, since this pass is desk research, whether to run the practitioner protocol with a real producer or first AD against StudioBinder before committing to the ranking.

## Sources

[StudioBinder](https://studiobinder.com/), [pre-production software](https://www.studiobinder.com/pre-production-software/), [choosing a plan](https://support.studiobinder.com/en/articles/10106468-choosing-the-right-studiobinder-plan), [Filmustage on Capterra](https://www.capterra.co.uk/software/1013259/filmustage), [Production Slate](https://www.capterra.ca/software/1109643/Production-Slate), [Celtx on film budgeting](https://blog.celtx.com/best-film-budgeting-software/), [Saturation on film budgeting](https://saturation.io/blog/best-film-budgeting-software), [Celtx vs StudioBinder](https://blog.celtx.com/celtx-vs-studiobinder-comparison/). Movie Magic file formats: [MMS files](https://mms-docs.ep.com/ScheduleFiles/MovieMagicSchedulingFiles.html), [importing breakdown sheets](https://mms-docs.ep.com/Breakdown/ImportingBreakdownSheets.html), [import/export budgets](https://mmb-docs.ep.com/Projects_and_Budgets/importexport.html), [Final Draft to Movie Magic](https://kb.finaldraft.com/hc/en-us/articles/15575252743316-Can-Final-Draft-export-to-Movie-Magic-Scheduling-and-Budgeting), [Filmustage budget import](https://help.filmustage.com/en/articles/15396789-import-a-budget-from-movie-magic), [Wrapbook](https://help.wrapbook.com/docs/import-a-project-budget-from-movie-magic-pas). Vendor-written sources are marked above; none was confirmed against the product.
