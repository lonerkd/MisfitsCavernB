// Regenerates .cavern-intelligence/island-coverage.md from the source. A small Node wrapper, so the same command works in cmd.exe, PowerShell and a POSIX shell.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vitest", "run", "lib/island/coverage.test.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, UPDATE_ISLAND_COVERAGE: "1" },
});
process.exit(result.status ?? 1);
