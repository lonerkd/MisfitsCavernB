# Knowledge Sync Protocol

## 1. Universal Agent Compatibility

Misfits Cavern uses an **agent-agnostic** knowledge architecture. Every AI coding tool reads `AGENTS.md` at the repo root natively:

| Tool | Reads | Function |
|---|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` → references `AGENTS.md` | IDE inline suggestions |
| Claude Code | `CLAUDE.md` → references `AGENTS.md` | CLI agent loop |
| Cline / Roo Code | `AGENTS.md` | Autonomous CLI agent |
| Cursor | `AGENTS.md` | IDE agent |
| Windsurf | `AGENTS.md`, `.windsurfrules` | IDE agent |
| Zed | `AGENTS.md` | Editor agent |
| OpenCode | `AGENTS.md`, `.opencode/` | CLI agent loop |
| Gemini Code Assist | `AGENTS.md` | IDE agent |
| Codex / Codeium | `AGENTS.md` | IDE agent |

All tools share **one source of truth**: `AGENTS.md` (universal rules) + `.cavern-intelligence/` (deep knowledge hub). No duplicated instructions across tools.

## 2. Multi-Suite Cooperation

Misfits Cavern is developed across multiple active environments:
- **VS Code:** Local coding, manual reviews, and extensions.
- **Claude Code / OpenCode:** Autonomous command-line agent loops.
- **Cline / Cursor / Windsurf:** AI IDE assistants.
- **Any other tool reading AGENTS.md.**

To prevent documentation drift, all human developers and AI coding agents must treat `.cavern-intelligence/` as the central **Source of Truth** and **Codebase Memory Gutter**.

---

## 3. The Golden Rules for AI Agents

Whenever an AI coding agent (Claude Code, Antigravity, OpenCode) initializes a session or is assigned a task:

1. **Read the Intel Directory First:** The agent must inspect `.cavern-intelligence/overview-and-goals.md` and `.cavern-intelligence/sync-manifest.json` before making assumptions about the workspace or writing files.
2. **Synchronize After Modifications:** If any files are created, renamed, or deleted, or if core architectures are refactored, the agent must update the relevant files in `.cavern-intelligence/` and run `npm run sync-intel`.
3. **Commit Together:** Any changes made to codebases should be committed in the same pull request alongside their corresponding documentation updates. This ensures that GitHub, local branches, and Vercel builds always match.
4. **Follow the "No Mocks" rule:** Ensure any code written has real persistence matching the description in the database overview.

---

## 4. Machine-Readable Syncing
- The file `.cavern-intelligence/sync-manifest.json` acts as an automated registry for external tools.
- It provides a tree mapping of folder blocks to their core technologies, dependencies, and synchronization states.
- Running `node scripts/sync-intel.js` will automatically scan the workspace and reconstruct this manifest, ensuring that file counts, structures, and module definitions are always accurate.
- Other AI engines can parse `sync-manifest.json` to immediately gain context of the folder structure without executing recursive filesystem lists.
