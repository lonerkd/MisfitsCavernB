// Regenerates .cavern-intelligence/parser-reference.md from the code. A small Node wrapper rather than
// `VAR=1 vitest …` in package.json, so the same command works in cmd.exe, PowerShell and a POSIX shell.
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['vitest', 'run', 'lib/scriptos/reference.test.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, UPDATE_PARSER_REFERENCE: '1' },
});
process.exit(result.status ?? 1);
