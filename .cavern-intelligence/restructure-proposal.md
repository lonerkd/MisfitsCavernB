# Restructure proposal — folders, logic, branding

**Status: phases 1–2 done (2026-10-06, the clean-up and the brand).
Owner decisions 1–5 made (below); the domain is open. Next: phase 3.**
Written 2026-10-06 from the bible and its audit (`bible/`). Each phase is one
PR that leaves CI green; phases can be approved one at a time.

## What stays

The bones are sound, and moving them would cost more than it gives:

- `app/` route per page (Next.js App Router); `proxy.ts` gating.
- `lib/<domain>/` modules with pure, unit-tested logic beside the
  data access (`lib/studio`, `lib/brief`, `lib/breakdown`, `lib/guides`,
  `lib/scriptos`, `lib/today`, `lib/pocket`, `lib/island`, …).
- `components/<domain>/` folders (`studio`, `editor`, `brief`, `lounge`…).
- `supabase/migrations` as the only schema source; `tests/integration`
  personas; `e2e/`; `.cavern-intelligence/` as the knowledge hub.
- The `@/` import alias.
- Internal `mc_` / `mc-` prefixes (localStorage keys, CSS helpers, DOM
  events). Renaming them would wipe saved device settings and the offline
  cache for nothing anyone sees. They stay as the internal prefix (decision
  below if you'd rather migrate them).

## What's wrong (from the audit)

| Problem | Where |
|---|---|
| ~~Stray top-level folders~~ (fixed, phase 1) | `hooks/` (one file, unused), `types/` (one file), `docs/` (July–September audits the bible supersedes) |
| ~~Dead files~~ (fixed, phase 1) | `hooks/useColorExtractor.ts`, `components/ui/AmbientGradient.tsx` (nothing imports them) |
| `components/` root is a pile | 22 files mixing the app shell (island, palette, cursor, bell, service worker, error reporter, audio widget) with UI primitives (Avatar, Toast, Confirm, EmptyState…) |
| `lib/` root is a pile | 17 loose files (`crafts` + `crafts-core`, `formats` + `formats-core`, `themes`, `search`, `legal`, `onboarding`, `color`, `password-strength`, `useEscapeKey`, `api-rate-limit`); one-file folders (`lib/types`, `lib/storage`); providers split between `lib/context` and `lib/os` |
| Giant pages | `editor` 1610 lines, `lounge` 1530, `projects/[id]` 1255, `/` 878, `jobs` 858, `p/[token]` 779, `projects` 756 |
| Two permission models | RLS (real) vs `lib/os/permissions.ts` + `access-matrix.ts` (unused) — BACKLOG 3.10 |
| Data access in pages | 30 files call `supabase.from` directly — BACKLOG 3.2 |
| ~~Mixed brand~~ (fixed, phase 2) | "Misfits Cavern", "MISFITS CAVERN", "MC", "Enter Cavern" in 30 files, the manifest, the service worker, the package name |

## Target layout

```
app/                         routes only — each page.tsx thin: load, compose, done
  (public)/                  route group (no URL change): landing, showcase, legal, share pages
  (suite)/                   route group: everything signed in
  admin/  api/  auth/  m/
components/
  shell/                     ClientShell, Island (EcosystemTaskbar), MobileTabBar, CommandPalette,
                             ShortcutsOverlay, NotificationBell, CustomCursor, ThemeInitializer,
                             ServiceWorkerRegister, ErrorReporter, GlobalAudioWidget, Navigation
  ui/                        Avatar, Button, Input, Textarea, EmptyState, SectionLabel, Toast,
                             Confirm, AnimatedSection, GrainOverlay, ParticleBackground,
                             PhotoGallery, ThemePicker, MotionPreference
  <domain>/                  editor, studio, lounge, projects, jobs, crew, portfolio, landing,
                             share, admin, account, brief, guides, breakdown, formats, crafts …
lib/
  os/                        boot, session, active project, providers (Presence, Pill, Spotify move here)
  supabase/                  client, public client, generated types, per-table modules
  <domain>/                  crafts/, formats/, themes/, search/, legal/, onboarding/,
                             account/ (+ password-strength), …
  hooks/                     every shared hook (useEscapeKey, useLoad, useOnChange, …)
  util/                      color, api-rate-limit, validation
docs → .cavern-intelligence/archive/   (old audits kept, out of the root)
```

Route groups `(public)` and `(suite)` change no URL. They give each side its
own `layout.tsx`: public pages drop the suite providers (smaller, faster
share pages), and the suite layout owns the island and tab bar.

## Phases

| # | PR | Size | What moves | Risk |
|---|---|---|---|---|
| 1 | ✓ **Clean-up** (done) | S | delete the 2 dead files; `types/screenplay.ts` → `lib/scriptos/types.ts`; `docs/` → `.cavern-intelligence/archive/` | none — no behaviour |
| 2 | ✓ **Brand: The Cavern** (done) | M | every product string, metadata, manifest (`name` "The Cavern", `short_name` "Cavern"), service worker texts, legal pages (`product`: The Cavern; maker: Misfits Cavern), Discord sender, Spotify player name, export filename, package name `the-cavern`, README / AGENTS / docs. Footer and legal say "The Cavern — by Misfits Cavern". Needs the mark (decision 1) | low; e2e text assertions updated |
| 3 | **iPhone install** (3.13, PWA part) | M | ~~PNG icons~~ (done in phase 2), splash images, Add to Home Screen coaching on phones, then Web Push (subscriptions table, VAPID, an Edge Function sender) | low → medium (push is new infra) |
| 4 | **Shell and primitives** | M | `components/` root → `components/shell/` and `components/ui/`; `lib/context` → `lib/os`; loose `lib/*.ts` → domain folders and `lib/hooks`, `lib/util`. `git mv` (history kept) + a codemod for imports | low — moves only; typecheck catches every missed import |
| 5 | **Route groups** | S/M | `app/(public)` and `app/(suite)` with their own layouts | medium — provider order; full e2e |
| 6 | **One permission model** (3.10) | S | delete the unused model; one `useProjectRole(projectId)` → owner / lead / contributor / viewer / none, mirroring RLS | low |
| 7 | **Thin pages** | M each | split editor, Lounge, project hub, landing, jobs, press kit into `components/<domain>/` parts; data into `lib/` as they go (3.2) | medium — one page per PR, e2e per page |
| 8 | *Optional* **Studio routes** | M | `/studio/[tab]/[view]` instead of `?tab=&view=` (old URLs redirect): code-split per tab, real back button | medium |

Phases 1–2 first, since everything after is easier once the name is settled.
Phase 3 can run beside 4–7.

## Decisions

Made by the owner, 2026-10-06:

1. **The mark** — "MC" goes. Two ideas: two mountain peaks that make the M,
   lit from one side so they cast shadow, or a crescent moon that makes the
   C. Drawn as three concepts — A peaks, B moon crest, C moon over peaks —
   in `brand/concepts/` (`sheet.png`: both themes, the iPhone icon, favicon
   sizes, the landing lockup; rebuild with `node scripts/brand-sheet.mjs`).
   Owner's direction (round two): A's peaks with a small crescent in the
   distance behind them, drawn as the Rocky Mountains — the brand was born
   in Alberta. Rounds two and three in `brand/concepts/` (`rockies.png`,
   `rockies-3.png`), four and five. **Chosen: R13** — the moonlit pyramid
   and slab with the crescent (`brand/mark/`: full, small cut, one colour,
   and the app/iPhone icons). Wired into the app in phase 2
   (`components/brand/Mark.tsx`, `public/` icons).
2. **The voice** — keep "Welcome back, misfit." The brand speaks.
3. **The landing page** — "THE CAVERN" as the hero, "by Misfits Cavern"
   under it.
4. **Repo** — no rename now. The owner makes a new repository at launch
   (see *Launch repository* below).

Decided since, and still open:

5. **Internal prefixes** — decided 2026-10-06: **keep `mc_` / `mc-`** (localStorage keys, CSS helpers, DOM events). Internal only; renaming would wipe saved device settings for nothing anyone sees.
6. **Domain** — is there one for The Cavern?
7. ~~Agent leftovers~~ — removed 2026-10-06 (owner: "remove old tools"): `.harnesskit/` and `progress/`, a September agent harness nothing referenced.

## Launch repository

The owner wants the launch repository to stand up to investors', buyers'
and media companies' technical due diligence. Two honest ways to start it:

- **Carry the history over** (recommended): push this repository's history
  into the new one. It's the provenance record — who wrote what, when, and
  every decision's PR — which is what diligence teams read. Clean practice
  from now on makes the recent history read well.
- **Start fresh, archive this one**: one "initial import" commit in the new
  repository, this one kept private and read-only as the record of how it
  was built.

Never rewrite history to look different from how it happened (backdated
commits, invented authors, squashed-away contributors): diligence teams
check, and it costs more trust than it gains. Note that much of the code
was written with AI assistance (commits carry `Co-Authored-By` trailers) —
say so plainly; acquirers ask about code provenance.

What makes the repository launch-grade, and can start **here, now**, so it's
real practice by launch (BACKLOG 3.16):

| Practice | State |
|---|---|
| Every change through a reviewed PR with CI green | ✓ (CI: lint, types, 472 unit, 289 integration, 39 e2e, schema drift) |
| Architecture and product docs | ✓ (`.cavern-intelligence/`, the bible) |
| Branch protection on `main`, required checks | owner (GitHub settings) |
| Conventional commit messages (`feat:`, `fix:`, `docs:`…) | partly — make it the rule |
| Releases: semantic versions, tags, a `CHANGELOG.md` | missing |
| `LICENSE` (proprietary), `SECURITY.md`, `CODEOWNERS` | missing |
| Decision records (why X over Y) | partly (PR bodies, STATE history) — an `adr/` folder |
| Secret scan of the whole history; dependency licence report (SBOM) | GitGuardian on PRs; full-history scan + SBOM missing |
| Test coverage report in CI | missing |
| Signed commits | owner (GitHub settings + a signing key) |
