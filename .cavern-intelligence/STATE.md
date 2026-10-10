# The Cavern — Project State

> Injected into every session — keep it short: open work and the latest
> session only. Every open task, scoped: [BACKLOG.md](BACKLOG.md). Older
> sessions: [STATE-history.md](STATE-history.md).

## Resume here (handoff, 2026-10-10 — cloud session closed)

1. **`main` is current** (`a83f99a`) and everything is merged: #136–#144.
   No PR is open. Start with `git switch main && git pull`.
2. **First job — apply three migrations to production (owner pastes them).**
   Their code is live but the database isn't: until they're applied, the beat
   board's **Add to script** errors and Web Push is off (the `jobs` read rule
   just keeps its old two policies). The cloud session's Supabase connector
   can read production but **times out on every write** (`apply_migration`
   and `execute_sql` both, 60 s) — so the owner pastes each file into the
   SQL editor (https://supabase.com/dashboard/project/fxsryglwpwcqkfjljbrm/sql/new),
   in this order, one at a time:
   `supabase/migrations/20261007010000_jobs_one_select_policy.sql` (3.9),
   `20261007020000_append_to_script.sql` (3.8),
   `20261008010000_web_push.sql` (3.13; `pg_net` is already enabled).
   Then check production has them (policy "Jobs readable", function
   `append_to_script`, table `push_subscriptions`), run **Production schema
   drift** (workflow id 367546497, `gh api -X POST
   repos/lonerkd/MisfitsCavernB/actions/workflows/367546497/dispatches -f ref=main`)
   — the fingerprint ignores CRLF, so a Windows paste won't trip it — and
   record it here. (A timed-out call may or may not have run: check first.)
3. **Then Web Push setup** (BACKLOG 3.13): VAPID keys in Vercel, and the
   dispatch URL + secret in `internal.push_config`; see
   `adr/0004-push-dispatch-from-the-database.md` and `lib/push/`.
4. **Owner's dashboard list for password recovery (3.4, shipped):** a custom
   SMTP sender (Supabase's built-in one only mails team members, so real users
   won't get reset emails); add `https://misfits-cavern-b.vercel.app/**` to
   Auth › URL Configuration › Redirect URLs; mark GitGuardian incidents
   37942181 and 37942439 false positives (test fixtures); delete the two
   accounts `e2e.recover.*@example.com` an earlier session made in production.
5. **Local setup**: `npm ci`; `.claude/skills/` has three real skills
   (`run-misfits-cavern`, `supabase`, `supabase-postgres-best-practices`);
   context loads from `CLAUDE.md`. In a cloud container Docker dies between
   commands — start `dockerd` as a background task, `npm run db:start`
   (mail catcher on :54324), `npx supabase stop` first if it came up from stale
   containers. Never push to `main`; PR from a `claude/*` branch; merge only
   on the owner's explicit "merge".
6. Decided: the internal `mc_` / `mc-` prefixes stay. Open with the owner:
   the domain. An installed iPhone app keeps its old icon until re-added to
   the Home Screen (iOS caches it).

## Open work — start here

Full scope for each in `BACKLOG.md`. The whole suite, top to bottom:
[`bible/`](bible/README.md). In order:

1. **Apply the three migrations, then Web Push setup** (above).
2. **Owner, outside the code** (owner: "good for now" — revisit before
   launch): the SMTP sender and redirect allow-list (above), Supabase usage
   (grace period over — which line?), lawyer review of `/privacy`, `/terms`
   and `LICENSE`, leaked-password protection, the two old Windows stashes,
   branch protection on `main` (`pr-title`, `checks`, `database` required),
   signed commits, the first `v*` tag, the domain.
3. **Next code work**: 3.17 — unit tests for the `lib/supabase/*` modules
   #137 added, then raise the coverage floors back to 49/49/51/49 (they were
   re-measured to 47/47/49/47 on 2026-10-10); restructure
   phases 4–8 (`restructure-proposal.md`: shell/primitives, route groups,
   thin pages, optional Studio routes); admin catalogues + moderation (3.14);
   email (3.15); activity feed (3.5, product call); dev-toolchain advisories
   (3.1, watch upstream).
4. **Verify** `e2e/onset-offline.spec.ts` on Windows with the older local
   Chromium.
5. **Wishlist** (owner, 2026-10-07): BACKLOG §4 — scope one into §3 before
   starting it.

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

## Latest Session — 2026-10-06 → 10: the rename, share links, and the merge train

Merged: **#140** restructure phases 1–2 (The Cavern everywhere, the R13 mark
and icons, the interactive 3D landing hero — `components/brand/Mark3D.tsx`,
three.js loaded after the page); **#141** 3.3 script share links (the
`get_shared_script` RPC replaces the anon/signed-in `shared` read arms;
`scripts_share_guard`; `/s/[token]` server-rendered; editor Share control;
migration `20261006000000`, **applied to production**, 0 of 41 scripts had
been shared); **#142** the drift fingerprint ignores CRLF; **#137**
(another session) data access through `lib/` + lint, phone layout, one
permission model, share previews, emphasis, beat → script, one `jobs`
policy, iPhone launch screens and coaching, Web Push; **#144** (another
session) launch-grade repo practice (LICENSE, SECURITY, CHANGELOG, `adr/`,
conventional PR titles, coverage floors, secret scan, SBOM); **#143**
(another session) password recovery (`/auth` forgot mode, `/auth/reset`,
`lib/auth/recovery.ts`, e2e with the mail catcher). I started my own 3.4
before finding #143 and dropped it. After merging #137, coverage fell under
the #144 floors, so they were re-measured (owner's call) — BACKLOG 3.17.

**Then (#145, 3.2 done):** the auth callback's profile code moved to
`lib/supabase/profiles.ts` (unit-tested); the lint exception is gone, so
`supabase.from(...)` is banned in `app/` and `components/` with no exceptions.

**Then (restructure phase 4):** `components/` root split into `components/shell/` (the app shell: island, palette, bell, cursor, providers' mount…) and `components/ui/` (primitives); `lib/context` → `lib/os`; loose `lib/*.ts` into `lib/crafts`, `formats`, `themes`, `search`, `legal`, `onboarding`, `account`, `hooks`, `util`. Moves only (`git mv` + import codemod); no behaviour change.

**Then (restructure phase 5):** `app/(public)` (share pages `/s`, `/p`, `/shared`, legal) and `app/(suite)` (everything else, with the session/presence/island/tab-bar providers in its layout). The root layout keeps only fonts, theme, toasts and confirms; root `error`/`loading`/`not-found` carry their own `<main>`. No URL changes. Production migrations 20261007010000, 20261007020000 and 20261008010000 are applied (checked 2026-10-10: one `jobs` SELECT policy, `append_to_script`, `push_subscriptions` exist).

Lessons: the Supabase connector's writes time out from the cloud (read works);
check production after a timed-out write before retrying. The 3D hero loaded
later and exposed a faded tagline failing axe contrast — fixed. Parallel
sessions edited the same files (`app/auth/page.tsx`, STATE/BACKLOG,
generated files): merge `main` in, regenerate generated files with
`npm run sync-intel` / `npm run bible` rather than hand-editing, and re-run
typecheck, lint, tests and `test:coverage` before pushing.

