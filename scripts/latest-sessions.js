#!/usr/bin/env node
// Prints the newest session notes (.cavern-intelligence/sessions/*.md) so a
// session starts knowing what the last few PRs did, and says whether this
// checkout is behind origin/main. Used by the SessionStart hook in
// .claude/settings.json. Usage: node scripts/latest-sessions.js [n]
// "Newest" is by the commit that added the note (file names only carry the
// date, so two notes from one day would otherwise sort by slug); a note not
// yet committed counts as newest.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, '.cavern-intelligence', 'sessions');
const n = Math.max(1, Number(process.argv[2]) || 3);

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

if (!fs.existsSync(DIR)) process.exit(0);
const names = fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f));
if (!names.length) process.exit(0);

const stamp = (f) => {
  const rel = `.cavern-intelligence/sessions/${f}`;
  if (git('status', '--porcelain', '--', rel)) return Number.MAX_SAFE_INTEGER;
  return Number(git('log', '-1', '--format=%ct', '--', rel)) || 0;
};
const files = names
  .map((f) => ({ f, t: stamp(f) }))
  .sort((a, b) => b.t - a.t || b.f.localeCompare(a.f))
  .slice(0, n)
  .map((x) => x.f);

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const behind = git('rev-list', '--count', 'HEAD..origin/main');
const dirty = git('status', '--porcelain', '--untracked-files=no').split('\n').filter(Boolean).length;
const sync = [`on ${branch || 'unknown branch'}`];
if (behind && behind !== '0') sync.push(`${behind} commit(s) behind origin/main (git fetch/pull before starting)`);
if (dirty) sync.push(`${dirty} uncommitted change(s)`);

console.log(`Sync: ${sync.join('; ')}.`);
console.log(`Latest session notes (newest first; more in .cavern-intelligence/sessions/):\n`);
for (const f of files) {
  console.log(`--- ${f} ---\n${fs.readFileSync(path.join(DIR, f), 'utf8').trim()}\n`);
}
