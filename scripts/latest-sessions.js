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

// When each note last changed: two git calls for all of them (one log, one status), not two per note (a hundred notes took minutes on Windows).
const REL = '.cavern-intelligence/sessions';
const committed = new Map();
let at = 0;
for (const line of git('log', '--name-only', '--format=@%ct', '--', REL).split('\n')) {
  if (line.startsWith('@')) at = Number(line.slice(1)) || 0;
  else if (line && !committed.has(line)) committed.set(line, at);
}
const unsaved = new Set(git('status', '--porcelain', '--', REL).split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')));
const stamp = (f) => {
  const rel = `${REL}/${f}`;
  return unsaved.has(rel) ? Number.MAX_SAFE_INTEGER : committed.get(rel) || 0;
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
// The nightly review's open findings are the first task of the day (best effort: no gh, no network, no review: say nothing).
try {
  const rows = JSON.parse(execFileSync('gh', ['issue', 'list', '--label', 'nightly-review', '--state', 'open', '--limit', '1', '--json', 'number,title,body,url'], { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }));
  if (rows[0]) {
    const open = String(rows[0].body).split('\n').filter((l) => /^\s*- \[ \]/.test(l));
    console.log(`START HERE: ${rows[0].title} (${rows[0].url}) has ${open.length} unchecked finding(s): fix them first, tick them off.`);
    for (const l of open.slice(0, 25)) console.log('  ' + l.trim().slice(0, 220));
    if (open.length > 25) console.log(`  ... and ${open.length - 25} more`);
    console.log('');
  }
} catch { /* nothing to say */ }
console.log(`Latest session notes (newest first; more in .cavern-intelligence/sessions/):\n`);
for (const f of files) {
  console.log(`--- ${f} ---\n${fs.readFileSync(path.join(DIR, f), 'utf8').trim()}\n`);
}
