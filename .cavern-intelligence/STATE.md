# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Latest Session — Launch-grade repository practice (3.16)

Branch `claude/repo-practice` (off `main`). No migration, no app code —
files and workflows only.

- **Files:** `LICENSE` (proprietary; lawyer confirms wording),
  `SECURITY.md`, `CHANGELOG.md` (baseline summarising everything to
  2026-10-08 + the release process), `adr/` (four decisions + template),
  `.gitleaksignore`.
- **CI:** `pr-title.yml` enforces conventional PR titles (the squash commit);
  the `checks` job now runs `npm run test:coverage` with thresholds in
  `vitest.config.ts` (baseline 2026-10-08: statements 49.88, branches 49.72,
  functions 52.29, lines 49.37 over `lib/`; floors re-measured to 47 / 47 / 49 /
  47 on 2026-10-10 after #137's `lib/` code — BACKLOG 3.17 raises them back) and uploads the report;
  `secret-scan.yml` (gitleaks over the whole history — three historical
  findings reviewed: two R2/S3-compatible docs phrases, one expired localhost
  session JWT); `sbom.yml` (SPDX + licence summary artifacts);
  `release.yml` (a `v*` tag must match `package.json`).
- **Owner:** branch protection requiring `pr-title`/`checks`/`database`,
  signed commits, the first `v*` tag, the lawyer's OK on `LICENSE`.

## Resume here (handoff, 2026-10-06 — cloud → local)

1. **Merged** 2026-10-06/07: #136, #135, #138, #139, #140 (restructure
   phases 1–2: The Cavern, the R13 mark and icons, the 3D landing hero) and
   #141 (3.3, script share links) — all live. `20261006000000` is applied
   to production (by the owner, in the SQL editor); production matches the
   snapshot (1742 objects). This branch's PR: the drift fingerprint ignores
   CRLF in function bodies (a Windows paste added them).
2. **Local setup check**: `npm ci`; `.claude/skills/` has three real
   skills (`run-misfits-cavern`, `supabase`,
   `supabase-postgres-best-practices`) — no symlinks, so they load on
   Windows. Session context loads from `CLAUDE.md` (it `@`-imports
   `RULES.md` + `STATE.md`) — no hook.
3. **Next**: 3.4 (password recovery). Then restructure phase 3 (splash
   images, Add to Home Screen coaching, Web Push — 3.13).
4. **Branches and stashes**: 17 of the 18 stale remote branches are deleted
   (2026-10-06, from the Windows machine); `claude/design-scales` stays — it
   carries PR #137 (data access through `lib/`, the sign-in fix). On the
   Windows machine, check `git stash list` — two old stashes were never
   reconciled (BACKLOG §1).
5. Decided: the internal `mc_` / `mc-` prefixes stay. Still open with the
   owner: the domain. An installed iPhone app keeps its old icon until it
   is removed and added to the Home Screen again (iOS caches it).

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Owner, outside the code** (owner, 2026-10-06: "good for now" — not
   blocking the next PRs; revisit before launch): Supabase usage (grace period over — which
   line?); an email sender (SMTP);
   lawyer review of `/privacy` and `/terms`; leaked-password protection; the
   two old Windows stashes; optionally branch protection on `main`.
2. **Restructure** — `restructure-proposal.md`: phases 1–2 done (clean-up;
   The Cavern with the R13 mark and icons). Next: 3 iPhone install (splash,
   coaching, push), 4 shell/primitives, 5 route groups, 6 one permission
   model, 7 thin pages, 8 optional Studio routes. No repo rename (new repo
   at launch, 3.16). Still open: the domain.
3. **Launch blocker**: password recovery (3.4).
4. **To apply to production (owner)**: `20261007010000_jobs_one_select_policy.sql`
   (3.9) and `20261007020000_append_to_script.sql` (3.8) — tested locally;
   apply both, then `npm run db:drift -- --target` should match the snapshot.
   The beat board's **Add to script** needs the second.
5. **Upgrades**: data access through `lib/` (3.2: only the auth callback
   left, after 3.4; PR #137) ·
   iPhone app (3.13) · admin catalogues + moderation (3.14) · email (3.15) ·
   activity feed (3.5, product call) ·
   dev-toolchain advisories (3.1, watch upstream).
6. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium.
7. **Wishlist** (owner, 2026-10-07): BACKLOG §4 — island live activities,
   Discord, translation, learning, mood boards, money, editor power tools,
   characters, formats, breakdown, world building, version compare, offline,
   AI table read, casting. Each says what's already built; scope one into
   §3 before starting it.

## Known issues

- Leaked-password protection is off (owner toggle; security advisor WARN).
- *Production schema drift* runs nightly and passes (2026-10-06: production
  matches the snapshot). It logs in as `drift_reader` (catalog reads +
  bucket settings only; `tools-and-access.md` §7).
- Supabase free plan: "grace period is over" banner. Database 23 MB, storage
  46 kB, 20 users, ~200 requests/day — all well inside the limits, so the
  overage is something only the dashboard shows (likely egress or Realtime).
- `npm audit`: production deps clean; 7 high in dev tooling only (`braces`
  via Tailwind's watcher and `eslint-config-next`; fix needs upstream) —
  BACKLOG 3.1.
- Security advisor: `SECURITY DEFINER` RPCs callable by anon (9) and signed-in
  users (24 more) — the intended API, each gated, reviewed in
  `database-and-security.md` §2.D.

## Latest Session — Data access through `lib/`, and lint keeps it there (PR #137)

No migration.

- **BACKLOG 3.2 is down to one file.** Every page and component now
  queries through `lib/supabase/*` (new: `project-hub`, `scripts`,
  `campaigns`, `audio`, `media`, `today`, `client-errors`; the call sheet
  through `studio.getCallSheetView`), and `eslint.config.mjs` fails
  `supabase.from()` in `app/` and `components/`. The one exception is the
  auth callback, left until the password-recovery work lands. Server
  routes keep their own clients. Found on the way:
  - **Story beat → script (BACKLOG 3.8, done)**: the beat board's **Add to
    script** appends a beat to the project's script (starting one if none)
    as a Fountain section + synopsis — notes that don't print. The server
    appends in one statement (`append_to_script`, invoker, RLS decides) and
    an `append` broadcast makes open editors add it to their own copy, so a
    co-writer's unsaved typing is kept. The beat records its `script_id`
    ("In the script ↗"). `e2e/beat-to-script.spec.ts`: two sessions, the
    writer's saves held while the beat lands — both kept, once each; an
    outsider and anon can't append. Limit: an editor that's offline when the
    beat lands still overwrites it on reconnect (whole-document sync).
  - **Emphasis while writing (BACKLOG 3.7, done)**: `*italic*`, `**bold**`,
    `***both***`, `_underline_` (nested, `*` literal) are drawn styled in
    the write surface with dimmed markers (`lib/scriptos/emphasis.ts`, unit
    tests). The markers stay in the text and Courier Prime is monospaced in
    every face, so the caret never drifts — `e2e/emphasis.spec.ts` checks
    the styled line is as wide as the plain one. Source and export unchanged.
  - **One SELECT policy on `jobs` (BACKLOG 3.9)**: migration
    `20261007010000_jobs_one_select_policy` merges the two read policies
    (same meaning); `tests/integration/hiring.test.ts` checks who reads open
    and closed postings (anon, outsider, poster, applicant). Whole
    integration suite: 301 pass. **Not yet applied to production.**
    Integration tests now start on Windows (the setup ran `npx` without a shell).
  - **Sign-in, again**: a lost input event followed by any re-render still
    blanked the email (the controlled field wrote its empty state back). The
    fields are uncontrolled now (read from the form on submit); a second
    test in `e2e/auth-validation.spec.ts` fails on the old code.
  - **Share links unfurl (BACKLOG 3.11, done)**: `/p/<token>` is now a
    server page (`generateMetadata` through the public client: title,
    description or role · year · author, a picture; never indexed) around
    the client view (`PortfolioView`). `e2e/share-pages.spec.ts` checks the
    server HTML and, signed out, that `/m/<id>` serves a published upload
    and stops when it's unpublished or the project goes private.
  - **One permission model (BACKLOG 3.10, done)**: the client's old global
    roles (`lib/os/permissions.ts`, `access-matrix.ts`, four unused hooks,
    project-access loading) are gone. The session carries `isAdmin`; pages
    use `ProtectedPage require="admin" | "signed-in"` (tested in
    `lib/os/guards.test.tsx`); projects use `useCanShape`. RLS is the model.
  - **Phone layout (BACKLOG 3.6, done)**: with a long project or script
    name, the Lounge header ran off the screen, the editor's status bar
    wrapped onto three lines, a Today card and the Crew switch grew past the
    screen, and Export's menu was clipped under the script. All fixed;
    `e2e/mobile.spec.ts` now sweeps with long names (the old short name hid
    every one) and covers `/editor`, its status bar and Export.
  - **The editor started a second, empty screenplay** for a project when
    looking up its script failed — tested by failing the request in the
    browser (`e2e/editor-project-script.spec.ts`, fails on the old code).
  - **A task added while the project page's panel loaded vanished** (saved,
    but the late load put back the old list). A load a write overtook is
    now fetched again.
  - **The pitch board made a second board** when looking up the existing
    one failed; that failure now stops it.
  - **Uploaded sound effects saved to a project never played**, in
    Soundtrack or the editor (Play wrapped their URL in a second storage URL).
  - Promos: a failed campaign save or delete said nothing useful; tested
    (add, move to Live, delete) in `e2e/project-manager.spec.ts`.
  - Lounge member rights ignored failed saves; the call sheet hung on its
    skeleton when a load threw; an outsider's call-sheet link is tested
    ("not found", nothing shown).
  - **Settings › Export could download an incomplete file** (each failed
    query became an empty list); it now fails with a message.
  - My Jobs counted applicants with one query per posting; now one.
  - Silent load failures on these pages now show a toast or message.
  - Unused helpers removed, among them `searchJobs` (typed text straight
    into a PostgREST `or()` filter).
- **Sign-in lost the email under load** (`app/auth`): an input event lost
  during hydration left text in the box but not in state, and typing the
  next field blanked it. Every change and the submit now read all fields
  from the form. The cause of the remaining e2e sign-in flakes; test in
  `e2e/auth-validation.spec.ts` fails on the old code. **Heads-up**: the
  password-recovery work (3.4, another session) also edits
  `app/auth/page.tsx` — whichever lands second merges the two.
- **Sessions share the Windows checkout**: another session switched it to
  its own branch mid-task. Branch work for #137 now happens in a worktree
  (`../MisfitsCavernB-design-scales`, served on :3100).
- The overview and production manager on the project page turned failed
  queries into zeros; they now say so. Test: `e2e/project-manager.spec.ts`
  (owner and crew, survives a reload).
- **17 stale remote branches deleted** (owner's command; each tip matched
  the audited one first). `claude/design-scales` kept — it carries #137.
  Not in the audit, left alone: `claude/state-assessment-testing-r0tf3y`.
- **Run driver** stops only what listens on its port (it ran
  `taskkill /im node.exe`).
- Tests: new `e2e/your-data.spec.ts` (profile, directory, export file);
  `e2e/hiring.spec.ts` checks the My Jobs applicant count.
- Windows notes: npm there strips the lockfile's `libc` fields (check a
  bump changes only its own lines); `npm run stack:up` fails (POSIX `/tmp`
  path handed to Node) — run its steps by hand.

## Earlier — Script share links: the token is the only way in (3.3)

Migration `20261006000000_script_share_links.sql` — applied to production
2026-10-07 (owner, SQL editor); production matches the snapshot.

- **The leak, closed**: the anon policy "Shared scripts publicly viewable"
  (`using (shared = true)`) and the same arm in "scripts view" let anyone
  list every shared script without its link. Both arms are gone; a link
  resolves only through `get_shared_script(token)` (definer: the exact
  token while `shared`; the words and the author's public profile). In
  production 0 of 41 scripts were shared, so nothing was exposed.
- **Who shares**: `internal.scripts_share_guard` (trigger) — only the
  owner, or a project script's shapers, may change `shared` or
  `share_token`; tokens under 24 characters are refused. A new token is a
  revoke. Viewers still edit the words.
- **`/s/[token]`** is server-rendered through the public client: link
  previews (title, writer), never indexed, no cache — off or a new link
  closes it at once.
- **The editor's Share** (`components/editor/ShareScriptButton.tsx`,
  `lib/scriptos/share.ts`): link on/off, copy, new link (confirmed);
  shown to whoever the database lets share; every save checks its error.
- **Pitch board** says "This is public" (blocks are readable by everyone
  by design); its copy-link checks for failure.
- Tests: `tests/integration/script-share.test.ts` (11, failed 9 before the
  migration — the leak reproduced); `privacy.test.ts` updated (it asserted
  the leak); `e2e/script-share.spec.ts` (on, read signed out, new link,
  off); `lib/scriptos/share.test.ts`. Docs: `database-and-security.md` §C
  and the §2.D allowlist, bible 04/08/11, BACKLOG 3.3 removed, 3.11
  narrowed to `/p` and `/m`.
- Verified: typecheck, lint, unit tests, integration (all files), build,
  drift snapshot and types regenerated; e2e: script-share, accessibility,
  route-smoke, legal, writing-loop.

## Earlier — Restructure phases 1–2: clean-up and The Cavern

No migration.

- **Brand**: the product is **The Cavern** everywhere it's named — titles
  and metadata, the manifest (`name` The Cavern, `short_name` Cavern), the
  service worker, share and press pages, Discord sender, Spotify player,
  export filename, legal (`LEGAL.product` The Cavern, `LEGAL.maker` Misfits
  Cavern; effective date moved to 6 October), README, package name
  `the-cavern`, doc headings. Misfits Cavern stays only as the maker:
  the landing tag reads "The Cavern", the hero is the mark in 3D
  (`Mark3D`: three.js loaded after the page, lit by its own moon, turns
  with the pointer or a drag; the flat mark is the fallback), "by Misfits
  Cavern" under it (owner's call, revising "THE CAVERN" as a wordmark);
  the footer reads "The Cavern · by Misfits Cavern ·
  © 2026 Peter Olowude". "Welcome back, misfit." and the `mc_`/`mc-`
  prefixes stay.
- **The mark in the app**: `components/brand/Mark.tsx` (R13 in theme
  tokens) replaces the "MC" text in the nav, Studio, projects, jobs,
  Lounge and portfolio headers. `public/` gets the R13 icons
  (`icon.svg`, `favicon-32.png`, `apple-touch-icon.png`, 192/512 and
  maskable PNGs); `app/layout.tsx` declares them; the service worker cache
  is `mc-shell-v3` so installed apps refresh.
- **Clean-up**: deleted `hooks/useColorExtractor.ts` and
  `components/ui/AmbientGradient.tsx` (unused); `types/screenplay.ts` →
  `lib/scriptos/types.ts` (17 imports); `docs/` → `.cavern-intelligence/archive/`;
  dead `tsconfig` aliases (`@/types`, `@/hooks`, `@/utils`, `@/styles`)
  removed; CI's docs-only filter no longer lists `docs/`.
- Docs: bible gaps closed (01, 03, 05, 08, 10), `restructure-proposal.md`
  phases 1–2 marked done, `brand/README.md` says how the icons get into
  `public/`; BACKLOG 3.12 done and removed, 3.13 narrowed.
- The landing tagline was drawn at 45% opacity (2.3:1); now `--fg-dim` at
  full opacity (the 4.5:1 floor) — axe caught it once the hero loaded later.
- Verified: typecheck, lint, unit tests (479, 7 new for the 3D mark's
  geometry), build, budget (36 pages; `/` 291 kB — three.js isn't in the
  first load); the landing (at rest, hovered, dragged) and showcase looked
  at on desktop and phone.
