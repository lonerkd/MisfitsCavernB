# Session — 2026-10-12: dim text on the active surface, Paper and Lagoon

**Found:** `--fg-dim` on `--bg-4` measured 4.4:1 in Paper and 4.3:1 in Lagoon (AA needs 4.5). The theme test only checked `--fg` on `--bg`.

**Changed:** Paper `--fg-dim` alpha .64 → .70, Lagoon .66 → .72. New test in `lib/themes/themes.test.ts`: every theme's `--fg-dim`, flattened over `--bg` … `--bg-4`, is at least 4.5:1. It failed for exactly those two themes before the change.

**Verified:** `lib/themes` tests 39/39, typecheck, lint (0 errors). **Not verified:** `npm run build`, e2e axe run in Paper, how the lighter alpha looks on screen.
