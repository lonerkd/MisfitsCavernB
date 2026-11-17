# The Cavern — Backlog

> **This is the index, generated** from [BACKLOG-detail.md](BACKLOG-detail.md) by `npm run sync-intel`: edit the detail file, never this one.
> Every session loads this page, so each item here is its first sentence, its plan link and its "Done when". The history, what was
> built and what is left are in the detail file under the same number: **read that item there when you pick it, and update it there.**

Every open task and planned pass, scoped. **This is the one list** — when work
is found and not done, it goes here (not only in a session note); when it's
done, delete it here and record it in `STATE.md`'s latest session. `STATE.md`
carries the short version ("Open work") and is injected into every session.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.
Last audited: 2026-10-06 (each item checked against the code, production, the
advisors and every screen that day — `bible/audit-2026-10-06.md`).

---

## 1. For the owner (outside the code)

- **Supabase usage** — the dashboard says the free-plan grace period is over
  (Organization › Usage: which line is over — likely egress or Realtime; the
  database, storage and request counts are well inside). Decide: trim it, or
  move to Pro (also brings daily backups).
- **Vercel usage** — the Hobby free tier caps Deployment Storage at 10 GB and
  deployments at 100/day; the multi-agent workflow (every branch push is a
  preview deployment) hit both on 2026-11-09, Vercel paused the project, and
  production was left 10 commits behind `main` (fixed 2026-11-11 — the session
  note). Decide: cut deployment volume (fewer pushes per PR; a broader
  `ignoreCommand` in `vercel.json`, which today inspects only the tip commit),
  or move to Pro.
- **GitGuardian**: mark the two open incidents false positives (test fixtures); delete the two throwaway e2e accounts in production (Authentication › Users).
- **Email sender** — a custom SMTP provider (Resend, Postmark…) in Supabase ›
  Auth › SMTP, on a domain you own, before strangers sign up (3.15).
- **Password reset needs the redirect allowed** (3.4 shipped) — Supabase dashboard › Auth › URL Configuration: add `https://<production domain>/auth/reset` (and each Vercel preview you test on) to the Redirect URLs, or reset links land on the Site URL instead. Then send yourself one reset email on production to check it, and the custom SMTP sender (below) before strangers use it.
- **Lawyer review** of `/privacy` and `/terms` (`lib/legal/legal.ts` names the operator).
- **Optional — branch protection on `main`** with `checks` and `database`
  required. (`e2e-local` is now a nightly scheduled check, not a PR gate.)
  Branch protection turns on GitHub auto-merge, so a green PR merges itself
  instead of waiting for a session to notice.
- **Leaked-password protection** — Supabase dashboard › Auth › Passwords.
  Still flagged by the security advisor (`auth_leaked_password_protection`).
- **Stashes**: the cloud container's ("legal") is dropped — every line was
  already on `main` (re-checked 2026-10-06). **Old stashes on the Windows machine** (the one that made the island
  branch): `stash@{1}` and `stash@{2}`, from June–July, predate the rewrites
  and were never reconciled. Look at each (`git stash show -p stash@{n}`);
  anything not on `main` goes into a branch, then drop them. (The cloud
  container's only stash, "legal", is fully on `main` — checked line by line.)
- **Stale remote branches**: 17 of the 18 deleted 2026-10-06 (tips matched; restore with `git push origin <sha>:refs/heads/<name>` from the list in git history of this file). `claude/design-scales` stays — it now carries PR #137 (data access through `lib/`, the sign-in fix).

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.42 Information architecture and the sound desk — L (owner, 2026-11-07)
In short: the editor's right rail becomes four sections (Scene, Sound, Script, Notes) instead of seven tabs; the table read and a Spotify-to-script desk (synced with what is already playing anywhere, tags per scene) move into **Sound**; the global player drops its "Audio Engine"… Plan: [plans/2026-11-07-information-architecture-and-sound.md](plans/2026-11-07-information-architecture-and-sound.md). **Done when each step in the plan holds with a test and the owner has used it.**

### 3.44 The portfolio — an audit and an upgrade — L (owner, 2026-11-08: "the next major upgrade needed")
Found: every portfolio is headed with a hardcoded "The Cavern Collection" and a generic blurb; pieces have no cover images; media is typed URLs; there is no person-level public page; the portfolio tables are readable by anyone by direct query, so the share token protects… Plan: [plans/2026-11-08-portfolio-upgrade.md](plans/2026-11-08-portfolio-upgrade.md). **Done when a person's portfolio is theirs (name, bio, reel, covers), private until published, shareable by link, and the database, not the token, decides who can read each piece.**

### 3.45 Print and export, one kit for the whole suite — L (owner, 2026-11-08)
Owner: "almost all tools and the stuff built into the suite needs to be easily exported for print in an intuitive, gorgeous file." **Built 2026-11-08:** the print kit (`lib/print/`, `conventions.md` §6a) and the portfolio one-sheet on it (a "One-sheet (print or PDF)" button on a… **Done when each tool prints through the kit with a look at its printed page, and no tool builds its own print HTML.**

### 3.47 Every tool at the project page's level, and the project in two panes — L (owner, 2026-11-09)
The owner: every tool designed at least as well as the project page (a tool header with progress and a next step, bricks, the one card), and the split screen made automatic: the project as a dual page by default. Plan: [plans/2026-11-09-project-in-two-panes.md](plans/2026-11-09-project-in-two-panes.md). **Done when each tool matches the project page and the owner has used the pair.**

### 3.48 Frosted mode for every theme — M (owner, 2026-11-09: "Slate's glass mode is sexy, might gotta make a frosted mode for each of them")
The owner likes how Slate's surfaces read as glass (the island's translucent bar over the page) and wants that as a **mode on every theme**, not a theme of its own. **Done when every theme has a frosted mode that passes the scan, the choice follows the account, and the owner has used it.**

### 3.49 The Reveal Gate: a stealth launch behind a written checklist — M (owner, 2026-11-12)
**Left:** the owner decides which audiences are in the reveal (a YouTube and a blog script format do not exist yet, M each), picks the 3-5 testers, and each gate line is made measurable (a script that prints the gate's status is a possible S). Plan: [plans/2026-11-13-reveal-gate.md](plans/2026-11-13-reveal-gate.md). **Done when every line of the gate is green and the owner has set the date.**

### 3.50 The role model: from Sam, Jordan and Riley to every role on a production — L (owner, 2026-11-13)
Today there are three access tiers (`lead`, `contributor`, `viewer`) and the craft is only on the profile, so a sound mixer and a producer have the same rights and every member reads every budget and casting row. Plan: [plans/2026-11-13-role-model.md](plans/2026-11-13-role-model.md). **Done when each role family has a persona test, an invite that says in words what the person will see, and no member reads another department's money or casting by default.**

### 3.51 Role suites: close the gaps the audit found — L (owner, 2026-11-15: "each role's full suite built, well made and interconnected")
The audit plans/2026-11-15-role-suites-audit.md (code-evidenced; nobody has run the practitioner protocol) found a working suite for every craft, ten roles that held a permission without its tool (fixed), and these gaps, **ranked**: **(1) the two Thin roles** (a role that cannot… Plan: [plans/2026-11-15-role-suites-audit.md](plans/2026-11-15-role-suites-audit.md). **Done when every Tier 1 and Tier 2 role has a suite with no Thin or Missing row in the audit and has passed a practitioner run.**

### 3.46 UX audit findings, not yet fixed — S each (Hermes audit, 2026-11-08)
Colours fixed 2026-11-08: the editor's checkboxes, the Insert link, the revision caret and the writing-goal bar used a hard-coded blue (`#0099ff`) and now use the theme's accent (`var(--accent)`). **Done when that look is done.**

### 3.43 The Cavern experience — an explorable cave that listens — M/L (owner, 2026-11-08)
**Built 2026-11-08 (steps 1–2):** a stick-figure ninja with a lantern runs through seeded, varied dark caves; arrows / WASD / a held pointer steer, idle for 6 s and it explores on its own; the cave follows the player (seed from the song, the cover's colour, a stroll when… Plan: [plans/2026-11-08-the-cavern-experience.md](plans/2026-11-08-the-cavern-experience.md). **Done when the owner has flown it, left it idle and watched the autopilot, and the cave says honestly which sync level it is running at.**

### 3.41 The phone experience (iPhone 15 Pro, both orientations) — L (owner, 2026-11-07)
**Built 2026-11-07:** the phone hook (`usePhoneLayout`: phone, landscape, keyboard, offset), the bottom sheet, and the editor on a phone (a slim bar with four doors, sheets for scripts/scenes, view, tools and more, an element strip over the keyboard, landscape typing, the island… Plan: [plans/2026-11-07-phone-experience.md](plans/2026-11-07-phone-experience.md). **Done when each surface passes the audit in both orientations and the owner has used it on the phone.**

### 3.36 Community — one page for Today, the Hub, the Lounge, crew discovery and the front door — S (owner, 2026-11-03)
**Built:** the hub feed's tab and audience are in the URL (`?kind=`, `?audience=`) and the lower sections load when they near the screen (`WhenNear`, 2026-11-03); `/community` with Your day (incl. Plan: [plans/2026-11-03-community-page.md](plans/2026-11-03-community-page.md). **Done when those hold.**

### 3.35 Paper as the default: what the walk did not cover — S (owner, 2026-11-03)
Paper became the default theme and every screen was walked in it (2026-11-03: all 48 screens photographed by eye on desktop; `npm run theme:scan` over 29 routes, desktop and phone, found and fixed the Jobs role pills and rates, the admin role badge and audit-log links, the… **Done when those hold.**

### 3.38 The 26 production tools: what review found and is left — M (found 2026-11-07, PR #427)
**Done 2026-11-07 (the #427 clean-up):** one `useSettingsList` hook replaces the 16 copies (typed key, no `as any`, an error toast on a failed save, a confirmed delete, no double submit); every view shows its Add form on an empty project (a test for all 16); Script revisions… **Done when a crew role can save its own tool's records, and each of (2)–(5) holds with a test.**

### 3.37 One shared e2e helper, and no test accounts in production's numbers — S/M (owner, 2026-11-03)
**Built 2026-11-15:** `e2e/support/stack.ts` — a Playwright fixture (`stack`, worker-scoped, so it works in `beforeAll`) that picks the backend (the local stack from `npx supabase status` with `E2E_LOCAL_STACK=1`; staging when `E2E_SUPABASE_URL`, `E2E_SUPABASE_SERVICE_KEY` and… **Done when every spec uses the helper, a spec has run against staging, and production's totals stay accurate after a QA run.**

### 3.39 The 2026-11-07 audit: fix what it found, in order — M/L (owner request, 2026-11-07)
The owner asked for a review of everything built 3–7 November for poor execution and fakes (much was done through a weaker model). **Done when each High and Medium finding in the audit has a fix, a test, or a recorded owner decision.**

### 3.40 Governance that cannot go stale — M (owner request, 2026-11-07)
**Built:** the `gate` workflow and the lint ratchet; the head-SHA-bound `claude-review` status (`tools-and-access.md` §9); it has run once (a low-risk PR: "not required") and must still be seen on a high-risk PR before it is made required. **Done when a PR that skips tests, docs, review or a contrast check cannot merge, whoever opened it.**

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
~~`dompurify` ≤ 3.4.16 through `jspdf`~~ (fixed 2026-11-08: the lockfile's `dompurify` is 3.4.17, inside jspdf's `^3.3.1` range; `npm audit --omit=dev` reports 0). **Done when `npm audit` reports 0.**

### 3.33 Conflict-free co-writing (ADR 0008) — M/L (accepted by the owner, 2026-10-14)
**What**: a Yjs `Y.Text` for the script, synced over the existing `script_${id}` Supabase Realtime channel as the transport (no new WebSocket server); `scripts.content` stays the persisted truth; presence and cursors stay as they are. **Done when each holds with a test.**

### 3.34 Agent workflows: switch on the worker and the autopilot — S (owner, 2026-10-27)
**Update 2026-10-27:** the owner chose Copilot as the worker and set `CLAUDE_CODE_OAUTH_TOKEN`, so the `agent-ready` label also runs the Claude worker. Plan: [plans/2026-11-11-nightly-review.md](plans/2026-11-11-nightly-review.md). **Done when an issue labelled `agent-ready` becomes a green PR without anyone typing a prompt, and a night's review is fixed by the next night.**

### 3.18 Film graph — what's left after steps 1–3 — L (owner: the editor gets cut over)
Done: days and places (1), characters and sides (2), story time and continuity (3). Plan: [plans/2026-10-27-graph-cutover-audit.md](plans/2026-10-27-graph-cutover-audit.md). **Done when nothing reads `scenes.cast_list`, `scenes.location` or `character_name` and the old columns are gone.**

### 3.32 Ad writing and copywriting — a format and an editor — L (owner, 2026-10-27: "probably the main one")
**Built 2026-10-27:** the `Advertising` and `Copywriting` formats, client review links and numbered versions; script-backed deliverables (30/15/6 s spots, radio, posters, banners, headlines, social and other), project-scoped RLS and cards; the `copy` format with two-column… Plan: [plans/2026-10-27-ad-and-copy.md](plans/2026-10-27-ad-and-copy.md).

### 3.20 The classifier and the importer — what is still wrong — S (found 2026-10-11; B2, B3, B5, B6 fixed the rest)
Still pinned as an expected-failure test: `lib/scriptos/parser-gaps.test.ts` (1).

### 3.21 The deep brain — the script engine, rung by rung — XL (owner direction, 2026-10-12)
A layered, deterministic, explainable reading engine: lossless Fountain first, then evidence, a document profile, a whole-document decoder, the suite's context as priors, and memory of corrections; the importers rebuilt on the same engine. Plan: [plans/2026-10-12-the-deep-brain.md](plans/2026-10-12-the-deep-brain.md). **Done when the corpus matrix's weakest cell is above 0.9 on text, PDF and blank-free, and a private real-script corpus agrees.**

### 3.22 The reader's context: places, the previous draft — M (B7 follow-ups; rejections shipped in B8)
(a) **Done (B8):** a stored per-project "not a character" / "is a character" list (`reading_corrections`), a "Not a character" action in the Character Bible with a way back, obeyed by the editor and the Studio. **Done when a rejected name survives a reload and both surfaces agree on the scene index.**

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Owner decision (2026-10-06): an installable phone app, on iOS for sure. **Done when The Cavern installs on an iPhone, opens without browser chrome, works offline on set, and a call sheet issued on the desk arrives as a notification on the phone.**

### 3.14 Admin catalogues and moderation — M (product call)
**Moderation, first slice built:** anyone signed in can **Report** a Lounge message, a job or a profile (a flag, a reason, one report per person per thing); admins work `/admin/reports` (open / resolved / dismissed, a link to the thing, who reported). **Done when the owner can add a craft without a deploy, and a report reaches the queue.**

### 3.15 Email — M
Notifications are in-app only; auth mail uses Supabase's default sender (low hourly limit). **Done when a call sheet issue emails the crew who opted in (e2e with the local mail catcher).**

### 3.16 Launch-grade repository practice — S each, start now
The owner will open a new repository at launch and wants it to stand up to investor and acquirer due diligence (`restructure-proposal.md` › *Launch repository*). **Done when each is in place and CI enforces the commit and coverage rules.**

---

## 4. Wishlist (owner, 2026-10-07) — ranked and scoped in [wishlist-ranking.md](wishlist-ranking.md)

**Order (2026-10-10, owner: most impressive and impactful first):** island live activities (4.1) → money (4.6) → comparing versions (4.12) → industry interchange (4.9/4.10) → characters (4.8) → mood boards (4.5) → editor navigation (4.7) → casting (4.15) → offline (4.13) → world building (4.11); blocked on an outside service or decision: AI voices (4.14), translation (4.3), Discord (4.2), learning (4.4). Slices, schema and "done when" for each are in the ranking file; a slice moves into §3 when it starts.

The owner's feature list, grouped by area and checked against the code that
day. **Built** = already in the suite (where, so nobody rebuilds it).
Everything else is an idea: before one is started it gets a scoped 3.x entry
(size, data, RLS, "done when"). The house rules still apply — nothing ships
as a mock: anything that needs an outside service (voices, translation, a
Discord bot, Pinterest/Google import, AI suggestions) waits until that
service is chosen and paid for.

### 4.1 The island: live activities
The island already has modes (`lib/island/mode.ts`: rest, context, live, open, caps, dot) and `emit()`s brief events (saved, synced, joined). Plan: [plans/2026-11-02-island-at-every-size.md](plans/2026-11-02-island-at-every-size.md). **Done when a narrow desktop window has the island, the phone pill has activities and the command layer, and every tool's ten fast-path actions are reachable by key, pointer and touch.**

### 4.2 Discord
**Built**: Discord sign-in (`app/(suite)/auth`, `signInWithOAuth({ provider: 'discord' })`; name and avatar from the identity in `app/(suite)/auth/callback`); posting a channel's messages to a Discord webhook (`/api/discord/notify`, `/test`).

### 4.3 Translation and localisation
Translate a script into 50+ languages (a translation service), side by side with the original, formatting kept (translate dialogue and action, never element types); translation memory and a per-project glossary; translator comments, review/approval and credits; version sync…

### 4.4 Learning
**Built**: in-app guides by workflow and experience (`lib/guides`, `GuidePanel`, `GuideSetup`); the writing loop's streaks, sprints and badges (`lib/writing`).

### 4.5 Mood boards
**Built**: the Studio Library (uploads incl.

### 4.6 Budget and money
**Built**: budget lines and actuals (project page, Studio › Money), vendors, expenses committed/paid with receipts from the library, timesheets, breakdown costs and per-category rates → "Push to budget" (`Breakdown · …` lines).

### 4.7 Editor: navigation and power editing
**Built**: scene list and outline (jump to a scene), search (Ctrl/⌘ K), the stash (snippets beside the script, now also **Alt + S** on a selection), autocomplete for characters and headings.

### 4.8 Characters
**Built**: the character bible (description, backstory, motivation, arc, notes — `script_characters`, `script_metadata.character_bible`), a look-board per character, casting with each character's scene footprint, dialogue and scene counts (editor › Stats).

### 4.9 Script formats, import and export
**Built**: import PDF, FDX, Fountain, text; export PDF (title page, watermark), FDX, Fountain, text; dual dialogue; scene numbers; revision colours (blue … cherry, `REVISION_COLORS`) with locked drafts; MORE/CONT'D on export; formats by project type.

### 4.10 Breakdown and scheduling
**Built**: tagging (with suggestions from past projects), categories and rates, per-scene sheets, page eighths, scene duration, Day/Night and INT/EXT, stripboard with auto-schedule and company moves, Day out of days, call sheets, readiness, printable sheets, push to budget.

### 4.11 World building and locations
**Built**: Locations (status, permit, address, contact, cost, notes; scenes link by name); scene references.

### 4.12 Comparing versions
**Built**: locked revisions with coloured changed pages and a diff view (`lib/scriptos/revisions.ts`).

### 4.13 Offline and installable
**Built**: the editor saves to IndexedDB first and syncs (retry, on reconnect, tombstones for offline deletes), a conflict prompt (keep mine / take theirs), sync state in its header, and (2026-10-18) a status-bar chip for the script queue — pending scripts and deletes, network,…

### 4.14 Table read with AI voices
**Built**: the browser's voices, one per character, the script highlighted as it reads, scene timings saved.

### 4.15 Casting
**Built**: casting per character with its scene footprint (`character_castings`, Studio › Cast & crew); casting calls posted as jobs (accepting an applicant casts them); each character's look-board.

### 3.24 Voice rooms beyond eight — an SFU — L (found 2026-10-18)
A voice room is a full mesh and now refuses a 9th person (`lib/webrtc/mesh.ts`: toast + "room is full"). **Done when a 12-person room works, or the cap is raised on purpose, and a two-browser spec covers the 9th joiner.**

### 3.23 Owner's workflow: View as everywhere, announcements, an owner dashboard — M (owner request, 2026-10-12)
**View as** exists for the hub, the Studio, the Lounge and the call-sheet page (`lib/os/viewAs.ts`). **Done when each is in the suite and covered by a persona spec.**

### 3.28 The Lounge overhaul and the platform hub — L (owner, 2026-10-25)
A full redesign of the Lounge plus a platform-wide hub: *What's new*, *Learn*, *Status* (incidents), *Case studies*, *Help* (support cases). Plan: [plans/2026-10-25-lounge-overhaul.md](plans/2026-10-25-lounge-overhaul.md). **Done when every slice's done-when holds.**

### 3.25 Story interview — a guided path from idea to skeleton — S left (owner idea, 2026-10-20)
A stored, resumable interview that builds the story's skeleton before dialogue is written and teaches the craft as it goes. **Done when a first-time user can answer it and land in the editor with a scene skeleton that persists, and a reload resumes mid-interview (the e2e spec holds this).**

### 3.26 Story-structure templates — S/M (owner idea, 2026-10-20)
Selectable structures to lay a skeleton over: three-act, five-act (Freytag), the hero's journey, the story circle, a seven-point outline, a beat sheet, and a free "none". **Done when a template can be chosen, applied, and reported on, and the beats it creates survive a reload.**

### 3.27 Open core: the license and the free / paid boundary — M (owner decision; lawyer review)
The repository is already public (license: proprietary `LICENSE`, all rights reserved). **Done when the license is chosen and committed, a free account hits a real plan limit through the entitlements layer (persona-tested), and the publication checklist is clean.**
