// BACKLOG.md is a generated, slim index of backlog-detail.md: every session imports it
// (CLAUDE.md), so it holds the owner's list in full and, for each upgrade, the heading and
// one sentence. The full text of an item lives in backlog-detail.md and is read when the
// item is picked. Edit the detail file, then `npm run sync-intel` (or this script).
//   node scripts/backlog-index.mjs          write BACKLOG.md
//   node scripts/backlog-index.mjs --check  fail if BACKLOG.md is stale
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = new URL('../.cavern-intelligence/', import.meta.url);
const DETAIL = new URL('backlog-detail.md', dir);
const INDEX = new URL('BACKLOG.md', dir);

const HEADER = `# The Cavern — Backlog (index)

**Generated** from [\`backlog-detail.md\`](backlog-detail.md) by \`scripts/backlog-index.mjs\` (run by \`npm run sync-intel\`; CI fails if it is stale). Never edit this file: change an item in \`backlog-detail.md\`, then run \`npm run sync-intel\`. This index is what every session loads; **when you pick an item, read its full text in \`backlog-detail.md\` first** (search for its number).

Every open task and planned pass, scoped. **This is the one list** — when work is found and not done, it goes in the detail file (not only in a session note); when it's done, delete it there and record it in a session note.

Sizes: **S** ≈ an hour or two · **M** ≈ a session · **L** ≈ several sessions.

---
`;

/** The first sentence of an item's text, tidied and capped. */
export function firstSentence(body) {
  const text = body.replace(/\s+/g, ' ').trim();
  const m = /^(.{40,}?[.!?])(?=\s+[A-Z*(\[`]|$)/.exec(text);
  let s = m ? m[1] : text;
  if (s.length > 260) s = `${s.slice(0, 257).replace(/\s+\S*$/, '')}…`;
  return s;
}

export function buildIndex(detail) {
  const lines = detail.replace(/\r\n/g, '\n').split('\n');
  const out = [HEADER.trimEnd(), ''];
  let i = lines.findIndex((l) => /^## 1\./.test(l));
  if (i < 0) throw new Error('backlog-detail.md has no "## 1." section');
  // Sections 1 and 2 (the owner's list, what to verify) are short and carried in full.
  for (; i < lines.length && !/^## 3\./.test(lines[i]); i++) out.push(lines[i]);
  let cur = null;
  const flush = () => { if (cur) { out.push(cur.heading, `${firstSentence(cur.body.join('\n'))} _(full text: \`backlog-detail.md\`, ${cur.id})_`, ''); cur = null; } };
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) { flush(); out.push(l, ''); continue; }
    const h = /^### (\d+\.\d+[a-z]?) /.exec(l);
    if (h) { flush(); cur = { id: h[1], heading: l, body: [] }; continue; }
    if (cur && l.trim() !== '---') cur.body.push(l);
  }
  flush();
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const want = buildIndex(readFileSync(DETAIL, 'utf8'));
  if (process.argv.includes('--check')) {
    const have = existsSync(INDEX) ? readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n') : '';
    if (have !== want) { console.error('BACKLOG.md is out of date with backlog-detail.md. Run `npm run sync-intel` and commit.'); process.exit(1); }
    console.log('BACKLOG.md matches backlog-detail.md.');
  } else {
    writeFileSync(INDEX, want, 'utf8');
    console.log(`BACKLOG.md written (${want.length} bytes from ${readFileSync(DETAIL, 'utf8').length}).`);
  }
}
