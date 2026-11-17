// The backlog every session loads is an index; the full text lives in BACKLOG-detail.md (BACKLOG 3.52).
//   node scripts/backlog-slim.mjs           writes .cavern-intelligence/BACKLOG.md from BACKLOG-detail.md
//   node scripts/backlog-slim.mjs --check   exits 1 when BACKLOG.md is not what the detail file generates
// `npm run sync-intel` runs it. Edit BACKLOG-detail.md, never BACKLOG.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DETAIL = new URL('../.cavern-intelligence/BACKLOG-detail.md', import.meta.url);
const INDEX = new URL('../.cavern-intelligence/BACKLOG.md', import.meta.url);

const NOTICE = `> **This is the index, generated** from [BACKLOG-detail.md](BACKLOG-detail.md) by \`npm run sync-intel\`: edit the detail file, never this one.
> Every session loads this page, so each item here is its first sentence, its plan link and its "Done when". The history, what was
> built and what is left are in the detail file under the same number: **read that item there when you pick it, and update it there.**
`;

const stripLinks = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`);

/** The one-paragraph form of an item's body. */
export function condense(body) {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  const plain = stripLinks(flat);
  // The first sentence worth reading: not the plan pointer (it is shown as a link below), and long enough to say something.
  const sentences = plain.split(/(?<=\.)\s+/);
  let first = sentences.find((x) => x.length >= 40 && !/^Plan\b/i.test(x)) ?? sentences[0] ?? plain;
  first = clip(first, 280);
  const plan = /\[([^\]]*plans\/[^\]]*)\]\(([^)]+)\)/.exec(flat);
  const dones = [...plain.matchAll(/Done when [^.]*(?:\.[^\s][^.]*)*\./g)].map((d) => d[0]);
  const done = dones.length ? clip(dones[dones.length - 1], 320) : '';
  return [first, plan ? `Plan: [${plan[1]}](${plan[2]}).` : '', done && !first.includes(done) ? `**${done.replace(/^Done when/, 'Done when')}**` : ''].filter(Boolean).join(' ');
}

/** The index for a detail file's text. */
export function slimBacklog(detail) {
  const lines = detail.split(/\r?\n/);
  const out = [];
  let i = 0;
  // The title and the first paragraph stay; the notice goes under the title.
  while (i < lines.length && !/^## /.test(lines[i]) && !/^### /.test(lines[i])) {
    out.push(lines[i]);
    if (/^# /.test(lines[i])) { out.push(''); out.push(...NOTICE.trimEnd().split('\n')); }
    i++;
  }
  while (i < lines.length) {
    const line = lines[i];
    if (/^### /.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^##+ /.test(lines[i]) && !/^---\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
      out.push(line, condense(body.join('\n')), '');
    } else { out.push(line); i++; }
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** Write the index (or, with `check`, say whether it is current). Returns 0 or 1. */
export function run({ check = false } = {}) {
  const detail = readFileSync(DETAIL, 'utf8');
  const text = slimBacklog(detail);
  if (check) {
    let have = '';
    try { have = readFileSync(INDEX, 'utf8'); } catch { /* missing */ }
    if (have !== text) { console.error('BACKLOG.md is not what BACKLOG-detail.md generates. Run `npm run sync-intel` and commit.'); return 1; }
    console.log('BACKLOG.md matches BACKLOG-detail.md.');
    return 0;
  }
  writeFileSync(INDEX, text, 'utf8');
  console.log(`BACKLOG.md written (${text.length} characters from ${detail.length}).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run({ check: process.argv.includes('--check') }));
