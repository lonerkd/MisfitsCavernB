# The Cavern — Backlog

Every open task and planned pass, scoped. **This is the one list** — when work
is found and not done, it goes here (not only in a session note); when it's
done, delete it here and record it in `STATE.md`'s latest session. `STATE.md`
carries the short version ("Open work") and is injected into every session.

Each item is one line: what it is, and what is left. The long per-item history
(what was built, step by step) lives in
[`backlog-detail.md`](backlog-detail.md), copied verbatim, so nothing is lost
and this list stays scannable.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.
Last audited: 2026-10-06 (each item checked against the code, production, the
advisors and every screen that day — `bible/audit-2026-10-06.md`).

---

## 1. For the owner (outside the code)

- **Supabase usage** — the dashboard says the free-plan grace period is over
  (Organization › Usage: which line is over — likely egress or Realtime; the
  database, storage and request counts are well inside). Decide: trim it, or
  move to Pro (also brings daily backups).
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
- **Vercel usage** — the Hobby free tier caps Deployment Storage at 10 GB and
  deployments at 100/day; the multi-agent workflow (every branch push is a
  preview deployment) hit both on 2026-11-09, Vercel paused the project, and
  production was left 10 commits behind `main` (fixed 2026-11-11 — the session
  note). Decide: cut deployment volume (fewer pushes per PR; a broader
  `ignoreCommand` in `vercel.json`, which today inspects only the tip commit),
  or move to Pro.

## 2. To verify

- **`e2e/onset-offline.spec.ts` on Windows with the older local Chromium
  (1228)**: after an offline reload the day stays on "Loading the schedule…".
  Same on plain `main`, passes in CI and in the cloud container. Check on a
  second Windows machine / a newer Chromium before treating it as a bug.

## 3. Upgrades (scoped — in suggested order)

### 3.42 Information architecture and the sound desk — L (owner, 2026-11-07)
The editor's right rail becomes four sections (Scene, Sound, Script, Notes); the table read and a Spotify-to-script desk move into Sound; the Studio's 36 production views get grouped and searchable. Plan: [plans/2026-11-07-information-architecture-and-sound.md](plans/2026-11-07-information-architecture-and-sound.md). Steps 1–3 built 2026-11-07 (Sound tab, remote Spotify playback, per-scene tags). **Left:** the rest of the plan. [History](backlog-detail.md)

### 3.44 The portfolio — an audit and an upgrade — L (owner, 2026-11-08: "the next major upgrade needed")
The person's page, covers, private-by-default sharing, credits and a directory. Plan: [plans/2026-11-08-portfolio-upgrade.md](plans/2026-11-08-portfolio-upgrade.md). Steps 1–6 built 2026-11-08 (migrations `20261108010000`–`20261108070000`). **Left:** the rest. [History](backlog-detail.md)

### 3.45 Print and export, one kit for the whole suite — L (owner, 2026-11-08)
One print kit (`lib/print/`, `conventions.md` §6a); a Print / PDF button on the record tools with a CSV beside it. Built 2026-11-08 (the kit + 21 tools). **Left (S each):** a branded PDF, a real QR scan, CSS margin boxes, the pages not yet rendered. [History](backlog-detail.md)

### 3.47 Every tool at the project page's level, and the project in two panes — L (owner, 2026-11-09)
Plan: [plans/2026-11-09-project-in-two-panes.md](plans/2026-11-09-project-in-two-panes.md). Slices 1–5 built 2026-11-09 (Two panes, `ToolHeader` on every Production view, `TabHeader`, the pane picker, `e2e/split.spec.ts`). **Left:** the rest. [History](backlog-detail.md)

### 3.48 Frosted mode for every theme — M (owner, 2026-11-09)
An orthogonal frosted (glass) mode over every theme, stored on the account. Steps 1–2 built 2026-11-09 (migration `20261109000000`, the token layer, the blur on the surfaces). **Left:** the rest. [History](backlog-detail.md)

### 3.46 UX audit findings, not yet fixed — S each (Hermes audit, 2026-11-08)
Seven findings from the Hermes audit. **Fixed 2026-11-08:** the hard-coded blue in the editor. **Left:** the footer's "Forgot password?" on a marketing page; the duplicated "by Misfits Cavern"; the "2 Creators" ticker; the marquee read twice; the auth heading identical for sign-in/up; the Production tab's 54 tools; the non-token status colours. [History](backlog-detail.md)

### 3.43 The Cavern experience — an explorable cave that listens — M/L (owner, 2026-11-08)
A layered, procedural cave you steer, synced to Spotify and (opt-in) real audio. Plan: [plans/2026-11-08-the-cavern-experience.md](plans/2026-11-08-the-cavern-experience.md). Steps 1–2 and 4–5 built 2026-11-08 (`/cavern`). **Left:** step 3 (the project's moods and the Scenes timeline), the tempo, remembered settings, the owner flying it. [History](backlog-detail.md)

### 3.41 The phone experience (iPhone 15 Pro, both orientations) — L (owner, 2026-11-07)
Plan: [plans/2026-11-07-phone-experience.md](plans/2026-11-07-phone-experience.md). Built 2026-11-07/08: the phone hook, the bottom sheet, touch rules for every page, the editor on a phone, the CI audit (`mobile-audit.yml`). **Left:** the keyboard-riding tab bar, a spec per surface at both sizes, a pass on the real iPhone. [History](backlog-detail.md)

### 3.36 Community — one page for Today, the Hub, the Lounge, crew discovery and the front door — S (owner, 2026-11-03)
Plan: [plans/2026-11-03-community-page.md](plans/2026-11-03-community-page.md). Built (`/community`, the hub feed, the redirects). **Left:** the phone pass, Home sharing `TheCavern`'s data, a calmer phone loading state, owner decisions, a persona spec. [History](backlog-detail.md)

### 3.35 Paper as the default: what the walk did not cover — S (owner, 2026-11-03)
Every screen walked in Paper; the theme scan found and fixed several. **Left:** walk the click-opened states (modals, menus, toasts, empty/error); scan the remaining dark presets; retake `bible/screens`. [History](backlog-detail.md)

### 3.38 The 26 production tools: what review found and is left — M (found 2026-11-07, PR #427)
The #427 clean-up (one `useSettingsList`, real storage per record) is built; `production_records` shipped (migration `20261108030000`). **Left:** a theme scan of the new views in Paper and Misfit; whether the editor's left bar is redesigned. [History](backlog-detail.md)

### 3.37 One shared e2e helper, and no test accounts in production's numbers — S/M (owner, 2026-11-03)
**Left:** build the shared e2e helper (local stack by default, staging when env vars are set, tracks what it creates); decide how QA accounts get flagged and delete the throwaway ones (§1). [History](backlog-detail.md)

### 3.39 The 2026-11-07 audit: fix what it found, in order — M/L (owner request, 2026-11-07)
Findings and order: [bible/audit-2026-11-07.md](bible/audit-2026-11-07.md). **Left:** each High and Medium finding needs a fix, a test, or a recorded owner decision. [History](backlog-detail.md)

### 3.40 Governance that cannot go stale — M (owner request, 2026-11-07)
Built: the `gate` workflow, the lint ratchet, the head-SHA-bound `claude-review`, branch protection on `main`. **Left:** make `claude-review` a required check once it has run green on a real PR. [History](backlog-detail.md)

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
**0** production vulnerabilities. **Left:** 7 high + 2 moderate, all in dev tools (`braces`, `postcss-selector-parser`); re-run `npm audit` when Tailwind or `eslint-config-next` release. [History](backlog-detail.md)

### 3.33 Conflict-free co-writing (ADR 0008) — M/L (accepted by the owner, 2026-10-14)
Yjs over the script Realtime channel; `scripts.content` stays canonical. E3 built (two browsers, offline merge). **Left (S each):** the garbled-merge investigation, broadcasting the merged update, chunking for the Realtime limit, a private channel policy. [History](backlog-detail.md)

### 3.34 Agent workflows: switch on the worker and the autopilot — S (owner, 2026-10-27)
Built: the opt-in Copilot autopilot and the risk tiers. **Left:** the owner runs `backlog-to-issues.mjs --create`, enables Copilot, then decides on the daily autopilot. [History](backlog-detail.md)

### 3.18 Film graph — what's left after steps 1–3 — L (owner: the editor gets cut over)
Steps 1–3 done; the cutover is in progress. **Left:** (a) the app reads `scene_characters` / `call_sheet_calls.character_id` (partly done) and shoot days by `shoot_day_id`; (b) continuity extras; (c) step 4 entities, links and mentions. [History](backlog-detail.md)

### 3.32 Ad writing and copywriting — a format and an editor — L (owner, 2026-10-27: "probably the main one")
Built: the Advertising/Copywriting formats, deliverables, the approval gate, the C4 export. Plan: [plans/2026-10-27-ad-and-copy.md](plans/2026-10-27-ad-and-copy.md). **Left (S):** a branded PDF, exporting a past review version, a non-Latin PDF font. [History](backlog-detail.md)

### 3.20 The classifier and the importer — what is still wrong — S (found 2026-10-11)
**Left:** real PDFs (needs the owner's scripts — synthetic pages only today); the expected-failure test `lib/scriptos/parser-gaps.test.ts`. [History](backlog-detail.md)

### 3.21 The deep brain — the script engine, rung by rung — XL (owner direction, 2026-10-12)
A layered, deterministic reading engine. Plan: [plans/2026-10-12-the-deep-brain.md](plans/2026-10-12-the-deep-brain.md). B0–B9 partly built (B4's profile, the blank-free script, title-case cues). **Left:** B4's rest, B7 (places and the previous draft), B8 (overrides and memory), B9 (confidence out to the suite). [History](backlog-detail.md)

### 3.22 The reader's context: places, the previous draft — M (B7 follow-ups; rejections shipped in B8)
**Left:** places and the previous draft as evidence for every surface that writes the scene index; the other callers (exports, the public share page, the pitch scan). [History](backlog-detail.md)

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Two routes to decide together: **PWA first (M)** — much is there, Web Push is live since 2026-10-25; **App Store app (L)** — a Capacitor shell, $99/yr, Sign in with Apple. **Left:** the owner's decision. [History](backlog-detail.md)

### 3.14 Admin catalogues and moderation — M (product call)
The first slice is built (Report, the admin queue, hide, suspend, the craft/channel/format screens). **Left:** notifying the reporter, more report places, the brief screen's edit/reorder, redacting error stacks. [History](backlog-detail.md)

### 3.15 Email — M
**Left:** a custom SMTP sender (owner, §1) and opt-in email for call sheets and job responses, honouring `notification_prefs`. [History](backlog-detail.md)

### 3.16 Launch-grade repository practice — S each, start now
Much is in place (`LICENSE`, `SECURITY.md`, `CODEOWNERS`, `CHANGELOG.md` + `release.yml`, `adr/`, conventional commits, coverage in CI, `secret-scan.yml`, `sbom.yml`). **Left (owner):** branch protection, signed commits, the first `v*` tag, the lawyer's LICENSE wording. [History](backlog-detail.md)

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
Built: the resting pill, notifications, search, the call / upload / music activities, the on-set day clock. **Left:** recording, the timer as a held activity, network/sync status, a temporary notification, and the island at every size (`plans/2026-11-02-island-at-every-size.md`). [History](backlog-detail.md)

### 4.2 Discord
Built: Discord sign-in and posting a channel's messages to a webhook. **Left:** the person's servers and stats, presence, Discord roles → suite roles, rich embeds, an announcements bot. [History](backlog-detail.md)

### 4.3 Translation and localisation
Nothing built. **To add:** a translation service side by side with the original, translation memory, review/approval, version sync, bilingual export and subtitles; the suite's own i18n. [History](backlog-detail.md)

### 4.4 Learning
Built: in-app guides and the writing loop's streaks, sprints and badges. **Left:** a video library, interactive lessons, famous-script analysis, courses, mentor matching, workshops, certificates, a daily prompt. Mostly content — needs an owner decision. [History](backlog-detail.md)

### 4.5 Mood boards
Built: the Studio Library, boards as objects of their own, the film search (Wikidata). **Left:** annotating an image, board search, board permissions, a public share link, Google Images import, AI suggestions. [History](backlog-detail.md)

### 4.6 Budget and money
Built: budget lines and actuals, vendors, expenses, timesheets, scene and shoot-day costs, the stripboard figures. **Left:** templates, day rates, location costs, equipment, invoices, cash flow, currencies, alerts, reports, Excel/Movie Magic export. [History](backlog-detail.md)

### 4.7 Editor: navigation and power editing
Built: the scene list and outline, search, the stash, Go to, scene stepping, jump history, case and duplicate, version compare. **Left:** multi-cursor and block selection, macros, snippet expansion, context-aware commands, percentages. [History](backlog-detail.md)

### 4.8 Characters
Built: the character bible, a look-board per character, casting with the scene footprint. **Left:** richer cards, an arc timeline, a relationship map, voice samples, appearances per scene, templates, consistency warnings, a bible PDF. [History](backlog-detail.md)

### 4.9 Script formats, import and export
Built: PDF/FDX/Fountain/text import and export, dual dialogue, scene numbers, revision colours with locked drafts. **Left:** round-trip fidelity tests, Movie Magic/Celtx/Highland, RTF/ePub/HTML, intercut/montage/flashback, act breaks, custom element styles. [History](backlog-detail.md)

### 4.10 Breakdown and scheduling
Built: tagging with suggestions, categories and rates, per-scene sheets, the stripboard with auto-schedule, Day out of days, call sheets, readiness, print, push to budget. **Left:** suggested props/vehicles/wardrobe/VFX/stunts from action lines, a one-liner, location and props reports, proper PDF reports, Movie Magic Scheduling export. [History](backlog-detail.md)

### 4.11 World building and locations
Built: Locations (status, permit, address, contact, cost, notes) and scene references. **Left:** location mood boards, a map view, time period, world rules and lore, weather and season, a continuity checker, a world timeline, a world bible PDF. [History](backlog-detail.md)

### 4.12 Comparing versions
Built: locked revisions with coloured changed pages and a diff view. **Left:** side by side for any two versions, inline diff colours, change statistics and filters, scene-reorder and rename detection, accept/reject per change, a change-report PDF, a three-way merge. [History](backlog-detail.md)

### 4.13 Offline and installable
Built: the editor saves to IndexedDB first and syncs, Capture's outbox, a service worker, an installable web app. **Left:** an app-wide offline indicator, per-document sync status, downloading a whole project, an offline queue beyond scripts, bandwidth-aware sync, a line-by-line conflict view. [History](backlog-detail.md)

### 4.14 Table read with AI voices
Built: the browser's voices, one per character, the script highlighted as it reads. **Left (a voice service):** 50+ voices, emotion, ambience, sound effects, MP3/WAV export, pacing, an actor-reference voice, listening together live, bookmarks and loops. [History](backlog-detail.md)

### 4.15 Casting
Built: casting per character with its scene footprint, casting calls posted as jobs. **Left:** drag crew onto roles, side-by-side candidates, notes per candidate, audition scheduling, decision history, a casting sheet PDF. [History](backlog-detail.md)

### 3.24 Voice rooms beyond eight — an SFU — L (found 2026-10-18)
A voice room is a full mesh and refuses a 9th person. **Left:** an SFU (LiveKit/mediasoup — an outside service and cost, owner's call), seat ordering by a server timestamp (S), the 9th-joiner spec (S). [History](backlog-detail.md)

### 3.23 Owner's workflow: View as everywhere, announcements, an owner dashboard — M (owner request, 2026-10-12)
Built: View as for the hub, the Studio, the Lounge and the call-sheet page; project announcements; the first dashboard slice on Today. **Left:** the other surfaces that decide ownership themselves, a platform-wide broadcast (needs email, 3.15), the rest of the dashboard. [History](backlog-detail.md)

### 3.28 The Lounge overhaul and the platform hub — L (owner, 2026-10-25)
Plan: [plans/2026-10-25-lounge-overhaul.md](plans/2026-10-25-lounge-overhaul.md). L0–L4 done (the hub, What's new, Learn, Status, Help, case studies — the last three behind flags). **Left:** L5 (the redesign) and L6. [History](backlog-detail.md)

### 3.25 Story interview — a guided path from idea to skeleton — M/L (owner idea, 2026-10-20)
Nothing built. **To build:** a stored, resumable interview whose answers produce an ordered beat list and a scene skeleton — real rows, editable afterwards. [History](backlog-detail.md)

### 3.26 Story-structure templates — S/M (owner idea, 2026-10-20)
Nothing built. **To build:** selectable structures (three-act, Freytag, hero's journey, story circle, seven-point, beat sheet) as data, applied from 3.25 or the outline, and a check against one. [History](backlog-detail.md)

### 3.27 Open core: the license and the free / paid boundary — M (owner decision; lawyer review)
The repository is public (proprietary `LICENSE`). **Left, in order:** the license decision with the lawyer; a single entitlements layer (plan limits in the database, RLS-safe); the pre-publication pass (personal data in docs, third-party assets, a final secret scan). [History](backlog-detail.md)
