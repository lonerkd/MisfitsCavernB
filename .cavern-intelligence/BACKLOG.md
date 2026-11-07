# The Cavern — Backlog

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
Plan, inventory and order of work: [plans/2026-11-07-information-architecture-and-sound.md](plans/2026-11-07-information-architecture-and-sound.md). In short: the editor's right rail becomes four sections (Scene, Sound, Script, Notes) instead of seven tabs; the table read and a Spotify-to-script desk (synced with what is already playing anywhere, tags per scene) move into **Sound**; the global player drops its "Audio Engine" label and keeps the disc icon; the Studio's 36 production views get grouped and searchable and its Scenes tab shares the editor's scene card; every writing surface gets a tool strip over the keyboard. **Step 1 built 2026-11-07:** the editor's Audio tab is now **Sound** (`SoundPanel`): the table read (play, pause, stop, from this scene, which line it is on; the idle floating control is gone, the controls appear in the writing area only while a read is running), music for the scene in view (its mood from `lib/spotify/moods.ts`, Spotify track suggestions, play, save to the project, what is playing now) and the project's saved tracks; the global player's "Audio Engine" label is gone (the disc icon stays) and `/soundtrack` is titled Soundtrack. **Step 2 built 2026-11-07:** the suite reads what Spotify is playing on *any* of the person's devices (`lib/spotify/playback.ts`: `GET /me/player` every 4 s while the page is visible, backing off on a 429) and drives that device (play/pause, next, previous, seek, volume; a song chosen in the suite goes to the device that already has the music); "Play here" moves it to the in-app player; the Sound tab shows where it is playing with a seek bar. Everything that reads `useSpotify()` (the island's music, the global player) follows, because the shared state is now the remote device's when music is elsewhere. Needs Spotify Premium to control (the API refuses otherwise); verified with fakes only. **Step 3 built 2026-11-07:** tags — a saved track can be tagged to a scene with a role and free tags (migration `20261107000200`, persona test), from the Sound tab: a Tag editor on each saved track, "Tag this song to Scene n" for the song playing now (saved and tagged in one tap as a temp score), this scene's tracks listed first with their role and tags. **Step 4 built 2026-11-07:** the rail is four sections (Scene, Sound, Script, Notes). **Scene music built 2026-11-07** (the Scene section lists the scene's tagged tracks). **Left:** the centre Stats view folded into Script, Studio (5), strips for other surfaces (6); `e2e/breakdown.spec.ts` fails on `main` at the suggestion button (S, find why). Done when each step in the plan holds with a test and the owner has used it.

### 3.41 The phone experience (iPhone 15 Pro, both orientations) — L (owner, 2026-11-07)
Plan, audit and rules: [plans/2026-11-07-phone-experience.md](plans/2026-11-07-phone-experience.md). **Built 2026-11-07:** the phone hook (`usePhoneLayout`: phone, landscape, keyboard, offset), the bottom sheet, and the editor on a phone (a slim bar with four doors, sheets for scripts/scenes, view, tools and more, an element strip over the keyboard, landscape typing, the island stepping aside). **Slice 2 built 2026-11-07:** touch rules for every page (`@media (pointer: coarse)` in `globals.css`: buttons, tabs and selects at least 44 pt, fields 16 px so iOS does not zoom, links get a larger tappable area; the audit's small targets went from 97 on a project page to 0), the Studio's tab row no longer squeezes its labels, e2e for the phone editor. **Left, in order:** the shell as one phone layout (the floating pill still sits over content; a tab bar that rides the keyboard); Lounge; forms (16 px fields, the focused field and its submit above the keyboard); On set, Today, Community; horizontal-only views where a row needs width; a browser spec per surface at 393×852 and 852×393; a CI audit (`scripts/mobile-audit.mjs`) that fails on sideways scroll and small targets; and a pass on the real iPhone. Done when each surface passes the audit in both orientations and the owner has used it on the phone.

### 3.36 Community — one page for Today, the Hub, the Lounge, crew discovery and the front door — S (owner, 2026-11-03)
Plan: [plans/2026-11-03-community-page.md](plans/2026-11-03-community-page.md). **Built:** the hub feed's tab and audience are in the URL (`?kind=`, `?audience=`) and the lower sections load when they near the screen (`WhenNear`, 2026-11-03); `/community` with Your day (incl. the Lounge's unread), What's new, Crew open to work, The Cavern (numbers + preview picker) and Music; `/today` and `/hub` redirect; one nav entry everywhere. Left: the phone pass by eye, Home sharing `TheCavern`'s data, a calmer loading state on the phone, decisions for the owner (signed-in `/` to Community; whether the Lounge keeps its own island entry), a persona spec for Jordan/Riley. Done when those hold.

### 3.35 Paper as the default: what the walk did not cover — S (owner, 2026-11-03)
Paper became the default theme and every screen was walked in it (2026-11-03: all 48 screens photographed by eye on desktop; `npm run theme:scan` over 29 routes, desktop and phone, found and fixed the Jobs role pills and rates, the admin role badge and audit-log links, the editor's goal badges and timing numbers, the crew page's portfolio note and the portfolio card's title over its video frame; Cavern, Slate, Editorial, Lagoon, Blueprint and Glass scan clean). Left: the scan sees what is on a route, not what opens on a click (modals, menus, toasts, empty and error states): walk those in Paper; scan the remaining dark presets (`THEME=terminal npm run theme:scan` …: Vampire, Terminal, Mono, Neon, Forest, Ink & Rust); text over an element's own image or gradient is skipped (not one colour); retake `bible/screens` (still the dark-era snapshot: `MC_LOCAL_CHROMIUM=… npm run bible:shots`). Done when those hold.

### 3.38 The 26 production tools: what review found and is left — M (found 2026-11-07, PR #427)
**Done 2026-11-07 (the #427 clean-up):** one `useSettingsList` hook replaces the 16 copies (typed key, no `as any`, an error toast on a failed save, a confirmed delete, no double submit); every view shows its Add form on an empty project (a test for all 16); Script revisions reads the editor's real locked revisions; Day out of days is the Stripboard's engine and table; undefined tokens (`--card`, `--muted-foreground`, `--warning`) and pastel status colours replaced with theme tokens; the editor's `false &&` left bar is gone because the whole bar is restored to `main`'s (the PR's two editor commits contradicted each other and dropped the script switcher and keyboard reorder). Docs: `studio-and-preproduction.md` §5a. **Still left:** the owner-only decision below, free-text scene and character names, the suspected overlaps (Props / Costume / Makeup / VFX vs the breakdown; Scout / Permit vs Locations; Wrap vs the set log), a theme scan of the new views in Paper and Misfit, a browser spec that adds a record in one view, and whether the editor's left bar should be redesigned (a design call).
Fixed in the PR: deep links (`?view=`) to the new views fell back to the default (the Studio page validated against a hard-coded list of ten; `PRODUCTION_VIEWS` in `lib/os/progress.ts` is now the one list the type is derived from), and an unused `autoCallSheet` import. **Left, in order of weight:** **(1) Only the project owner can save in the new views** (a design decision for the owner): every role view writes its records into `projects.settings`, which RLS limits to the creator, so a director, sound mixer or camera operator can read their tool but its Add / status / delete fails (`patch_project_settings` keeps the owner-only rule on purpose: allowing any crew to write would let them change the project's phase, modules and other settings). The fix is real storage per tool (a table per record kind or one `production_records` table, RLS through `can_access_project` / `can_shape_project`, persona-tested), not a wider settings write. **(2)** ~~errors and the lost add~~ (done 2026-11-07: an error toast, and the next save is built from the last saved list); with several writers (if crew ever write) a whole-array write still loses a concurrent add: per-record rows fix that too; **(3)** the call-sheet "auto fill" helper (`lib/studio/auto-call-sheet.ts`) is tested but not wired into the seed flow; **(4)** ~~Day out of days~~ (done: it is the Stripboard's engine, with S / W / H / F / SF); **(5)** the parser's `places` context is copied but never read; the Studio's shared sync passes project data (cast, rejections, places, forced line types) and deliberately **not** a writer's private reading memory or the previous draft; and a forced line type steers its neighbours but never changes the line itself (`lib/scriptos/line-override-boneyard.test.ts` pins it as an expected failure: the "Force type" control does not do what it says on the line it is set on; found 2026-11-07, already on `main`). Done when a crew role can save its own tool's records, and each of (2)–(5) holds with a test.

### 3.37 One shared e2e helper, and no test accounts in production's numbers — S/M (owner, 2026-11-03)
Almost every `e2e/*.spec.ts` repeats the same setup: `npx supabase status` for the local URL and service key, an admin client, creating a user, signing in through `/auth`, and cleaning up. **Build:** one helper that picks the backend (the local stack by default; staging, `cavern-staging`, when environment variables are set, so a session without Docker can run specs against a Vercel preview), signs in, and tracks everything it creates so a spec that fails halfway still cleans up. **And:** production's totals must stay real (`get_platform_stats` leaves out `is_sample` people and their work; 10 old QA accounts were flagged 2026-11-03): decide how QA accounts that do reach production get flagged on creation (a naming convention the stats skip, or flag by hand after each run) and delete the throwaway accounts (§1). `thekid` is a real account (owner, 2026-11-05), so it is counted. Done when specs use the helper, a spec can run against staging, and production's totals stay accurate after a QA run.

### 3.39 The 2026-11-07 audit: fix what it found, in order — M/L (owner request, 2026-11-07)
The owner asked for a review of everything built 3–7 November for poor execution and fakes (much was done through a weaker model). Findings, evidence and the order of work: [bible/audit-2026-11-07.md](bible/audit-2026-11-07.md). In short: #427 must not merge as is (the Misfit default theme fails WCAG AA on nearly every page; the "removed" editor sidebar is `false &&` dead code and the keyboard-reorder spec fails); the 19 settings-backed production views are copy-pasted, fail silently, hold free-text scene and character names and are owner-only for writes; `main` ships 17 of them that cannot take a first record until #427 lands; none of the 26 has a test or a doc; the PDF "real files" test reads no real file. Done when each High and Medium finding in the audit has a fix, a test, or a recorded owner decision.

### 3.40 Governance that cannot go stale — M (owner request, 2026-11-07)
**Built:** the `gate` workflow and the lint ratchet; the head-SHA-bound `claude-review` status (`tools-and-access.md` §9); it has run once (a low-risk PR: "not required") and must still be seen on a high-risk PR before it is made required. **Left:** (a) an autonomous Claude reviewer workflow that posts the marker (like `agent-claude.yml`; needs the worker's token, untestable from a session) and the gate's per-file `git` spawns (S); (b) a PR-level browser job (accessibility, editor, Studio specs) when UI paths change; (c) a check that the STATE.md handoff date is not older than the newest session note; (d) **Done 2026-11-07 (owner applied it):** the `main-2` ruleset requires `conventional`, `checks`, `database` and `gate` (strict), requires a pull request (0 approvals, squash only), and has **no bypass**: nobody, the owner included, pushes to or skips checks on `main`. Left: make `claude-review` a required check once it has run green on a real PR (it first runs on the next PR; until then a misbehaving required check could block every merge, with no bypass to get round it). Done when a PR that skips tests, docs, review or a contrast check cannot merge, whoever opened it.

### 3.1 Dev-toolchain advisories — watch, S when upstream moves
Production dependencies: **0** vulnerabilities (`npm audit --omit=dev`,
2026-10-06, after `source-map-js` 1.2.2; 2026-10-03's fix bumped `dompurify`,
`fflate`, `brace-expansion`, `postcss-selector-parser` and the Next ESLint
config). Left: 7 high, all `braces` (every version flagged) reached only
through dev tools — `tailwindcss` → `chokidar`, and `eslint-config-next` →
`fast-glob` — and 2 moderate, `postcss-selector-parser` under Tailwind 3's
`postcss-nested`. Nothing ships to the browser or server; the only offered
fix is `--force` (Tailwind 4, breaking). On Windows, check a lockfile bump
changed only the package's own lines: npm there strips the `libc` fields. Re-run `npm audit` when Tailwind or `eslint-config-next`
release; take the plain fix then. Done when `npm audit` reports 0.

### 3.33 Conflict-free co-writing (ADR 0008) — M/L (accepted by the owner, 2026-10-14)
**What**: a Yjs `Y.Text` for the script, synced over the existing `script_${id}` Supabase Realtime channel as the transport (no new WebSocket server); `scripts.content` stays the persisted truth; presence and cursors stay as they are. This is rung E3 of 3.18(d). **Where**: `lib/scriptos/sync.ts` (the provider lives beside it), the write surface in `components/editor/WriteView.tsx`, a scoped Yjs undo manager (local author only), then delete the conflict heuristic and its UI. **Done when**: two simultaneous sessions editing the same paragraph keep both edits word-level (an integration test with two simulated authors plus an e2e two-browser spec), offline capture reconciles through the CRDT on reconnect, and the conflict prompt is gone from the editor. Read `adr/0008-conflict-free-co-writing.md` first; it is the design.

**Built 2026-10-27 (E3):** Yjs over the script channel, verified with two real browsers (`e2e/editor-cowriting.spec.ts`). **Offline queue (2026-11-01):** the queue now merges with the server's shared document and writes `content` with `yjs_state` (compare-and-set; never overwrites) — `e2e/editor-offline-merge.spec.ts`. **Fixed 2026-11-02 (the nightly's "typing at the very same spot" flake):** it was not a co-writing race. The editor's own reshaping of the text (an opening parenthesis becomes a pair, Tab cycles a line, an inserted element) placed the caret afterwards with `setTimeout(…, 0)`; React puts a textarea's caret at the end when it sets the new value, and Chromium serves a queued key press before a 0 ms timer, so a key typed straight after `(` landed at the **end of the script**. This happens to a fast typist with no collaborator at all. The caret is now placed in the layout effect that runs as the new text is put on screen (`caretAfterEdit` in `app/(suite)/editor/page.tsx`; the timer stays only for an edit that leaves the text unchanged), and a caret waiting to be placed moves with a collaborator's words. `e2e/editor-caret-after-edit.spec.ts` types `(abc` with no delay 12 times and fails on the old code; the original same-spot spec went from about 1 failure in 4 to 21 passes of 22 (the one failure was the page not loading). **Left (S each):** find out why a window that stays connected while its writer is "offline" (Playwright's switch does not close the websocket) produced a garbled merge (an edit landed inside a heading); `e2e/editor-cowriting.spec.ts` also flakes about 1 in 6 on a loaded container, even on `main`'s code; broadcast the queue's merged update so open editors see it at once (today they merge at their next save); chunk or compress large updates for the Realtime size limit; a private channel with a `realtime.messages` policy so only project members can write to a script's channel. Done when each holds with a test.
### 3.34 Agent workflows: switch on the worker and the autopilot — S (owner, 2026-10-27)
**Update 2026-10-27:** the owner chose Copilot as the worker and set `CLAUDE_CODE_OAUTH_TOKEN`, so the `agent-ready` label also runs the Claude worker. Built: the opt-in daily Copilot autopilot (`tools-and-access.md` §8), disabled until the owner explicitly enables it after trusting the loop; it selects only unassigned owner-approved backlog issues and observes the configured cap. Left: **(a)** the owner runs `node scripts/backlog-to-issues.mjs --create` once; **(b)** enable Copilot coding agent on the repo and try one S-sized issue end to end; **(c)** only after that trial, add `COPILOT_ASSIGN_PAT` and set `AGENT_AUTOPILOT_ENABLED=true` if the owner wants daily dispatch. **Update 2026-11-01:** the Claude worker works end to end (issue #326 → PR #353); built: risk tiers on every PR (`pr-risk.yml`) and a per-run cost comment aggregated in the status issue. Left for the owner: turn Copilot's automatic review off, then set the repository variable `PR_RISK_REQUEST_COPILOT=true` (see `tools-and-access.md` §8), and decide on the daily autopilot (it dispatches to Copilot today). Done when an issue labelled `agent-ready` becomes a green PR without anyone typing a prompt.

### 3.18 Film graph — what's left after steps 1–3 — L (owner: the editor gets cut over)
Done: days and places (1), characters and sides (2), story time and continuity (3). Left, in order: **(a)** the app reads `scene_characters` / `call_sheet_calls.character_id` instead of `cast_list` / `character_name` text (S–M) — **started 2026-10-13**: `lib/film/cast.ts`, Continuity and the Casting board read the links; **(2026-10-27)** the Studio's stripboard, readiness, call-sheet cast, On set, Scenes tab and breakdown now read the links (`StudioContext.castOf`); the crew's call sheet page now reads cast through the links (2026-11-02; an issued sheet's snapshot now files calls by character id too (2026-11-03, migration `20261103110000`; old sheets fall back to the name until reissued)); still on the text: `character_name` on calls (plan: [plans/2026-10-27-graph-cutover-audit.md](plans/2026-10-27-graph-cutover-audit.md)); **(2026-11-02)** places read through `location_id` (stripboard, auto-schedule, call sheet, readiness, Locations; a location can be renamed) — calls now carry `character_id` too (2026-11-02, migration `20261102100000`; readers move to it with the text drop) — next in the audit: shoot days by `shoot_day_id`; **(b)** continuity extras — a photo and wardrobe/prop elements on a look, a wardrobe/make-up sheet (PDF), shoot order beside story order, the look-change warning on the call sheet (M); **(c)** step 4 entities and links, the card, mentions (L) — **slice A built 2026-10-27 behind flag `entity_cards`** (entities + links tables, the card for scene / character / location / shoot day, opened from the stripboard and call sheet); next, owner-ordered: D (guest review with versions and approval — [plans/2026-10-27-guest-review-and-phases.md](plans/2026-10-27-guest-review-and-phases.md); **D1 built 2026-10-27 behind flag `guest_review`**: script versions, the `/review/<token>` client page, comments and approve / ask-for-changes, team confirms; next, in the owner's order, D3 phase templates and gates — film and series first, then advertising and copy — then D2 lifecycle and layers (**D3 built 2026-10-27 behind flag `phase_gates`** on the existing phase engine: the gate on the PhasePanel, `media.lifecycle` archive/restore, `advance_phase`; left: gate items beyond the library — scripts, documents —); media versions are a follow-up), then B (**built 2026-10-27**: attach / remove tasks, documents and media on any card, a Card button on a media item; left: entry points from tasks and documents, search hits open cards), then C (mentions — **first slice built 2026-10-27**: `@` in a new task in the project hub points at scenes, characters, places, days, tasks, documents and media; stored as `@[Label](id)`, shown as a chip with the current name that opens the card in the Studio via `/studio?project=…&card=…`, kept in step as `mentions` links; left: mentions in the Lounge (a message is not an entity yet — needs a decision: an entity per message is heavy, a lighter link table is the alternative), in documents and notes, editing a task's text, and the people `@name` notify beside it) — [plans/2026-10-27-link-layer-and-card.md](plans/2026-10-27-link-layer-and-card.md); **(d)** the editor on the graph — **a major expansion, not a thinning** (owner, 2026-10-11): planned rung by rung in [plans/2026-10-11-editor-integration.md](plans/2026-10-11-editor-integration.md) (E0 safety net → E1 take the page apart → E2 read the graph → E3 CRDT → E4 write the graph → E5 margin links → E6 contract; XL overall, decisions for the owner in §6); **(e)** step 5 money, step 6 my day, step 7 drop the text columns. Done when nothing reads `scenes.cast_list`, `scenes.location` or `character_name` and the old columns are gone.

**E3 — conflict-free co-writing (ADR 0008): built 2026-10-27.** Yjs syncs over the script Realtime channel; `scripts.content` stays canonical, with `scripts.yjs_state` for durable CRDT state and local-author undo.

### 3.32 Ad writing and copywriting — a format and an editor — L (owner, 2026-10-27: "probably the main one")
**Built 2026-10-27:** the `Advertising` and `Copywriting` formats, client review links and numbered versions; script-backed deliverables (30/15/6 s spots, radio, posters, banners, headlines, social and other), project-scoped RLS and cards; the `copy` format with two-column picture/sound editing, per-piece character/time limits and structured guest rendering; owner-approved briefs and brand rules checked while writing and on the deliverables panel. Advertising scripts are deliverables automatically, and the approval gate now requires every deliverable's latest version to be sent, client-approved and team-confirmed. New UI is behind `ad_copywriting` (on in production since 2026-10-27, owner's decision). See [plans/2026-10-27-ad-and-copy.md](plans/2026-10-27-ad-and-copy.md).
**C4 export built 2026-11-01:** Campaign deliverables has a Text and a PDF button per piece and for the whole set (the working text, review status and limits; the PDF uses the built-in fonts, so characters outside Western European text print as "?" and the person is told; the plain-text export keeps everything). **Left (S):** a branded PDF (the campaign's logo and colours), export of a past review version, and a non-Latin PDF font if clients need one. The campaign remains a project and each piece a script; `public.campaigns` is the unrelated Promos distribution plan and is not reused.

### 3.20 The classifier and the importer — what is still wrong — S (found 2026-10-11; B2, B3, B5, B6 fixed the rest)
Still pinned as an expected-failure test: `lib/scriptos/parser-gaps.test.ts` (1).
1. **Done (B9):** `Character.firstLineIndex` is the line of the first cue (-1 if none), `Scene.omitted` is gone (nothing read it), `ScriptLine.confidence` is the decoder's own and feeds the editor's "doubtful reads". `Character.lines` counts speeches, as its comment now says.
2. **Real PDFs** (needs the owner): the PDF reader is tested on synthetic pages only. Send a few script PDFs (text PDFs and a scan) so it can be measured on real item splitting, rotation and two-column dual dialogue; a scan is reported as "no text" and not OCR'd.
**Fixed:** Fountain import as written, the title page, dual dialogue as Fountain spells it (B2); numbered headings with a full stop, `FADE OUT.` and bare transitions, names with digits and full stops, non-Latin cues, "Interior lights…", a mid-sentence "draft" (B3); shouted dialogue after a cue, `(beat)` mid-speech, ALL-CAPS action before action (B5, the whole-document decoder); the PDF reader (B6).

### 3.21 The deep brain — the script engine, rung by rung — XL (owner direction, 2026-10-12)
A layered, deterministic, explainable reading engine: lossless Fountain first, then evidence, a document profile, a whole-document decoder, the suite's context as priors, and memory of corrections; the importers rebuilt on the same engine. Plan, layers, baseline and decisions: [plans/2026-10-12-the-deep-brain.md](plans/2026-10-12-the-deep-brain.md). **Built:** B0 the measure, B1 hard to fool, B2 Fountain complete (import as written), B3 the evidence layer, B5 the decoder, B6 the PDF reader on geometry, B7's first slice (the cast and rejected names), B8's first slice ("not a character"), and **B4's first piece (2026-11-01): the document profile knows a script with no blank lines**, found with an independent set of hand-labelled scripts (`lib/scriptos/corpus/handwritten/`, which agree with the engine on all but a handful of lines) and a new blank-free surface in the ratchet (macro-F1 0.911 / 0.914 / 0.903). **2026-11-02:** the profile also learns **title-case cues** (a short name that recurs at the head of blocks), the cast is now **the names read as cues** (no more invented names in a script with no blank lines; a shouted-only cue is in the cast; `#` kept in names), and every hand-labelled script has its cast checked. **Left, in order:** **B4** the rest of the profile (headings, transitions; the inline `NAME: speech` form belongs to the podcast format, now read by the editor and the Studio) · **B7** places and the previous draft as evidence (see 3.22) · **B8** line overrides, renames and per-writer memory · **B9** confidence out to the suite: a reading-review screen that asks only about the doubtful lines. **The honest limit:** with no blank lines, action under a speech is found at F1 ≈ 0.6 (a plain sentence under dialogue is ambiguous; more weights make it worse elsewhere). It needs the previous draft or a person's correction, not another tuning pass. **First real script in the private corpus (2026-11-02):** the owner's own series pilot (about 10,000 lines). `.private-corpus/` is git-ignored and the script never enters the repository: no tracked file, test or note quotes it. It is unlabelled, so it checks consistency, not correctness; **more real scripts are still wanted** (and a person's hand-labelling of one is the next honest measure). **What the reader now keeps from a script (2026-11-02):** a heading is taken apart (`lib/scriptos/heading.ts`: the place, its qualifiers, the years, the era, how it follows the scene before, its layer of a story told in layers), so a place is one place whatever hour or year it is set in (on that script about a tenth of the location strings were the same place under another name); a cue's language (`ABUELA (Spanish)`, `(in Spanish)`, `(speaking Yiddish)`) is read from the runtime's own locale data, not a typed list (`lib/scriptos/languages.ts`); headings are read in English, Spanish, Portuguese, French, German and Italian time words, with years anywhere and clock times; and `scriptKnowledge` (`lib/scriptos/knowledge.ts`) summarises languages (speeches, words, scenes, speakers), eras, layers, places and time jumps. **Gaps are reported, not guessed:** `scriptKnowledge().vocabulary` lists the cue words and heading endings nothing recognised, per script, so running many scripts shows what vocabulary is missing (first finding: delivery tags such as `low`, `quiet`, `soft`: a class the reader should name). **The parser reference is built (2026-11-02):** [`parser-reference.md`](parser-reference.md) is generated from the code (every word list, heading vocabulary, pattern, language synonym and decoder weight) and a test keeps it current. **Thresholds named (2026-11-02):** the document profile's, the second-reading offer's and the Title Case cue scan's cut-offs are in `lib/scriptos/thresholds.ts`, each with what it decides, and the reference lists them. **Left (S–M):** the reader's other inline numbers and its ~95 inline patterns (`parser.ts` evidence scans, `normalize.ts`), and the profile's remaining facets (heading style, transition style), which should be measured on real scripts before they are built. Left (S–M each): show it in the editor (a Languages and Eras panel; a translation-workload report for 4.3), carry a language through the rest of a conversation (scripts tag only the first cue), years and layers as columns on `scenes` for the Studio (a migration), and a `NAME:` language form for the podcast format. Done when the corpus matrix's weakest cell is above 0.9 on text, PDF and blank-free, and a private real-script corpus agrees.

### 3.22 The reader's context: places, the previous draft — M (B7 follow-ups; rejections shipped in B8)
(a) **Done (B8):** a stored per-project "not a character" / "is a character" list (`reading_corrections`), a "Not a character" action in the Character Bible with a way back, obeyed by the editor and the Studio. (b) **Places and the previous draft as evidence**, once every surface that writes the scene index reads with one shared context (today the editor and the Studio do; public share, pitch and brief pages parse without it). **Format (2026-11-02):** the editor and the Studio read a script with its own format (`readingFormat`); still format-less: the exports (text, Fountain, FDX, PDF: for a podcast or outline script the writers would emit Dialogue paragraphs with no Character cue and Scene Headings for segments, so the element mapping for those formats has to be decided and checked in Final Draft first, not just switched), the public share page (the `get_shared_script` RPC does not return the format: a migration), the pitch deck's script scan, Spotify mood and the editor's Normalize (canonical Fountain is a screenplay notion). (c) Context for the other callers where it does not affect scenes. Done when a rejected name survives a reload and both surfaces agree on the scene index.

### 3.13 The Cavern on iPhone — installable app — M/L (owner: a must)
Owner decision (2026-10-06): an installable phone app, on iOS for sure. Two
routes, to decide together:
- **PWA first (M):** much is already there — `public/manifest.webmanifest`
  (standalone, starts at `/today`), `public/sw.js` (offline shell),
  `appleWebApp` metadata, the R13 icons (180 px touch icon, 192/512 and
  maskable manifest PNGs), the name, Pocket and the on-set offline cache.
  Missing for iPhone: splash images, "Share → Add to Home Screen" coaching
  (iOS has no install prompt), and ~~Web Push~~ (**live 2026-10-25**; iOS 16.4+,
  installed web apps only; needs VAPID keys, a `push_subscriptions` table and
  a sender — an Edge Function — for call sheets, DMs and mentions). iOS
  ignores manifest shortcuts and `share_target`. No App Store review; ships
  with every deploy.
- **App Store app (L):** the same web app in a native shell (Capacitor) for an
  App Store listing, native push and the camera/files pickers — needs an Apple
  Developer account ($99/yr), App Review, and a release process.
PWA first, App Store wrapper after, is the usual order. Done when The Cavern
installs on an iPhone, opens without browser chrome, works offline on set, and
a call sheet issued on the desk arrives as a notification on the phone.
An App Store listing with Discord sign-in also needs **Sign in with Apple**.

### 3.14 Admin catalogues and moderation — M (product call)
**Moderation, first slice built:** anyone signed in can **Report** a Lounge message, a job or a profile (a flag, a reason, one report per person per thing); admins work `/admin/reports` (open / resolved / dismissed, a link to the thing, who reported). An admin can **close a reported job** from the queue (`admin_close_job`, audit-logged). An admin can also **read a reported message and hide it** (everyone reads "[Removed by an admin]"; the original is kept for admins; bring-back restores it). An admin can **suspend an account** from `/admin/users` (the auth service's ban: no sign-in, no refresh, sessions ended; nothing deleted; reversible; audit-logged; not yourself, not an admin). An access token already issued lasts until it expires (at most an hour). Left: notifying the reporter, reporting from more places (portfolio pieces, media), and admin read access to a reported message in a private channel (deliberately not granted). **Crafts, channel suggestions, project formats and brief questions have admin screens (`/admin/crafts`, `/admin/channel-presets`, `/admin/formats`, `/admin/brief-questions`: add, remove).** Left on the brief screen (plan: `plans/2026-10-17-admin-brief-questions.md`): edit and reorder a question, set `implies`/`detect`/`ask_when` (still migrations), an audit-log entry when a question is removed (it deletes every project's answer). And before the network opens to strangers:
report a message / job / profile, an admin queue, hide and suspend. Done when
the owner can add a craft without a deploy, and a report reaches the queue.
**Redact error stacks (S, found 2026-10-18):** `client_errors.stack` is stored and shown unredacted (`lib/errors/report.ts` `describeError`, `report_client_error`, `/admin/errors`). Strip origins, absolute paths, query strings and token- or email-like text before storing, in the client and in the RPC (new migration + persona test). Done when a stack with a path and a token is stored redacted. See `bible/09-admin.md` › Known gaps.

### 3.15 Email — M
Notifications are in-app only; auth mail uses Supabase's default sender (low
hourly limit). With a custom SMTP sender (owner, §1): branded auth emails
(The Cavern), and opt-in email for call sheets issued / changed and job
responses, honouring `notification_prefs`. Done when a call sheet issue
emails the crew who opted in (e2e with the local mail catcher).

### 3.16 Launch-grade repository practice — S each, start now
The owner will open a new repository at launch and wants it to stand up to
investor and acquirer due diligence (`restructure-proposal.md` › *Launch
repository*). Start the practices here so they're real by then: conventional
commit messages; semantic-version releases with tags and a `CHANGELOG.md`;
`LICENSE` (proprietary — owner/lawyer), `SECURITY.md`, `CODEOWNERS`; an
`adr/` folder for decisions; a coverage report in CI; a full-history secret
scan and a dependency licence report (SBOM). Owner: branch protection and
signed commits. Done when each is in place and CI enforces the commit and
coverage rules.

**In place (2026-10-08, `claude/repo-practice`):**
- `LICENSE` (proprietary — lawyer confirms the exact wording), `SECURITY.md`
  (private reporting through the Security tab or the privacy contact),
  `CODEOWNERS` (already existed).
- `CHANGELOG.md` — Keep a Changelog, a baseline entry for everything up to
  2026-10-08, and the release process (bump `package.json`, move
  Unreleased → version, tag `vX.Y.Z`); `release.yml` refuses a tag that
  isn't the version in `package.json`.
- `adr/` — four records (RLS as the security boundary, data access through
  `lib/`, PWA before the App Store, push dispatched from the database) with
  an index and template.
- Conventional commits: `pr-title.yml` fails any PR whose title isn't one —
  the title is the commit a squash-merge leaves on main (the PR template
  says so too).
- Coverage: `npm run test:coverage`, scoped to `lib/`, with thresholds in
  `vitest.config.ts` (floors 56 / 55 / 57 / 56, measured 58 / 58 / 59 / 58 on 2026-10-12); the `checks` job runs it and uploads the report — CI enforces both rules the done-state asks for.
- Full-history secret scan: `secret-scan.yml` (gitleaks over every
  reachable commit; weekly + main + PRs). Three historical findings, all
  reviewed: two are the R2/S3-compatible docs phrase,
  one an expired localhost session JWT (committed 2026-07-05, removed) —
  accepted in `.gitleaksignore`, reasons in the PR.
- SBOM: `sbom.yml` — SPDX (full and production-only) plus a licence
  summary, uploaded as artifacts on main pushes and weekly.

**Owner:** branch protection on `main` with `pr-title`, `checks` and
`database` required; signed commits; the first `v*` tag; the lawyer's OK on
the `LICENSE` wording.


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
The island already has modes (`lib/island/mode.ts`: rest, context, live,
open, caps, dot) and `emit()`s brief events (saved, synced, joined).
**Built**: the resting pill, notifications (bell + `live` events), search
(`/` in the caps deck, ⌘K), animated state changes (framer-motion, reduced
motion respected), the editor's sync events.
**To add** — a *live activity* layer that holds the island while something
runs, one at a time by priority, each with its controls:
- ~~call active~~ — **built 2026-11-02**: the call moved from the Lounge page to the suite (`lib/webrtc/VoiceCall.tsx`), so it survives leaving the Lounge, and the island holds it with Mute, **Room** (back to the room: `/lounge?channel=<id>`, offered anywhere but the Lounge) and Leave, and says who is speaking (`lib/island/callActivity.ts`). **Two-browser spec built 2026-11-02** (`e2e/voice-two-people.spec.ts`: two accounts join, each island counts two people and shows the other by name speaking, one leaves and the other is alone again)
- recording (Capture's voice memo / clip — `MediaRecorder` in `Capture.tsx`) — **tried 2026-11-02, not built, and why:** an activity registered from Capture's recorder works (a fake-microphone browser run showed it recording) but nothing can show it: the island (`.dock`) is hidden under 760 px (`island.module.css`), the phone's own "Suite" nav is the tab-bar pill (`MobileTabBar`) which does not render activities, and Capture is a phone-only bottom sheet; on a desktop the island shows but Capture does not exist there. It only becomes worth having if (a) the recorder moves out of the sheet into a suite-level provider (as the voice call did, `lib/webrtc/VoiceCall.tsx`) so a recording survives leaving the screen, and (b) the tab-bar pill shows activities. That is M–L and a product call on the phone; the recorder also stops itself when its component unmounts today. A `recordingActivity` (id `recording`, a clock in whole seconds, a Stop) is the small part, once those two exist.
- ~~uploading, with a progress bar~~ — **built 2026-11-02 for the Studio library**: the island holds "Uploading <name>" (or "Uploading 3 files") with the percentage and a bar (`lib/island/uploads.ts`, `lib/supabase/uploadProgress.ts`: a signed upload URL sent over XMLHttpRequest, whose upload events report progress; `e2e/island-upload.spec.ts` slows the browser's network to watch it). Left (S each): the other upload paths (the SFX library `lib/supabase/audio.ts`, the paperwork scans `lib/studio/api.ts`, Capture's outbox), a cancel button, and a retry when the network drops mid-upload
- ~~music playing~~ — **built 2026-11-02**: the island holds the track that is playing (name, artists, a progress bar) with Pause / Play and Next, on every page, and lets go of a song paused for more than two minutes (`lib/island/musicActivity.ts`, `useMusicActivity.ts`). Left: previous track, album art, and a check against a real Spotify Premium account (unit-tested only: Spotify cannot be driven in CI)
- timer running (writing sprint — `WritingLoop`) — the sprint is built. **On set's day clock built 2026-11-02:** on a shoot day the island's "On set · Day N" (and the phone pill's, shorter) also says where the day is — the phase, the time on set, and the time to the planned wrap or how far over (`onSetLine` in `lib/island/onset.ts`, read live by `useOnSet` from the day's call sheet and set log, only while it is a shoot day and the person has not stepped out). Left (S): the same line as a held activity with a Wrap button in the island's activity deck (today it sits in the rest-mode pill).
- network / sync status (offline, "saved on device, will sync", outbox count)
- a temporary notification (exists as `live`; add a hold time and an action)

**The island at every size — M/L, a design pass first (owner, 2026-11-02):** under 760 px the island vanishes and the phone's pill takes over, whatever the device (narrow desktop windows, split screens, small tablets with keyboards). Plan: [plans/2026-11-02-island-at-every-size.md](plans/2026-11-02-island-at-every-size.md) — one island core, three presentations (dock, pill, sheet) chosen by capability (width × pointer × keyboard) not by a breakpoint; four layers (rest, live, context, command) the same at every size; a zone map per surface class so the keyboard, pointer and island share the whole screen; never strip a tool's own controls to fit the pill. Order: audit → compact dock for narrow non-touch → one core → action registry and command grammar → tool-by-tool pass. Owner leans to the island *replacing* the tab bar on phones and wants a long-press equivalent of the held layer on touch (2026-11-02); the two remaining decisions were delegated to Claude (2026-11-02: "take charge, I'll come with actually trying it"): a fixed ten-slot fast path with the same keys in every tool, and a bottom-anchored three-detent thumb zone with long-press for the held layer and for zones, to be tried behind an account flag (`island_v2`) and tuned from counted use. Only 6 stages and 3 zones describe themselves to the island today, and 12 route areas tell it nothing; step 0's first part is built (2026-11-02): the generated `island-coverage.md` (`npm run island:coverage`, a test keeps it current). The reference now shows each control's deck key, which proved keys are by position (Q is a different action on every page): **slots are built (2026-11-02, `lib/island/slots.ts`; Create Q, Jump W, Find E, View R, Share T, People Y, Note U, Live I)** and nine actions are tagged; **2026-11-07:** Live (the editor's sprint), Share (the Studio's Share tab) and the Undo tile (`O`) are in, not yet pressed in a browser (write the specs with the local stack up: sprint start/pause/resume from the island, Share offered off the Share tab, the Undo tile after a Studio undo and its click); the Note slot is in and pressed in two real browsers (2026-11-07, `e2e/notes.spec.ts`: editor and Studio overview; a writer note between two people too), left: the Lounge's Live (join voice), and every other page and Studio view registering actions with slots. **Step 1 built (2026-11-03, behind `island_v2`):** a window under 760 px whose main input is a mouse or trackpad keeps the dock (`lib/island/compact.ts`, `useIslandSurface`; a touch device keeps the pill); left on the flag: try it on a real narrow window and a small tablet with a keyboard, and graduating the flag (the Continue offer now treats a narrow window with a mouse as the desktop, 2026-11-07). Left in step 0 (S): the views inside the Studio, and the old-versus-new screenshot comparison. **Key model (owner, 2026-11-02):** global Ctrl/⌘ chords, the island as the hover context, Caps Lock adding the suite layer on top — plan section "The key model"; the chord table is built (`lib/os/chords.ts`), **`e2e/editor-undo.spec.ts` flakes about 1 run in 4 beside other specs (a second element labelled "Script" makes `getByLabel('Script', { exact: true })` ambiguous; once a value check): find what the second element is and make the spec exact (S).** **the suite's undo is built (2026-11-02, `lib/os/undo.ts`; Ctrl/⌘ Z outside a text box; registered: moving a scene, its status, auto-schedule)**; left: redo outside text boxes, more registered actions (S each: rename a location, budget edits, tasks), the island showing the pending undo (the O slot), an undo that survives a reload, and the Studio's and Lounge's chords on the table. Done when a narrow desktop window has the island, the phone pill has activities and the command layer, and every tool's ten fast-path actions are reachable by key, pointer and touch.

### 4.2 Discord
**Built**: Discord sign-in (`app/(suite)/auth`, `signInWithOAuth({ provider:
'discord' })`; name and avatar from the identity in `app/(suite)/auth/callback`);
posting a channel's messages to a Discord webhook (`/api/discord/notify`,
`/test`).
**To add**: the person's Discord servers and real server stats (the `guilds`
OAuth scope and the Discord API); presence/status on profiles; Discord roles
→ suite roles (product call: which side is the source of truth); rich embeds
when a script, pitch or call sheet is shared to Discord; an announcements bot
(a hosted bot — infrastructure decision).

### 4.3 Translation and localisation
Nothing built. Translate a script into 50+ languages (a translation
service), side by side with the original, formatting kept (translate
dialogue and action, never element types); translation memory and a
per-project glossary; translator comments, review/approval and credits;
version sync (flag lines whose original changed); export bilingual scripts
and subtitles (SRT/VTT from dialogue — table-read timings help); notes on
cultural context. Also the suite's own interface in other languages (i18n) —
not on the list, but a translator audience needs it.

### 4.4 Learning
**Built**: in-app guides by workflow and experience (`lib/guides`,
`GuidePanel`, `GuideSetup`); the writing loop's streaks, sprints and badges
(`lib/writing`).
**To add**: a video tutorials library, interactive lessons, exercises with
feedback, analysis of famous scripts (rights), technique breakdowns, genre
courses, mentor matching (from crew profiles and crafts), group workshops
and live Q&A (on Lounge voice), certificates, progress tracking and skill
badges beyond writing, community challenges, a daily writing prompt, reading
lists, industry news, masterclasses. Mostly content, not code — needs an
owner decision on who makes it.

### 4.5 Mood boards
**Built**: the Studio Library (uploads incl. audio and video, YouTube/Vimeo
links, Pinterest boards via `/api/links`, Openverse search with credit,
boards); a look-board per character (`character_media`); scene references
(`scene_media`, the editor's Refs panel); tags; publishing per item
(`media.shared`); the pitch deck's full-screen presenting.
**Built 2026-11-05 (slice 1):** boards as objects of their own (unlimited; types: free, character, location, tone, colour, each starting with note cards), library items and note cards arranged by drag or keyboard, resize, edit, colours read from the images, print / PDF, undo, live for the crew (Studio > Library > Mood boards; `20261105000000`).
**To add**: annotating an image (a note pinned to a spot), search within a board, board-level permissions, a slideshow, a public share link for a board (the way a script has one: this is Cineboard's "presentation" link), Google Images import (licensing: prefer Openverse); AI mood suggestions and AI frame generation (an outside service: owner's call, 4.5 competitor note in the session log).

### 4.6 Budget and money
**Built**: budget lines and actuals (project page, Studio › Money), vendors,
expenses committed/paid with receipts from the library, timesheets,
breakdown costs and per-category rates → "Push to budget" (`Breakdown · …`
lines).
**Built 2026-11-02 (slice 1):** cost by scene and by shoot day in Studio › Production › Money, read from the breakdown (`lib/studio/scene-cost.ts`: an element's cost, or its category's default; something used in several scenes is paid once, so it is split between them and the scenes add up to the total; the table says how much rests on a default and how many elements have no price at all). **Stripboard (2026-11-02):** each strip and each day shows the same figure (a strip's accessible name says what it costs; the tooltip says how much is a default estimate or that an element has no price). Left on the slice: the scene cards.
**To add**: budget templates (micro, low, indie, studio) and above/below the
line; cast and crew
day rates × days (Day out of days exists); location costs from Locations;
equipment rental; invoices; cash-flow projection; currencies (none today —
every amount is plain dollars) and tax jurisdictions; cost alerts; financial
reports; export to Excel/CSV and Movie Magic Budgeting.

### 4.7 Editor: navigation and power editing
**Built**: scene list and outline (jump to a scene), ⌘K, the stash
(snippets beside the script), autocomplete for characters and headings.
**To add**: go to scene number / page number / a character's scenes;
multi-cursor and block selection; quick actions on a selection (tag mode's
selection menu is a start); macros; snippet expansion (stash → a typed
trigger); context-aware commands; command history and repeat.

### 4.8 Characters
**Built**: the character bible (description, backstory, motivation, arc,
notes — `script_characters`, `script_metadata.character_bible`), a
look-board per character, casting with each character's scene footprint,
dialogue and scene counts (editor › Stats).
**To add**: richer cards (goals, fears, flaws), an arc timeline, a
relationship map, voice samples taken from their lines, a backstory
timeline, appearances per scene, comparing two characters, templates
(protagonist, antagonist, mentor), consistency warnings (a name spelled two
ways, a dead character speaking), a character bible PDF, wardrobe from the
breakdown's wardrobe elements.

### 4.9 Script formats, import and export
**Built**: import PDF, FDX, Fountain, text; export PDF (title page,
watermark), FDX, Fountain, text; dual dialogue; scene numbers; revision
colours (blue … cherry, `REVISION_COLORS`) with locked drafts; MORE/CONT'D
on export; formats by project type.
**To add**: FDX round-trip fidelity tests; Movie Magic Screenwriter, Celtx
and Highland import; RTF, ePub and HTML export; intercut, montage, series of
shots and flashback/dream formatting; subtitled lines in another language;
A/B pages, locked pages with asterisks, manual scene numbers (the parser
reads `12A` but `sync_script_scenes` stores the position in the integer
`scenes.scene_number` — needs a text column); act breaks for
TV; custom element styles; headers/footers with dynamic content.

### 4.10 Breakdown and scheduling
**Built**: tagging (with suggestions from past projects), categories and
rates, per-scene sheets, page eighths, scene duration, Day/Night and
INT/EXT, stripboard with auto-schedule and company moves, Day out of days,
call sheets, readiness, printable sheets, push to budget.
**To add**: suggested props, vehicles, wardrobe, VFX/SFX, stunts and animals
from action lines (to accept — never tagged automatically); a one-liner;
location and props reports; proper PDF breakdown reports; export to Movie
Magic Scheduling and Gorilla.

### 4.11 World building and locations
**Built**: Locations (status, permit, address, contact, cost, notes; scenes
link by name); scene references.
**To add**: location mood boards (4.5), a map view, time period, world rules
and lore, technology level, magic system, currency/language/culture notes,
where each location appears, weather and season, day/night cycle, a
continuity checker, a world timeline, a world bible PDF, a shareable world
database.

### 4.12 Comparing versions
**Built**: locked revisions with coloured changed pages and a diff view
(`lib/scriptos/revisions.ts`).
**To add**: side by side for any two versions or an imported script; inline
diff colours; change statistics and filters (dialogue / action / scenes);
next/previous change; scene-reorder and character-rename detection;
page-number change tracking; accept/reject per change in a review mode; a
change-report PDF; three-way merge and branches (with the CRDT idea in the
bible's ScriptOS known gaps).

### 4.13 Offline and installable
**Built**: the editor saves to IndexedDB first and syncs (retry, on
reconnect, tombstones for offline deletes), a conflict prompt (keep mine /
take theirs), sync state in its header, and (2026-10-18) a status-bar chip
for the script queue — pending scripts and deletes, network, a retry
countdown with backoff (15 s → 5 min), "Sync now" (`SyncStatusChip`); On set
works offline; Capture's outbox; a service worker; an installable web app
(iPhone polish is 3.13).
**To add**: an app-wide offline indicator (4.1; the chip's `getSyncStatus`
store is the feed for it), sync status per document in lists, downloading a whole project for offline, an offline queue
for actions beyond scripts, bandwidth-aware sync, a line-by-line conflict
view.

### 4.14 Table read with AI voices
**Built**: the browser's voices, one per character, the script highlighted
as it reads, scene timings saved.
**To add** (a voice service): 50+ voices, emotion from parentheticals,
ambience from scene headings, optional sound effects for action, MP3/WAV
export, pacing, an actor-reference voice (consent and rights first), more
languages, listening together live (Lounge voice exists), bookmarks and
loops, notes during playback, comparing reads, scoring from the Soundtrack.

### 4.15 Casting
**Built**: casting per character with its scene footprint
(`character_castings`, Studio › Cast & crew); casting calls posted as jobs
(accepting an applicant casts them); each character's look-board.
**To add**: drag crew onto roles, side-by-side candidates (photos, reels),
notes per candidate per role, audition scheduling, decision history, a
casting sheet PDF.

### 3.24 Voice rooms beyond eight — an SFU — L (found 2026-10-18)
A voice room is a full mesh and now refuses a 9th person (`lib/webrtc/mesh.ts`: toast + "room is full"). Left: **(a)** an SFU (LiveKit/mediasoup — an outside service and cost, owner's call) so rooms scale past 8; **(b)** order seats by a server timestamp instead of each client's clock (S); **(c)** ~~check the cap before asking for the microphone~~ (done 2026-11-02); **(d)** ~~a two-browser e2e for voice~~ (built 2026-11-02, two people; the 9th-joiner case is left, S). Done when a 12-person room works, or the cap is raised on purpose, and a two-browser spec covers the 9th joiner.

### 3.23 Owner's workflow: View as everywhere, announcements, an owner dashboard — M (owner request, 2026-10-12)
**View as** exists for the hub, the Studio, the Lounge and the call-sheet page (`lib/os/viewAs.ts`). Left: any other surface that decides ownership itself should read the same store; a "view as this person" for a named crew member (their role and craft) is the next step beyond Crew. **Announcements:** project announcements are built (the hub's "Tell the team" box → the project's announcements channel + each confirmed crew member's bell); left: a platform-wide broadcast (needs email first, 3.15). (`notify()` now returns an error message; the announcement box uses it, the other callers still ignore it — fix them as each is touched.) **Owner dashboard:** the first slice is on Today's "Your projects" — for each project you run: unanswered invites, overdue tasks, the next shoot day and whether its call sheet is issued. Left: who has not acknowledged a call sheet (needs an acknowledgement record), budget overruns, the `/admin` stats beside them for admins. Done when each is in the suite and covered by a persona spec.

### 3.28 The Lounge overhaul and the platform hub — L (owner, 2026-10-25)
A full redesign of the Lounge plus a platform-wide hub: *What's new*, *Learn*, *Status* (incidents), *Case studies*, *Help* (support cases). Plan, data, personas and slices L0–L6: [plans/2026-10-25-lounge-overhaul.md](plans/2026-10-25-lounge-overhaul.md); five decisions for the owner in its last section. L0 done (2026-10-25: the page split into `useLounge` + seven components). L1 done (2026-10-25: `/hub` with What's new and Learn by audience, `/admin/hub`, push for important posts, the hub is where sign-in lands). L2 done behind flag `hub_status` (2026-10-26: incidents with severity, updates and resolve; a suite-wide banner; production admins-only until the owner graduates the flag). L3 done behind flag `hub_help` (2026-10-26: support cases at `/hub/help`, the admin queue at `/admin/support`, answers notify and push; left: a screenshot attachment, email once 3.15 exists). L4 done behind flag `hub_case_studies` (2026-10-26: owner opt-in in Studio › Share, admin links consenting productions, withdrawing pulls the case study back to draft; left: show the production's media). Next: L5 (the redesign) and L6. Feature flags (`lib/flags.ts`, ADR 0007) are in: unfinished slices ship behind a flag. Done when every slice's done-when holds.

### 3.25 Story interview — a guided path from idea to skeleton — M/L (owner idea, 2026-10-20)
A step-by-step interview that builds the story's skeleton **before** dialogue is written, and teaches a newcomer the workflow as they go. Today `lib/guides` (workflows, steps) teaches *how to use the suite* and `lib/brief` asks the project questions; neither turns answers into structure. Build: a stored, resumable interview (premise, protagonist's want and need, the central conflict, theme, ending, the key turning points) whose answers produce an ordered beat list and a scene skeleton in the editor and the film graph — real rows, editable afterwards, never a mock. Each step explains *why* it is asked. Data: answers per project (RLS through `can_shape_project`), persona-tested (Sam writes, Jordan co-edits, Riley sees nothing). Done when a first-time user can answer the interview and land in the editor with a scene skeleton that persists, and a reload resumes mid-interview.

### 3.26 Story-structure templates — S/M (owner idea, 2026-10-20)
Selectable structures to lay a skeleton over: three-act, five-act (Freytag), the hero's journey, the story circle, a seven-point outline, a beat sheet, and a free "none". Each template is data (named beats with a suggested position and a one-line purpose), applied from 3.25 or from the outline, and a script can be **checked against** one (which beats have a scene, which do not — a report, never an automatic change). Also worth scoping: branching / non-linear structure for games and interactive stories as its own template type. Done when a template can be chosen, applied, and reported on, and the beats it creates survive a reload.

### 3.27 Open core: the license and the free / paid boundary — M (owner decision; lawyer review)
The repository is already public (license: proprietary `LICENSE`, all rights reserved). The owner is weighing an open-source core with a paid tier (extended features, storage, project space, AI features). Needs, in order: **(a)** the license decision, with the lawyer (a permissive license, AGPL, or a source-available license such as BSL each answer "may a competitor host a fork" differently); **(b)** a single entitlements layer — one place that answers "may this account do X / how much storage", with plan limits in the database and RLS-safe — today the suite has no plan or limit concept; **(c)** the pre-publication pass: personal data in docs and session notes, third-party assets and fonts that cannot be redistributed, a final secret scan (`secret-scan.yml` already covers history). Done when the license is chosen and committed, a free account hits a real plan limit through the entitlements layer (persona-tested), and the publication checklist is clean.
