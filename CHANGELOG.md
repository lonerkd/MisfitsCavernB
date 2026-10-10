# Changelog

All notable changes to The Cavern are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Release process:** an entry moves from `Unreleased` to a version with a date
when a `vX.Y.Z` tag is pushed and the matching GitHub release is created.
`package.json` carries the same version. Tags are never moved.

**History before 2026-10-08** (when this file was introduced, BACKLOG 3.16)
lives in the git history and in `.cavern-intelligence/STATE.md`; the Baseline
entry below summarizes it.

## [Unreleased]

_Nothing yet._

## [Baseline] — 2026-10-08

First entry. The repository up to this point, summarized:

### Added
- **The suite itself:** ScriptOS screenwriting editor (Fountain parser,
  revisions, exports), breakdown and scheduling, call sheets, money and
  paperwork, the Lounge (forums, DMs, WebRTC voice), Jobs, Portfolio, Promos,
  Studio, Today (the day on set, offline), admin and analytics — one
  interconnected system on Next.js 16 (App Router, React 19) and Supabase
  (Postgres + RLS + Auth + Realtime + Storage).
- **Security floor:** RLS on every table from birth, tested as three personas
  (owner / crew / outsider); `internal` schema helpers for policy decisions;
  definer-function allowlist; production schema drift check in CI.
- **Quality gates:** lint with React Compiler rules as errors, `tsc`,
  unit + jsdom hook tests, persona integration tests against the local
  database, Playwright e2e (sharded, balanced; docs-only PRs skip the slow
  jobs), and a per-page bundle budget (`npm run budget`).
- **Knowledge hub:** `.cavern-intelligence/` — architecture, DB/RLS, routing,
  conventions, open backlog, session state.
- **Script share links** (token-only access) and the legal pages.

### Changed
- The suite was renamed and restructured into **The Cavern** (phases 1–2,
  PR #140): one source of rules, R13 brand mark, bible and 2026-10-06 audit.
- Next 16 / React 19, built with webpack (#114); periodic dependency updates
  (Dependabot groups); design scales and the island dock (#96).

### Fixed
- Database advisor findings (sound effects stayed uploadable to the wrong
  project, policy and index improvements, #116); low-contrast labels; Studio
  tab scroll on narrow screens (#111); dialogs above the dock (#117);
  lint-found effect-dependency and ref issues (#118, #120, #121, #127).

### Security
- `has_discord_webhook` gated to people who can manage the channel (#126);
  drift-check login moved behind `PRODUCTION_DB_URL` (#129, #134).

[Unreleased]: https://github.com/lonerkd/MisfitsCavernB/compare/v0.0.1...HEAD
[Baseline]: https://github.com/lonerkd/MisfitsCavernB/commits/main
