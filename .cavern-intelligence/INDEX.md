# .cavern-intelligence — Knowledge Hub Index

The single source of truth for Misfits Cavern. Any AI agent (Claude Code,
Copilot, Cursor, Cline, Codex, Gemini, …) or human should start here. Adapter
files (`CLAUDE.md`, `.github/copilot-instructions.md`) and the universal
`AGENTS.md` are thin pointers into this directory — knowledge is **not**
duplicated across them.

## Read order at session start

1. `../AGENTS.md` — universal rules (stack, core rules, workflow, personas)
2. `STATE.md` — current iteration, last changes, known issues (**living doc**)
3. This `INDEX.md` — route to the file you need
4. `sync-manifest.json` — machine-readable file map (regen: `npm run sync-intel`)

## Files

| File | Read when… |
|---|---|
| `CLAW.md` | Session start — condensed working rules & product shape |
| `overview-and-goals.md` | Understanding product vision & the interconnected modules |
| **`tools-and-access.md`** | You need to know what tools/MCP/permissions/skills/env exist and how access is wired |
| **`routing-and-surface.md`** | Working on any route — gating tiers, page/API map, providers, module ownership |
| **`conventions.md`** | Writing code — data-access layer, client/server, toast/confirm, prefs, TS/styling, migrations, git |
| `database-and-security.md` | DB schema, RLS architecture, `internal` helpers, sharing security |
| `design-tokens.md` | UI work — colors, typography, component classes, aesthetic |
| `playbook.md` | The detailed 7-step change cycle |
| `scriptos-engine.md` | ScriptOS editor — Fountain parser, realtime sync, offline storage |
| `lounge-and-audio.md` | Lounge chat + channels + WebRTC voice |
| `studio-and-preproduction.md` | The Studio — boards, breakdown, casting, scheduling |
| `sync-protocol.md` | Multi-agent / multi-tool cooperation & keeping this hub in sync |
| `STATE.md` | Current iteration state (update every session) |
| `sync-manifest.json` | Generated file registry (do not hand-edit) |

**Bold** = tools / routing / conventions ("the stuff usually inline"), added so
every AI has the full operating picture, not just product docs.

## The contract

- Treat this directory as **Source of Truth** and codebase memory.
- Any change to files, architecture, or access **must** update the relevant doc
  here in the same PR, then run `npm run sync-intel` and update `STATE.md`.
- Adapters stay thin: if a rule belongs to all tools, it goes in `AGENTS.md` or
  here — never copied into `CLAUDE.md`/`copilot-instructions.md`.
