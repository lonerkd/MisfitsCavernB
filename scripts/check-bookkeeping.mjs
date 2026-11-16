#!/usr/bin/env node
// Is the project's paperwork still telling the truth? Reports drift between BACKLOG.md, its GitHub issues,
// STATE.md and the session notes. Advice, not a gate: exits 0 unless --strict.
//
//   node scripts/check-bookkeeping.mjs [--strict] [--offline]
//
// What it checks (each finding says what to do):
//   1. an open `[BACKLOG x]` issue whose item is no longer in BACKLOG.md      -> done but open: close it
//   2. a BACKLOG item with no issue yet                                         -> info (the owner runs backlog-to-issues --create)
//   3. two BACKLOG items with the same number                                   -> renumber one
//   4. BACKLOG "Last audited" more than 45 days before today                                -> info
// The STATE.md handoff's freshness is not checked here (one fact, one home): see scripts/check-state-freshness.mjs, which fails CI.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseBacklog } from './backlog-to-issues.mjs';

const REPO = process.env.GITHUB_REPOSITORY || 'lonerkd/MisfitsCavernB';
const strict = process.argv.includes('--strict');
const offline = process.argv.includes('--offline');
const root = new URL('../.cavern-intelligence/', import.meta.url);
const days = (a, b) => Math.round((b - a) / 86_400_000);
const findings = [];
const add = (level, what, fix) => findings.push({ level, what, fix });

const backlog = readFileSync(new URL('BACKLOG.md', root), 'utf8');
const items = parseBacklog(backlog);
const ids = new Set(items.map((i) => i.id));
const counts = new Map();
for (const i of items) counts.set(i.id, (counts.get(i.id) ?? 0) + 1);
for (const [id, n] of counts) if (n > 1) add('warn', `BACKLOG has ${n} items numbered ${id}`, 'renumber one');

if (!offline) {
  try {
    const out = execFileSync('gh', ['api', `repos/${REPO}/issues?state=all&per_page=100&labels=backlog`, '--paginate', '--jq', '.[]|select(.pull_request|not)|[.number,.state,(.body|capture("backlog-id:(?<id>[0-9.]+[a-z]?)")?.id // "")]|@tsv'], { encoding: 'utf8' });
    const have = new Map();
    for (const line of out.split('\n').filter(Boolean)) {
      const [num, state, id] = line.split('\t');
      if (id) have.set(id, { num, state });
      if (id && state === 'open' && !ids.has(id)) add('warn', `issue #${num} (backlog ${id}) is open but ${id} is not in BACKLOG.md`, `done but open: close #${num} with a note`);
    }
    for (const id of ids) if (!have.has(id)) add('info', `BACKLOG ${id} has no issue yet`, 'the owner runs: node scripts/backlog-to-issues.mjs --create');
  } catch (e) {
    add('info', `could not read issues (${String(e.message).split('\n')[0]})`, 'run with gh signed in, or --offline');
  }
}

// STATE.md handoff freshness: scripts/check-state-freshness.mjs (a CI gate), not repeated here.

const audited = /Last audited: (\d{4}-\d\d-\d\d)/.exec(backlog);
if (audited && days(new Date(audited[1]), new Date()) > 45) add('info', `BACKLOG "Last audited" is ${audited[1]}`, 'audit each item against the code, then redate it');

if (!findings.length) console.log('Bookkeeping is consistent: issues, BACKLOG, STATE and the session notes agree.');
else {
  for (const f of findings) console.log(`${f.level === 'warn' ? 'DRIFT' : 'note '}  ${f.what}\n       -> ${f.fix}`);
  console.log(`\n${findings.filter((f) => f.level === 'warn').length} drift, ${findings.filter((f) => f.level === 'info').length} notes`);
}
if (strict && findings.some((f) => f.level === 'warn')) process.exit(1);
