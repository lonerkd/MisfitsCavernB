# 8 · Public pages and sharing

What a signed-out visitor (Riley, logged out) can see: the front door, the
legal pages, and the links people choose to share. Every public surface reads
through a narrow gate — an exact token checked by a definer function, or a
policy on an explicit "published" flag. Security model:
[`database-and-security.md`](../database-and-security.md) §2.C–D.

## Screens

| | Desktop | Phone |
|---|---|---|
| `/` landing | <img src="screens/public-landing--desktop.webp" width="420"> | <img src="screens/public-landing--phone.webp" width="140"> |
| `/shared/[token]` project lookbook | <img src="screens/public-shared-project--desktop.webp" width="420"> | <img src="screens/public-shared-project--phone.webp" width="140"> |
| `/p/[token]` press kit | <img src="screens/public-press-kit--desktop.webp" width="420"> | <img src="screens/public-press-kit--phone.webp" width="140"> |
| `/s/[token]` shared script | <img src="screens/public-shared-script--desktop.webp" width="420"> | <img src="screens/public-shared-script--phone.webp" width="140"> |
| `/privacy` | <img src="screens/public-privacy--desktop.webp" width="420"> | <img src="screens/public-privacy--phone.webp" width="140"> |
| `/terms` | <img src="screens/public-terms--desktop.webp" width="420"> | <img src="screens/public-terms--phone.webp" width="140"> |

`/showcase` is in §7.

## Pages

| Route | Rendered | What it shows | Gate |
|---|---|---|---|
| `/` | client | the brand hero, "Script to Screen — one integrated studio", pipeline, live platform totals and ticker, module tiles with real recent work, footer (© Peter Olowude · Misfits Cavern Productions, Privacy, Terms) | `get_platform_stats`, `get_recent_work` (samples excluded) |
| `/shared/[token]` | **server**, `force-dynamic`, Open Graph metadata | a project's lookbook: title, logline, creator, published items under their scenes, cast & crew and laurels (press kit) — never notes or unpublished items | `get_shared_project`, `get_shared_lookbook`, `get_press_kit`: exact token + visibility link/public |
| `/m/[id]` | route handler | a published file: 302 to a fresh signed URL (5 min images, 1 h video/audio), `no-store` | `get_published_media` + storage "shared read" policy |
| `/p/[token]` | client | a portfolio piece as a press kit: media, blocks from the pitch board, credits | `portfolio_projects` / `portfolio_blocks` / `portfolio_media` are readable by everyone (all portfolio work is public by design) |
| `/s/[token]` | client | a screenplay, read-only, formatted, with its author | anon policy `scripts.shared = true` — see the gap below |
| `/privacy`, `/terms` | static | the policies; operator, province, contact and effective date from `lib/legal.ts` | — |

Framing: every page sends `frame-ancestors 'self'` except the share pages
and `/m`, which anyone may embed.

## States

Each share page: loading · found · **not found** (wrong token, sharing turned
off, or the project back to Team/Private — the same answer for all, so a
token can't be probed) · empty (nothing published yet).

## Rules

- Turning sharing off takes effect at once: nothing is cached (`/m` is
  `no-store`, `/shared` is dynamic).
- The owner decides what's published (`media.shared`, `media_guard`).
- Sample data never appears on the landing page or the showcase.

## Known gaps

- **Shared scripts can be listed without their link.** The anon policy
  reads every row with `shared = true`, so the token isn't a secret: anyone
  with the public API key can fetch all shared scripts. Fix: drop the anon
  policy (and the `shared = true` arm of the signed-in one) and read through
  a definer `get_shared_script(token)`, as `/shared` does. Nothing in the app
  turns `shared` on today (no share button in the editor), so the exposure is
  whatever rows were shared earlier — count them in production first.
  BACKLOG 3.3 (security).
- `/s` has no way in from the app: the editor has no "share script" control
  (the feature is half there — finish it, per "No Mocks"; 3.3).
- `/p` and `/s` render on the client: no link previews when pasted into a
  chat (`/shared` has them). Server-render both (3.11).
- No e2e opens `/s/[token]`; `/m/[id]` and the API routes are covered only
  by integration tests (3.11).
- The landing page is the brand ("MISFITS CAVERN"); product naming → The
  Cavern (3.12). `/showcase` copy still says "Every element of Misfits
  Cavern…".
