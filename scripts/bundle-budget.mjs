#!/usr/bin/env node
// Page-weight budget. After `npm run build`, adds up the JavaScript each page
// ships on first load (the root layout's chunks plus the page's own, gzipped —
// the figure `next build` prints as "First Load JS") and compares it with
// performance-budget.json. Fails when a page goes over, so a heavy import that
// sneaks into Studio or the editor is caught in the PR, not by a phone on set.
//
//   npm run budget            check against the budget
//   npm run budget -- --update rewrite the budget from this build (+10% headroom)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, '.next', 'app-build-manifest.json');
const budgetPath = path.join(root, 'performance-budget.json');
if (!existsSync(manifestPath)) {
  console.error('No build found (.next/app-build-manifest.json) — run `npm run build` first.');
  process.exit(1);
}

const pages = JSON.parse(readFileSync(manifestPath, 'utf8')).pages;
const gz = new Map();
const size = (chunk) => {
  if (!gz.has(chunk)) gz.set(chunk, gzipSync(readFileSync(path.join(root, '.next', chunk))).length);
  return gz.get(chunk);
};
const layout = pages['/layout'] ?? [];
const kb = (bytes) => Math.round(bytes / 102.4) / 10;

const measured = Object.entries(pages)
  .filter(([key]) => key.endsWith('/page'))
  .map(([key, chunks]) => {
    const route = key.slice(0, -'/page'.length) || '/';
    const files = [...new Set([...layout, ...chunks])].filter((c) => c.endsWith('.js'));
    return { route, kb: kb(files.reduce((sum, c) => sum + size(c), 0)) };
  })
  .sort((a, b) => b.kb - a.kb);

if (process.argv.includes('--update')) {
  const routes = Object.fromEntries(measured.map((m) => [m.route, Math.ceil(m.kb * 1.1)]));
  writeFileSync(budgetPath, JSON.stringify({ note: 'First-load JS per page, kB gzipped. Raise a number only on purpose.', routes }, null, 2) + '\n');
  console.log(`Wrote budgets for ${measured.length} pages to performance-budget.json`);
  process.exit(0);
}

const budget = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')).routes : {};
const DEFAULT = Math.max(0, ...Object.values(budget)) || Infinity; // a new page may not exceed the heaviest known one
let over = 0;
for (const m of measured) {
  const limit = budget[m.route] ?? DEFAULT;
  const bad = m.kb > limit;
  if (bad) over++;
  console.log(`${bad ? 'OVER' : 'ok  '} ${String(m.kb).padStart(7)} kB / ${String(limit).padStart(4)} kB  ${m.route}`);
}
if (over) {
  console.error(`\n${over} page(s) over budget. Trim the import (lazy-load it) or, if the weight is intended, raise the number in performance-budget.json.`);
  process.exit(1);
}
console.log(`\nAll ${measured.length} pages within budget.`);
