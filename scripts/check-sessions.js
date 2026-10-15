#!/usr/bin/env node
// Lists merged PRs that left no session note. A squash-merge commit that adds
// or changes a file in .cavern-intelligence/sessions/ counts as logged.
// Usage: node scripts/check-sessions.js [--since=YYYY-MM-DD]   (exit 1 on gaps)
// A note naming the PR as #N also counts. Docs-only commits and dependency bumps from bots are exempt.

const fs = require('fs');
const { execFileSync } = require('child_process');

const since = (process.argv.find((a) => a.startsWith('--since=')) || '--since=2026-10-10').slice(8);
const out = execFileSync(
  'git',
  ['log', `--since=${since}`, '--no-merges', '--format=@@%h|%s', '--name-only'],
  { encoding: 'utf8' },
);

// A note that names a PR as "#N" also counts (for PRs merged without one).
const dir = '.cavern-intelligence/sessions';
const notesText = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => fs.readFileSync(`${dir}/${f}`, 'utf8')).join('\n');

const gaps = [];
let cur = null;
// Notes became the rule with PR #168; earlier PRs are not expected to have one.
const FIRST_PR = 168;
const flush = () => {
  const pr = Number(/\(#(\d+)\)$/.exec(cur?.subject ?? '')?.[1]);
  if (cur && pr >= FIRST_PR && !cur.logged && !new RegExp(`#${pr}\\b`).test(notesText) && !/^(docs|chore\(deps)/.test(cur.subject)) gaps.push(cur);
};
for (const line of out.split('\n')) {
  if (line.startsWith('@@')) {
    flush();
    const [sha, ...rest] = line.slice(2).split('|');
    cur = { sha, subject: rest.join('|'), logged: false };
  } else if (cur && line.startsWith('.cavern-intelligence/sessions/')) cur.logged = true;
}
flush();

if (!gaps.length) console.log(`Every PR since ${since} has a session note.`);
else {
  console.log(`PRs since ${since} with no session note:`);
  for (const g of gaps) console.log(`  ${g.sha}  ${g.subject}`);
  process.exit(1);
}
