# Role suites audit (2026-11-15)

The owner's question (2026-11-15): *make sure each role's full suite is built and their tools are well made and interconnected.*
This is the first **code-evidenced** answer to it. The role completeness map (`2026-11-13-role-completeness-map.md`) says plainly that
its statuses are "assessments from the repo brief, not a fresh screen-by-screen audit"; this audit replaces the guesses it can with
facts from the repository, and says what it could not check.

**What "built" means here:** the tool exists, is reachable from the role's own suite, and is permission-correct for that role. It does
**not** mean a practitioner has finished their canonical job in it at a competitor's standard: nobody has run the practitioner
protocol (map, "Private evidence protocol"). That is still the only proof that counts.

## Method

- The catalogue: `public.crafts` (58 crafts in 13 departments) and `craft_capabilities` (the permissions each craft holds).
- The tools: the Studio's 41 Production views (`PRODUCTION_VIEWS`), plus the surfaces outside the tab (the editor, Library, Sound, Pitch,
  Share, the crew call page, the client review link).
- A **written workflow per craft** (`lib/roles/workflows.ts`, 2026-11-15): the steps of the job in four stages (Prep, The day before, On the day, After the shoot), each in the tool it happens in, with what the role receives and hands on. About 20 crafts have their own; every other craft uses its department's. A test checks every tool named exists and, against the real catalogue, that every craft has a step in a tool its own suite holds. The person sees it as **Your workflow** on the Production tab. The workflows are written from the role completeness map and the tools as they are; they have not been run by practitioners.
- A **toolkit per craft** (`lib/roles/toolkit.ts`): the ordered tools that craft works in, a department fallback for crafts an admin adds,
  and the gaps (canonical steps with no tool). It is data, with tests, so the audit cannot drift from the code.
- **An interconnection check** (`tests/integration/role-toolkits.test.ts`): reads the real catalogue and templates from the database and
  fails when a craft holds a permission whose tool is not in its suite, when a craft has nowhere to work, or when a toolkit names a craft
  that does not exist.

## What the audit found, and what was fixed

1. **Ten roles held a permission without the tool that uses it** (found by the check on its first run; fixed in this step): the Producer,
   Line producer and Production manager could edit the breakdown and locations; the Production coordinator could edit locations; the
   Director could decide casting; the Location manager and Music supervisor could edit paperwork. None of those tools was in their suite.
   Every one is now, and the check keeps it so.
2. **A person's own tools were buried.** The Production tab offers 41 tools in six groups to everyone: a gaffer and a producer saw the same
   wall. It now opens with a **Your tools** row (their craft's suite, only the tools they may open), without hiding anything else. The
   *Your role* card on Your day uses the same suites.
3. **Six crafts hold no permission at all** (Actor, Stunt performer, Voice actor, Investor, Distributor or festival guest, Press). By
   design for the budget, casting and paperwork. But they have **almost no working surface**: performers have the crew call page, and the
   outside roles have only the client review link. See the gaps below. (Update 2026-11-15: a link per audience, enforced in the database.)
4. **The owner could not see any of this.** "View as" previewed one generic crew member. It now previews a **specific craft at an access
   level**, and every screen that follows a person's capabilities shows what that role sees; while previewing, the Production tab also says
   what the role's job still lacks.

## Suites by role family

"Surfaces" = outside the Production tab. Verdicts: **Built** (the suite is there and permission-correct), **Partial** (a real gap in the canonical
job), **Thin** (the role has almost no working surface). All are *unproven by a practitioner*.

| Family (crafts) | Working suite (Production tab) | Other surfaces | Gaps (evidence in `toolkit.ts`) | Verdict |
|---|---|---|---|---|
| Writing (Writer, Story editor, Showrunner, Story producer) | Story, Script revisions, World, Continuity (+ Breakdown, Schedule, Money for the Showrunner) | the editor (the real writing surface), Pitch | YouTube, article and game formats exist (2026-11-15); their exports are still screenplay-shaped and nothing publishes to a channel or CMS (R3, R5) | Partial |
| Direction (Director, 1st AD, 2nd AD, Script supervisor) | Director notebook, Shots, Breakdown, Schedule, Day out of days, Readiness, On set, Script sup, Continuity | editor, Pitch | the director's day at a glance is on Your day (2026-11-15), a live on-set view is not separate from On set (R11); the script supervisor's takes are logged by scene, shot and line run, lined on the script, with one selected take per shot (2026-11-15); photos with continuity notes and the handoff into the editor's timeline are not (R12); scene identity across a script change unproven (R10) | Partial |
| Production (Producer, Line producer, PM, Coordinator, Accountant, PA, Location manager, Casting director) | Money, POs, Paperwork, Schedule, Readiness, Crew, Permits, Locations, Comms, Transport, Catering | Community, Hub | no invoices, cash-flow or Excel / Movie Magic export (4.6); location packet not one shareable page (R16); no Backstage-style casting intake (R15); coordinator flow unrun (R9) | Partial |
| Camera (DP, operators, ACs, Steadicam, drone, DIT, stills) | Shots, Camera report, Gear, Media offload, Stills, Schedule | Library | no overhead / blocking diagram (R13) | Partial |
| Lighting & grip (Gaffer, Key grip, Electrician, Grip) | Gear, Schedule, Safety, Shots, Location scouts | n/a | none recorded | Built |
| Sound (mixers, boom, designer, re-recording) | Sound report, Gear, Media offload, Editorial, Revisions | Sound (the page) | no sound spotting or effects list tied to scenes (R17) | Partial |
| Art (Designer, Art director, Decorator, Prop master) | Props, World, Locations, Breakdown, Continuity, Scouts | Library, mood boards | references cannot become tracked assets; no Pinterest import (R14) | Partial |
| Wardrobe, hair & makeup | Costumes, Makeup / hair, Continuity, Breakdown | Library | none recorded | Built |
| Editorial & post (Editor, AE, Colorist, VFX, Motion, Post supervisor) | Editorial handoff, Media offload, Reports, Revisions, VFX shots | Studio › Post, cut review | review comments are not pinned to a picture version; approval of a cut happens outside (R18) | Partial |
| Music (Composer, Music supervisor) | Sound report, Editorial, Revisions, Paperwork | Sound (the page, Spotify) | no cue sheet or licensing tracker; Spotify verified with fakes only (R17) | Partial |
| Performance (Actor, Stunt, Voice) | Rehearsals (and Safety for stunts) | **My calls** (`/call`) and the call sheet with **Your pages** (built 2026-11-15) | no lines-learning or self-tape tool; nothing after the shoot day (R19) | Partial |
| Outside (Client, Investor, Distributor, Press) | none | a review link per audience (client: read, comment, decide; investor and distributor: read and comment; press: read only; enforced in the database, 2026-11-15) | approval is of script versions only, not a picture cut; no investor deck or budget summary, no screening link, press kit not in the link (R20) | Partial |

## Handoffs (X1-X7): what the code shows

| Handoff | Evidence in the repository | Verdict |
|---|---|---|
| X1 writer → producer / AD | the script's scenes are synced to rows (`sync_script_scenes`); the breakdown and the stripboard read them | Built; **not proven across a script change** (film graph cutover is BACKLOG 3.18) |
| X2 director → departments | the Director notebook is a record tool; nothing carries a director's change to a department | Partial |
| X3 production → crew | a call sheet issues per-person calls, crew acknowledge, push is live, and the issue bar shows who has not acknowledged | Built; the coordinator's whole flow unrun (R9) |
| X4 shoot → editor | the set log, camera and sound reports, the media offload log and an Editorial handoff record | Partial: records, not one package the editor receives |
| X5 team → client | review links by audience; versions are script versions; approval is not tied to a picture cut | Partial |
| X6 project → portfolio | credits and laurels appear on a person's page from the work itself | Built |
| X7 creator lane → production lane | formats are separate (screenplay, podcast, copy, advertising, and since 2026-11-15 YouTube, article and game scripts); a video script's sections are scenes the Studio can plan, but nothing carries an ad or an article into a production plan | Partial |

## What this audit could not check

- Whether any tool is *good enough* for its specialist: only practitioners can say. Tier 1 roles need three each (map, evidence protocol).
- Each tool's internal quality: the tools were built and reviewed over many sessions; this audit checks reachability and permissions, not usability.
- The phone, offline and print behaviour of each role's suite (F4 in the map).
- Whether each written workflow matches how a practitioner really works: they are the engineering's reading of the job, to be corrected in the practitioner runs.
- Surfaces outside the Production tab were listed, not audited: the editor, Library, Sound, Pitch and Share each need their own pass against their role.

## Next, ranked (BACKLOG 3.51)

1. **Thin roles first** (a role that cannot work at all fails the Reveal Gate): ~~a performer's own surface~~ (built 2026-11-15: My calls and Your pages) ~~and the client / outside view~~ (**built 2026-11-15**: a review link per audience, enforced by the database; left: approval tied to a picture cut, an investor deck or budget summary, a screening link, the press kit inside the link, M).
2. **X7 and the missing formats** (YouTube and prose): the owner decides which lanes are in the first claim; each format is M.
3. **X2 and X4:** carry a director's change to the departments it touches; package the shoot for the editor as one handoff (M each).
4. ~~The director's day at a glance~~ (**built 2026-11-15**: a card on Your day for a Direction craft) and ~~the script supervisor's lined script and takes~~ (**built 2026-11-15**, R12).
5. **A practitioner run per Tier 1 role** against these suites: the only thing that turns "Built" into "complete".
