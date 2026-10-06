# 5 · The Studio

`/studio` — the production workspace: one project at a time, from references
to delivery. Tabs open with the project's phase (§11). URL: `?tab=` and, for
Production, `?view=`; the project is the active one (`mc_active_project`) or
`?project=`. Engineering detail:
[`studio-and-preproduction.md`](../studio-and-preproduction.md).

## Screens

| Tab / view | Desktop | Phone |
|---|---|---|
| Overview | <img src="screens/studio-overview--desktop.webp" width="380"> | <img src="screens/studio-overview--phone.webp" width="120"> |
| Library | <img src="screens/studio-library--desktop.webp" width="380"> | <img src="screens/studio-library--phone.webp" width="120"> |
| Scenes | <img src="screens/studio-scenes--desktop.webp" width="380"> | <img src="screens/studio-scenes--phone.webp" width="120"> |
| Production › Story | <img src="screens/studio-production-story--desktop.webp" width="380"> | <img src="screens/studio-production-story--phone.webp" width="120"> |
| Production › Breakdown | <img src="screens/studio-production-breakdown--desktop.webp" width="380"> | <img src="screens/studio-production-breakdown--phone.webp" width="120"> |
| Production › Readiness | <img src="screens/studio-production-readiness--desktop.webp" width="380"> | <img src="screens/studio-production-readiness--phone.webp" width="120"> |
| Production › Schedule | <img src="screens/studio-production-schedule--desktop.webp" width="380"> | <img src="screens/studio-production-schedule--phone.webp" width="120"> |
| Production › On set | <img src="screens/studio-production-onset--desktop.webp" width="380"> | <img src="screens/studio-production-onset--phone.webp" width="120"> |
| Production › Cast & crew | <img src="screens/studio-production-crew--desktop.webp" width="380"> | <img src="screens/studio-production-crew--phone.webp" width="120"> |
| Production › Locations | <img src="screens/studio-production-locations--desktop.webp" width="380"> | <img src="screens/studio-production-locations--phone.webp" width="120"> |
| Production › Money | <img src="screens/studio-production-money--desktop.webp" width="380"> | <img src="screens/studio-production-money--phone.webp" width="120"> |
| Production › Paperwork | <img src="screens/studio-production-paperwork--desktop.webp" width="380"> | <img src="screens/studio-production-paperwork--phone.webp" width="120"> |
| Post | <img src="screens/studio-post--desktop.webp" width="380"> | <img src="screens/studio-post--phone.webp" width="120"> |
| Promos | <img src="screens/studio-promos--desktop.webp" width="380"> | <img src="screens/studio-promos--phone.webp" width="120"> |
| Pitch | <img src="screens/studio-pitch--desktop.webp" width="380"> | <img src="screens/studio-pitch--phone.webp" width="120"> |
| Share | <img src="screens/studio-share--desktop.webp" width="380"> | <img src="screens/studio-share--phone.webp" width="120"> |
| `/call/[id]` (crew's call sheet) | <img src="screens/call-sheet--desktop.webp" width="380"> | <img src="screens/call-sheet--phone.webp" width="120"> |

## Tabs

| Tab | What it's for | Key data |
|---|---|---|
| **Overview** | the project at a glance: phase, what's next, counts | `project_progress` |
| **Library** | every reference: uploads (images, video, audio, PDF ≤ 50 MB), links (YouTube/Vimeo embeds, Pinterest boards via `/api/links`), Openverse search with credit; boards; transcripts and the paper edit for recordings | `media`, `transcript_lines`, bucket `project-media` |
| **Scenes** | one card per scene heading: references, note, colour, shoot day, status, shot list with the **shot designer** (size, angle, movement, lens, framing diagram, a storyboard frame), open post notes | `scenes`, `scene_media`, `shots` |
| **Production** | Story · Breakdown · Readiness · Schedule · On set · Cast & crew · Locations · Money · Paperwork (below) | |
| **Post** | Cut review (link or library video, timecoded notes by department, tied to scenes and script lines, `CutPlayer` seeks YouTube/Vimeo/`<video>`), Paper edit, Pipeline & deliverables | `post_cuts`, `post_notes`, `post_items` |
| **Promos** | campaigns: platform (free text, suggested from history), status drafting / live / wrapped, budget and spend | `campaigns` |
| **Pitch** | the pitch deck: logline, look, characters, scenes — presentable full-screen | project + media |
| **Share** | visibility (Private · Team · Anyone with the link · Public), which items are published, the link | `projects.visibility`, `media.shared` |

## Production views

| View | What it does |
|---|---|
| **Story** | beat board; character bible with a look-board per character (`character_media`) |
| **Breakdown** | elements by category or per-scene sheets; status, cost, owner; **Categories & rates** (data, not code); **Push to budget** (`Breakdown · <category>` lines); printable sheets |
| **Readiness** | can we shoot it? each scene checked against cast, breakdown, shots, a dated day, references; grouped by shoot day; "what unblocks the most"; every blocker links to its fix |
| **Schedule** | stripboard (INT/EXT × DAY/NIGHT colours), drag or Alt+←/→ between days, pages vs day length, company moves, auto-schedule, Day out of days, print; **call sheets** per day: calls, wrap, address, weather, per-person calls; **issue** (versioned, notifies) and reminders |
| **On set** | today's sheet, your own call, the day's clock (call · rolling · lunch · back · wrap), shots Got / Drop, wrap scene, continuity notes with phone photos, day notes; works offline (`e2e/onset-offline`) |
| **Cast & crew** | crew with crafts and roles, presence, availability (`project_availability`), recruiting (job posts from the brief), casting with each character's scene footprint (`character_castings`) |
| **Locations** | one record per location name: status, permit, address, contact, cost, notes; scenes link by name |
| **Money** | budget vs actuals, vendors, expenses (committed / paid, receipt from the library), timesheets (submit → approve) — shapers only |
| **Paperwork** | permits, insurance, releases, contracts: status, person / vendor / location, files in `project-papers`; a granted permit updates its location |

## `/call/[id]` — the crew's call sheet

Where a call sheet notification lands: the viewer's own call on top, "Got it"
(acknowledges *this* version — `ack_call_sheet`), the day, the scenes,
everyone's calls. Members of the production only. The owner sees who has
acknowledged.

## Rules

- Everything is project-scoped (`can_access_project`); money, paperwork,
  issuing and planning need `can_shape_project` (owner, lead, contributor).
- Crew add to the library and delete what they added; only the owner deletes
  others' items or decides what's published (`media_guard`).
- Readiness and milestones are *read* from the data — nothing is ticked by
  hand.
- Everything is live (Realtime) for the whole crew; `useLiveRows` reloads on
  reconnect and keeps local writes.

## Connections

Script → scenes, breakdown, characters, shots. Breakdown → budget, call
sheets, readiness. Schedule → Today, `/call`, On set, notifications. Library →
share page, `/m` permalinks, showcase, pitch, portfolio. Post notes →
editor margins. Brief → Cast & crew hints, Breakdown hints, role posts.

## Known gaps

- Studio's graph is 140 files; tabs are client-rendered in one page — a
  candidate for route segments per tab in the restructure.
