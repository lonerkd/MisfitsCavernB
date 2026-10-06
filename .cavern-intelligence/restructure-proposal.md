# Restructure proposal — folders, logic, branding

**Status: proposal, waiting for the owner's sign-off. No file has moved.**
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
| Stray top-level folders | `hooks/` (one file, unused), `types/` (one file), `progress/` and `.harnesskit/` (leftovers of an earlier agent harness), `docs/` (July–September audits the bible supersedes) |
| Dead files | `hooks/useColorExtractor.ts`, `components/ui/AmbientGradient.tsx` (nothing imports them) |
| `components/` root is a pile | 22 files mixing the app shell (island, palette, cursor, bell, service worker, error reporter, audio widget) with UI primitives (Avatar, Toast, Confirm, EmptyState…) |
| `lib/` root is a pile | 17 loose files (`crafts` + `crafts-core`, `formats` + `formats-core`, `themes`, `search`, `legal`, `onboarding`, `color`, `password-strength`, `useEscapeKey`, `api-rate-limit`); one-file folders (`lib/types`, `lib/storage`); providers split between `lib/context` and `lib/os` |
| Giant pages | `editor` 1610 lines, `lounge` 1530, `projects/[id]` 1255, `/` 878, `jobs` 858, `p/[token]` 779, `projects` 756 |
| Two permission models | RLS (real) vs `lib/os/permissions.ts` + `access-matrix.ts` (unused) — BACKLOG 3.10 |
| Data access in pages | 30 files call `supabase.from` directly — BACKLOG 3.2 |
| Mixed brand | "Misfits Cavern", "MISFITS CAVERN", "MC", "Enter Cavern", "misfit" in 30 files, the manifest, the service worker, the package name |

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
| 1 | **Clean-up** | S | delete the 2 dead files; `types/screenplay.ts` → `lib/scriptos/types.ts`; remove `progress/`, `.harnesskit/` (agent leftovers — confirm); `docs/` → `.cavern-intelligence/archive/` | none — no behaviour |
| 2 | **Brand: The Cavern** (3.12) | M | every product string, metadata, manifest (`name` "The Cavern", `short_name` "Cavern"), service worker texts, legal pages (`product`: The Cavern; maker: Misfits Cavern), Discord sender, Spotify player name, export filename, package name `the-cavern`, README / AGENTS / docs. Footer and legal say "The Cavern — by Misfits Cavern". Needs the mark (decision 1) | low; e2e text assertions updated |
| 3 | **iPhone install** (3.13, PWA part) | M | PNG icons (180 apple-touch, 192/512 maskable), splash images, Add to Home Screen coaching on phones, then Web Push (subscriptions table, VAPID, an Edge Function sender) | low → medium (push is new infra) |
| 4 | **Shell and primitives** | M | `components/` root → `components/shell/` and `components/ui/`; `lib/context` → `lib/os`; loose `lib/*.ts` → domain folders and `lib/hooks`, `lib/util`. `git mv` (history kept) + a codemod for imports | low — moves only; typecheck catches every missed import |
| 5 | **Route groups** | S/M | `app/(public)` and `app/(suite)` with their own layouts | medium — provider order; full e2e |
| 6 | **One permission model** (3.10) | S | delete the unused model; one `useProjectRole(projectId)` → owner / lead / contributor / viewer / none, mirroring RLS | low |
| 7 | **Thin pages** | M each | split editor, Lounge, project hub, landing, jobs, press kit into `components/<domain>/` parts; data into `lib/` as they go (3.2) | medium — one page per PR, e2e per page |
| 8 | *Optional* **Studio routes** | M | `/studio/[tab]/[view]` instead of `?tab=&view=` (old URLs redirect): code-split per tab, real back button | medium |

Phases 1–2 first, since everything after is easier once the name is settled.
Phase 3 can run beside 4–7.

## Decisions for the owner

1. **The mark.** "MC" goes. What replaces it on the island, the favicon and
   the iPhone icon — a "C", a cave/aperture glyph, or a wordmark you have?
   (I can draw two or three options to pick from.)
2. **The voice.** Keep "Welcome back, misfit." / "Join the cavern." — the
   brand speaking — or neutral sign-in copy?
3. **The landing hero.** "THE CAVERN" with "by Misfits Cavern" under it — or
   keep the company wordmark big on the front door and the product name in
   the app?
4. **Repo and package names.** Rename the GitHub repo `MisfitsCavernB` →
   `the-cavern` (GitHub redirects the old URL; Vercel follows)? That one is
   in GitHub settings, yours to do.
5. **Internal prefixes.** Keep `mc_` / `mc-` (recommended), or migrate them
   (reads old keys once, writes new).
6. **Domain.** Is there one for The Cavern? Metadata, emails, the share links
   and the iPhone app name follow it.
7. **Agent leftovers.** OK to delete `.harnesskit/` and `progress/`?
