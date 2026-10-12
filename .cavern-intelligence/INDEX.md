# .cavern-intelligence — the map

The one source of truth for The Cavern, for every agent and person, local or
cloud. Nothing about how to work here lives anywhere else: the tool entry
files at the root are generated from [`RULES.md`](RULES.md) by
`npm run sync-intel`, and CI fails if they drift.

## Layers — each fact lives in exactly one

| Layer | File(s) | Holds | Changes |
|---|---|---|---|
| **Rules** | [`RULES.md`](RULES.md) | how to work: non-negotiables, the change cycle, personas, where to look | rarely, by decision |
| **Now** | [`STATE.md`](STATE.md) · [`BACKLOG.md`](BACKLOG.md) · [`sessions/`](sessions/README.md) · [`STATE-history.md`](STATE-history.md) | the handoff · every open task, scoped · one note per PR · sessions before 2026-10-11 | the handoff when it changes; BACKLOG and a new session note every PR |
| **What it is** | [`bible/`](bible/README.md) | every part of the suite: purpose, screens, states, rules, connections, gaps; the generated inventory; the audit | when a part changes |
| **How it works** | the deep docs below | the engineering of each system | with the code |
| **Product and brand** | [`overview-and-goals.md`](overview-and-goals.md) · [`brand/`](brand/README.md) · [`restructure-proposal.md`](restructure-proposal.md) | vision · the mark and the brand decisions · the plan for the repo | by decision |
| **Generated** | `sync-manifest.json` (not committed — it changes on every run) · `bible/inventory.md` · `bible/screens/` | file map · what each route touches · every screen | `npm run sync-intel` · `npm run bible` · `npm run bible:shots` |

## Deep docs (how it works)

| File | Read when |
|---|---|
| [`tools-and-access.md`](tools-and-access.md) | tools, MCP servers, permissions, skills, env, CI, the drift check |
| [`routing-and-surface.md`](routing-and-surface.md) | routes, gating tiers, providers, the island, layers |
| [`conventions.md`](conventions.md) | writing code: data layer, client/server, feedback, prefs, TS/styling, migrations, effects |
| [`database-and-security.md`](database-and-security.md) | schema, RLS, `internal` helpers, sharing, the definer allowlist, the migration workflow |
| [`design-tokens.md`](design-tokens.md) | colours, type, scales, components, themes, accessibility |
| [`scriptos-engine.md`](scriptos-engine.md) | the script editor: parser, co-writing, offline, the writing loop |
| [`studio-and-preproduction.md`](studio-and-preproduction.md) | the Studio: library, scenes, production, on set, post, sharing |
| [`project-brief.md`](project-brief.md) | the brief and project context every tool adapts to |
| [`lounge-and-audio.md`](lounge-and-audio.md) | the Lounge, channels, voice |

## Who reads what

| Tool | Entry file | It is |
|---|---|---|
| Claude Code (local and cloud) | `CLAUDE.md` | `@`-imports `RULES.md`, `STATE.md`, `BACKLOG.md` and `INDEX.md`, plus Claude-only notes — generated |
| Codex, Cursor, Cline, Windsurf, Zed, Gemini, Jules, Copilot's agent | `AGENTS.md` | a generated mirror of `RULES.md` |
| GitHub Copilot chat | `.github/copilot-instructions.md` | a generated pointer here |
| People | `README.md` | setup and commands; points here |

Claude skills live in `.claude/skills/` (the one place Claude Code loads
them from); they're listed in `tools-and-access.md` §4. Adding a tool: add
its entry file to `adapters()` in `scripts/sync-intel.js` — never a
hand-written copy of the rules.

## The contract

- A change to files, architecture or access updates the doc that owns it in
  the same PR, then `npm run sync-intel`, then a note in `sessions/` and `BACKLOG.md`.
- One fact, one home. If you find the same thing in two places, keep the
  owner (the table above) and link to it from the other.
