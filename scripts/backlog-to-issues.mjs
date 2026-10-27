#!/usr/bin/env node
// Turn the open items in BACKLOG.md §3 into labelled GitHub issues, one per item.
//
//   node scripts/backlog-to-issues.mjs                 dry run: print what would be created
//   node scripts/backlog-to-issues.mjs --create        create the missing issues (and the labels)
//   node scripts/backlog-to-issues.mjs --only 3.31,3.29 limit to those items
//
// Idempotent: every issue carries a hidden `backlog-id` marker, and an item that already has an
// issue (open or closed) is skipped. Nothing is ever edited or closed. Needs the `gh` CLI, signed in.
// An issue is NOT given the `agent-ready` label here: the owner adds it after reading the issue.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REPO = process.env.GITHUB_REPOSITORY || 'lonerkd/MisfitsCavernB';
const args = process.argv.slice(2);
const create = args.includes('--create');
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? new Set(String(args[onlyArg + 1] ?? '').split(',').filter(Boolean)) : null;

const gh = (ghArgs, input) =>
  execFileSync('gh', ghArgs, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });

const LABELS = [
  ['backlog', '5319e7', 'An item from .cavern-intelligence/BACKLOG.md'],
  ['size/S', 'c2e0c6', 'An hour or two'],
  ['size/M', 'fef2c0', 'About a session'],
  ['size/L', 'f9d0c4', 'Several sessions'],
  ['size/XL', 'e99695', 'A long project'],
  ['needs-owner', 'd93f0b', 'Waiting on a decision or action by the owner'],
  ['agent-ready', '0e8a16', 'Read by the owner; an agent may pick it up'],
  ['agent-working', 'fbca04', 'An agent has a branch or PR open for this'],
  ['agent-status', '1d76db', 'The generated agent status issue'],
];

/** Parse BACKLOG.md §3 into items: { id, title, size, body }. */
export function parseBacklog(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let cur = null;
  let in3 = false;
  for (const line of lines) {
    if (/^## /.test(line)) { in3 = /^## 3\./.test(line); cur = null; continue; }
    if (!in3) continue;
    const h = /^### (3\.\d+[a-z]?) (.+)$/.exec(line);
    if (h) {
      const rest = h[2];
      let size = null;
      let title = rest;
      const re = /\s—\s(XL|[SML](?:[/–][SML])?)(?=[\s(,.]|$)/g;
      let m;
      let last = null;
      while ((m = re.exec(rest)) !== null) last = m;
      if (last) { size = last[1]; title = rest.slice(0, last.index).trim(); }
      cur = { id: h[1], title, size, heading: rest, body: [] };
      items.push(cur);
      continue;
    }
    if (cur) cur.body.push(line);
  }
  for (const it of items) it.body = it.body.join('\n').replace(/\n---\s*$/m, '').trim();
  return items;
}

const sizeLabel = (size) => {
  if (!size) return null;
  const s = size.toUpperCase().replace('–', '/');
  if (s === 'XL') return 'size/XL';
  const biggest = s.split('/').pop();
  return `size/${biggest}`;
};

const needsOwner = (it) => /needs a product call|owner decision|owner's decision|needs the owner|lawyer|owner:/i.test(`${it.heading} ${it.body.slice(0, 500)}`);

function issueBody(it) {
  const body = it.body.length > 5000 ? `${it.body.slice(0, 5000)}\n\n…(truncated; the full text is in BACKLOG.md)` : it.body;
  return [
    `<!-- backlog-id:${it.id} -->`,
    `From \`.cavern-intelligence/BACKLOG.md\` §${it.id}${it.size ? ` (size ${it.size})` : ''}. The BACKLOG stays the source of truth; update it, not this copy.`,
    '',
    body,
    '',
    '---',
    'Labelled `agent-ready` only after the owner has read this. See `tools-and-access.md` §8.',
  ].join('\n');
}

function existingIds() {
  const out = gh(['issue', 'list', '--repo', REPO, '--state', 'all', '--label', 'backlog', '--limit', '1000', '--json', 'body']);
  const ids = new Set();
  for (const i of JSON.parse(out || '[]')) {
    const m = /<!-- backlog-id:([\w.]+) -->/.exec(i.body || '');
    if (m) ids.add(m[1]);
  }
  return ids;
}

function main() {
  const path = new URL('../.cavern-intelligence/BACKLOG.md', import.meta.url);
  const all = parseBacklog(readFileSync(path, 'utf8'));
  const seen = new Set();
  for (const it of all) {
    if (seen.has(it.id)) console.log(`  WARNING: BACKLOG has two items numbered ${it.id}; only the first gets an issue. Renumber one.`);
    seen.add(it.id);
  }
  const items = all.filter((i, n) => all.findIndex((x) => x.id === i.id) === n).filter((i) => !only || only.has(i.id));
  console.log(`${items.length} backlog item(s) in §3${only ? ' (filtered)' : ''}; repo ${REPO}; mode ${create ? 'CREATE' : 'dry run'}`);

  let have = new Set();
  try { have = existingIds(); } catch (e) {
    if (create) throw e;
    console.log('(could not read existing issues, assuming none: run `gh auth login` for an accurate dry run)');
  }

  if (create) for (const [name, color, description] of LABELS) gh(['label', 'create', name, '--repo', REPO, '--color', color, '--description', description, '--force']);

  let made = 0;
  for (const it of items) {
    if (have.has(it.id)) { console.log(`  skip   ${it.id}  already has an issue`); continue; }
    const labels = ['backlog'];
    const sl = sizeLabel(it.size);
    if (sl) labels.push(sl);
    if (needsOwner(it)) labels.push('needs-owner');
    const title = `[BACKLOG ${it.id}] ${it.title}`;
    console.log(`  ${create ? 'create' : 'would '} ${it.id}  ${title.slice(0, 80)}  [${labels.join(', ')}]`);
    if (create) {
      gh(['issue', 'create', '--repo', REPO, '--title', title, '--body-file', '-', '--label', labels.join(',')], issueBody(it));
      made += 1;
    }
  }
  console.log(create ? `created ${made} issue(s)` : 'dry run only; add --create to make them');
}

if (process.argv[1]?.endsWith('backlog-to-issues.mjs')) main();
