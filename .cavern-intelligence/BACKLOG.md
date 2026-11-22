# The Cavern — Backlog (index)

**Generated** from [`backlog-detail.md`](backlog-detail.md) by `scripts/backlog-index.mjs` (run by `npm run sync-intel`; CI fails if it is stale). Never edit this file: change an item in `backlog-detail.md`, then run `npm run sync-intel`. This index is what every session loads; **when you pick an item, read its full text in `backlog-detail.md` first** (search for its number).

Every open task and planned pass, scoped. **This is the one list** — when work is found and not done, it goes in the detail file (not only in a session note); when it's done, delete it there and record it in a session note.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.

---

## 1. For the owner (outside the code)

- **Supabase usage** — the dashboard says the free-plan grace period is over
  (Organization › Usage: which line is over — likely egress or Realtime; the
  database, storage and request counts are well inside). Decide: trim it, or
  move to Pro (also brings daily backups).
- **Vercel usage** — the Hobby free tier caps Deployment Storage at 10 GB and
  deployments at 100/day; the multi-agent workflow (every branch push is a
  preview deployment) hit both on 2026-11-09 and the daily cap again on
  2026-11-18. **Decided 2026-11-18 (owner): cut deployment volume.** Built:
  `scripts/vercel-ignore.sh` (the `ignoreCommand`) builds only when a file that
  goes into the app changed since the branch's last deployment, never for
  tests, e2e, migrations, dev scripts, docs or dependency-bot branches; the
  habit stays: one push per PR, update a branch only right before it merges.
  Pro stays open if that is still not enough.
- **GitGuardian**: mark the two open incidents false positives (test fixtures); delete the two throwaway e2e accounts in production (Authentication › Users).
- **Email sender** — a custom SMTP provider (Resend, Postmark…) in Supabase ›
  Auth › SMTP, on a domain you own, before strangers sign up (3.15).
- **Password reset needs the redirect allowed** (3.4 shipped) — Supabase dashboard › Auth › URL Configuration: add `https://<production domain>/auth/reset` (and each Vercel preview you test on) to the Redirect URLs, or reset links land on the Site URL instead. Then send yourself one reset email on production to check it, and the custom SMTP sender (below) before strangers use it.
- **Lawyer review** of `/privacy` and `/terms` (`lib/legal/legal.ts` names the operator).
- **Make `mobile-audit` a required check** (GitHub › Settings › Rules) once it has run green on a few real pull requests (2026-11-18: it now also runs the page-error spec and the Paper theme scan, which found real defects); and `claude-review` is still not required, so a "high-risk" label cannot stop a merge (RULES 11 asks for an independent review instead). Only you can change the ruleset.
- **Optional — branch protection on `main`** with `checks` and `database`
  required. (`e2e-local` is now a nightly scheduled check, not a PR gate.)
  Branch protection turns on GitHub auto-merge, so a green PR merges itself
  instead of waiting for a session to notice.
- **Leaked-password protection** — Supabase dashboard › Auth › Passwords.
  Still flagged by the security advisor (`auth_leaked_password_protection`).
- **Stashes**: the cloud container's ("legal") is dropped (every line was on `main`). **Old stashes on the Windows machine** (the one that made the island branch): `stash@{1}` and `stash@{2}`, from June–July, predate the rewrites and were never reconciled. Not reachable from a cloud session (checked 2026-11-18: no computer folder is attached): look at each there (`git stash show -p stash@{n}`); anything not on `main` goes into a branch, then drop them.
- **Stale remote branches** (checked 2026-11-18 against PR state and `git cherry`; a cloud session cannot delete branches, both the API and git return 403, so these are yours): **safe to delete**, their changes are on `main` or superseded: `claude/backlog-index` (96c5dc9c), `claude/governance-budget` (cdfdc6ac; its one idea, counting more workflow files as prose in `ci.yml`'s `changes` job, was not ported on purpose), `claude/rules-merge` (a858cd87): `git push origin --delete claude/backlog-index claude/governance-budget claude/rules-merge`, or the Branches page. **Not to delete:** `cavern-offline` (37 commits of your own from 2026-10-15, "the open-source, local-first cut": decide what it is), `claude/tool-breadth` (closed today by another session with commits that may not be on `main`), and the branches of open PRs. `claude/design-scales` is gone.

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.42 Information architecture and the sound desk — L (owner, 2026-11-07)
Plan, inventory and order of work: [plans/2026-11-07-information-architecture-and-sound.md](plans/2026-11-07-information-architecture-and-sound.md). _(full text: `backlog-detail.md`, 3.42)_

### 3.44 The portfolio — an audit and an upgrade — L (owner, 2026-11-08: "the next major upgrade needed")
Plan and audit: [plans/2026-11-08-portfolio-upgrade.md](plans/2026-11-08-portfolio-upgrade.md) (sketched 2026-11-08, nothing built). _(full text: `backlog-detail.md`, 3.44)_

### 3.45 Print and export, one kit for the whole suite — L (owner, 2026-11-08)
Owner: "almost all tools and the stuff built into the suite needs to be easily exported for print in an intuitive, gorgeous file." **Built 2026-11-08:** the print kit (`lib/print/`, `conventions.md` §6a) and the portfolio one-sheet on it (a "One-sheet… _(full text: `backlog-detail.md`, 3.45)_

### 3.47 Every tool at the project page's level, and the project in two panes — L (owner, 2026-11-09)
Plan: [plans/2026-11-09-project-in-two-panes.md](plans/2026-11-09-project-in-two-panes.md). _(full text: `backlog-detail.md`, 3.47)_

### 3.48 Frosted mode for every theme — M (owner, 2026-11-09: "Slate's glass mode is sexy, might gotta make a frosted mode for each of them")
The owner likes how Slate's surfaces read as glass (the island's translucent bar over the page) and wants that as a **mode on every theme**, not a theme of its own. _(full text: `backlog-detail.md`, 3.48)_

### 3.49 The Reveal Gate: a stealth launch behind a written checklist — M (owner, 2026-11-12)
Plan, the eight-line gate and the audience matrix: [plans/2026-11-13-reveal-gate.md](plans/2026-11-13-reveal-gate.md). _(full text: `backlog-detail.md`, 3.49)_

### 3.50 The role model: from Sam, Jordan and Riley to every role on a production — L (owner, 2026-11-13)
Plan: [plans/2026-11-13-role-model.md](plans/2026-11-13-role-model.md) (designed 2026-11-13; step 1 built the same day; the owner's first message was cut off, so confirm the intent). _(full text: `backlog-detail.md`, 3.50)_

### 3.51 Role suites: close the gaps the audit found — L (owner, 2026-11-15: "each role's full suite built, well made and interconnected")
The audit [plans/2026-11-15-role-suites-audit.md](plans/2026-11-15-role-suites-audit.md) (code-evidenced; nobody has run the practitioner protocol) found a working suite for every craft, ten roles that held a permission without its tool (fixed), and these… _(full text: `backlog-detail.md`, 3.51)_

### 3.52 Phase requirements, by role and for the project — M/L (owner, 2026-11-21: "what each role and the project need to actually and accurately advance, with real assets")
<<<<<<< HEAD **Built 2026-11-21:** (1) the lock screen (`LockedTool`): what is left before the tool's phase, each step with its hint, progress, who usually does it (`MILESTONE_ROLES`, crafts from the role model, test-guarded), a *Go* to where it is done,… _(full text: `backlog-detail.md`, 3.52)_

### 3.46 UX audit findings, not yet fixed — S each (Hermes audit, 2026-11-08)
Colours fixed 2026-11-08: the editor's checkboxes, the Insert link, the revision caret and the writing-goal bar used a hard-coded blue (`#0099ff`) and now use the theme's accent (`var(--accent)`). _(full text: `backlog-detail.md`, 3.46)_

### 3.43 The Cavern experience — an explorable cave that listens — M/L (owner, 2026-11-08)
Plan: [plans/2026-11-08-the-cavern-experience.md](plans/2026-11-08-the-cavern-experience.md). _(full text: `backlog-detail.md`, 3.43)_

### 3.41 The phone experience (iPhone 15 Pro, both orientations) — L (owner, 2026-11-07)
Plan, audit and rules: [plans/2026-11-07-phone-experience.md](plans/2026-11-07-phone-experience.md). _(full text: `backlog-detail.md`, 3.41)_

### 3.36 Community — one page for Today, the Hub, the Lounge, crew discovery and the front door — S (owner, 2026-11-03)
Plan: [plans/2026-11-03-community-page.md](plans/2026-11-03-community-page.md). _(full text: `backlog-detail.md`, 3.36)_

### 3.35 Paper as the default: what the walk did not cover — S (owner, 2026-11-03)
Paper became the default theme and every screen was walked in it (2026-11-03: all 48 screens photographed by eye on desktop; `npm run theme:scan` over 29 routes, desktop and phone, found and fixed the Jobs role pills and rates, the admin role badge and… _(full text: `backlog-detail.md`, 3.35)_

### 3.38 The 26 production tools: what review found and is left — M (found 2026-11-07, PR #427)
**Done 2026-11-07 (the #427 clean-up):** one `useSettingsList` hook replaces the 16 copies (typed key, no `as any`, an error toast on a failed save, a confirmed delete, no double submit); every view shows its Add form on an empty project (a test for all… _(full text: `backlog-detail.md`, 3.38)_

### 3.37 One shared e2e helper, and no test accounts in production's numbers — S/M (owner, 2026-11-03)
**Built 2026-11-15:** `e2e/support/stack.ts` — a Playwright fixture (`stack`, worker-scoped, so it works in `beforeAll`) that picks the backend (the local stack from `npx supabase status` with `E2E_LOCAL_STACK=1`; staging when `E2E_SUPABASE_URL`,… _(full text: `backlog-detail.md`, 3.37)_

### 3.39 The 2026-11-07 audit: fix what it found, in order — M/L (owner request, 2026-11-07)
The owner asked for a review of everything built 3–7 November for poor execution and fakes (much was done through a weaker model). _(full text: `backlog-detail.md`, 3.39)_

### 3.40 Governance that cannot go stale — M (owner request, 2026-11-07)
**Built:** the `gate` workflow and the lint ratchet; the head-SHA-bound `claude-review` status (`tools-and-access.md` §9); it has run once (a low-risk PR: "not required") and must still be seen on a high-risk PR before it is made required. _(full text: `backlog-detail.md`, 3.40)_

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
~~`dompurify` ≤ 3.4.16 through `jspdf`~~ (fixed 2026-11-08: the lockfile's `dompurify` is 3.4.17, inside jspdf's `^3.3.1` range; `npm audit --omit=dev` reports 0). _(full text: `backlog-detail.md`, 3.1)_

### 3.33 Conflict-free co-writing (ADR 0008) — M/L (accepted by the owner, 2026-10-14)
**What**: a Yjs `Y.Text` for the script, synced over the existing `script_${id}` Supabase Realtime channel as the transport (no new WebSocket server); `scripts.content` stays the persisted truth; presence and cursors stay as they are. _(full text: `backlog-detail.md`, 3.33)_

### 3.34 Agent workflows: switch on the worker and the autopilot — S (owner, 2026-10-27)
**Update 2026-10-27:** the owner chose Copilot as the worker and set `CLAUDE_CODE_OAUTH_TOKEN`, so the `agent-ready` label also runs the Claude worker. _(full text: `backlog-detail.md`, 3.34)_

### 3.18 Film graph — what's left after steps 1–3 — L (owner: the editor gets cut over)
Done: days and places (1), characters and sides (2), story time and continuity (3). _(full text: `backlog-detail.md`, 3.18)_

### 3.32 Ad writing and copywriting — a format and an editor — L (owner, 2026-10-27: "probably the main one")
**Built 2026-10-27:** the `Advertising` and `Copywriting` formats, client review links and numbered versions; script-backed deliverables (30/15/6 s spots, radio, posters, banners, headlines, social and other), project-scoped RLS and cards; the `copy`… _(full text: `backlog-detail.md`, 3.32)_

### 3.20 The classifier and the importer — what is still wrong — S (found 2026-10-11; B2, B3, B5, B6 fixed the rest)
No classifier gap is pinned any more (`lib/scriptos/parser-gaps.test.ts` holds regression cases only; its last `it.fails` was fixed, checked 2026-11-22). 1. _(full text: `backlog-detail.md`, 3.20)_

### 3.21 The deep brain — the script engine, rung by rung — XL (owner direction, 2026-10-12)
A layered, deterministic, explainable reading engine: lossless Fountain first, then evidence, a document profile, a whole-document decoder, the suite's context as priors, and memory of corrections; the importers rebuilt on the same engine. _(full text: `backlog-detail.md`, 3.21)_

### 3.22 The reader's context: places, the previous draft — M (B7 follow-ups; rejections shipped in B8)
(a) **Done (B8):** a stored per-project "not a character" / "is a character" list (`reading_corrections`), a "Not a character" action in the Character Bible with a way back, obeyed by the editor and the Studio. _(full text: `backlog-detail.md`, 3.22)_

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Owner decision (2026-10-06): an installable phone app, on iOS for sure. _(full text: `backlog-detail.md`, 3.13)_

### 3.14 Admin catalogues and moderation — M (product call)
**Moderation, first slice built:** anyone signed in can **Report** a Lounge message, a job or a profile (a flag, a reason, one report per person per thing); admins work `/admin/reports` (open / resolved / dismissed, a link to the thing, who reported). _(full text: `backlog-detail.md`, 3.14)_

### 3.15 Email — M
Notifications are in-app only; auth mail uses Supabase's default sender (low hourly limit). _(full text: `backlog-detail.md`, 3.15)_

### 3.16 Launch-grade repository practice — S each, start now
The owner will open a new repository at launch and wants it to stand up to investor and acquirer due diligence (`restructure-proposal.md` › *Launch repository*). _(full text: `backlog-detail.md`, 3.16)_

## 4. Wishlist (owner, 2026-10-07) — ranked and scoped in [wishlist-ranking.md](wishlist-ranking.md)

### 4.1 The island: live activities
The island already has modes (`lib/island/mode.ts`: rest, context, live, open, caps, dot) and `emit()`s brief events (saved, synced, joined). _(full text: `backlog-detail.md`, 4.1)_

### 4.2 Discord
**Owner direction (brainstorm, 2026-11-22):** connecting a Discord account should make a **mirror** of the Lounge, and of whichever parts of the suite the person chooses to connect, for **persistent data sharing**, plus **project logging and management… _(full text: `backlog-detail.md`, 4.2)_

### 4.3 Translation and localisation
Nothing built. Translate a script into 50+ languages (a translation service), side by side with the original, formatting kept (translate dialogue and action, never element types); translation memory and a per-project glossary; translator comments,… _(full text: `backlog-detail.md`, 4.3)_

### 4.4 Learning
**Built**: in-app guides by workflow and experience (`lib/guides`, `GuidePanel`, `GuideSetup`); the writing loop's streaks, sprints and badges (`lib/writing`). _(full text: `backlog-detail.md`, 4.4)_

### 4.5 Mood boards
**Built**: the Studio Library (uploads incl. audio and video, YouTube/Vimeo links, Pinterest boards via `/api/links`, Openverse search with credit, boards); a look-board per character (`character_media`); scene references (`scene_media`, the editor's Refs… _(full text: `backlog-detail.md`, 4.5)_

### 4.6 Budget and money
**Built**: budget lines and actuals (project page, Studio › Money), vendors, expenses committed/paid with receipts from the library, timesheets, breakdown costs and per-category rates → "Push to budget" (`Breakdown · …` lines). _(full text: `backlog-detail.md`, 4.6)_

### 4.7 Editor: navigation and power editing
**Built**: scene list and outline (jump to a scene), search (Ctrl/⌘ K), the stash (snippets beside the script, now also **Alt + S** on a selection), autocomplete for characters and headings. _(full text: `backlog-detail.md`, 4.7)_

### 4.8 Characters
**Built**: the character bible (description, backstory, motivation, arc, notes — `script_characters`, `script_metadata.character_bible`), a look-board per character, casting with each character's scene footprint, dialogue and scene counts (editor › Stats). _(full text: `backlog-detail.md`, 4.8)_

### 4.9 Script formats, import and export
**Built**: import PDF, FDX, Fountain, text; export PDF (title page, watermark), FDX, Fountain, text; dual dialogue; scene numbers; revision colours (blue … cherry, `REVISION_COLORS`) with locked drafts; MORE/CONT'D on export; formats by project type. _(full text: `backlog-detail.md`, 4.9)_

### 4.10 Breakdown and scheduling
**Built**: tagging (with suggestions from past projects), categories and rates, per-scene sheets, page eighths, scene duration, Day/Night and INT/EXT, stripboard with auto-schedule and company moves, Day out of days, call sheets, readiness, printable… _(full text: `backlog-detail.md`, 4.10)_

### 4.11 World building and locations
**Resumed 2026-11-22 (PR 718):** the WIP is finished: appearances per place with a jump, unlisted places, the cross-place checks and a world bible print, with `e2e/world-locations.spec.ts` passing against the local stack. _(full text: `backlog-detail.md`, 4.11)_

### 4.12 Comparing versions
**Built**: locked revisions with coloured changed pages and a diff view (`lib/scriptos/revisions.ts`); **2026-11-21 (slice 1)**: Compare for any two versions (the locked revisions and the draft; A and B, swap), side by side and aligned by scene (stacked A… _(full text: `backlog-detail.md`, 4.12)_

### 4.13 Offline and installable
**Built**: the editor saves to IndexedDB first and syncs (retry, on reconnect, tombstones for offline deletes), a conflict prompt (keep mine / take theirs), sync state in its header, and (2026-10-18) a status-bar chip for the script queue — pending scripts… _(full text: `backlog-detail.md`, 4.13)_

### 4.14 Table read with AI voices
**Built**: the browser's voices, one per character, the script highlighted as it reads, scene timings saved. _(full text: `backlog-detail.md`, 4.14)_

### 4.15 Casting
**Candidates built 2026-11-22 (PR 719):** a shortlist per role (`casting_candidates`: name, status, reel link, note; `CandidateShortlist` on the Casting Board). _(full text: `backlog-detail.md`, 4.15)_

### 3.24 Voice rooms beyond eight — an SFU — RETIRED (owner, 2026-11-22: "we don't need rooms bigger than 8, for that we'll use the discord connection")
**Decision:** a voice room stays at eight people (the mesh, with its "room is full" message); nothing to build, no outside media service to buy. _(full text: `backlog-detail.md`, 3.24)_

### 3.23 Owner's workflow: View as everywhere, announcements, an owner dashboard — M (owner request, 2026-10-12)
**View as** exists for the hub, the Studio, the Lounge and the call-sheet page (`lib/os/viewAs.ts`). _(full text: `backlog-detail.md`, 3.23)_

### 3.28 The Lounge overhaul and the platform hub — L (owner, 2026-10-25)
A full redesign of the Lounge plus a platform-wide hub: *What's new*, *Learn*, *Status* (incidents), *Case studies*, *Help* (support cases). _(full text: `backlog-detail.md`, 3.28)_

### 3.25 Story interview — a guided path from idea to skeleton — S left (owner idea, 2026-10-20)
A stored, resumable interview that builds the story's skeleton before dialogue is written and teaches the craft as it goes. _(full text: `backlog-detail.md`, 3.25)_

### 3.26 Story-structure templates — S/M (owner idea, 2026-10-20)
Selectable structures to lay a skeleton over: three-act, five-act (Freytag), the hero's journey, the story circle, a seven-point outline, a beat sheet, and a free "none". _(full text: `backlog-detail.md`, 3.26)_

### 3.27 Open core: the license and the free / paid boundary — M (owner decision; lawyer review)
The repository is already public (license: proprietary `LICENSE`, all rights reserved). _(full text: `backlog-detail.md`, 3.27)_
